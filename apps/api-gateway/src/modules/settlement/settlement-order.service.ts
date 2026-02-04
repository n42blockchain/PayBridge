import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class SettlementOrderService {
  private readonly logger = new Logger(SettlementOrderService.name);

  constructor(private prisma: PrismaService) {}

  async findAll(query: any) {
    const { status, merchantId, page = 1, pageSize = 20 } = query;

    const where: any = {};
    if (status) where.status = status;
    if (merchantId) where.merchantId = merchantId;

    const [items, total] = await Promise.all([
      this.prisma.settlementOrder.findMany({
        where,
        include: {
          merchant: { select: { name: true } },
          channel: { select: { name: true } },
        },
        skip: (page - 1) * pageSize,
        take: pageSize,
        orderBy: { createdAt: 'desc' },
      }),
      this.prisma.settlementOrder.count({ where }),
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
