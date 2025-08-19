import { ApiProperty } from '@nestjs/swagger';

/**
 * DTO for tenant response data.
 * Used to standardize tenant information returned by the API.
 */
export class TenantResponseDto {
  @ApiProperty({
    description: 'The unique identifier of the tenant',
    example: 'uuid-string',
  })
  id: string;

  @ApiProperty({
    description: 'The name of the tenant company',
    example: 'Acme Corporation',
  })
  name: string;

  @ApiProperty({
    description: 'The subdomain for the tenant',
    example: 'acme-corp',
  })
  subdomain: string;

  @ApiProperty({
    description: 'The timezone for the tenant',
    example: 'America/New_York',
  })
  timezone: string;

  @ApiProperty({
    description: 'Whether the tenant is enabled',
    example: true,
  })
  isEnabled: boolean;

  @ApiProperty({
    description: 'The plan type for the tenant',
    example: 'premium',
    nullable: true,
  })
  planType: string | null;

  @ApiProperty({
    description: 'The region where the tenant operates',
    example: 'us-east-1',
    nullable: true,
  })
  region: string | null;

  @ApiProperty({
    description: 'Additional settings for the tenant',
    example: {theme: 'dark', language: 'en'},
    nullable: true,
  })
  settings: Record<string, any> | null;

  @ApiProperty({
    description: 'When the tenant was created',
    example: '2025-01-15T12:00:00Z',
  })
  createdAt: Date;

  @ApiProperty({
    description: 'When the tenant was last updated',
    example: '2025-01-15T12:00:00Z',
  })
  updatedAt: Date;
}

/**
 * DTO for paginated tenant list response.
 */
export class TenantListResponseDto {
  @ApiProperty({
    description: 'Array of tenants',
    type: [ TenantResponseDto ],
  })
  tenants: TenantResponseDto[];

  @ApiProperty({
    description: 'Total number of tenants',
    example: 50,
  })
  total: number;

  @ApiProperty({
    description: 'Current page number',
    example: 1,
  })
  page: number;

  @ApiProperty({
    description: 'Number of items per page',
    example: 10,
  })
  limit: number;

  @ApiProperty({
    description: 'Total number of pages',
    example: 5,
  })
  totalPages: number;
}
