import { IsEnum, IsOptional, IsString } from 'class-validator';
import { OrderTypeEnum }                from '@modules/orders/domain/enums/order-type.enum';
import { OrderStatusEnum }              from '@modules/orders/domain/enums/order-status.enum';

export class OrderQueryDto {
  @IsOptional()
  @IsString()
  orderNumber?: string;

  @IsOptional()
  @IsString({each: true})
  clientId?: string[];

  @IsOptional()
  @IsEnum(OrderTypeEnum, {each: true})
  type?: OrderTypeEnum[];

  @IsOptional()
  @IsEnum(OrderStatusEnum, {each: true})
  status?: OrderStatusEnum[];

  @IsOptional()
  @IsString()
  deliveryLocation?: string;

  @IsOptional()
  @IsString()
  emissionDate?: string;

  @IsOptional()
  @IsString()
  deliveryDate?: string;

  @IsOptional()
  @IsString()
  amount?: number;

  @IsOptional()
  @IsString()
  invoice?: number;
}
