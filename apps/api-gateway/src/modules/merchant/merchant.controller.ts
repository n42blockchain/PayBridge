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
import { UserRole, MerchantStatus } from '@paybridge/shared-types';
import { MerchantService } from './merchant.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { CurrentUser, CurrentUserPayload } from '../../common/decorators/current-user.decorator';
import {
  CreateMerchantDto,
  UpdateMerchantDto,
  UpdateMerchantConfigDto,
  MerchantListQueryDto,
} from './dto/merchant.dto';

@ApiTags('Merchants')
@ApiBearerAuth()
@Controller('v1/merchants')
@UseGuards(JwtAuthGuard, RolesGuard)
export class MerchantController {
  constructor(private merchantService: MerchantService) {}

  @Post()
  @Roles(UserRole.SUPER_ADMIN, UserRole.ADMIN)
  @ApiOperation({ summary: 'Create a new merchant' })
  async create(@Body() dto: CreateMerchantDto) {
    return this.merchantService.create(dto);
  }

  @Get()
  @Roles(UserRole.SUPER_ADMIN, UserRole.ADMIN, UserRole.OPERATOR)
  @ApiOperation({ summary: 'List all merchants' })
  async findAll(@Query() query: MerchantListQueryDto) {
    return this.merchantService.findAll(query);
  }

  @Get('me')
  @Roles(UserRole.MERCHANT_ADMIN, UserRole.MERCHANT_USER)
  @ApiOperation({ summary: 'Get current merchant info' })
  async findMe(@CurrentUser() user: CurrentUserPayload) {
    if (!user.merchantId) {
      return null;
    }
    return this.merchantService.findById(user.merchantId);
  }

  @Get(':id')
  @Roles(UserRole.SUPER_ADMIN, UserRole.ADMIN, UserRole.OPERATOR)
  @ApiOperation({ summary: 'Get merchant by ID' })
  async findById(@Param('id') id: string) {
    return this.merchantService.findById(id);
  }

  @Put(':id')
  @Roles(UserRole.SUPER_ADMIN, UserRole.ADMIN)
  @ApiOperation({ summary: 'Update merchant' })
  async update(@Param('id') id: string, @Body() dto: UpdateMerchantDto) {
    return this.merchantService.update(id, dto);
  }

  @Put(':id/config')
  @Roles(UserRole.SUPER_ADMIN, UserRole.ADMIN)
  @ApiOperation({ summary: 'Update merchant config (fees, limits, etc.)' })
  async updateConfig(
    @Param('id') id: string,
    @Body() dto: UpdateMerchantConfigDto,
  ) {
    return this.merchantService.updateConfig(id, dto);
  }

  @Post(':id/reset-api-secret')
  @Roles(UserRole.SUPER_ADMIN, UserRole.ADMIN)
  @ApiOperation({ summary: 'Reset merchant API key and secret' })
  async resetApiSecret(@Param('id') id: string) {
    return this.merchantService.resetApiSecret(id);
  }

  @Post(':id/enable')
  @Roles(UserRole.SUPER_ADMIN, UserRole.ADMIN)
  @ApiOperation({ summary: 'Enable merchant' })
  async enable(@Param('id') id: string) {
    await this.merchantService.toggleStatus(id, MerchantStatus.ENABLED);
    return { message: 'Merchant enabled' };
  }

  @Post(':id/disable')
  @Roles(UserRole.SUPER_ADMIN, UserRole.ADMIN)
  @ApiOperation({ summary: 'Disable merchant' })
  async disable(@Param('id') id: string) {
    await this.merchantService.toggleStatus(id, MerchantStatus.DISABLED);
    return { message: 'Merchant disabled' };
  }

  @Post(':id/freeze')
  @Roles(UserRole.SUPER_ADMIN)
  @ApiOperation({ summary: 'Freeze merchant' })
  async freeze(@Param('id') id: string) {
    await this.merchantService.toggleStatus(id, MerchantStatus.FROZEN);
    return { message: 'Merchant frozen' };
  }
}
