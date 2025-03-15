import { PaymentEntity }                                       from '@modules/invoices/domain/entities/payment.entity';
import { IsDate, IsEnum, IsNumber, IsOptional, IsString, Min } from 'class-validator';
import { PaymentMethodEnum }                                   from '@modules/invoices/domain/enums/payment-method.enum';

export class CreatePaymentDto implements Partial<PaymentEntity> {
  @IsOptional()
  @IsDate()
  paymentDate: Date;

  @IsNumber()
  @Min(1)
  amount: number;

  @IsOptional()
  @IsEnum(PaymentMethodEnum)
  method?: PaymentMethodEnum;

  @IsOptional()
  @IsString()
  reference?: string;
}
