import { ApiProperty, ApiPropertyOptional }                                                                 from '@nestjs/swagger';
import { IsArray, IsBoolean, IsEnum, IsNotEmpty, IsNumber, IsOptional, IsString, Max, Min, ValidateNested } from 'class-validator';
import { Type }                                                                                             from 'class-transformer';
import { ChecklistType }                                                                                    from '../enums/checklist-type.enum';
import { TargetType }                                                                                       from '../enums/target-type.enum';
import { CreateCategoryDto }                                                                                from './create-category.dto';
import { RoleEnum }                                                                                         from '@modules/roles/roles.enum';

export class CreateChecklistTemplateDto {
  @ApiProperty({
    description: 'Type of checklist',
    enum: ChecklistType,
    example: ChecklistType.INSPECTION
  })
  @IsEnum(ChecklistType)
  @IsNotEmpty()
  type: ChecklistType;

  @ApiProperty({
    description: 'Name of the checklist template',
    example: 'Vehicle Pre-Trip Inspection'
  })
  @IsString()
  @IsNotEmpty()
  name: string;

  @ApiPropertyOptional({
    description: 'Description of the checklist template',
    example: 'Comprehensive pre-trip inspection checklist for all vehicles'
  })
  @IsString()
  @IsOptional()
  description?: string;

  @ApiPropertyOptional({
    description: 'Version of the template',
    example: '1.0',
    default: '1.0'
  })
  @IsString()
  @IsOptional()
  version?: string;

  @ApiPropertyOptional({
    description: 'Target types this checklist applies to',
    enum: TargetType,
    isArray: true,
    example: [ TargetType.VEHICLE, TargetType.USER, TargetType.WAREHOUSE ]
  })
  @IsArray()
  @IsEnum(TargetType, {each: true})
  @IsOptional()
  targetTypes?: TargetType[];

  @ApiPropertyOptional({
    description: 'User roles that can execute this checklist',
    example: [ 1, 2, 3 ]
  })
  @IsArray()
  @IsEnum(RoleEnum, {each: true})
  @IsOptional()
  userRoles?: RoleEnum[];

  @ApiPropertyOptional({
    description: 'Whether the template is active',
    example: true,
    default: true
  })
  @IsBoolean()
  @IsOptional()
  isActive?: boolean;

  @ApiPropertyOptional({
    description: 'Performance threshold percentage for incident creation',
    example: 70.0,
    minimum: 0,
    maximum: 100,
    default: 70.0
  })
  @IsNumber({maxDecimalPlaces: 2})
  @Min(0)
  @Max(100)
  @IsOptional()
  performanceThreshold?: number;

  @ApiPropertyOptional({
    description: 'Categories within this template',
    type: [ CreateCategoryDto ],
    example: [
      {
        title: 'Safety Checks',
        description: 'All safety-related inspection items',
        sortOrder: 0,
        questions: [
          {
            title: 'Are all lights functioning?',
            description: 'Check headlights, taillights, indicators',
            weight: 1.0,
            required: true,
            hasIntermediateApproval: false,
            intermediateValue: 0.5,
            extraFields: {},
            sortOrder: 0,
            isActive: true
          }
        ]
      }
    ]
  })
  @IsArray()
  @ValidateNested({each: true})
  @Type(() => CreateCategoryDto)
  @IsOptional()
  categories?: CreateCategoryDto[];
}
