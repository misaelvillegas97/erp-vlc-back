import { Column, Entity, JoinColumn, ManyToOne, PrimaryColumn } from 'typeorm';
import { OrderEntity }                                          from './order.entity';
import { v4 }                                                   from 'uuid';
import { ProductEntity }                                        from '@modules/products/domain/entities/product.entity';

@Entity('orders_products')
export class ProductRequestEntity {
  @PrimaryColumn({type: 'uuid'})
  id: string = v4();

  @Column({nullable: true})
  code: string;

  @Column({nullable: true})
  providerCode: string;

  @Column()
  upcCode: string;

  @Column()
  description: string;

  @Column()
  quantity: number;

  @Column('decimal') // Use 'decimal' for monetary values
  unitaryPrice: number;

  @Column()
  totalPrice: number;

  @Column({nullable: true, type: 'json'})
  additionalInfo?: Record<string, any>;

  @ManyToOne(() => OrderEntity, (orderRequest) => orderRequest.products)
  orderRequest: OrderEntity;

  @ManyToOne(() => ProductEntity, (product) => product.id, {nullable: true})
  @JoinColumn({name: 'product_id'})
  product?: ProductEntity;

  constructor(values: Partial<ProductRequestEntity>) {
    Object.assign(this, values);
  }
}
