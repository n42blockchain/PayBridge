import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import { ApiTags, ApiBearerAuth } from '@nestjs/swagger';
import { UserRole } from '@paybridge/shared-types';
import { RefundService } from './refund.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';

@ApiTags('Refunds')
@ApiBearerAuth()
@Controller('v1/refund-orders')
@UseGuards(JwtAuthGuard, RolesGuard)
export class RefundController {
  constructor(private refundService: RefundService) {}

  @Get()
  @Roles(UserRole.SUPER_ADMIN, UserRole.ADMIN, UserRole.OPERATOR, UserRole.FINANCE)
  async findAll(@Query() query: any) {
    return this.refundService.findAll(query);
  }
}
