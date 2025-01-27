import { Column, Entity, ManyToOne, Unique } from 'typeorm';
import { AbstractEntity }                    from '@shared/domain/entities/abstract.entity';
import { ClientEntity }                      from '@modules/clients/domain/entities/client.entity';
import { ProductEntity }                     from '@modules/products/domain/entities/product.entity';

@Entity('products_client')
@Unique([ 'product', 'client' ])
export class ProductsClientEntity extends AbstractEntity {
  @ManyToOne(() => ProductEntity, product => product.id)
  product: ProductEntity;

  @ManyToOne(() => ClientEntity, client => client.id)
  client: ClientEntity;

  @Column()
  providerCode: number;
}
