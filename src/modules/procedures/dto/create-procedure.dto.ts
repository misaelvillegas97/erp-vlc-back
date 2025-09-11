import { IsArray, IsBoolean, IsEnum, IsOptional, IsString, IsUUID, MaxLength, MinLength } from 'class-validator';
import { Transform, Type }                                                                from 'class-transformer';
import { ApiProperty, ApiPropertyOptional }                                               from '@nestjs/swagger';
import { LegalReferenceCategory, ProcedureCategory, ProcedurePriority }                   from '../domain/enums';
import { FileDto }                                                                        from '@modules/files/dto/file.dto';
import { RoleEnum }                                                                       from '@modules/roles/roles.enum';

/**
 * DTO for creating a new procedure
 */
export class CreateProcedureDto {
  @ApiProperty({
    description: 'Unique code for the procedure (e.g., PROC-001)',
    example: 'PROC-001',
    maxLength: 50
  })
  @IsString()
  @MinLength(3, {message: 'El código debe tener al menos 3 caracteres'})
  @MaxLength(50, {message: 'El código no puede exceder 50 caracteres'})
  @Transform(({value}) => value?.trim()?.toUpperCase())
  code: string;

  @ApiProperty({
    description: 'Title of the procedure',
    example: 'Procedimiento de Seguridad en el Trabajo',
    maxLength: 500
  })
  @IsString()
  @MinLength(10, {message: 'El título debe tener al menos 10 caracteres'})
  @MaxLength(500, {message: 'El título no puede exceder 500 caracteres'})
  @Transform(({value}) => value?.trim())
  title: string;

  @ApiPropertyOptional({
    description: 'Brief description or purpose of the procedure',
    example: 'Procedimiento para garantizar la seguridad de los trabajadores...'
  })
  @IsOptional()
  @IsString()
  @MaxLength(2000, {message: 'La descripción no puede exceder 2000 caracteres'})
  @Transform(({value}) => value?.trim())
  description?: string;

  @ApiPropertyOptional({
    description: 'Priority level for this procedure',
    enum: ProcedurePriority,
    example: ProcedurePriority.MEDIUM
  })
  @IsOptional()
  @IsEnum(ProcedurePriority, {
    message: 'La prioridad debe ser una de: LOW, MEDIUM, HIGH, CRITICAL'
  })
  priority?: ProcedurePriority;

  @ApiProperty({
    description: 'Category of the procedure',
    enum: ProcedureCategory,
    example: ProcedureCategory.HEALTH_SAFETY
  })
  @IsEnum(ProcedureCategory)
  category: ProcedureCategory;

  @ApiPropertyOptional({
    description: 'Department or area this procedure belongs to',
    example: 'Seguridad y Prevención de Riesgos',
    maxLength: 200
  })
  @IsOptional()
  @IsString()
  @MaxLength(200, {message: 'El departamento no puede exceder 200 caracteres'})
  @Transform(({value}) => value?.trim())
  department?: string;

  @ApiPropertyOptional({
    description: 'Primary legal reference categories',
    enum: LegalReferenceCategory,
    isArray: true,
    example: [ LegalReferenceCategory.HEALTH_SAFETY, LegalReferenceCategory.RISK_PREVENTION ]
  })
  @IsOptional()
  @IsArray()
  @IsEnum(LegalReferenceCategory, {
    each: true,
    message: 'Cada categoría legal debe ser válida'
  })
  legalCategories?: LegalReferenceCategory[];

  @ApiPropertyOptional({
    description: 'Whether this procedure affects internal regulation (requires 30-day notice)',
    example: false
  })
  @IsOptional()
  @IsBoolean()
  affectsInternalRegulation?: boolean;

  @ApiPropertyOptional({
    description: 'Whether this procedure requires quiz for acknowledgment',
    example: false
  })
  @IsOptional()
  @IsBoolean()
  requiresQuiz?: boolean;

  @ApiPropertyOptional({
    description: 'Tags for categorization and search',
    example: [ 'seguridad', 'prevencion', 'riesgos' ],
    isArray: true
  })
  @IsOptional()
  @IsArray()
  @IsString({each: true})
  @Transform(({value}) => value?.map((tag: string) => tag?.trim()?.toLowerCase()).filter(Boolean))
  tags?: string[];

  @ApiPropertyOptional({
    description: 'Date when this procedure expires or needs review (ISO 8601)',
    example: '2025-12-31T23:59:59.000Z'
  })
  @IsOptional()
  @Transform(({value}) => {
    // Si el valor es una cadena vacía, null, undefined, o solo espacios en blanco, retornar undefined
    if (!value || (typeof value === 'string' && value.trim() === '')) {
      return undefined;
    }
    return value;
  })
  @Type(() => Date)
  expiresAt?: Date;

