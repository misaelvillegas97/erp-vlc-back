import { PaymentEntity }                               from '@modules/invoices/domain/entities/payment.entity';
import { IsDate, IsNumber, IsOptional, IsString, Min } from 'class-validator';

export class CreatePaymentDto implements Partial<PaymentEntity> {
  @IsDate()
  paymentDate: Date;

  @IsNumber()
  @Min(1)
  amount: number;

  @IsOptional()
  @IsString()
  method?: string;

  @IsOptional()
  @IsString()
  reference?: string;
}
