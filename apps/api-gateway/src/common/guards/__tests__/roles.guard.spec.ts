import { Test, TestingModule } from '@nestjs/testing';
import { Reflector } from '@nestjs/core';
import { ExecutionContext, ForbiddenException } from '@nestjs/common';
import { RolesGuard } from '../roles.guard';
import { UserRole } from '@paybridge/shared-types';

describe('RolesGuard', () => {
  let guard: RolesGuard;
  let reflector: Reflector;

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
        RolesGuard,
        {
          provide: Reflector,
          useValue: {
            getAllAndOverride: jest.fn(),
          },
        },
      ],
    }).compile();

    guard = module.get<RolesGuard>(RolesGuard);
    reflector = module.get<Reflector>(Reflector);
  });

  describe('canActivate', () => {
    it('should allow access when no roles are required', () => {
      jest.spyOn(reflector, 'getAllAndOverride').mockReturnValue(null);
      const context = createMockExecutionContext({ role: UserRole.OPERATOR });

      expect(guard.canActivate(context)).toBe(true);
    });

    it('should allow access when roles array is empty', () => {
      jest.spyOn(reflector, 'getAllAndOverride').mockReturnValue([]);
      const context = createMockExecutionContext({ role: UserRole.OPERATOR });

      expect(guard.canActivate(context)).toBe(true);
    });

    it('should throw ForbiddenException when user is not authenticated', () => {
      jest.spyOn(reflector, 'getAllAndOverride').mockReturnValue([UserRole.ADMIN]);
      const context = createMockExecutionContext(null);

      expect(() => guard.canActivate(context)).toThrow(ForbiddenException);
      expect(() => guard.canActivate(context)).toThrow('User not authenticated');
    });

    it('should allow SUPER_ADMIN access to any role-protected route', () => {
      jest.spyOn(reflector, 'getAllAndOverride').mockReturnValue([UserRole.ADMIN, UserRole.FINANCE]);
      const context = createMockExecutionContext({ role: UserRole.SUPER_ADMIN });

      expect(guard.canActivate(context)).toBe(true);
    });

    it('should allow access when user has required role', () => {
      jest.spyOn(reflector, 'getAllAndOverride').mockReturnValue([UserRole.ADMIN, UserRole.FINANCE]);
      const context = createMockExecutionContext({ role: UserRole.ADMIN });

      expect(guard.canActivate(context)).toBe(true);
    });

    it('should allow access when user has one of multiple required roles', () => {
      jest.spyOn(reflector, 'getAllAndOverride').mockReturnValue([UserRole.ADMIN, UserRole.FINANCE, UserRole.OPERATOR]);
      const context = createMockExecutionContext({ role: UserRole.FINANCE });

      expect(guard.canActivate(context)).toBe(true);
    });

    it('should throw ForbiddenException when user does not have required role', () => {
      jest.spyOn(reflector, 'getAllAndOverride').mockReturnValue([UserRole.ADMIN]);
      const context = createMockExecutionContext({ role: UserRole.OPERATOR });

      expect(() => guard.canActivate(context)).toThrow(ForbiddenException);
      expect(() => guard.canActivate(context)).toThrow('Insufficient permissions');
    });

    it('should deny merchant users access to admin-only routes', () => {
      jest.spyOn(reflector, 'getAllAndOverride').mockReturnValue([UserRole.ADMIN, UserRole.SUPER_ADMIN]);
      const context = createMockExecutionContext({ role: UserRole.MERCHANT_ADMIN });

      expect(() => guard.canActivate(context)).toThrow(ForbiddenException);
    });

    it('should handle auditor roles correctly', () => {
      jest.spyOn(reflector, 'getAllAndOverride').mockReturnValue([UserRole.AUDITOR_L1, UserRole.AUDITOR_L2, UserRole.AUDITOR_L3]);

      const l1Context = createMockExecutionContext({ role: UserRole.AUDITOR_L1 });
      expect(guard.canActivate(l1Context)).toBe(true);

      const l2Context = createMockExecutionContext({ role: UserRole.AUDITOR_L2 });
      expect(guard.canActivate(l2Context)).toBe(true);

      const l3Context = createMockExecutionContext({ role: UserRole.AUDITOR_L3 });
      expect(guard.canActivate(l3Context)).toBe(true);
    });

    it('should deny finance role when only auditor roles are required', () => {
      jest.spyOn(reflector, 'getAllAndOverride').mockReturnValue([UserRole.AUDITOR_L1, UserRole.AUDITOR_L2, UserRole.AUDITOR_L3]);
      const context = createMockExecutionContext({ role: UserRole.FINANCE });

      expect(() => guard.canActivate(context)).toThrow(ForbiddenException);
    });
  });
});
