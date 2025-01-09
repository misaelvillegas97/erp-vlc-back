import { Column, Entity, OneToMany, PrimaryColumn, Unique } from 'typeorm';
import { ProductRequestEntity }                             from './product-request.entity';
import { v4 }                                               from 'uuid';

@Entity({name: 'orders'})
@Unique([ 'orderNumber' ])
export class OrderEntity {
  @PrimaryColumn({type: 'uuid'})
  id: string = v4();

  @Column()
  orderNumber: string;

  @Column()
  provider: string;

  @Column()
  businessName: string;

  @Column()
  type: string;

  @Column()
  status: string;

  @Column()
  deliveryLocation: string;

  @Column()
  deliveryDate: string;

  @Column()
  emissionDate: string;

  @Column({nullable: true})
  observation?: string;

  @OneToMany(() => ProductRequestEntity, (product) => product.orderRequest, {cascade: true})
  products: ProductRequestEntity[];

  @Column({nullable: true, type: 'json'})
  additionalInfo?: Record<string, any>;

  constructor(values: Partial<OrderEntity>) {
    Object.assign(this, values);
  }
}
