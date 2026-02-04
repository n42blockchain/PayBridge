import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  Query,
  UseGuards,
} from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger';
import { UserRole, AuditResult } from '@paybridge/shared-types';
import { SettlementOrderService } from './settlement-order.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import {
  CurrentUser,
  CurrentUserPayload,
} from '../../common/decorators/current-user.decorator';

@ApiTags('Settlement Orders')
@ApiBearerAuth()
@Controller('v1/settlement-orders')
@UseGuards(JwtAuthGuard, RolesGuard)
export class SettlementOrderController {
  constructor(private orderService: SettlementOrderService) {}

  @Post()
  @Roles(UserRole.MERCHANT_ADMIN)
  @ApiOperation({ summary: 'Create settlement order (merchant)' })
  async create(
    @CurrentUser() user: CurrentUserPayload,
    @Body() body: { tokenAmount: string },
  ) {
    if (!user.merchantId) {
      throw new Error('Merchant ID required');
    }
    return this.orderService.create(user.merchantId, body.tokenAmount);
  }

  @Get()
  @Roles(
    UserRole.SUPER_ADMIN,
    UserRole.ADMIN,
    UserRole.FINANCE,
    UserRole.AUDITOR_L1,
    UserRole.AUDITOR_L2,
    UserRole.AUDITOR_L3,
  )
  @ApiOperation({ summary: 'List all settlement orders (admin)' })
  async findAll(@Query() query: any) {
    return this.orderService.findAll(query);
  }

  @Get('pending-my-audit')
  @Roles(
    UserRole.FINANCE,
    UserRole.AUDITOR_L1,
    UserRole.AUDITOR_L2,
    UserRole.AUDITOR_L3,
    UserRole.ADMIN,
    UserRole.SUPER_ADMIN,
  )
  @ApiOperation({ summary: 'List orders pending my audit' })
  async findPendingMyAudit(@CurrentUser() user: CurrentUserPayload) {
    return this.orderService.findPendingMyAudit(user.id, user.role as UserRole);
  }

  @Get('my')
  @Roles(UserRole.MERCHANT_ADMIN, UserRole.MERCHANT_USER)
  @ApiOperation({ summary: 'List my settlement orders (merchant)' })
  async findMy(@CurrentUser() user: CurrentUserPayload, @Query() query: any) {
    if (!user.merchantId) {
      return { items: [], pagination: { page: 1, pageSize: 20, total: 0, totalPages: 0 } };
    }
    return this.orderService.findAll({ ...query, merchantId: user.merchantId });
  }

  @Get(':id')
  @Roles(
    UserRole.SUPER_ADMIN,
    UserRole.ADMIN,
    UserRole.FINANCE,
    UserRole.AUDITOR_L1,
    UserRole.AUDITOR_L2,
    UserRole.AUDITOR_L3,
    UserRole.MERCHANT_ADMIN,
    UserRole.MERCHANT_USER,
  )
  @ApiOperation({ summary: 'Get settlement order details' })
  async findById(@Param('id') id: string) {
    return this.orderService.findById(id);
  }

  @Post(':id/audit')
  @Roles(
    UserRole.FINANCE,
    UserRole.AUDITOR_L1,
    UserRole.AUDITOR_L2,
    UserRole.AUDITOR_L3,
    UserRole.ADMIN,
    UserRole.SUPER_ADMIN,
  )
  @ApiOperation({ summary: 'Submit audit decision' })
  async submitAudit(
    @Param('id') id: string,
    @CurrentUser() user: CurrentUserPayload,
    @Body()
    body: {
      result: AuditResult;
      comment?: string;
      selectedChannelId?: string;
    },
  ) {
    return this.orderService.submitAudit(
      id,
      user.id,
      user.role as UserRole,
      body.result,
      body.comment,
      body.selectedChannelId,
    );
  }

  @Post(':id/cancel')
  @Roles(UserRole.MERCHANT_ADMIN)
  @ApiOperation({ summary: 'Cancel settlement order (merchant)' })
  async cancel(
    @Param('id') id: string,
    @CurrentUser() user: CurrentUserPayload,
  ) {
    if (!user.merchantId) {
      throw new Error('Merchant ID required');
    }
    return this.orderService.cancel(id, user.merchantId);
  }
}
