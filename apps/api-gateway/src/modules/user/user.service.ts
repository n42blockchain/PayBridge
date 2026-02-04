import {
  Injectable,
  BadRequestException,
  NotFoundException,
  ConflictException,
  Logger,
} from '@nestjs/common';
import { hashPassword } from '@paybridge/shared-utils';
import { UserRole, UserStatus } from '@paybridge/shared-types';
import { PrismaService } from '../prisma/prisma.service';
import { CreateUserDto, UpdateUserDto, UserListQueryDto } from './dto/user.dto';

@Injectable()
export class UserService {
  private readonly logger = new Logger(UserService.name);

  constructor(private prisma: PrismaService) {}

  async create(dto: CreateUserDto) {
    // Check if email already exists
    const existingUser = await this.prisma.user.findUnique({
      where: { email: dto.email },
    });

    if (existingUser) {
      throw new ConflictException('Email already registered');
    }

    // Validate merchant user roles
    if (
      (dto.role === UserRole.MERCHANT_ADMIN || dto.role === UserRole.MERCHANT_USER) &&
      !dto.merchantId
    ) {
      throw new BadRequestException(
        'Merchant ID is required for merchant user roles',
      );
    }

    // Hash password
    const passwordHash = hashPassword(dto.password);

    const user = await this.prisma.user.create({
      data: {
        email: dto.email,
        passwordHash,
        name: dto.name,
        role: dto.role,
        merchantId: dto.merchantId,
        status: UserStatus.ACTIVE,
      },
      select: {
        id: true,
        email: true,
        name: true,
        role: true,
        status: true,
        merchantId: true,
        twoFactorEnabled: true,
        createdAt: true,
      },
    });

    this.logger.log(`User created: ${user.id} (${user.email})`);
    return user;
  }

  async findAll(query: UserListQueryDto) {
    const {
      role,
      status,
      merchantId,
      search,
      page = 1,
      pageSize = 20,
    } = query;

    const where: any = {};

    if (role) {
      where.role = role;
    }

    if (status) {
      where.status = status;
    }

    if (merchantId) {
      where.merchantId = merchantId;
    }

    if (search) {
      where.OR = [
        { email: { contains: search, mode: 'insensitive' } },
        { name: { contains: search, mode: 'insensitive' } },
      ];
    }

    const [items, total] = await Promise.all([
      this.prisma.user.findMany({
        where,
        select: {
          id: true,
          email: true,
          name: true,
          role: true,
          status: true,
          merchantId: true,
          merchant: {
            select: { name: true },
          },
          twoFactorEnabled: true,
          lastLoginAt: true,
          createdAt: true,
        },
        skip: (page - 1) * pageSize,
        take: pageSize,
        orderBy: { createdAt: 'desc' },
      }),
      this.prisma.user.count({ where }),
    ]);

    return {
      items: items.map((user) => ({
        ...user,
        merchantName: user.merchant?.name,
        merchant: undefined,
      })),
      pagination: {
        page,
        pageSize,
        total,
        totalPages: Math.ceil(total / pageSize),
      },
    };
  }

  async findById(id: string) {
    const user = await this.prisma.user.findUnique({
      where: { id },
      select: {
        id: true,
        email: true,
        name: true,
        role: true,
        status: true,
        merchantId: true,
        merchant: {
          select: { name: true },
        },
        twoFactorEnabled: true,
        lastLoginAt: true,
        createdAt: true,
        updatedAt: true,
      },
    });

    if (!user) {
      throw new NotFoundException('User not found');
    }

    return {
      ...user,
      merchantName: user.merchant?.name,
      merchant: undefined,
    };
  }

  async update(id: string, dto: UpdateUserDto) {
    const user = await this.prisma.user.findUnique({
      where: { id },
    });

    if (!user) {
      throw new NotFoundException('User not found');
    }

    const updated = await this.prisma.user.update({
      where: { id },
      data: {
        name: dto.name,
        role: dto.role,
        status: dto.status,
      },
      select: {
        id: true,
        email: true,
        name: true,
        role: true,
        status: true,
        merchantId: true,
        twoFactorEnabled: true,
        updatedAt: true,
      },
    });

    this.logger.log(`User updated: ${id}`);
    return updated;
  }

  async resetPassword(id: string, newPassword: string) {
    const user = await this.prisma.user.findUnique({
      where: { id },
    });

    if (!user) {
      throw new NotFoundException('User not found');
    }

    const passwordHash = hashPassword(newPassword);

    await this.prisma.user.update({
      where: { id },
      data: {
        passwordHash,
        passwordChangedAt: new Date(),
      },
    });

    this.logger.log(`Password reset for user: ${id}`);
  }

  async delete(id: string) {
    const user = await this.prisma.user.findUnique({
      where: { id },
    });

    if (!user) {
      throw new NotFoundException('User not found');
    }

    // Soft delete by setting status to INACTIVE
    await this.prisma.user.update({
      where: { id },
      data: { status: UserStatus.INACTIVE },
    });

    this.logger.log(`User deleted (soft): ${id}`);
  }
}
