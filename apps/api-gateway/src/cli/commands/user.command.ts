import { Command, CommandRunner, Option } from 'nest-commander';
import { PrismaService } from '../../modules/prisma/prisma.service';
import { UserRole, UserStatus } from '@paybridge/shared-types';
import { hashPassword } from '@paybridge/shared-utils';

interface CreateUserOptions {
  email: string;
  password: string;
  name: string;
  role: string;
}

interface ListUserOptions {
  role?: string;
  status?: string;
  limit?: number;
}

@Command({
  name: 'user',
  description: 'User management commands',
})
export class UserCommand extends CommandRunner {
  constructor(private prisma: PrismaService) {
    super();
  }

  async run(): Promise<void> {
    console.log('Usage: cli user:create|user:list [options]');
    console.log('Use --help for more information');
  }
}

@Command({
  name: 'user:create',
  description: 'Create a new user',
})
export class UserCreateCommand extends CommandRunner {
  constructor(private prisma: PrismaService) {
    super();
  }

  @Option({
    flags: '-e, --email <email>',
    description: 'User email address',
    required: true,
  })
  parseEmail(val: string): string {
    return val;
  }

  @Option({
    flags: '-p, --password <password>',
    description: 'User password',
    required: true,
  })
  parsePassword(val: string): string {
    return val;
  }

  @Option({
    flags: '-n, --name <name>',
    description: 'User name',
    required: true,
  })
  parseName(val: string): string {
    return val;
  }

  @Option({
    flags: '-r, --role <role>',
    description: `User role (${Object.values(UserRole).join(', ')})`,
    required: true,
  })
  parseRole(val: string): string {
    if (!Object.values(UserRole).includes(val as UserRole)) {
      throw new Error(`Invalid role: ${val}. Valid roles: ${Object.values(UserRole).join(', ')}`);
    }
    return val;
  }

  async run(
    passedParams: string[],
    options?: CreateUserOptions,
  ): Promise<void> {
    if (!options?.email || !options?.password || !options?.name || !options?.role) {
      console.error('Missing required options. Use --help for usage.');
      return;
    }

    const existing = await this.prisma.user.findUnique({
      where: { email: options.email },
    });

    if (existing) {
      console.error(`User with email ${options.email} already exists`);
      return;
    }

    const hashedPassword = hashPassword(options.password);

    const user = await this.prisma.user.create({
      data: {
        email: options.email,
        passwordHash: hashedPassword,
        name: options.name,
        role: options.role as UserRole,
        status: UserStatus.ACTIVE,
      },
    });

    console.log('User created successfully:');
    console.log(`  ID: ${user.id}`);
    console.log(`  Email: ${user.email}`);
    console.log(`  Name: ${user.name}`);
    console.log(`  Role: ${user.role}`);
  }
}

@Command({
  name: 'user:list',
  description: 'List users',
})
export class UserListCommand extends CommandRunner {
  constructor(private prisma: PrismaService) {
    super();
  }

  @Option({
    flags: '-r, --role <role>',
    description: 'Filter by role',
  })
  parseRole(val: string): string {
    return val;
  }

  @Option({
    flags: '-s, --status <status>',
    description: 'Filter by status (ACTIVE, INACTIVE, SUSPENDED)',
  })
  parseStatus(val: string): string {
    return val;
  }

  @Option({
    flags: '-l, --limit <limit>',
    description: 'Limit number of results',
    defaultValue: 20,
  })
  parseLimit(val: string): number {
    return parseInt(val, 10);
  }

  async run(
    passedParams: string[],
    options?: ListUserOptions,
  ): Promise<void> {
    const where: Record<string, unknown> = {};

    if (options?.role) {
      where.role = options.role;
    }
    if (options?.status) {
      where.status = options.status;
    }

    const users = await this.prisma.user.findMany({
      where,
      take: options?.limit || 20,
      select: {
        id: true,
        email: true,
        name: true,
        role: true,
        status: true,
        createdAt: true,
      },
      orderBy: { createdAt: 'desc' },
    });

    if (users.length === 0) {
      console.log('No users found');
      return;
    }

    console.log(`Found ${users.length} users:\n`);
    console.log('ID\t\t\t\t\t\tEmail\t\t\t\tName\t\tRole\t\tStatus');
    console.log('-'.repeat(120));

    for (const user of users) {
      console.log(
        `${user.id}\t${user.email.padEnd(24)}\t${user.name.padEnd(12)}\t${user.role.padEnd(16)}\t${user.status}`,
      );
    }
  }
}
