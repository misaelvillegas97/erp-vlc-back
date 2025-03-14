import { InvoiceStatusEnum }                        from '@modules/orders/domain/enums/invoice-status.enum';
import { IsEnum, IsNotEmpty, IsOptional, IsString } from 'class-validator';

export class StatusUpdateDto {
  @IsEnum(InvoiceStatusEnum)
  status: InvoiceStatusEnum;

  @IsOptional()
  @IsString()
  @IsNotEmpty()
  observations?: string;
}
