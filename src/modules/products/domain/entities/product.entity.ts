import { Column, Entity, PrimaryColumn } from 'typeorm';
import { v4 }                            from 'uuid';
import { Unique }                        from 'typeorm/browser';

@Entity({name: 'products'})
@Unique([ 'upcCode' ])
export class ProductEntity {
  @PrimaryColumn({type: 'uuid'})
  id: string = v4();

  @Column({type: 'varchar'})
  upcCode: string;

  @Column({type: 'varchar'})
  name: string;

  @Column({type: 'text', nullable: true})
  description?: string;

  @Column()
  price: number;
}
