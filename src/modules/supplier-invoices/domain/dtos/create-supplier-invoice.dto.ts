import { IsDate, IsEnum, IsNumber, IsNumberString, IsOptional, IsString } from 'class-validator';
import { SupplierInvoiceStatusEnum }                                      from '@modules/supplier-invoices/domain/enums/invoice-status.enum';

export class CreateSupplierInvoiceDto {
  @IsNumberString()
  invoiceNumber: string;

  @IsEnum(SupplierInvoiceStatusEnum)
  status: SupplierInvoiceStatusEnum;

  @IsDate()
  issueDate: Date;

  @IsNumber()
  netAmount: number;

  @IsNumber()
  taxAmount: number;

  @IsNumber()
  grossAmount: number;

  @IsOptional()
  @IsString()
  description?: string;

  @IsString()
  observations: string;
}
