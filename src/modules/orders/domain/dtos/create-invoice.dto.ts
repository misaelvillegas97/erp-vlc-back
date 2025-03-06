import { InvoiceStatusEnum }                                            from '@modules/orders/domain/enums/invoice-status.enum';
import { IsDateString, IsEnum, IsNumber, IsOptional, IsString, IsUUID } from 'class-validator';

export class CreateInvoiceDto {
  @IsNumber()
  invoiceNumber: number;

  @IsEnum(InvoiceStatusEnum)
  status: InvoiceStatusEnum;

  @IsOptional()
  observations?: string;

  @IsString()
  emissionDate: string;

  @IsDateString()
  @IsOptional()
  dueDate?: string;

  @IsOptional()
  @IsNumber()
  netAmount: number;

  @IsOptional()
  @IsNumber()
  taxAmount: number;

  @IsOptional()
  @IsNumber()
  totalAmount: number;

  @IsOptional()
  @IsUUID()
  deliveryAssignmentId: string;

  @IsOptional()
  markAsPendingDelivery: boolean = false;
}
