import { ApiPropertyOptional }                      from '@nestjs/swagger';
import { IsDateString, IsEnum, IsOptional, IsUUID } from 'class-validator';
import { ExecutionStatus }                          from '../enums/execution-status.enum';

export class QueryChecklistExecutionDto {
  @ApiPropertyOptional({
    description: 'Template ID to filter by',
    example: '123e4567-e89b-12d3-a456-426614174000'
  })
  @IsUUID()
  @IsOptional()
  templateId?: string;

  @ApiPropertyOptional({
    description: 'Group ID to filter by',
    example: '123e4567-e89b-12d3-a456-426614174000'
  })
  @IsUUID()
  @IsOptional()
  groupId?: string;

  @ApiPropertyOptional({
    description: 'Executor user ID to filter by',
    example: '123e4567-e89b-12d3-a456-426614174000'
  })
  @IsUUID()
  @IsOptional()
  executorUserId?: string;

  @ApiPropertyOptional({
    description: 'Target vehicle ID to filter by',
    example: '123e4567-e89b-12d3-a456-426614174000'
  })
  @IsUUID()
  @IsOptional()
  targetVehicleId?: string;

  @ApiPropertyOptional({
    description: 'Execution status to filter by',
    enum: ExecutionStatus,
    example: ExecutionStatus.COMPLETED
  })
  @IsEnum(ExecutionStatus)
  @IsOptional()
  status?: ExecutionStatus;

  @ApiPropertyOptional({
    description: 'Start date for execution timestamp filter',
    example: '2025-07-01T00:00:00Z'
  })
  @IsDateString()
  @IsOptional()
  startDate?: string;

  @ApiPropertyOptional({
    description: 'End date for execution timestamp filter',
    example: '2025-07-31T23:59:59Z'
  })
  @IsDateString()
  @IsOptional()
  endDate?: string;

  @ApiPropertyOptional({
    description: 'Page number for pagination',
    example: 1,
    default: 1
  })
  @IsOptional()
  page?: number;

  @ApiPropertyOptional({
    description: 'Number of items per page',
    example: 10,
    default: 10
  })
  @IsOptional()
  limit?: number;
}