  @ApiPropertyOptional({
    description: 'Roles that this procedure applies to',
    example: [ 'drivers', 'supervisor' ],
    isArray: true
  })
  @IsOptional()
  @IsArray()
  @IsEnum(RoleEnum, {each: true})
  roles?: RoleEnum[];

  @ApiPropertyOptional({
    description: 'Content file reference with metadata',
    example: {id: '550e8400-e29b-41d4-a716-446655440000', path: 'path/to/the/file'}
  })
  @IsOptional()
  content?: FileDto;

  authorId: string;
}

/**
 * DTO for creating a new version of an existing procedure
 */
export class CreateProcedureVersionDto {
  @ApiProperty({
    description: 'Title of this specific version',
    example: 'Procedimiento de Seguridad en el Trabajo v2.0',
    maxLength: 500
  })
  @IsString()
  @MinLength(10, {message: 'El título debe tener al menos 10 caracteres'})
  @MaxLength(500, {message: 'El título no puede exceder 500 caracteres'})
  @Transform(({value}) => value?.trim())
  title: string;

  // Content fields removed - now handled through file upload endpoints
  // Content will be uploaded separately after version creation

  @ApiProperty({
    description: 'User who is creating this version',
    example: '550e8400-e29b-41d4-a716-446655440000'
  })
  @IsUUID(4, {message: 'El ID del autor debe ser un UUID válido'})
  authorId: string;

  // changeSummary removed - now handled through file upload endpoints

  @ApiPropertyOptional({
    description: 'Date when this version becomes effective (ISO 8601)',
    example: '2025-01-01T00:00:00.000Z'
  })
  @IsOptional()
  @Transform(({value}) => {
    // Si el valor es una cadena vacía, null, undefined, o solo espacios en blanco, retornar undefined
    if (!value || (typeof value === 'string' && value.trim() === '')) {
      return undefined;
    }
    return value;
  })
  @Type(() => Date)
  effectiveDate?: Date;
}

/**
 * DTO for query parameters when searching procedures
 */
export class QueryProceduresDto {
  @ApiPropertyOptional({
    description: 'Search term for title, description, or tags',
    example: 'seguridad'
  })
  @IsOptional()
  @IsString()
  @Transform(({value}) => value?.trim())
  search?: string;

  @ApiPropertyOptional({
    description: 'Filter by department',
    example: 'Seguridad y Prevención de Riesgos'
  })
  @IsOptional()
  @IsString()
  @Transform(({value}) => value?.trim())
  department?: string;

  @ApiPropertyOptional({
    description: 'Filter by priority level',
    enum: ProcedurePriority
  })
  @IsOptional()
  @IsEnum(ProcedurePriority)
  priority?: ProcedurePriority;

  @ApiPropertyOptional({
    description: 'Filter by legal categories',
    enum: LegalReferenceCategory,
    isArray: true
  })
  @IsOptional()
  @IsArray()
  @IsEnum(LegalReferenceCategory, {each: true})
  legalCategories?: LegalReferenceCategory[];

  @ApiPropertyOptional({
    description: 'Filter by tags',
    example: [ 'seguridad', 'prevencion' ],
    isArray: true
  })
  @IsOptional()
  @IsArray()
  @IsString({each: true})
  @Transform(({value}) => value?.map((tag: string) => tag?.trim()?.toLowerCase()).filter(Boolean))
  tags?: string[];

  @ApiPropertyOptional({
    description: 'Page number for pagination',
    example: 1,
    minimum: 1
  })
  @IsOptional()
  @Type(() => Number)
  page?: number = 1;

  @ApiPropertyOptional({
    description: 'Number of items per page',
    example: 20,
    minimum: 1,
    maximum: 100
  })
  @IsOptional()
  @Type(() => Number)
  limit?: number = 20;

  @ApiPropertyOptional({
    description: 'Sort field',
    example: 'createdAt'
  })
  @IsOptional()
  @IsString()
  sortBy?: string = 'createdAt';

  @ApiPropertyOptional({
    description: 'Sort order',
    enum: [ 'ASC', 'DESC' ],
    example: 'DESC'
  })
  @IsOptional()
  @IsEnum([ 'ASC', 'DESC' ])
  sortOrder?: 'ASC' | 'DESC' = 'DESC';
}

