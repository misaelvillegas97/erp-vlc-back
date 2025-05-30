import { ApiProperty }                            from '@nestjs/swagger';
import { IsEnum, IsNumber, IsOptional, IsString } from 'class-validator';
import { DriverLicenseType }                      from '@modules/users/domain/entities/driver-license.entity';
import { Transform }                              from 'class-transformer';

export class QueryDriverDto {
  @ApiProperty({required: false, description: 'Búsqueda por nombre, apellido o documento'})
  @IsOptional()
  @IsString()
  search?: string;

  @ApiProperty({required: false, description: 'Filtrar por número de documento'})
  @IsOptional()
  @IsString()
  documentId?: string;

  @ApiProperty({required: false, description: 'Filtrar por número de licencia'})
  @IsOptional()
  @IsString()
  licenseNumber?: string;

  @ApiProperty({required: false, enum: DriverLicenseType, description: 'Filtrar por tipo de licencia'})
  @IsOptional()
  @IsEnum(DriverLicenseType)
  licenseType?: DriverLicenseType;

  @ApiProperty({required: false, default: true, description: 'Mostrar solo conductores con licencia válida'})
  @IsOptional()
  onlyValid?: boolean = false;

  @ApiProperty({required: false, default: 1, description: 'Número de página para paginación'})
  @Transform(({value}) => (value ? Number(value) : 1))
  @IsNumber()
  @IsOptional()
  page?: number = 1;

  @ApiProperty({required: false, default: 10, description: 'Cantidad de registros por página'})
  @Transform(({value}) => (value ? Number(value) : 10))
  @IsNumber()
  @IsOptional()
  limit?: number = 10;
}
