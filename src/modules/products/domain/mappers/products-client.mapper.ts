import { ClientLightMapper }    from '@modules/clients/domain/mappers/client-light.mapper';
import { ProductLightMapper }   from '@modules/products/domain/mappers/product-light.mapper';
import { ProductsClientEntity } from '@modules/products/domain/entities/products-client.entity';

export class ProductsClientMapper {
  readonly id: string;
  readonly providerCode: number;
  readonly client: ClientLightMapper;
  readonly product: ProductLightMapper;

  constructor(values: Partial<ProductsClientMapper>) {
    Object.assign(this, values);
  }

  static map(entity: ProductsClientEntity): ProductsClientMapper {
    return new ProductsClientMapper({
      id: entity.id,
      providerCode: entity.providerCode,
      client: entity.client && ClientLightMapper.map(entity.client),
      product: ProductLightMapper.map(entity.product)
    });
  }
}
