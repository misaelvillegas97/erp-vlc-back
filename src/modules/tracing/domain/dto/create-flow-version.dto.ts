import { IsNotEmpty, IsNumber, IsOptional, IsString, Min } from 'class-validator';
import { ApiProperty, ApiPropertyOptional }                from '@nestjs/swagger';

/**
 * DTO for creating a new flow version
 */
export class CreateFlowVersionDto {
  @ApiProperty({
    description: 'ID of the template to create version for',
    example: 'template-123'
  })
  @IsString()
  @IsNotEmpty()
  templateId: string;

  @ApiPropertyOptional({
    description: 'Version number to clone from (if not provided, creates empty version)',
    example: 1,
    minimum: 1
  })
  @IsOptional()
  @IsNumber()
  @Min(1)
  fromVersion?: number;

  @ApiPropertyOptional({
    description: 'Notes about this version',
    example: 'v2 adds chemical treatment step'
  })
  @IsOptional()
  @IsString()
  notes?: string;
}
