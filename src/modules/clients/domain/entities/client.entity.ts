import { Column, Entity, PrimaryColumn } from 'typeorm';
import { v4 }                            from 'uuid';

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

  @Column()
  email: string;

  @Column()
  phoneNumber: string;

  constructor(values: Partial<ClientEntity>) {
    Object.assign(this, values);
  }
}
