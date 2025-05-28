import { Column, Entity, JoinColumn, ManyToOne } from 'typeorm';
import { AbstractEntity }                        from '@shared/domain/entities/abstract.entity';
import { WarehouseEntity }                       from './warehouse.entity';

@Entity('warehouse_zones')
export class WarehouseZoneEntity extends AbstractEntity {
  @Column()
  name: string;

  @Column({nullable: true})
  description: string;

  @ManyToOne(() => WarehouseEntity)
  @JoinColumn({name: 'warehouse_id'})
  warehouse: WarehouseEntity;

  @Column({name: 'warehouse_id'})
  warehouseId: string;

  @Column({type: 'boolean', default: true})
  isActive: boolean;
}
