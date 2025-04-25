import { ApiProperty, ApiPropertyOptional }                                                 from '@nestjs/swagger';
import { IsEmail, IsNotEmpty, IsOptional, IsString, MinLength, ValidateIf, ValidateNested } from 'class-validator';
import { Transform, Type }                                                                  from 'class-transformer';
import { lowerCaseTransformer }                                                             from '@shared/utils/transformers/lower-case.transformer';
import { RoleDto }                                                                          from '@modules/roles/dto/role.dto';
import { DriverLicenseDto }                                                                 from '@modules/users/dto/driver-license.dto';
import { RoleEnum }                                                                         from '@modules/roles/roles.enum';

export class AuthRegisterLoginDto {
  @ApiProperty({example: 'test1@example.com', type: String})
  @Transform(lowerCaseTransformer)
  @IsEmail()
  email: string;

  @ApiProperty()
  @MinLength(6)
  password: string;

  @ApiProperty({example: 'John'})
  @IsNotEmpty()
  firstName: string;

  @ApiProperty({example: 'Doe'})
  @IsNotEmpty()
  lastName: string;

  @ApiPropertyOptional({type: RoleDto})
  @IsOptional()
  @ValidateNested()
  @Type(() => RoleDto)
  role?: RoleDto | null;

  @ApiPropertyOptional({description: 'Número de teléfono'})
  @IsOptional()
  @IsString()
  phoneNumber?: string;

  @ApiPropertyOptional({description: 'Documento de identidad (obligatorio para conductores)'})
  @IsString()
  @ValidateIf((o) => o.role?.id === RoleEnum.driver)
  @IsNotEmpty({message: 'El documento de identidad es obligatorio para conductores'})
  documentId?: string;

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
  @ValidateIf((o) => o.role?.id === RoleEnum.driver)
  @ValidateNested()
  @Type(() => DriverLicenseDto)
  @IsNotEmpty({message: 'La información de licencia es obligatoria para conductores'})
  driverLicense?: DriverLicenseDto;
}
