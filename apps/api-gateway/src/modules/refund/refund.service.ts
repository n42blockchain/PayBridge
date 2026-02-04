import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class RefundService {
  private readonly logger = new Logger(RefundService.name);

  constructor(private prisma: PrismaService) {}

  async findAll(query: any) {
    const { status, merchantId, page = 1, pageSize = 20 } = query;

    const where: any = {};
    if (status) where.status = status;
    if (merchantId) {
      where.topupOrder = { merchantId };
    }

    const [items, total] = await Promise.all([
      this.prisma.refundOrder.findMany({
        where,
        include: {
          topupOrder: {
            select: {
              orderNo: true,
              merchantOrderNo: true,
              merchant: { select: { name: true } },
            },
          },
        },
        skip: (page - 1) * pageSize,
        take: pageSize,
        orderBy: { createdAt: 'desc' },
      }),
      this.prisma.refundOrder.count({ where }),
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
