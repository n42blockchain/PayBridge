import { Controller, Get, Put, Body, Param, UseGuards, OnModuleInit } from '@nestjs/common';
import { ApiTags, ApiBearerAuth } from '@nestjs/swagger';
import { UserRole } from '@paybridge/shared-types';
import { SettingService } from './setting.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';

@ApiTags('Settings')
@ApiBearerAuth()
@Controller('v1/settings')
@UseGuards(JwtAuthGuard, RolesGuard)
export class SettingController implements OnModuleInit {
  constructor(private settingService: SettingService) {}

  async onModuleInit() {
    await this.settingService.initializeDefaults();
  }

  @Get()
  @Roles(UserRole.SUPER_ADMIN, UserRole.ADMIN)
  async findAll() {
    return this.settingService.findAll();
  }

  @Get(':key')
  @Roles(UserRole.SUPER_ADMIN, UserRole.ADMIN)
  async get(@Param('key') key: string) {
    return this.settingService.get(key);
  }

  @Put(':key')
  @Roles(UserRole.SUPER_ADMIN)
  async update(@Param('key') key: string, @Body() body: { value: unknown }) {
    return this.settingService.set(key, body.value);
  }
}
