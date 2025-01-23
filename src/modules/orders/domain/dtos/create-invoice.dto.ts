import { InvoiceStatusEnum }                      from '@modules/orders/domain/enums/invoice-status.enum';
import { IsEnum, IsNumber, IsOptional, IsString } from 'class-validator';

export class CreateInvoiceDto {
  @IsNumber()
  invoiceNumber: number;

  @IsEnum(InvoiceStatusEnum)
  status: InvoiceStatusEnum;

  @IsOptional()
  observations?: string;

  @IsString()
  emissionDate: string;

  @IsOptional()
  @IsNumber()
  netAmount: number;

  @IsOptional()
  @IsNumber()
  taxAmount: number;

  @IsOptional()
  @IsNumber()
  totalAmount: number;
}
