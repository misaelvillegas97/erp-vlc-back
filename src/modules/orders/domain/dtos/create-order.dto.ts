import { ProductRequestDto }                                        from '@modules/integrations/domain/dto/product-request.dto';
import { IsEnum, IsNotEmpty, IsOptional, IsString, ValidateNested } from 'class-validator';
import { OrderStatusEnum }                                          from '@modules/orders/domain/enums/order-status.enum';
import { CreateOrderProductDto }                                    from '@modules/orders/domain/dtos/create-order-product.dto';
import { Type }                                                     from 'class-transformer';

export class CreateOrderDto {
  @IsString()
  @IsNotEmpty()
  public orderNumber: string;

  @IsString()
  @IsNotEmpty()
  public businessName: string;

  @IsString()
  @IsNotEmpty()
  public type: string;

  @IsEnum(OrderStatusEnum)
  public status: OrderStatusEnum;

  @IsString()
  @IsNotEmpty()
  public deliveryLocation: string;

  @IsString()
  @IsNotEmpty()
  public deliveryDate: string;

  @IsString()
  @IsNotEmpty()
  public emissionDate: string;

  @IsString()
  @IsNotEmpty()
  public observation?: string;

  @Type(() => ProductRequestDto)
  @ValidateNested({each: true})
  public products: CreateOrderProductDto[];

  @IsOptional()
  public additionalInfo?: Record<string, any>;

  public clientId?: string;

  constructor(values: Partial<CreateOrderDto>) {
    Object.assign(this, values);
  }
}
