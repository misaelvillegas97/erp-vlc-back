import { ApiProperty }     from '@nestjs/swagger';
import { ApprovalStatus }  from '../enums/approval-status.enum';
import { ExecutionStatus } from '../enums/execution-status.enum';
import { TargetType }      from '../enums/target-type.enum';

export class ExecutionReportAnswerDto {
  @ApiProperty({
    description: 'Answer ID',
    example: '123e4567-e89b-12d3-a456-426614174000'
  })
  id: string;

  @ApiProperty({
    description: 'Question ID',
    example: '123e4567-e89b-12d3-a456-426614174000'
  })
  questionId: string;

  @ApiProperty({
    description: 'Approval status for the answer',
    enum: ApprovalStatus,
    example: ApprovalStatus.APPROVED
  })
  approvalStatus: ApprovalStatus;

  @ApiProperty({
    description: 'Numeric approval value (0-1)',
    example: 1.0
  })
  approvalValue: number;

  @ApiProperty({
    description: 'Evidence file path or URL',
    example: '/files/evidence/inspection-photo.jpg',
    nullable: true
  })
  evidenceFile?: string;

  @ApiProperty({
    description: 'Additional comments for the answer',
    example: 'All safety checks passed successfully',
    nullable: true
  })
  comment?: string;

  @ApiProperty({
    description: 'Calculated score for this answer',
    example: 2.5,
    nullable: true
  })
  answerScore?: number;

  @ApiProperty({
    description: 'Maximum possible score for this answer',
    example: 2.5,
    nullable: true
  })
  maxScore?: number;

  @ApiProperty({
    description: 'Whether the answer was skipped',
    example: false
  })
  isSkipped: boolean;

  @ApiProperty({
    description: 'When the answer was provided',
    example: '2025-08-04T10:30:00Z'
  })
  answeredAt: Date;
}

export class ExecutionReportQuestionDto {
  @ApiProperty({
    description: 'Question ID',
    example: '123e4567-e89b-12d3-a456-426614174000'
  })
  id: string;

  @ApiProperty({
    description: 'Question title',
    example: 'Are all lights functioning properly?'
  })
  title: string;

  @ApiProperty({
    description: 'Question description',
    example: 'Check headlights, taillights, and indicators',
    nullable: true
  })
  description?: string;

  @ApiProperty({
    description: 'Question weight for scoring',
    example: 1.0
  })
  weight: number;

  @ApiProperty({
    description: 'Whether the question is required',
    example: true
  })
  required: boolean;

  @ApiProperty({
    description: 'Whether intermediate approval is allowed',
    example: false
  })
  hasIntermediateApproval: boolean;

  @ApiProperty({
    description: 'Value for intermediate approval',
    example: 0.5
  })
  intermediateValue: number;

  @ApiProperty({
    description: 'Sort order within category',
    example: 0
  })
  sortOrder: number;

  @ApiProperty({
    description: 'Answer provided for this question',
    type: ExecutionReportAnswerDto,
    nullable: true
  })
  answer?: ExecutionReportAnswerDto;
}

export class ExecutionReportCategoryDto {
  @ApiProperty({
    description: 'Category ID',
    example: '123e4567-e89b-12d3-a456-426614174000'
  })
  id: string;

  @ApiProperty({
    description: 'Category title',
    example: 'Safety Checks'
  })
  title: string;

  @ApiProperty({
    description: 'Category description',
    example: 'All safety-related inspection items',
    nullable: true
  })
  description?: string;

  @ApiProperty({
    description: 'Sort order within template',
    example: 0
  })
  sortOrder: number;

  @ApiProperty({
    description: 'Category score percentage',
    example: 85.5,
    nullable: true
  })
  categoryScore?: number;

  @ApiProperty({
    description: 'Questions within this category',
    type: [ ExecutionReportQuestionDto ]
  })
  questions: ExecutionReportQuestionDto[];
}

export class ExecutionReportDto {
  @ApiProperty({
    description: 'Execution ID',
    example: '123e4567-e89b-12d3-a456-426614174000'
  })
  id: string;

  @ApiProperty({
    description: 'Template ID',
    example: '123e4567-e89b-12d3-a456-426614174000',
    nullable: true
  })
  templateId?: string;

  @ApiProperty({
    description: 'Template name',
    example: 'Vehicle Pre-Trip Inspection',
    nullable: true
  })
  templateName?: string;

  @ApiProperty({
    description: 'Group ID',
    example: '123e4567-e89b-12d3-a456-426614174000',
    nullable: true
  })
  groupId?: string;

  @ApiProperty({
    description: 'Group name',
    example: 'Fleet Compliance Group',
    nullable: true
  })
  groupName?: string;

  @ApiProperty({
    description: 'Executor user ID',
    example: '123e4567-e89b-12d3-a456-426614174000'
  })
  executorUserId: string;

  @ApiProperty({
    description: 'Executor user name',
    example: 'John Doe'
  })
  executorUserName: string;

  @ApiProperty({
    description: 'Target type being evaluated',
    enum: TargetType,
    example: TargetType.VEHICLE
  })
  targetType: TargetType;

  @ApiProperty({
    description: 'Target ID being evaluated',
    example: '123e4567-e89b-12d3-a456-426614174000'
  })
  targetId: string;

  @ApiProperty({
    description: 'Execution status',
    enum: ExecutionStatus,
    example: ExecutionStatus.COMPLETED
  })
  status: ExecutionStatus;

  @ApiProperty({
    description: 'When the execution was completed',
    example: '2025-08-04T11:00:00Z',
    nullable: true
  })
  completedAt?: Date;

  @ApiProperty({
    description: 'Total score achieved',
    example: 85.5,
    nullable: true
  })
  totalScore?: number;

  @ApiProperty({
    description: 'Maximum possible score',
    example: 100.0,
    nullable: true
  })
  maxPossibleScore?: number;

  @ApiProperty({
    description: 'Percentage score',
    example: 85.5,
    nullable: true
  })
  percentageScore?: number;

  @ApiProperty({
    description: 'Group score (for group executions)',
    example: 87.2,
    nullable: true
  })
  groupScore?: number;

  @ApiProperty({
    description: 'Additional notes',
    example: 'Inspection completed during routine maintenance',
    nullable: true
  })
  notes?: string;

  @ApiProperty({
    description: 'When the execution was created',
    example: '2025-08-04T10:00:00Z'
  })
  createdAt: Date;

  @ApiProperty({
    description: 'Categories with questions and answers',
    type: [ ExecutionReportCategoryDto ]
  })
  categories: ExecutionReportCategoryDto[];
}
