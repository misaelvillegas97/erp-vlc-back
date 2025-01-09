import { Column, CreateDateColumn, Entity, JoinColumn, ManyToOne, OneToMany, PrimaryColumn, Unique, UpdateDateColumn } from 'typeorm';
import { ProductRequestEntity }                                                                                        from './product-request.entity';
import { v4 }                                                                                                          from 'uuid';
import { ClientEntity }                                                                                                from '@modules/clients/domain/entities/client.entity';

@Entity({name: 'orders'})
@Unique([ 'orderNumber' ])
export class OrderEntity {
  @PrimaryColumn({type: 'uuid'})
  id: string = v4();

  @Column()
  orderNumber: string;

  @Column()
  businessName: string;

  @Column()
  type: string;

  @Column()
  status: string;

  @Column()
  deliveryLocation: string;

  @Column({type: 'date'})
  deliveryDate: string;

  @Column({type: 'date'})
  emissionDate: string = new Date().toISOString().split('T')[0];

  @Column({nullable: true})
  observation?: string;

  @Column({nullable: true, type: 'json'})
  additionalInfo?: Record<string, any>;

  @OneToMany(() => ProductRequestEntity, (product) => product.orderRequest, {cascade: true})
  products: ProductRequestEntity[];

  @ManyToOne(() => ClientEntity, (client) => client.id, {eager: true})
  @JoinColumn({name: 'client_id'})
  client: ClientEntity;

  @CreateDateColumn({name: 'created_at'})
  createdAt: Date;

  @UpdateDateColumn({name: 'updated_at'})
  updatedAt: Date;

  constructor(values: Partial<OrderEntity>) {
    Object.assign(this, values);
  }
}
