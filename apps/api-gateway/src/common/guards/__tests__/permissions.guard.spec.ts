import { Test, TestingModule } from '@nestjs/testing';
import { Reflector } from '@nestjs/core';
import { ExecutionContext, ForbiddenException } from '@nestjs/common';
import { PermissionsGuard } from '../permissions.guard';
import { PermissionService } from '../../permissions/permission.service';
import { UserRole } from '@paybridge/shared-types';

describe('PermissionsGuard', () => {
  let guard: PermissionsGuard;
  let reflector: Reflector;
  let permissionService: PermissionService;

  const createMockExecutionContext = (user: any): ExecutionContext => {
    return {
      switchToHttp: () => ({
        getRequest: () => ({ user }),
      }),
      getHandler: () => jest.fn(),
      getClass: () => jest.fn(),
    } as unknown as ExecutionContext;
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        PermissionsGuard,
        {
          provide: Reflector,
          useValue: {
            getAllAndOverride: jest.fn(),
          },
        },
        {
          provide: PermissionService,
          useValue: {
            hasPermission: jest.fn(),
          },
        },
      ],
    }).compile();

    guard = module.get<PermissionsGuard>(PermissionsGuard);
    reflector = module.get<Reflector>(Reflector);
    permissionService = module.get<PermissionService>(PermissionService);
  });

  describe('canActivate', () => {
    it('should allow access when no permissions are required', () => {
      jest.spyOn(reflector, 'getAllAndOverride').mockReturnValue(null);
      const context = createMockExecutionContext({ role: UserRole.OPERATOR });

      expect(guard.canActivate(context)).toBe(true);
    });

    it('should allow access when permissions array is empty', () => {
      jest.spyOn(reflector, 'getAllAndOverride').mockReturnValue([]);
      const context = createMockExecutionContext({ role: UserRole.OPERATOR });

      expect(guard.canActivate(context)).toBe(true);
    });

    it('should throw ForbiddenException when user is not authenticated', () => {
      jest.spyOn(reflector, 'getAllAndOverride').mockReturnValue(['order:read']);
      const context = createMockExecutionContext(null);

      expect(() => guard.canActivate(context)).toThrow(ForbiddenException);
      expect(() => guard.canActivate(context)).toThrow('User not authenticated');
    });

    it('should allow SUPER_ADMIN access to any permission-protected route', () => {
      jest.spyOn(reflector, 'getAllAndOverride').mockReturnValue(['order:read', 'order:write']);
      const context = createMockExecutionContext({ role: UserRole.SUPER_ADMIN });

      expect(guard.canActivate(context)).toBe(true);
      // Should not check permission service for SUPER_ADMIN
      expect(permissionService.hasPermission).not.toHaveBeenCalled();
    });

    it('should allow access when user has required permission', () => {
      jest.spyOn(reflector, 'getAllAndOverride').mockReturnValue(['order:read']);
      jest.spyOn(permissionService, 'hasPermission').mockReturnValue(true);
      const context = createMockExecutionContext({ role: UserRole.OPERATOR });

      expect(guard.canActivate(context)).toBe(true);
      expect(permissionService.hasPermission).toHaveBeenCalledWith(UserRole.OPERATOR, 'order:read');
    });

    it('should allow access when user has one of multiple required permissions', () => {
      jest.spyOn(reflector, 'getAllAndOverride').mockReturnValue(['order:write', 'order:read']);
      jest.spyOn(permissionService, 'hasPermission')
        .mockReturnValueOnce(false) // order:write
        .mockReturnValueOnce(true); // order:read
      const context = createMockExecutionContext({ role: UserRole.OPERATOR });

      expect(guard.canActivate(context)).toBe(true);
    });

    it('should throw ForbiddenException when user lacks required permission', () => {
      jest.spyOn(reflector, 'getAllAndOverride').mockReturnValue(['merchant:write']);
      jest.spyOn(permissionService, 'hasPermission').mockReturnValue(false);
      const context = createMockExecutionContext({ role: UserRole.OPERATOR });

      expect(() => guard.canActivate(context)).toThrow(ForbiddenException);
      expect(() => guard.canActivate(context)).toThrow('Insufficient permissions');
    });

    it('should check self-scoped permission for merchant users', () => {
      jest.spyOn(reflector, 'getAllAndOverride').mockReturnValue(['order:read']);
      jest.spyOn(permissionService, 'hasPermission')
        .mockReturnValueOnce(false) // order:read direct check
        .mockReturnValueOnce(true); // order:self:read check
      const context = createMockExecutionContext({
        role: UserRole.MERCHANT_ADMIN,
        merchantId: 'merchant-123',
      });

      expect(guard.canActivate(context)).toBe(true);
      expect(permissionService.hasPermission).toHaveBeenCalledWith(UserRole.MERCHANT_ADMIN, 'order:read');
      expect(permissionService.hasPermission).toHaveBeenCalledWith(UserRole.MERCHANT_ADMIN, 'order:self:read');
    });

    it('should not check self-scoped permission for non-merchant users', () => {
      jest.spyOn(reflector, 'getAllAndOverride').mockReturnValue(['order:read']);
      jest.spyOn(permissionService, 'hasPermission').mockReturnValue(false);
      const context = createMockExecutionContext({
        role: UserRole.OPERATOR,
        // No merchantId
      });

      expect(() => guard.canActivate(context)).toThrow(ForbiddenException);
      // Should only check direct permission, not self-scoped
      expect(permissionService.hasPermission).toHaveBeenCalledTimes(1);
      expect(permissionService.hasPermission).toHaveBeenCalledWith(UserRole.OPERATOR, 'order:read');
    });

    it('should not convert already self-scoped permissions', () => {
      jest.spyOn(reflector, 'getAllAndOverride').mockReturnValue(['order:self:read']);
      jest.spyOn(permissionService, 'hasPermission').mockReturnValue(true);
      const context = createMockExecutionContext({
        role: UserRole.MERCHANT_ADMIN,
        merchantId: 'merchant-123',
      });

      expect(guard.canActivate(context)).toBe(true);
      // Should check exactly as specified
      expect(permissionService.hasPermission).toHaveBeenCalledWith(UserRole.MERCHANT_ADMIN, 'order:self:read');
    });

    it('should handle complex permission patterns', () => {
      jest.spyOn(reflector, 'getAllAndOverride').mockReturnValue(['settlement:audit:l1']);
      jest.spyOn(permissionService, 'hasPermission').mockReturnValue(true);
      const context = createMockExecutionContext({ role: UserRole.AUDITOR_L1 });

      expect(guard.canActivate(context)).toBe(true);
      expect(permissionService.hasPermission).toHaveBeenCalledWith(UserRole.AUDITOR_L1, 'settlement:audit:l1');
    });

    it('should include required permissions in error message', () => {
      jest.spyOn(reflector, 'getAllAndOverride').mockReturnValue(['order:write', 'order:delete']);
      jest.spyOn(permissionService, 'hasPermission').mockReturnValue(false);
      const context = createMockExecutionContext({ role: UserRole.OPERATOR });

      try {
        guard.canActivate(context);
        fail('Expected ForbiddenException');
      } catch (error: any) {
        expect(error.message).toContain('order:write');
        expect(error.message).toContain('order:delete');
      }
    });
  });
});
