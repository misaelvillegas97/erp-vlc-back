import { Transform, Type }                                                                  from 'class-transformer';
import { ApiProperty, ApiPropertyOptional }                                                 from '@nestjs/swagger';
import { IsEmail, IsNotEmpty, IsOptional, IsString, MinLength, ValidateIf, ValidateNested } from 'class-validator';
import { FileDto }                                                                          from '../../files/dto/file.dto';
import { RoleDto }                                                                          from '../../roles/dto/role.dto';
import { StatusDto }                                                                        from '../../statuses/dto/status.dto';
import { lowerCaseTransformer }                                                             from '@shared/utils/transformers/lower-case.transformer';
import { DriverLicenseDto }                                                                 from './driver-license.dto';

export class CreateUserDto {
  @ApiProperty({example: 'test1@example.com', type: String})
  @Transform(lowerCaseTransformer)
  @IsNotEmpty()
  @IsEmail()
  email: string | null;

  @ApiProperty()
  @MinLength(6)
  password?: string;

  provider?: string;

  socialId?: string | null;

  @ApiProperty({example: 'John', type: String})
  @IsNotEmpty()
  firstName: string | null;

  @ApiProperty({example: 'Doe', type: String})
  @IsNotEmpty()
  lastName: string | null;

  @ApiPropertyOptional({type: () => FileDto})
  @IsOptional()
  photo?: FileDto | null;

  @ApiPropertyOptional({type: RoleDto})
  @IsOptional()
  @Type(() => RoleDto)
  role?: RoleDto | null;

  @ApiPropertyOptional({type: StatusDto})
  @IsOptional()
  @Type(() => StatusDto)
  status?: StatusDto;

  // Campos específicos para conductores
  @ApiPropertyOptional({description: 'Documento de identidad (obligatorio para conductores)'})
  @IsOptional()
  @IsString()
  @ValidateIf((o) => o.isDriver === true)
  @IsNotEmpty({message: 'El documento de identidad es obligatorio para conductores'})
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

  // Información de licencia de conducir (obligatoria para conductores)
  @ApiPropertyOptional({type: DriverLicenseDto, description: 'Información de licencia de conducir (obligatoria para conductores)'})
  @IsOptional()
  @ValidateIf((o) => o.isDriver === true)
  @ValidateNested()
  @Type(() => DriverLicenseDto)
  @IsNotEmpty({message: 'La información de licencia es obligatoria para conductores'})
  driverLicense?: DriverLicenseDto;

  // Campo auxiliar para validación (no se persiste)
  @ApiPropertyOptional({description: 'Indica si el usuario es un conductor'})
  @IsOptional()
  isDriver?: boolean;

  hash?: string | null;
}
