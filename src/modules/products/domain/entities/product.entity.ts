import { Column, Entity, JoinTable, OneToMany, PrimaryColumn, Unique } from 'typeorm';
import { v4 }                                                          from 'uuid';
import { ProductsClientEntity }                                        from '@modules/products/domain/entities/products-client.entity';

@Entity({name: 'products'})
@Unique([ 'upcCode' ])
export class ProductEntity {
  @PrimaryColumn({type: 'uuid'})
  id: string = v4();

  @Column()
  upcCode: string;

  @Column()
  name: string;

  @Column({nullable: true})
  description?: string;

  @Column()
  unitaryPrice: number;

  @OneToMany(() => ProductsClientEntity, (productClient) => productClient.product)
  @JoinTable()
  providerCodes: ProductsClientEntity[];
}
