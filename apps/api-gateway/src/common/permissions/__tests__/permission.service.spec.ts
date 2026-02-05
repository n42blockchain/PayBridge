import { Test, TestingModule } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import { PermissionService } from '../permission.service';
import { UserRole, ROLE_PERMISSIONS } from '@paybridge/shared-types';
import * as fs from 'fs';
import * as yaml from 'js-yaml';

jest.mock('fs');
jest.mock('js-yaml');

describe('PermissionService', () => {
  let service: PermissionService;
  let mockConfigService: any;
  const mockFs = fs as jest.Mocked<typeof fs>;
  const mockYaml = yaml as jest.Mocked<typeof yaml>;

  beforeEach(async () => {
    jest.clearAllMocks();

    mockConfigService = {
      get: jest.fn().mockReturnValue('/mock/path/permissions.yaml'),
    };

    // Default to file not existing (use hardcoded permissions)
    mockFs.existsSync.mockReturnValue(false);

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        PermissionService,
        { provide: ConfigService, useValue: mockConfigService },
      ],
    }).compile();

    service = module.get<PermissionService>(PermissionService);
  });

  describe('onModuleInit', () => {
    it('should load default permissions when config file does not exist', () => {
      mockFs.existsSync.mockReturnValue(false);

      service.onModuleInit();

      // Verify default permissions are loaded
      expect(service.getPermissions(UserRole.SUPER_ADMIN)).toEqual(['*']);
      expect(service.getPermissions(UserRole.ADMIN)).toContain('merchant:*');
    });

    it('should load permissions from YAML config when file exists', async () => {
      mockFs.existsSync.mockReturnValue(true);
      mockFs.readFileSync.mockReturnValue('yaml content');
      mockYaml.load.mockReturnValue({
        roles: {
          SUPER_ADMIN: { permissions: ['*'] },
          ADMIN: { permissions: ['custom:permission'] },
        },
      });

      // Create new instance to trigger onModuleInit with mocks
      const module: TestingModule = await Test.createTestingModule({
        providers: [
          PermissionService,
          { provide: ConfigService, useValue: mockConfigService },
        ],
      }).compile();
      const newService = module.get<PermissionService>(PermissionService);
      newService.onModuleInit();

      expect(newService.getPermissions(UserRole.ADMIN)).toEqual(['custom:permission']);
    });

    it('should fallback to default permissions on invalid YAML', async () => {
      mockFs.existsSync.mockReturnValue(true);
      mockFs.readFileSync.mockReturnValue('invalid yaml');
      mockYaml.load.mockReturnValue(null); // Invalid config

      const module: TestingModule = await Test.createTestingModule({
        providers: [
          PermissionService,
          { provide: ConfigService, useValue: mockConfigService },
        ],
      }).compile();
      const newService = module.get<PermissionService>(PermissionService);
      newService.onModuleInit();

      // Should use default hardcoded permissions
      expect(newService.getPermissions(UserRole.SUPER_ADMIN)).toEqual(['*']);
    });

    it('should fallback to default permissions on read error', async () => {
      mockFs.existsSync.mockReturnValue(true);
      mockFs.readFileSync.mockImplementation(() => {
        throw new Error('Read error');
      });

      const module: TestingModule = await Test.createTestingModule({
        providers: [
          PermissionService,
          { provide: ConfigService, useValue: mockConfigService },
        ],
      }).compile();
      const newService = module.get<PermissionService>(PermissionService);
      newService.onModuleInit();

      // Should use default hardcoded permissions
      expect(newService.getPermissions(UserRole.SUPER_ADMIN)).toEqual(['*']);
    });
  });

  describe('getPermissions', () => {
    beforeEach(() => {
      service.onModuleInit();
    });

    it('should return permissions for SUPER_ADMIN', () => {
      const permissions = service.getPermissions(UserRole.SUPER_ADMIN);
      expect(permissions).toEqual(['*']);
    });

    it('should return permissions for ADMIN', () => {
      const permissions = service.getPermissions(UserRole.ADMIN);
      expect(permissions).toContain('merchant:*');
      expect(permissions).toContain('user:*');
    });

    it('should return permissions for MERCHANT_ADMIN', () => {
      const permissions = service.getPermissions(UserRole.MERCHANT_ADMIN);
      expect(permissions).toContain('merchant:self:read');
      expect(permissions).toContain('order:self:*');
    });

    it('should return empty array for unknown role', () => {
      const permissions = service.getPermissions('UNKNOWN_ROLE' as UserRole);
      expect(permissions).toEqual([]);
    });
  });

  describe('hasPermission', () => {
    beforeEach(() => {
      service.onModuleInit();
    });

    describe('wildcard permissions', () => {
      it('should return true for SUPER_ADMIN with any permission', () => {
        expect(service.hasPermission(UserRole.SUPER_ADMIN, 'any:permission')).toBe(true);
        expect(service.hasPermission(UserRole.SUPER_ADMIN, 'complex:nested:permission')).toBe(true);
      });

      it('should match resource wildcard pattern', () => {
        // ADMIN has 'merchant:*'
        expect(service.hasPermission(UserRole.ADMIN, 'merchant:read')).toBe(true);
        expect(service.hasPermission(UserRole.ADMIN, 'merchant:write')).toBe(true);
        expect(service.hasPermission(UserRole.ADMIN, 'merchant:delete')).toBe(true);
      });

      it('should match nested wildcard pattern', () => {
        // MERCHANT_ADMIN has 'order:self:*'
        expect(service.hasPermission(UserRole.MERCHANT_ADMIN, 'order:self:read')).toBe(true);
        expect(service.hasPermission(UserRole.MERCHANT_ADMIN, 'order:self:write')).toBe(true);
        expect(service.hasPermission(UserRole.MERCHANT_ADMIN, 'order:self:create')).toBe(true);
      });
    });

    describe('exact permissions', () => {
      it('should return true for exact match', () => {
        // OPERATOR has 'merchant:read'
        expect(service.hasPermission(UserRole.OPERATOR, 'merchant:read')).toBe(true);
      });

      it('should return false for non-matching permission', () => {
        // OPERATOR does not have 'merchant:write'
        expect(service.hasPermission(UserRole.OPERATOR, 'merchant:write')).toBe(false);
      });

      it('should return false for permission not in any role', () => {
        expect(service.hasPermission(UserRole.OPERATOR, 'nonexistent:permission')).toBe(false);
      });
    });

    describe('scoped permissions', () => {
      it('should match self-scoped permissions', () => {
        // MERCHANT_USER has 'order:self:read'
        expect(service.hasPermission(UserRole.MERCHANT_USER, 'order:self:read')).toBe(true);
      });

      it('should not match self-scope when permission is different', () => {
        // MERCHANT_USER has 'order:self:read' but not 'order:read'
        expect(service.hasPermission(UserRole.MERCHANT_USER, 'order:read')).toBe(false);
      });
    });

    describe('auditor permissions', () => {
      it('should check AUDITOR_L1 permissions', () => {
        expect(service.hasPermission(UserRole.AUDITOR_L1, 'settlement:read')).toBe(true);
        expect(service.hasPermission(UserRole.AUDITOR_L1, 'settlement:audit:l1')).toBe(true);
        expect(service.hasPermission(UserRole.AUDITOR_L1, 'settlement:audit:l2')).toBe(false);
      });

      it('should check AUDITOR_L2 permissions', () => {
        expect(service.hasPermission(UserRole.AUDITOR_L2, 'settlement:audit:l2')).toBe(true);
        expect(service.hasPermission(UserRole.AUDITOR_L2, 'settlement:audit:l1')).toBe(false);
      });

      it('should check AUDITOR_L3 permissions', () => {
        expect(service.hasPermission(UserRole.AUDITOR_L3, 'settlement:audit:l3')).toBe(true);
        expect(service.hasPermission(UserRole.AUDITOR_L3, 'settlement:audit:l1')).toBe(false);
      });
    });
  });

  describe('reloadPermissions', () => {
    it('should reload permissions from config file', async () => {
      service.onModuleInit();

      // Now mock new config
      mockFs.existsSync.mockReturnValue(true);
      mockFs.readFileSync.mockReturnValue('yaml content');
      mockYaml.load.mockReturnValue({
        roles: {
          ADMIN: { permissions: ['new:permission'] },
        },
      });

      service.reloadPermissions();

      expect(service.getPermissions(UserRole.ADMIN)).toEqual(['new:permission']);
    });
  });

  describe('getAllPermissions', () => {
    it('should return all role permissions', () => {
      service.onModuleInit();

      const allPermissions = service.getAllPermissions();

      expect(allPermissions[UserRole.SUPER_ADMIN]).toBeDefined();
      expect(allPermissions[UserRole.ADMIN]).toBeDefined();
      expect(allPermissions[UserRole.OPERATOR]).toBeDefined();
    });
  });

  describe('config validation', () => {
    it('should skip unknown roles in config', async () => {
      mockFs.existsSync.mockReturnValue(true);
      mockFs.readFileSync.mockReturnValue('yaml content');
      mockYaml.load.mockReturnValue({
        roles: {
          SUPER_ADMIN: { permissions: ['*'] },
          UNKNOWN_ROLE: { permissions: ['some:permission'] },
        },
      });

      const module: TestingModule = await Test.createTestingModule({
        providers: [
          PermissionService,
          { provide: ConfigService, useValue: mockConfigService },
        ],
      }).compile();
      const newService = module.get<PermissionService>(PermissionService);
      newService.onModuleInit();

      // Should still load valid roles
      expect(newService.getPermissions(UserRole.SUPER_ADMIN)).toEqual(['*']);
    });

    it('should reject config with missing roles object', async () => {
      mockFs.existsSync.mockReturnValue(true);
      mockFs.readFileSync.mockReturnValue('yaml content');
      mockYaml.load.mockReturnValue({
        invalid: 'config',
      });

      const module: TestingModule = await Test.createTestingModule({
        providers: [
          PermissionService,
          { provide: ConfigService, useValue: mockConfigService },
        ],
      }).compile();
      const newService = module.get<PermissionService>(PermissionService);
      newService.onModuleInit();

      // Should fallback to default permissions
      expect(newService.getPermissions(UserRole.SUPER_ADMIN)).toEqual(ROLE_PERMISSIONS[UserRole.SUPER_ADMIN]);
    });

    it('should reject config with invalid role config', async () => {
      mockFs.existsSync.mockReturnValue(true);
      mockFs.readFileSync.mockReturnValue('yaml content');
      mockYaml.load.mockReturnValue({
        roles: {
          ADMIN: 'invalid', // Should be an object
        },
      });

      const module: TestingModule = await Test.createTestingModule({
        providers: [
          PermissionService,
          { provide: ConfigService, useValue: mockConfigService },
        ],
      }).compile();
      const newService = module.get<PermissionService>(PermissionService);
      newService.onModuleInit();

      // Should fallback to default permissions
      expect(newService.getPermissions(UserRole.ADMIN)).toEqual(ROLE_PERMISSIONS[UserRole.ADMIN]);
    });

    it('should reject config with non-array permissions', async () => {
      mockFs.existsSync.mockReturnValue(true);
      mockFs.readFileSync.mockReturnValue('yaml content');
      mockYaml.load.mockReturnValue({
        roles: {
          ADMIN: { permissions: 'not-an-array' },
        },
      });

      const module: TestingModule = await Test.createTestingModule({
        providers: [
          PermissionService,
          { provide: ConfigService, useValue: mockConfigService },
        ],
      }).compile();
      const newService = module.get<PermissionService>(PermissionService);
      newService.onModuleInit();

      // Should fallback to default permissions
      expect(newService.getPermissions(UserRole.ADMIN)).toEqual(ROLE_PERMISSIONS[UserRole.ADMIN]);
    });
  });
});
