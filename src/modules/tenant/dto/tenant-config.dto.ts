import { IsBoolean, IsEnum, IsObject, IsOptional, IsString } from 'class-validator';
import { ApiProperty, ApiPropertyOptional }                  from '@nestjs/swagger';

/**
 * DTO for updating tenant configuration settings.
 */
export class UpdateTenantConfigDto {
  @ApiProperty({
    description: 'The configuration key',
    example: 'gps.sync',
  })
  @IsString()
  key: string;

  @ApiProperty({
    description: 'The configuration value in JSON format',
    example: {cron: '0 */15 * * * *', timezone: 'UTC', isEnabled: true},
  })
  @IsObject()
  value: Record<string, any>;

  @ApiPropertyOptional({
    description: 'The configuration scope',
    example: 'tenant',
    enum: [ 'tenant', 'user' ],
    default: 'tenant',
  })
  @IsOptional()
  @IsEnum([ 'tenant', 'user' ])
  scope?: 'tenant' | 'user';

  @ApiPropertyOptional({
    description: 'User ID for user-scoped settings',
    example: 'user-uuid',
  })
  @IsOptional()
  @IsString()
  userId?: string;

  @ApiPropertyOptional({
    description: 'Description of the configuration setting',
    example: 'GPS sync configuration for this tenant',
  })
  @IsOptional()
  @IsString()
  description?: string;
}

/**
 * DTO for tenant configuration response.
 */
export class TenantConfigResponseDto {
  @ApiProperty({
    description: 'The configuration ID',
    example: 'config-uuid',
  })
  id: string;

  @ApiProperty({
    description: 'The tenant ID',
    example: 'tenant-uuid',
  })
  tenantId: string;

  @ApiProperty({
    description: 'The configuration key',
    example: 'gps.sync',
  })
  key: string;

  @ApiProperty({
    description: 'The configuration value',
    example: {cron: '0 */15 * * * *', timezone: 'UTC', isEnabled: true},
  })
  value: Record<string, any>;

  @ApiProperty({
    description: 'The configuration scope',
    example: 'tenant',
  })
  scope: 'tenant' | 'user';

  @ApiProperty({
    description: 'User ID for user-scoped settings',
    example: 'user-uuid',
    nullable: true,
  })
  userId: string | null;

  @ApiProperty({
    description: 'Configuration description',
    example: 'GPS sync configuration for this tenant',
    nullable: true,
  })
  description: string | null;

  @ApiProperty({
    description: 'When the configuration was created',
    example: '2025-01-15T12:00:00Z',
  })
  createdAt: Date;

  @ApiProperty({
    description: 'When the configuration was last updated',
    example: '2025-01-15T12:00:00Z',
  })
  updatedAt: Date;
}

/**
 * DTO for bulk configuration update.
 */
export class BulkConfigUpdateDto {
  @ApiProperty({
    description: 'Array of configuration updates',
    type: [ UpdateTenantConfigDto ],
  })
  configurations: UpdateTenantConfigDto[];
}

/**
 * DTO for cron configuration specifically.
 */
export class CronConfigDto {
  @ApiProperty({
    description: 'Cron expression',
    example: '0 */15 * * * *',
  })
  @IsString()
  cron: string;

  @ApiProperty({
    description: 'Timezone for the cron job',
    example: 'America/New_York',
  })
  @IsString()
  timezone: string;

  @ApiProperty({
    description: 'Whether the cron job is enabled',
    example: true,
  })
  @IsBoolean()
  isEnabled: boolean;
}

/**
 * DTO for GPS provider configuration.
 */
export class GpsProviderConfigDto {
  @ApiProperty({
    description: 'GPS provider name',
    example: 'providerA',
  })
  @IsString()
  provider: string;

  @ApiProperty({
    description: 'Base URL for the GPS provider API',
    example: 'https://api.gps-provider.com',
  })
  @IsString()
  baseUrl: string;

  @ApiProperty({
    description: 'Secret reference for API credentials',
    example: 'secret:gps:tenant-123',
  })
  @IsString()
  apiKeySecretRef: string;

  @ApiProperty({
    description: 'Whether the GPS provider is enabled',
    example: true,
  })
  @IsBoolean()
  isEnabled: boolean;
}
