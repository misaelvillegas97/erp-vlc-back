import { ApiProperty }                                                  from '@nestjs/swagger';
import { IsEmail, IsEnum, IsISO8601, IsNotEmpty, IsOptional, IsString } from 'class-validator';
import { DriverLicenseType }                                            from '@modules/users/domain/entities/driver-license.entity';

export class UpdateDriverDto {
  @ApiProperty({required: false})
  @IsOptional()
  @IsString()
  firstName?: string;

  @ApiProperty({required: false})
  @IsOptional()
  @IsString()
  lastName?: string;

  @ApiProperty({required: false})
  @IsOptional()
  @IsString()
  documentId?: string;

  @ApiProperty({required: false})
  @IsOptional()
  @IsString()
  licenseNumber?: string;

  @ApiProperty({enum: DriverLicenseType, required: false})
  @IsEnum(DriverLicenseType)
  @IsOptional()
  licenseType?: DriverLicenseType;

  @ApiProperty({required: false})
  @IsOptional()
  @IsNotEmpty()
  @IsISO8601()
  licenseValidFrom?: string;

  @ApiProperty({required: false})
  @IsOptional()
  @IsNotEmpty()
  @IsISO8601()
  licenseValidTo?: string;

  @ApiProperty({required: false})
  @IsOptional()
  @IsString()
  phoneNumber?: string;

  @ApiProperty({required: false})
  @IsOptional()
  @IsEmail()
  email?: string;

  @ApiProperty({required: false})
  @IsOptional()
  @IsString()
  address?: string;

  @ApiProperty({required: false})
  @IsOptional()
  @IsString()
  emergencyContactName?: string;

  @ApiProperty({required: false})
  @IsOptional()
  @IsString()
  emergencyContactPhone?: string;

  @ApiProperty({required: false})
  @IsOptional()
  @IsString()
  notes?: string;

  @ApiProperty({required: false})
  @IsOptional()
  @IsString()
  photoId?: string;
}
