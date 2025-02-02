import { IsEnum, IsOptional } from 'class-validator';
import { InvoiceStatusEnum }  from '@modules/orders/domain/enums/invoice-status.enum';

export class InvoiceQueryDto {
  @IsOptional()
  invoiceNumber: number;

  @IsOptional()
  clientId: string;

  @IsOptional()
  @IsEnum(InvoiceStatusEnum)
  status: InvoiceStatusEnum;

  @IsOptional()
  emissionDate: { from: string; to: string };

  @IsOptional()
  dueDate: { from: string; to: string };

  @IsOptional()
  netAmount: { from: number; to: number };

  @IsOptional()
  taxAmount: { from: number; to: number };

  @IsOptional()
  totalAmount: { from: number; to: number };

  @IsOptional()
  deliveryAssignment: string;
}
