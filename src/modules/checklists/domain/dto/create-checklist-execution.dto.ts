import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsArray,
  IsDateString,
  IsEnum,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsString,
  IsUUID,
  Max,
  Min,
  ValidateNested
}                                           from 'class-validator';
import { Type }                             from 'class-transformer';
import { ApprovalStatus }                   from '../enums/approval-status.enum';
import { TargetType }                       from '../enums/target-type.enum';

export class ChecklistAnswerDto {
  @ApiProperty({
    description: 'Question ID',
    example: '123e4567-e89b-12d3-a456-426614174000'
  })
  @IsUUID()
  @IsNotEmpty()
  questionId: string;

  @ApiProperty({
    description: 'Approval status for the question',
    enum: ApprovalStatus,
    example: ApprovalStatus.APPROVED
  })
  @IsEnum(ApprovalStatus)
  @IsNotEmpty()
  approvalStatus: ApprovalStatus;

  @ApiProperty({
    description: 'Numeric value for the approval (0 = not approved, 1 = approved, 0.5 = intermediate)',
    example: 1.0,
    minimum: 0,
    maximum: 1
  })
  @IsNumber({maxDecimalPlaces: 2})
  @Min(0)
  @Max(1)
  @IsNotEmpty()
  approvalValue: number;

  @ApiPropertyOptional({
    description: 'Evidence file path or URL',
    example: '/files/evidence/inspection-photo.jpg'
  })
  @IsString()
  @IsOptional()
  evidenceFile?: string;

  @ApiPropertyOptional({
    description: 'Additional comments for the answer',
    example: 'All safety checks passed successfully'
  })
  @IsString()
  @IsOptional()
  comment?: string;
}

export class CreateChecklistExecutionDto {
  @ApiPropertyOptional({
    description: 'Template ID (required if groupId is not provided)',
    example: '123e4567-e89b-12d3-a456-426614174000'
  })
  @IsUUID()
  @IsOptional()
  templateId?: string;

  @ApiPropertyOptional({
    description: 'Group ID (required if templateId is not provided)',
    example: '123e4567-e89b-12d3-a456-426614174000'
  })
  @IsUUID()
  @IsOptional()
  groupId?: string;

  @ApiProperty({
    description: 'Executor user ID',
    example: '123e4567-e89b-12d3-a456-426614174000'
  })
  @IsUUID()
  @IsNotEmpty()
  @IsOptional()
  executorUserId: string;

  @ApiProperty({
    description: 'Type of target being evaluated',
    enum: TargetType,
    example: TargetType.VEHICLE
  })
  @IsEnum(TargetType)
  @IsNotEmpty()
  targetType: TargetType;

  @ApiProperty({
    description: 'ID of the target being evaluated (user, vehicle, warehouse, etc.)',
    example: '123e4567-e89b-12d3-a456-426614174000'
  })
  @IsUUID()
  @IsNotEmpty()
  targetId: string;

  @ApiProperty({
    description: 'Execution timestamp',
    example: '2025-07-17T23:30:00Z'
  })
  @IsDateString()
  @IsNotEmpty()
  executionTimestamp: string;

  @ApiProperty({
    description: 'Array of answers to checklist questions',
    type: [ ChecklistAnswerDto ]
  })
  @IsArray()
  @ValidateNested({each: true})
  @Type(() => ChecklistAnswerDto)
  answers: ChecklistAnswerDto[];

  @ApiPropertyOptional({
    description: 'Additional notes for the execution',
    example: 'Inspection completed during routine maintenance'
  })
  @IsString()
  @IsOptional()
  notes?: string;
}
