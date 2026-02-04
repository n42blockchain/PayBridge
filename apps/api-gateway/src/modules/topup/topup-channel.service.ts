import { Injectable, NotFoundException, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { encrypt, decrypt, encryptConfig, decryptConfig } from '@paybridge/shared-utils';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class TopupChannelService {
  private readonly logger = new Logger(TopupChannelService.name);
  private readonly masterKey: string;

  constructor(
    private prisma: PrismaService,
    private configService: ConfigService,
  ) {
    this.masterKey = this.configService.get<string>('WALLET_MASTER_KEY_V1', '');
  }

  async create(dto: any) {
    const encryptedConfig = encryptConfig(dto.connectionConfig, this.masterKey);

    const channel = await this.prisma.topupChannel.create({
      data: {
        code: dto.code,
        name: dto.name,
        environment: dto.environment || 'PRODUCTION',
        connectionConfig: encryptedConfig,
        costPercentageFee: dto.costPercentageFee,
        costFixedFee: dto.costFixedFee,
        costMinimumFee: dto.costMinimumFee,
        orderTimeoutMinutes: dto.orderTimeoutMinutes || 30,
        priority: dto.priority || 0,
        dailyLimit: dto.dailyLimit,
        singleMinAmount: dto.singleMinAmount,
        singleMaxAmount: dto.singleMaxAmount,
      },
    });

    this.logger.log(`Topup channel created: ${channel.id} (${channel.code})`);
    return channel;
  }

  async findAll(query: any) {
    const { status, environment, search, page = 1, pageSize = 20 } = query;

    const where: any = {};
    if (status) where.status = status;
    if (environment) where.environment = environment;
    if (search) {
      where.OR = [
        { code: { contains: search, mode: 'insensitive' } },
        { name: { contains: search, mode: 'insensitive' } },
      ];
    }

    const [items, total] = await Promise.all([
      this.prisma.topupChannel.findMany({
        where,
        select: {
          id: true,
          code: true,
          name: true,
          environment: true,
          status: true,
          costPercentageFee: true,
          costFixedFee: true,
          costMinimumFee: true,
          orderTimeoutMinutes: true,
          priority: true,
          dailyLimit: true,
          singleMinAmount: true,
          singleMaxAmount: true,
          createdAt: true,
          updatedAt: true,
        },
        skip: (page - 1) * pageSize,
        take: pageSize,
        orderBy: { priority: 'desc' },
      }),
      this.prisma.topupChannel.count({ where }),
    ]);

    return {
      items,
      pagination: {
        page,
        pageSize,
        total,
        totalPages: Math.ceil(total / pageSize),
      },
    };
  }

  async findById(id: string, includeConfig = false) {
    const channel = await this.prisma.topupChannel.findUnique({
      where: { id },
    });

    if (!channel) {
      throw new NotFoundException('Channel not found');
    }

    if (includeConfig) {
      const connectionConfig = decryptConfig(channel.connectionConfig, this.masterKey);
      return {
        ...channel,
        connectionConfig,
      };
    }

    return {
      ...channel,
      connectionConfig: undefined,
    };
  }

  async update(id: string, dto: any) {
    const channel = await this.prisma.topupChannel.findUnique({
      where: { id },
    });

    if (!channel) {
      throw new NotFoundException('Channel not found');
    }

    const updateData: any = {
      name: dto.name,
      status: dto.status,
      costPercentageFee: dto.costPercentageFee,
      costFixedFee: dto.costFixedFee,
      costMinimumFee: dto.costMinimumFee,
      orderTimeoutMinutes: dto.orderTimeoutMinutes,
      priority: dto.priority,
      dailyLimit: dto.dailyLimit,
      singleMinAmount: dto.singleMinAmount,
      singleMaxAmount: dto.singleMaxAmount,
    };

    if (dto.connectionConfig) {
      updateData.connectionConfig = encryptConfig(dto.connectionConfig, this.masterKey);
    }

    const updated = await this.prisma.topupChannel.update({
      where: { id },
      data: updateData,
    });

    this.logger.log(`Topup channel updated: ${id}`);
    return updated;
  }
}
