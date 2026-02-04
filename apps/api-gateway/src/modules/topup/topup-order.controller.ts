import {
  Controller,
  Get,
  Param,
  Query,
  UseGuards,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { UserRole } from '@paybridge/shared-types';
import { TopupOrderService } from './topup-order.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { CurrentUser, CurrentUserPayload } from '../../common/decorators/current-user.decorator';

@ApiTags('Topup Orders')
@ApiBearerAuth()
@Controller('v1/topup-orders')
@UseGuards(JwtAuthGuard, RolesGuard)
export class TopupOrderController {
  constructor(private orderService: TopupOrderService) {}

  @Get()
  @Roles(
    UserRole.SUPER_ADMIN,
    UserRole.ADMIN,
    UserRole.OPERATOR,
    UserRole.FINANCE,
    UserRole.MERCHANT_ADMIN,
    UserRole.MERCHANT_USER,
  )
  @ApiOperation({ summary: 'List topup orders' })
  async findAll(
    @CurrentUser() user: CurrentUserPayload,
    @Query() query: any,
  ) {
    // Merchant users can only see their own orders
    if (user.merchantId) {
      query.merchantId = user.merchantId;
    }
    return this.orderService.findAll(query);
  }

  @Get(':id')
  @Roles(
    UserRole.SUPER_ADMIN,
    UserRole.ADMIN,
    UserRole.OPERATOR,
    UserRole.FINANCE,
    UserRole.MERCHANT_ADMIN,
    UserRole.MERCHANT_USER,
  )
  @ApiOperation({ summary: 'Get topup order by ID' })
  async findById(
    @CurrentUser() user: CurrentUserPayload,
    @Param('id') id: string,
  ) {
    const order = await this.orderService.findById(id);
    // Check merchant access
    if (user.merchantId && order.merchantId !== user.merchantId) {
      return null;
    }
    return order;
  }
}
