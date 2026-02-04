import { Controller, Get, Post, Body, Query, UseGuards } from '@nestjs/common';
import { ApiTags, ApiBearerAuth } from '@nestjs/swagger';
import { UserRole, WalletType, ChainNetwork } from '@paybridge/shared-types';
import { WalletService } from './wallet.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';

@ApiTags('Wallets')
@ApiBearerAuth()
@Controller('v1/wallets')
@UseGuards(JwtAuthGuard, RolesGuard)
export class WalletController {
  constructor(private walletService: WalletService) {}

  @Post()
  @Roles(UserRole.SUPER_ADMIN)
  async create(@Body() dto: { type: WalletType; chain: ChainNetwork; merchantId?: string; label?: string }) {
    return this.walletService.create(dto.type, dto.chain, dto.merchantId, dto.label);
  }

  @Get()
  @Roles(UserRole.SUPER_ADMIN, UserRole.ADMIN, UserRole.FINANCE)
  async findAll(@Query() query: any) {
    return this.walletService.findAll(query);
  }

  @Get('system-summary')
  @Roles(UserRole.SUPER_ADMIN, UserRole.ADMIN)
  async getSystemSummary(@Query('chain') chain: ChainNetwork) {
    return this.walletService.getSystemWalletSummary(chain || ChainNetwork.PAYBRIDGE);
  }
}
