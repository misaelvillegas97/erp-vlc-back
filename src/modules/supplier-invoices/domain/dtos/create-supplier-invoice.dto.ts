import { IsBoolean, IsEnum, IsISO8601, IsNumber, IsOptional, IsString, IsUUID } from 'class-validator';
import { SupplierInvoiceStatusEnum }                                            from '@modules/supplier-invoices/domain/enums/invoice-status.enum';

export class CreateSupplierInvoiceDto {
  @IsString()
  invoiceNumber: string;

  @IsUUID()
  supplierId: string;

  @IsEnum(SupplierInvoiceStatusEnum)
  status: SupplierInvoiceStatusEnum;

  @IsUUID()
  expenseTypeId: string;

  @IsBoolean()
  isExempt: boolean;

  @IsISO8601()
  issueDate: string;

  @IsISO8601()
  dueDate: string;

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
