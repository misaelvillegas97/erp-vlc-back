import { Column, CreateDateColumn, DeleteDateColumn, Entity, JoinTable, OneToMany, PrimaryColumn, UpdateDateColumn } from 'typeorm';
import { v4 }                                                                                                        from 'uuid';
import { ProductsClientEntity }                                                                                      from '@modules/products/domain/entities/products-client.entity';
import { ClientAddress }                                                                                             from '@modules/clients/domain/models/client-address';

@Entity('client')
export class ClientEntity {
  @PrimaryColumn({type: 'uuid'})
  id: string = v4();

  @Column()
  businessName: string;

  @Column()
  fantasyName: string;

  @Column({nullable: true})
  code: string;

  @Column()
  nationalId: string;

  @Column({nullable: true})
  email: string;

  @Column({nullable: true})
  phoneNumber: string;

  @Column({nullable: true, type: 'json'})
  address: ClientAddress[];

  @Column({default: true})
  deletable: boolean = true;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;

  @DeleteDateColumn()
  deletedAt: Date;

  @OneToMany(() => ProductsClientEntity, clientProduct => clientProduct.client)
  @JoinTable()
  products: ProductsClientEntity[];

  constructor(values: Partial<ClientEntity>) {
    Object.assign(this, values);
  }
}
