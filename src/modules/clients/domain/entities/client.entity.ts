import { Column, Entity, JoinTable, OneToMany } from 'typeorm';
import { ProductsProviderCodeEntity }           from '@modules/products/domain/entities/products-provider-code.entity';
import { ClientAddress }                        from '@modules/clients/domain/models/client-address';
import { AbstractEntity }                       from '@shared/domain/entities/abstract.entity';

@Entity('client')
export class ClientEntity extends AbstractEntity {
  @Column({name: 'business_name'})
  businessName: string;

  @Column({name: 'fantasy_name'})
  fantasyName: string;

  @Column({nullable: true})
  code: string;

  @Column({name: 'national_id'})
  nationalId: string;

  @Column({nullable: true})
  email: string;

  @Column({nullable: true, name: 'phone_number'})
  phoneNumber: string;

  @Column({nullable: true, type: 'json'})
  address: ClientAddress[];

  @Column({default: true})
  deletable: boolean = true;

  @OneToMany(() => ProductsProviderCodeEntity, clientProduct => clientProduct.client)
  @JoinTable()
  products: ProductsProviderCodeEntity[];

  constructor(values: Partial<ClientEntity>) {
    super();
    Object.assign(this, values);
  }
}
