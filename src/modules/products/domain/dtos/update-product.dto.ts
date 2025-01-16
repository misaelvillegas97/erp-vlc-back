import { CreateProductDto } from '@modules/products/domain/dtos/create-product.dto';

export class UpdateProductDto extends CreateProductDto {
  public readonly id: string;
}
