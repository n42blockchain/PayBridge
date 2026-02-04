import {
  IsString,
  IsEnum,
  IsOptional,
  MinLength,
  MaxLength,
  IsInt,
  Min,
  Max,
  IsArray,
  IsDecimal,
  IsUrl,
  Matches,
  IsIP,
} from 'class-validator';
import { Type } from 'class-transformer';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  MerchantType,
  MerchantStatus,
  ChainNetwork,
  FeeChargeMode,
} from '@paybridge/shared-types';

// Ethereum address regex (checksum-agnostic)
const ETH_ADDRESS_REGEX = /^0x[a-fA-F0-9]{40}$/;

export class CreateMerchantDto {
  @ApiProperty({ example: 'Acme Corporation' })
  @IsString()
  @MinLength(2)
  @MaxLength(100)
  name: string;

  @ApiPropertyOptional({ enum: MerchantType, default: MerchantType.NORMAL })
  @IsOptional()
  @IsEnum(MerchantType)
  type?: MerchantType;

  @ApiPropertyOptional({ description: 'Self custody wallet address (EVM format)' })
  @IsOptional()
  @IsString()
  @Matches(ETH_ADDRESS_REGEX, { message: 'Invalid EVM wallet address format' })
  selfCustodyAddress?: string;

  @ApiPropertyOptional({ description: 'USDT settlement receiving address (EVM format)' })
  @IsOptional()
  @IsString()
  @Matches(ETH_ADDRESS_REGEX, { message: 'Invalid EVM wallet address format' })
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
  @MaxLength(100)
  name?: string;

  @ApiPropertyOptional({ enum: MerchantStatus })
  @IsOptional()
  @IsEnum(MerchantStatus)
  status?: MerchantStatus;

  @ApiPropertyOptional({ description: 'Self custody wallet address (EVM format)' })
  @IsOptional()
  @IsString()
  @Matches(ETH_ADDRESS_REGEX, { message: 'Invalid EVM wallet address format' })
  selfCustodyAddress?: string;

  @ApiPropertyOptional({ description: 'USDT settlement receiving address (EVM format)' })
  @IsOptional()
  @IsString()
  @Matches(ETH_ADDRESS_REGEX, { message: 'Invalid EVM wallet address format' })
  settlementAddress?: string;

  @ApiPropertyOptional({ enum: ChainNetwork })
  @IsOptional()
  @IsEnum(ChainNetwork)
  settlementChain?: ChainNetwork;

  @ApiPropertyOptional()
  @IsOptional()
  @IsUrl({}, { message: 'Invalid callback URL format' })
  @MaxLength(500)
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
