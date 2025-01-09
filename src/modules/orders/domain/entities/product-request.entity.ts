import { Column, Entity, ManyToOne, PrimaryColumn } from 'typeorm';
import { OrderEntity }                              from './order.entity';
import { v4 }                                       from 'uuid';

@Entity('product_requests')
export class ProductRequestEntity {
  @PrimaryColumn({type: 'uuid'})
  id: string = v4();

  @Column()
  code: string;

  @Column()
  providerCode: string;

  @Column()
  upcCode: string;

  @Column()
  description: string;

  @Column()
  quantity: number;

  @Column('decimal') // Use 'decimal' for monetary values
  unitaryPrice: number;

  @Column('decimal')
  totalPrice: number;

  @Column({nullable: true, type: 'json'})
  additionalInfo?: Record<string, any>;

  @ManyToOne(() => OrderEntity, (orderRequest) => orderRequest.products)
  orderRequest: OrderEntity;

  constructor(values: Partial<ProductRequestEntity>) {
    Object.assign(this, values);
  }
}
