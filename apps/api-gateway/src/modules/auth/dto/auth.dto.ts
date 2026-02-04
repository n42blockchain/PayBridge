import {
  IsEmail,
  IsString,
  MinLength,
  MaxLength,
  IsOptional,
  Matches,
  Length,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class LoginDto {
  @ApiProperty({ example: 'admin@paybridge.io' })
  @IsEmail({}, { message: 'Invalid email format' })
  @MaxLength(255)
  email: string;

  @ApiProperty({ example: 'Password123!' })
  @IsString()
  @MinLength(8, { message: 'Password must be at least 8 characters' })
  @MaxLength(128, { message: 'Password must not exceed 128 characters' })
  password: string;

  @ApiPropertyOptional({ description: 'Two-factor authentication code' })
  @IsOptional()
  @IsString()
  @Length(6, 6, { message: '2FA code must be 6 digits' })
  twoFactorCode?: string;
}

export class RefreshTokenDto {
  @ApiProperty()
  @IsString()
  @MinLength(32)
  @MaxLength(128)
  refreshToken: string;
}

export class ChangePasswordDto {
  @ApiProperty()
  @IsString()
  @MinLength(8)
  @MaxLength(128)
  currentPassword: string;

  @ApiProperty({ description: 'Must contain uppercase, lowercase, number, and special character' })
  @IsString()
  @MinLength(8, { message: 'Password must be at least 8 characters' })
  @MaxLength(128, { message: 'Password must not exceed 128 characters' })
  @Matches(
    /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]/,
    { message: 'Password must contain uppercase, lowercase, number, and special character' },
  )
  newPassword: string;
}

export class Verify2FADto {
  @ApiProperty({ description: 'Six-digit TOTP code' })
  @IsString()
  @Length(6, 6, { message: 'Code must be exactly 6 digits' })
  @Matches(/^\d{6}$/, { message: 'Code must contain only digits' })
  code: string;
}
