import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import { ApiTags, ApiBearerAuth } from '@nestjs/swagger';
import { UserRole } from '@paybridge/shared-types';
import { SettlementOrderService } from './settlement-order.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';

@ApiTags('Settlement Orders')
@ApiBearerAuth()
@Controller('v1/settlement-orders')
@UseGuards(JwtAuthGuard, RolesGuard)
export class SettlementOrderController {
  constructor(private orderService: SettlementOrderService) {}

  @Get()
  @Roles(UserRole.SUPER_ADMIN, UserRole.ADMIN, UserRole.FINANCE, UserRole.AUDITOR_L1, UserRole.AUDITOR_L2, UserRole.AUDITOR_L3)
  async findAll(@Query() query: any) {
    return this.orderService.findAll(query);
  }
}
