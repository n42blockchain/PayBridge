import { Test, TestingModule } from '@nestjs/testing';
import { UserCommand, UserCreateCommand, UserListCommand } from '../user.command';
import { PrismaService } from '../../../modules/prisma/prisma.service';
import { UserRole, UserStatus } from '@paybridge/shared-types';
import * as sharedUtils from '@paybridge/shared-utils';

jest.mock('@paybridge/shared-utils', () => ({
  hashPassword: jest.fn().mockReturnValue('hashed_password'),
}));

describe('User Commands', () => {
  let prisma: PrismaService;

  beforeEach(async () => {
    jest.clearAllMocks();
    jest.spyOn(console, 'log').mockImplementation();
    jest.spyOn(console, 'error').mockImplementation();
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  describe('UserCommand', () => {
    let command: UserCommand;

    beforeEach(async () => {
      const module: TestingModule = await Test.createTestingModule({
        providers: [
          UserCommand,
          {
            provide: PrismaService,
            useValue: {},
          },
        ],
      }).compile();

      command = module.get<UserCommand>(UserCommand);
    });

    it('should print usage information', async () => {
      await command.run();
      expect(console.log).toHaveBeenCalledWith(expect.stringContaining('user:create'));
      expect(console.log).toHaveBeenCalledWith(expect.stringContaining('user:list'));
    });
  });

  describe('UserCreateCommand', () => {
    let command: UserCreateCommand;
    let mockPrisma: any;

    beforeEach(async () => {
      mockPrisma = {
        user: {
          findUnique: jest.fn(),
          create: jest.fn(),
        },
      };

      const module: TestingModule = await Test.createTestingModule({
        providers: [
          UserCreateCommand,
          { provide: PrismaService, useValue: mockPrisma },
        ],
      }).compile();

      command = module.get<UserCreateCommand>(UserCreateCommand);
    });

    it('should validate role option', () => {
      // Valid role
      expect(command.parseRole('ADMIN')).toBe('ADMIN');

      // Invalid role should throw
      expect(() => command.parseRole('INVALID_ROLE')).toThrow('Invalid role');
    });

    it('should parse email option', () => {
      expect(command.parseEmail('test@example.com')).toBe('test@example.com');
    });

    it('should parse password option', () => {
      expect(command.parsePassword('secret123')).toBe('secret123');
    });

    it('should parse name option', () => {
      expect(command.parseName('John Doe')).toBe('John Doe');
    });

    it('should show error when missing required options', async () => {
      await command.run([], undefined);
      expect(console.error).toHaveBeenCalledWith(expect.stringContaining('Missing required options'));
    });

    it('should show error when email already exists', async () => {
      mockPrisma.user.findUnique.mockResolvedValue({ id: 'existing-user' });

      await command.run([], {
        email: 'existing@example.com',
        password: 'password123',
        name: 'Test User',
        role: 'ADMIN',
      });

      expect(console.error).toHaveBeenCalledWith(expect.stringContaining('already exists'));
      expect(mockPrisma.user.create).not.toHaveBeenCalled();
    });

    it('should create user successfully', async () => {
      mockPrisma.user.findUnique.mockResolvedValue(null);
      mockPrisma.user.create.mockResolvedValue({
        id: 'new-user-id',
        email: 'new@example.com',
        name: 'New User',
        role: UserRole.ADMIN,
      });

      await command.run([], {
        email: 'new@example.com',
        password: 'password123',
        name: 'New User',
        role: 'ADMIN',
      });

      expect(sharedUtils.hashPassword).toHaveBeenCalledWith('password123');
      expect(mockPrisma.user.create).toHaveBeenCalledWith({
        data: {
          email: 'new@example.com',
          passwordHash: 'hashed_password',
          name: 'New User',
          role: UserRole.ADMIN,
          status: UserStatus.ACTIVE,
        },
      });
      expect(console.log).toHaveBeenCalledWith('User created successfully:');
    });
  });

  describe('UserListCommand', () => {
    let command: UserListCommand;
    let mockPrisma: any;

    const mockUsers = [
      {
        id: 'user-1',
        email: 'user1@example.com',
        name: 'User 1',
        role: UserRole.ADMIN,
        status: UserStatus.ACTIVE,
        createdAt: new Date(),
      },
      {
        id: 'user-2',
        email: 'user2@example.com',
        name: 'User 2',
        role: UserRole.OPERATOR,
        status: UserStatus.ACTIVE,
        createdAt: new Date(),
      },
    ];

    beforeEach(async () => {
      mockPrisma = {
        user: {
          findMany: jest.fn(),
        },
      };

      const module: TestingModule = await Test.createTestingModule({
        providers: [
          UserListCommand,
          { provide: PrismaService, useValue: mockPrisma },
        ],
      }).compile();

      command = module.get<UserListCommand>(UserListCommand);
    });

    it('should parse role option', () => {
      expect(command.parseRole('ADMIN')).toBe('ADMIN');
    });

    it('should parse status option', () => {
      expect(command.parseStatus('ACTIVE')).toBe('ACTIVE');
    });

    it('should parse limit option', () => {
      expect(command.parseLimit('50')).toBe(50);
    });

    it('should list all users without filters', async () => {
      mockPrisma.user.findMany.mockResolvedValue(mockUsers);

      await command.run([], {});

      expect(mockPrisma.user.findMany).toHaveBeenCalledWith({
        where: {},
        take: 20,
        select: expect.any(Object),
        orderBy: { createdAt: 'desc' },
      });
      expect(console.log).toHaveBeenCalledWith(expect.stringContaining('Found 2 users'));
    });

    it('should filter by role', async () => {
      mockPrisma.user.findMany.mockResolvedValue([mockUsers[0]]);

      await command.run([], { role: 'ADMIN' });

      expect(mockPrisma.user.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { role: 'ADMIN' },
        }),
      );
    });

    it('should filter by status', async () => {
      mockPrisma.user.findMany.mockResolvedValue(mockUsers);

      await command.run([], { status: 'ACTIVE' });

      expect(mockPrisma.user.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { status: 'ACTIVE' },
        }),
      );
    });

    it('should apply limit', async () => {
      mockPrisma.user.findMany.mockResolvedValue([mockUsers[0]]);

      await command.run([], { limit: 1 });

      expect(mockPrisma.user.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          take: 1,
        }),
      );
    });

    it('should show message when no users found', async () => {
      mockPrisma.user.findMany.mockResolvedValue([]);

      await command.run([], {});

      expect(console.log).toHaveBeenCalledWith('No users found');
    });
  });
});
