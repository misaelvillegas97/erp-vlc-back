import { Column, Entity, JoinColumn, ManyToOne, PrimaryColumn } from 'typeorm';
import { OrderEntity }                                          from './order.entity';
import { v4 }                                                   from 'uuid';
import { ProductEntity }                                        from '@modules/products/domain/entities/product.entity';

@Entity('orders_products')
export class OrderProductEntity {
  @PrimaryColumn({type: 'uuid'})
  id: string = v4();

  @Column({nullable: true})
  code: string;

  @Column({nullable: true, name: 'provider_code'})
  providerCode: string;

  @Column({name: 'upc_code'})
  upcCode: string;

  @Column()
  description: string;

  @Column()
  quantity: number;

  @Column('decimal', {name: 'unitary_price'})
  unitaryPrice: number;

  @Column({name: 'total_price'})
  totalPrice: number;

  @Column({nullable: true, type: 'json', name: 'additional_info'})
  additionalInfo?: Record<string, any>;

  @ManyToOne(() => OrderEntity, (orderRequest) => orderRequest.products)
  @JoinColumn({name: 'order_id'})
  order: OrderEntity;

  @ManyToOne(() => ProductEntity, (product) => product.id, {nullable: true})
  @JoinColumn({name: 'product_id'})
  product?: ProductEntity;

  constructor(values: Partial<OrderProductEntity>) {
    Object.assign(this, values);
  }
}
