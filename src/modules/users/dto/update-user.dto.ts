import { ApiPropertyOptional, PartialType } from '@nestjs/swagger';

import { Transform, Type }                                          from 'class-transformer';
import { IsEmail, IsOptional, IsString, MinLength, ValidateNested } from 'class-validator';

import { lowerCaseTransformer } from '@shared/utils/transformers/lower-case.transformer';
import { FileDto }              from '../../files/dto/file.dto';
import { RoleDto }              from '../../roles/dto/role.dto';
import { StatusDto }            from '../../statuses/dto/status.dto';
import { CreateUserDto }        from './create-user.dto';
import { DriverLicenseDto }     from './driver-license.dto';

export class UpdateUserDto extends PartialType(CreateUserDto) {
  @ApiPropertyOptional({example: 'test1@example.com', type: String})
  @Transform(lowerCaseTransformer)
  @IsOptional()
  @IsEmail()
  email?: string | null;

  @ApiPropertyOptional()
  @IsOptional()
  @MinLength(6)
  password?: string;

  provider?: string;

  socialId?: string | null;

  @ApiPropertyOptional({example: 'John', type: String})
  @IsOptional()
  firstName?: string | null;

  @ApiPropertyOptional({example: 'Doe', type: String})
  @IsOptional()
  lastName?: string | null;

  @ApiPropertyOptional({type: () => FileDto})
  @IsOptional()
  photo?: FileDto | null;

  @ApiPropertyOptional({type: () => RoleDto})
  @IsOptional()
  @Type(() => RoleDto)
  role?: RoleDto | null;

  @ApiPropertyOptional({type: () => StatusDto})
  @IsOptional()
  @Type(() => StatusDto)
  status?: StatusDto;

  // Campos específicos para conductores
  @ApiPropertyOptional({description: 'Documento de identidad (obligatorio para conductores)'})
  @IsOptional()
  @IsString()
  documentId?: string;

  @ApiPropertyOptional({description: 'Número de teléfono'})
  @IsOptional()
  @IsString()
  phoneNumber?: string;

  @ApiPropertyOptional({description: 'Dirección'})
  @IsOptional()
  @IsString()
  address?: string;

  @ApiPropertyOptional({description: 'Nombre de contacto de emergencia (recomendado para conductores)'})
  @IsOptional()
  @IsString()
  emergencyContactName?: string;

  @ApiPropertyOptional({description: 'Teléfono de contacto de emergencia (recomendado para conductores)'})
  @IsOptional()
  @IsString()
  emergencyContactPhone?: string;

  @ApiPropertyOptional({description: 'Notas adicionales'})
  @IsOptional()
  @IsString()
  notes?: string;

  // Información de licencia de conducir (para usuarios con rol de conductor)
  @ApiPropertyOptional({type: Array<DriverLicenseDto>, description: 'Información de licencia de conducir (obligatoria para conductores)'})
  @IsOptional()
  @ValidateNested({each: true})
  @Type(() => Array<DriverLicenseDto>)
  driverLicense?: Array<DriverLicenseDto>;

  hash?: string | null;
}
