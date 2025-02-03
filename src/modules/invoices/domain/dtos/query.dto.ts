import { IsEnum, IsOptional } from 'class-validator';
import { InvoiceStatusEnum }  from '@modules/orders/domain/enums/invoice-status.enum';
import { Transform }          from 'class-transformer';

export class InvoiceQueryDto {
  @IsOptional()
  invoiceNumber: number;

  @IsOptional()
  clientId: string[];

  @IsOptional()
  @IsEnum(InvoiceStatusEnum, {each: true})
  status: InvoiceStatusEnum;

  // Date will come as JSON.stringify from the client, so we need to parse it
  @IsOptional()
  @Transform(({value}) => JSON.parse(value))
  emissionDate: { from: string; to: string };

  @IsOptional()
  @Transform(({value}) => JSON.parse(value))
  dueDate: { from: string; to: string };

  @IsOptional()
  @Transform(({value}) => JSON.parse(value))
  netAmount: { from: number; to: number };

  @IsOptional()
  @Transform(({value}) => JSON.parse(value))
  taxAmount: { from: number; to: number };

  @IsOptional()
  @Transform(({value}) => JSON.parse(value))
  totalAmount: { from: number; to: number };

  @IsOptional()
  deliveryAssignment: string;
}
