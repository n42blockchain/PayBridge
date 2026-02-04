import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import { ApiTags, ApiBearerAuth } from '@nestjs/swagger';
import { UserRole } from '@paybridge/shared-types';
import { SettlementChannelService } from './settlement-channel.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';

@ApiTags('Settlement Channels')
@ApiBearerAuth()
@Controller('v1/settlement-channels')
@UseGuards(JwtAuthGuard, RolesGuard)
export class SettlementChannelController {
  constructor(private channelService: SettlementChannelService) {}

  @Get()
  @Roles(UserRole.SUPER_ADMIN, UserRole.ADMIN)
  async findAll(@Query() query: any) {
    return this.channelService.findAll(query);
  }
}
