import { ProductEntity } from '@modules/products/domain/entities/product.entity';

export class ProductLightMapper {
  readonly upcCode: string;
  readonly name: string;
  readonly unitaryPrice: number;

  constructor(values: Partial<ProductLightMapper>) {
    Object.assign(this, values);
  }

  static map(product: ProductEntity): ProductLightMapper {
    return new ProductLightMapper({
      upcCode: product.upcCode,
      name: product.name,
      unitaryPrice: product.unitaryPrice,
    });
  }
}
