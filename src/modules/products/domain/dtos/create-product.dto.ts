import { IsNumber, IsOptional, IsString } from 'class-validator';
import { ProductEntity }                  from '@modules/products/domain/entities/product.entity';
import { Type }                           from 'class-transformer';

export class CreateProductDto implements Partial<ProductEntity> {
  @IsString()
  public readonly upcCode: string;

  @IsString()
  public readonly name: string;

  @IsString()
  @IsOptional()
  public readonly description?: string;

  @IsNumber()
  @Type(() => Number)
  public readonly price: number;
}
