import { IsBoolean, IsEmail, IsEnum, IsNotEmpty, IsNumber, IsOptional, IsString, Length, Matches } from 'class-validator';
import { SupplierTypeEnum }                                                                        from '@modules/supplier/domain/enums/supplier-type.enum';
import { SupplierTaxCategoryEnum }                                                                 from '@modules/supplier/domain/enums/supplier-tax-category.enum';

export class CreateSupplierDto {
  @IsNotEmpty()
  @IsString()
  @Matches(/^\d{1,8}-[\dkK]$/, {message: 'RUT debe tener formato válido (ej: 12345678-9)'})
  rut: string;

  @IsNotEmpty()
  @IsString()
  @Length(2, 100)
  businessName: string;

  @IsOptional()
  @IsString()
  @Length(2, 100)
  fantasyName?: string;

  @IsEnum(SupplierTypeEnum)
  type: SupplierTypeEnum;

  @IsOptional()
  @IsString()
  economicActivity?: string;

  @IsOptional()
  @IsString()
  address?: string;

  @IsOptional()
  @IsString()
  city?: string;

  @IsOptional()
  @IsString()
  phone?: string;

  @IsOptional()
  @IsEmail()
  email?: string;

  @IsOptional()
  @IsString()
  contactPerson?: string;

  @IsOptional()
  @IsString()
  contactPhone?: string;

  @IsOptional()
  @IsString()
  notes?: string;

  @IsOptional()
  tags?: string[];

  @IsOptional()
  @IsNumber()
  paymentTermDays?: number;
}

export class UpdateSupplierDto {
  @IsOptional()
  @IsString()
  @Length(2, 100)
  businessName?: string;

  @IsOptional()
  @IsString()
  @Length(2, 100)
  fantasyName?: string;

  @IsOptional()
  @IsEnum(SupplierTypeEnum)
  type?: SupplierTypeEnum;

  @IsOptional()
  @IsString()
  economicActivity?: string;

  @IsOptional()
  @IsString()
  address?: string;

  @IsOptional()
  @IsString()
  city?: string;

  @IsOptional()
  @IsString()
  phone?: string;

  @IsOptional()
  @IsEmail()
  email?: string;

  @IsOptional()
  @IsString()
  contactPerson?: string;

  @IsOptional()
  @IsString()
  contactPhone?: string;

  @IsOptional()
  @IsBoolean()
  isActive?: boolean;

  @IsOptional()
  @IsString()
  notes?: string;

  @IsOptional()
  tags?: string[];

  @IsOptional()
  @IsNumber()
  paymentTermDays?: number;
}

export class FilterSuppliersDto {
  @IsOptional()
  @IsString()
  search?: string;

  @IsOptional()
  @IsEnum(SupplierTypeEnum)
  type?: SupplierTypeEnum;

  @IsOptional()
  @IsEnum(SupplierTaxCategoryEnum)
  taxCategory?: SupplierTaxCategoryEnum;

  @IsOptional()
  @IsBoolean()
  isActive?: boolean;

  @IsOptional()
  @IsString()
  tag?: string;
}
