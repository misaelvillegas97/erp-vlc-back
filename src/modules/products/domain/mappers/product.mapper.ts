import { ProductEntity }        from '@modules/products/domain/entities/product.entity';
import { ProductsClientMapper } from '@modules/products/domain/mappers/products-client.mapper';

export class ProductMapper {
  readonly id: string;
  readonly upcCode: string;
  readonly name: string;
  readonly description?: string;
  readonly unitaryPrice: number;
  readonly providerCodes?: ProductsClientMapper[];

  constructor(values: Partial<ProductMapper>) {
    Object.assign(this, values);
  }

  static map(entity: ProductEntity): ProductMapper {
    return new ProductMapper({
      id: entity.id,
      upcCode: entity.upcCode,
      name: entity.name,
      description: entity.description,
      unitaryPrice: entity.unitaryPrice,
      providerCodes: entity.providerCodes && entity.providerCodes.map(ProductsClientMapper.map),
    });
  }

  static mapAll(entities: ProductEntity[]): ProductMapper[] {
    return entities.map(ProductMapper.map);
  }
}
