import { ProductEntity }                  from '@modules/products/domain/entities/product.entity';
import { IsNumber, IsOptional, IsString } from 'class-validator';
import { Type }                           from 'class-transformer';

export class QueryProductDto implements Partial<ProductEntity> {
  @IsOptional()
  @IsString()
  public readonly upcCode: string;

  @IsOptional()
  @IsString()
  public readonly name: string;

  @IsOptional()
  @IsNumber()
  @Type(() => Number)
  public readonly unitaryPrice: number;
}
