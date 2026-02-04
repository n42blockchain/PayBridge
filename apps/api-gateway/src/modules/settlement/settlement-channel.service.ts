import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class SettlementChannelService {
  private readonly logger = new Logger(SettlementChannelService.name);

  constructor(private prisma: PrismaService) {}

  async findAll(query: any) {
    const { status, mode, page = 1, pageSize = 20 } = query;

    const where: any = {};
    if (status) where.status = status;
    if (mode) where.mode = mode;

    const [items, total] = await Promise.all([
      this.prisma.settlementChannel.findMany({
        where,
        skip: (page - 1) * pageSize,
        take: pageSize,
        orderBy: { createdAt: 'desc' },
      }),
      this.prisma.settlementChannel.count({ where }),
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
}
