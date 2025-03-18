import { IsEnum, IsNumber, IsOptional, IsString } from 'class-validator';
import { OrderTypeEnum }                          from '@modules/orders/domain/enums/order-type.enum';
import { OrderStatusEnum }                        from '@modules/orders/domain/enums/order-status.enum';
import { Transform }                              from 'class-transformer';
import { ApiPropertyOptional }                    from '@nestjs/swagger';

export class FilterOrderDto {
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

export class OrderQueryDto extends FilterOrderDto {
  @ApiPropertyOptional()
  @Transform(({value}) => (value ? Number(value) : 1))
  @IsNumber()
  @IsOptional()
  page?: number;

  @ApiPropertyOptional()
  @Transform(({value}) => (value ? Number(value) : 10))
  @IsNumber()
  @IsOptional()
  limit?: number;
}
