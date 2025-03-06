import { Column, Entity, JoinTable, OneToMany, PrimaryColumn, Unique } from 'typeorm';
import { v4 }                                                          from 'uuid';
import { ProductsProviderCodeEntity }                                  from '@modules/products/domain/entities/products-provider-code.entity';

@Entity({name: 'products'})
@Unique([ 'upcCode' ])
export class ProductEntity {
  @PrimaryColumn({type: 'uuid'})
  id: string = v4();

  @Column({nullable: false, name: 'upc_code'})
  upcCode: string;

  @Column()
  name: string;

  @Column({nullable: true})
  description?: string;

  @Column('decimal', {name: 'unitary_price'})
  unitaryPrice: number;

  @OneToMany(() => ProductsProviderCodeEntity, (productClient) => productClient.product)
  @JoinTable()
  providerCodes: ProductsProviderCodeEntity[];

  constructor(values: Partial<ProductEntity>) {
    Object.assign(this, values);
  }
}
