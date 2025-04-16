import { ApiProperty }                                       from '@nestjs/swagger';
import { IsEmail, IsEnum, IsNotEmpty, IsOptional, IsString } from 'class-validator';
import { DriverLicenseType }                                 from '../entities/driver.entity';

export class CreateDriverDto {
  @ApiProperty()
  @IsNotEmpty()
  @IsString()
  firstName: string;

  @ApiProperty()
  @IsNotEmpty()
  @IsString()
  lastName: string;

  @ApiProperty()
  @IsNotEmpty()
  @IsString()
  documentId: string;

  @ApiProperty()
  @IsNotEmpty()
  @IsString()
  licenseNumber: string;

  @ApiProperty({enum: DriverLicenseType})
  @IsEnum(DriverLicenseType)
  @IsNotEmpty()
  licenseType: DriverLicenseType;

  @ApiProperty()
  @IsNotEmpty()
  licenseValidFrom: Date;

  @ApiProperty()
  @IsNotEmpty()
  licenseValidTo: Date;

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
