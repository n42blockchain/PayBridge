import {
  IsString,
  IsEnum,
  IsOptional,
  MinLength,
  IsInt,
  Min,
  Max,
  IsArray,
  IsDecimal,
  IsUrl,
} from 'class-validator';
import { Type } from 'class-transformer';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  MerchantType,
  MerchantStatus,
  ChainNetwork,
  FeeChargeMode,
} from '@paybridge/shared-types';

export class CreateMerchantDto {
  @ApiProperty({ example: 'Acme Corporation' })
  @IsString()
  @MinLength(2)
  name: string;

  @ApiPropertyOptional({ enum: MerchantType, default: MerchantType.NORMAL })
  @IsOptional()
  @IsEnum(MerchantType)
  type?: MerchantType;

  @ApiPropertyOptional({ description: 'Self custody wallet address' })
  @IsOptional()
  @IsString()
  selfCustodyAddress?: string;

  @ApiPropertyOptional({ description: 'USDT settlement receiving address' })
  @IsOptional()
  @IsString()
  settlementAddress?: string;

  @ApiPropertyOptional({ enum: ChainNetwork })
  @IsOptional()
  @IsEnum(ChainNetwork)
  settlementChain?: ChainNetwork;

  @ApiPropertyOptional({ description: 'Agent merchant ID' })
  @IsOptional()
  @IsString()
  agentId?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsUrl()
  callbackUrl?: string;
}

export class UpdateMerchantDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MinLength(2)
  name?: string;

  @ApiPropertyOptional({ enum: MerchantStatus })
  @IsOptional()
  @IsEnum(MerchantStatus)
  status?: MerchantStatus;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  selfCustodyAddress?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  settlementAddress?: string;

  @ApiPropertyOptional({ enum: ChainNetwork })
  @IsOptional()
  @IsEnum(ChainNetwork)
  settlementChain?: ChainNetwork;

  @ApiPropertyOptional()
  @IsOptional()
  @IsUrl()
  callbackUrl?: string;
}

export class UpdateMerchantConfigDto {
  // Topup fees
  @ApiPropertyOptional({ example: '0.025' })
  @IsOptional()
  @IsDecimal()
  topupPercentageFee?: string;

  @ApiPropertyOptional({ example: '0' })
  @IsOptional()
  @IsDecimal()
  topupFixedFee?: string;

  @ApiPropertyOptional({ example: '1' })
  @IsOptional()
  @IsDecimal()
  topupMinimumFee?: string;

  @ApiPropertyOptional({ enum: FeeChargeMode })
  @IsOptional()
  @IsEnum(FeeChargeMode)
  topupFeeChargeMode?: FeeChargeMode;

  // Settlement fees
  @ApiPropertyOptional()
  @IsOptional()
  @IsDecimal()
  settlementPercentageFee?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsDecimal()
  settlementFixedFee?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsDecimal()
  settlementMinimumFee?: string;

  @ApiPropertyOptional({ enum: FeeChargeMode })
  @IsOptional()
  @IsEnum(FeeChargeMode)
  settlementFeeChargeMode?: FeeChargeMode;

  // Refund fees
  @ApiPropertyOptional()
  @IsOptional()
  @IsDecimal()
  refundPercentageFee?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsDecimal()
  refundFixedFee?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsDecimal()
  refundMinimumFee?: string;

  // Settlement limits
  @ApiPropertyOptional()
  @IsOptional()
  @IsDecimal()
  settlementMinAmount?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsDecimal()
  settlementMaxAmount?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  settlementCycleDays?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsDecimal()
  depositMinBalance?: string;

  // Gateway config
  @ApiPropertyOptional({ enum: ['RSA', 'HMAC-SHA256'] })
  @IsOptional()
  @IsString()
  encryptionAlgorithm?: string;

  @ApiPropertyOptional({ description: 'RSA public key (PEM format)' })
  @IsOptional()
  @IsString()
  publicKey?: string;

  @ApiPropertyOptional({ type: [String] })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  ipWhitelist?: string[];
}

export class MerchantListQueryDto {
  @ApiPropertyOptional({ enum: MerchantStatus })
  @IsOptional()
  @IsEnum(MerchantStatus)
  status?: MerchantStatus;

  @ApiPropertyOptional({ enum: MerchantType })
  @IsOptional()
  @IsEnum(MerchantType)
  type?: MerchantType;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  agentId?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  search?: string;

  @ApiPropertyOptional({ default: 1 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page?: number;

  @ApiPropertyOptional({ default: 20 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100)
  pageSize?: number;
}
