import { ApiProperty, ApiPropertyOptional }                                         from '@nestjs/swagger';
import { IsArray, IsNotEmpty, IsNumber, IsOptional, IsString, Min, ValidateNested } from 'class-validator';
import { Type }                                                                     from 'class-transformer';
import { CreateQuestionDto }                                                        from './create-question.dto';

export class CreateCategoryDto {
  @ApiProperty({
    description: 'Title of the category',
    example: 'Safety Checks'
  })
  @IsString()
  @IsNotEmpty()
  title: string;

  @ApiPropertyOptional({
    description: 'Description of the category',
    example: 'All safety-related inspection items'
  })
  @IsString()
  @IsOptional()
  description?: string;

  @ApiPropertyOptional({
    description: 'Sort order for displaying the category',
    example: 0,
    default: 0
  })
  @IsNumber()
  @Min(0)
  @IsOptional()
  sortOrder?: number;

  @ApiPropertyOptional({
    description: 'Questions within this category',
    type: [ CreateQuestionDto ]
  })
  @IsArray()
  @ValidateNested({each: true})
  @Type(() => CreateQuestionDto)
  @IsOptional()
  questions?: CreateQuestionDto[];
}
