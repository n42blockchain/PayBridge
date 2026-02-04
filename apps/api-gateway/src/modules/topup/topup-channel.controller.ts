import {
  Controller,
  Get,
  Post,
  Put,
  Body,
  Param,
  Query,
  UseGuards,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { UserRole } from '@paybridge/shared-types';
import { TopupChannelService } from './topup-channel.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';

@ApiTags('Topup Channels')
@ApiBearerAuth()
@Controller('v1/topup-channels')
@UseGuards(JwtAuthGuard, RolesGuard)
export class TopupChannelController {
  constructor(private channelService: TopupChannelService) {}

  @Post()
  @Roles(UserRole.SUPER_ADMIN, UserRole.ADMIN)
  @ApiOperation({ summary: 'Create topup channel' })
  async create(@Body() dto: any) {
    return this.channelService.create(dto);
  }

  @Get()
  @Roles(UserRole.SUPER_ADMIN, UserRole.ADMIN, UserRole.OPERATOR)
  @ApiOperation({ summary: 'List topup channels' })
  async findAll(@Query() query: any) {
    return this.channelService.findAll(query);
  }

  @Get(':id')
  @Roles(UserRole.SUPER_ADMIN, UserRole.ADMIN)
  @ApiOperation({ summary: 'Get topup channel by ID' })
  async findById(@Param('id') id: string) {
    return this.channelService.findById(id, true);
  }

  @Put(':id')
  @Roles(UserRole.SUPER_ADMIN, UserRole.ADMIN)
  @ApiOperation({ summary: 'Update topup channel' })
  async update(@Param('id') id: string, @Body() dto: any) {
    return this.channelService.update(id, dto);
  }
}
