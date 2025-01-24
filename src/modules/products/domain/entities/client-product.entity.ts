import { Column, Entity, ManyToOne, Unique } from 'typeorm';
import { AbstractEntity }                    from '@shared/domain/entities/abstract.entity';
import { ClientEntity }                      from '@modules/clients/domain/entities/client.entity';
import { ProductEntity }                     from '@modules/products/domain/entities/product.entity';

@Entity('client-product')
@Unique([ 'product', 'client' ])
export class ClientProductEntity extends AbstractEntity {
  @ManyToOne(() => ProductEntity, product => product.id)
  product: ProductEntity;

  @ManyToOne(() => ClientEntity, client => client.id)
  client: ClientEntity;

  @Column()
  providerCode: number;
}
