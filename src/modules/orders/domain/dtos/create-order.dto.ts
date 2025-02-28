import { IsEnum, IsISO8601, IsNotEmpty, IsOptional, IsString, IsUUID, ValidateNested } from 'class-validator';
import { OrderTypeEnum }                                                               from '@modules/orders/domain/enums/order-type.enum';
import { OrderStatusEnum }                                                             from '@modules/orders/domain/enums/order-status.enum';
import { Type }                                                                        from 'class-transformer';
import { CreateOrderProductDto }                                                       from '@modules/orders/domain/dtos/create-order-product.dto';

export class CreateOrderDto {
  @IsUUID()
  clientId: string;

  @IsEnum(OrderTypeEnum)
  type: OrderTypeEnum;

  @IsEnum(OrderStatusEnum)
  status: OrderStatusEnum;

  @IsString()
  @IsNotEmpty()
  deliveryLocation: string;

  @IsISO8601()
  deliveryDate: string;

  @IsOptional()
  @IsString()
  observations?: string;

  @Type(() => CreateOrderProductDto)
  @ValidateNested({each: true})
  products: CreateOrderProductDto[];
}
