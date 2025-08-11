import { IsNotEmpty, IsOptional, IsString, MaxLength } from 'class-validator';
import { ApiProperty, ApiPropertyOptional }            from '@nestjs/swagger';

/**
 * DTO for creating a new flow template
 */
export class CreateFlowTemplateDto {
  @ApiProperty({
    description: 'Name of the flow template',
    example: 'Production Quality Control',
    maxLength: 255
  })
  @IsString()
  @IsNotEmpty()
  @MaxLength(255)
  name: string;

  @ApiPropertyOptional({
    description: 'Description of the flow template',
    example: 'Quality control process for production line items'
  })
  @IsOptional()
  @IsString()
  description?: string;
}
