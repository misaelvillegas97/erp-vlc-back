import { IsBoolean, IsEnum, IsObject, IsOptional, IsString, Length, Matches } from 'class-validator';
import { ApiProperty, ApiPropertyOptional }                                   from '@nestjs/swagger';

/**
 * DTO for creating a new tenant.
 * Validates input data and provides API documentation.
 */
export class CreateTenantDto {
  @ApiProperty({
    description: 'The name of the tenant company',
    example: 'Acme Corporation',
    minLength: 2,
    maxLength: 255,
  })
  @IsString()
  @Length(2, 255)
  name: string;

  @ApiProperty({
    description: 'The subdomain for the tenant (used for multi-tenant routing)',
    example: 'acme-corp',
    minLength: 2,
    maxLength: 100,
    pattern: '^[a-z0-9][a-z0-9-]*[a-z0-9]$',
  })
  @IsString()
  @Length(2, 100)
  @Matches(/^[a-z0-9][a-z0-9-]*[a-z0-9]$/, {
    message: 'Subdomain must contain only lowercase letters, numbers, and hyphens. It must start and end with a letter or number.',
  })
  subdomain: string;

  @ApiPropertyOptional({
    description: 'The timezone for the tenant',
    example: 'America/New_York',
    default: 'UTC',
  })
  @IsOptional()
  @IsString()
  timezone?: string;

  @ApiPropertyOptional({
    description: 'The plan type for the tenant',
    example: 'premium',
    enum: [ 'basic', 'premium', 'enterprise' ],
  })
  @IsOptional()
  @IsEnum([ 'basic', 'premium', 'enterprise' ])
  planType?: string;

  @ApiPropertyOptional({
    description: 'The region where the tenant operates',
    example: 'us-east-1',
  })
  @IsOptional()
  @IsString()
  region?: string;

  @ApiPropertyOptional({
    description: 'Additional settings for the tenant in JSON format',
    example: {theme: 'dark', language: 'en'},
  })
  @IsOptional()
  @IsObject()
  settings?: Record<string, any>;

  @ApiPropertyOptional({
    description: 'Whether the tenant is enabled',
    example: true,
    default: true,
  })
  @IsOptional()
  @IsBoolean()
  isEnabled?: boolean;
}
