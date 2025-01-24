import { Column, CreateDateColumn, DeleteDateColumn, Entity, OneToMany, PrimaryColumn, UpdateDateColumn } from 'typeorm';
import { v4 }                                                                                             from 'uuid';
import { ClientProductEntity }                                                                            from '@modules/products/domain/entities/client-product.entity';

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

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;

  @DeleteDateColumn()
  deletedAt: Date;

  @OneToMany(() => ClientProductEntity, clientProduct => clientProduct.client)
  products: ClientProductEntity[];

  constructor(values: Partial<ClientEntity>) {
    Object.assign(this, values);
  }
}
