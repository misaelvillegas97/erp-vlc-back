import { InvoiceStatusEnum }                                              from '@modules/orders/domain/enums/invoice-status.enum';
import { IsBoolean, IsEnum, IsISO8601, IsNotEmpty, IsOptional, IsString } from 'class-validator';

export class StatusUpdateDto {
  @IsEnum(InvoiceStatusEnum)
  status: InvoiceStatusEnum;

  @IsBoolean()
  isPaid: boolean = false;

  @IsOptional()
  @IsString()
  @IsNotEmpty()
  observations?: string;

  @IsOptional()
  @IsISO8601()
  paymentDate?: string;
}
