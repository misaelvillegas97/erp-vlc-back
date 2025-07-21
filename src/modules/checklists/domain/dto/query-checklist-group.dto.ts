import { ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsBoolean,
  IsNumber,
  IsOptional,
  IsString,
  IsUUID,
  Min,
  Max
}                              from 'class-validator';
import { Type, Transform }     from 'class-transformer';

export class QueryChecklistGroupDto {
  @ApiPropertyOptional({
    description: 'Search by group name (partial match)',
    example: 'Safety'
  })
  @IsString()
  @IsOptional()
  name?: string;

  @ApiPropertyOptional({
    description: 'Filter by active status',
    example: true
  })
  @IsBoolean()
  @IsOptional()
  @Transform(({value}) => {
    if (value === 'true') return true;
    if (value === 'false') return false;
    return value;
  })
  isActive?: boolean;

  @ApiPropertyOptional({
    description: 'Filter by vehicle type',
    example: 'TRUCK'
  })
  @IsString()
  @IsOptional()
  vehicleType?: string;

  @ApiPropertyOptional({
    description: 'Filter by user role',
    example: 'driver'
  })
  @IsString()
  @IsOptional()
  userRole?: string;

  @ApiPropertyOptional({
    description: 'Filter by template ID (groups containing this template)',
    example: '123e4567-e89b-12d3-a456-426614174000'
  })
  @IsUUID(4)
  @IsOptional()
  templateId?: string;

  @ApiPropertyOptional({
    description: 'Minimum performance threshold',
    example: 70.0,
    minimum: 0,
    maximum: 100
  })
  @IsNumber({maxDecimalPlaces: 2})
  @Min(0)
  @Max(100)
  @IsOptional()
  @Type(() => Number)
  minPerformanceThreshold?: number;

  @ApiPropertyOptional({
    description: 'Maximum performance threshold',
    example: 90.0,
    minimum: 0,
    maximum: 100
  })
  @IsNumber({maxDecimalPlaces: 2})
  @Min(0)
  @Max(100)
  @IsOptional()
  @Type(() => Number)
  maxPerformanceThreshold?: number;

  @ApiPropertyOptional({
    description: 'Page number for pagination',
    example: 1,
    minimum: 1,
    default: 1
  })
  @IsNumber()
  @Min(1)
  @IsOptional()
  @Type(() => Number)
  page?: number;

  @ApiPropertyOptional({
    description: 'Number of items per page',
    example: 10,
    minimum: 1,
    maximum: 100,
    default: 10
  })
  @IsNumber()
  @Min(1)
  @Max(100)
  @IsOptional()
  @Type(() => Number)
  limit?: number;

  @ApiPropertyOptional({
    description: 'Sort field',
    example: 'name',
    enum: [ 'name', 'createdAt', 'updatedAt', 'performanceThreshold' ]
  })
  @IsString()
  @IsOptional()
  sortBy?: 'name' | 'createdAt' | 'updatedAt' | 'performanceThreshold';

  @ApiPropertyOptional({
    description: 'Sort order',
    example: 'ASC',
    enum: [ 'ASC', 'DESC' ]
  })
  @IsString()
  @IsOptional()
  sortOrder?: 'ASC' | 'DESC';

  @ApiPropertyOptional({
    description: 'Include templates in response',
    example: true,
    default: false
  })
  @IsBoolean()
  @IsOptional()
  @Transform(({value}) => {
    if (value === 'true') return true;
    if (value === 'false') return false;
    return value;
  })
  includeTemplates?: boolean;

  @ApiPropertyOptional({
    description: 'Include categories in response',
    example: true,
    default: false
  })
  @IsBoolean()
  @IsOptional()
  @Transform(({value}) => {
    if (value === 'true') return true;
    if (value === 'false') return false;
    return value;
  })
  includeCategories?: boolean;

  @ApiPropertyOptional({
    description: 'Include execution statistics',
    example: true,
    default: false
  })
  @IsBoolean()
  @IsOptional()
  @Transform(({value}) => {
    if (value === 'true') return true;
    if (value === 'false') return false;
    return value;
  })
  includeStats?: boolean;
}
