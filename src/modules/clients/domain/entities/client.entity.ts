import { Entity, Column, PrimaryGeneratedColumn } from 'typeorm';
import { v4 } from 'uuid';

@Entity('clients')
export class Client {
  @PrimaryColumn({type: 'uuid'})
  id: string = v4();

  @Column()
  businessName: string;

  @Column()
  fantasyName: string;

  @Column()
  nationalId: string;

  @Column()
  email: string;

  @Column()
  phoneNumber: string;
}
