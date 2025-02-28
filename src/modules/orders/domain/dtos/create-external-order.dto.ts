import { ProductRequestDto }                                                from '@modules/integrations/domain/dto/product-request.dto';
import { IsEnum, IsNotEmpty, IsOptional, IsString, IsUUID, ValidateNested } from 'class-validator';
import { OrderStatusEnum }                                                  from '@modules/orders/domain/enums/order-status.enum';
import { CreateExternalOrderProductDto }                                    from '@modules/orders/domain/dtos/create-external-order-product.dto';
import { Type }                                                             from 'class-transformer';
import { OrderTypeEnum }                                                    from '@modules/orders/domain/enums/order-type.enum';

export class CreateExternalOrderDto {
  @IsString()
  @IsNotEmpty()
  public orderNumber: string;

  @IsUUID()
  public clientId: string;

  @IsEnum(OrderTypeEnum)
  public type: OrderTypeEnum;

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
  public products: CreateExternalOrderProductDto[];

  @IsOptional()
  public additionalInfo?: Record<string, any>;

  public businessName: string;

  constructor(values: Partial<CreateExternalOrderDto>) {
    Object.assign(this, values);
  }
}
