import { Column, Entity, JoinColumn, ManyToOne, OneToMany } from 'typeorm';
import { AbstractEntity }                                   from '@shared/domain/entities/abstract.entity';
import { WarehouseEntity }                                  from './warehouse.entity';
import { UserEntity }                                       from '@modules/users/domain/entities/user.entity';
import { InventoryCountItemEntity }                         from './inventory-count-item.entity';

export enum CountStatus {
  PLANNED = 'PLANNED',
  IN_PROGRESS = 'IN_PROGRESS',
  COMPLETED = 'COMPLETED',
  CANCELLED = 'CANCELLED'
}

@Entity('inventory_counts')
export class InventoryCountEntity extends AbstractEntity {
  @Column()
  name: string;

  @Column({nullable: true})
  description: string;

  @ManyToOne(() => WarehouseEntity)
  @JoinColumn({name: 'warehouse_id'})
  warehouse: WarehouseEntity;

  @Column({name: 'warehouse_id'})
  warehouseId: string;

  @Column({type: 'date'})
  scheduledDate: Date;

  @Column({type: 'enum', enum: CountStatus, default: CountStatus.PLANNED})
  status: CountStatus;

  @Column({type: 'date', nullable: true})
  completedDate: Date;

  @ManyToOne(() => UserEntity)
  @JoinColumn({name: 'assigned_to'})
  assignedTo: UserEntity;

  @Column({name: 'assigned_to', nullable: true})
  assignedToId: string;

  @OneToMany(() => InventoryCountItemEntity, item => item.inventoryCount)
  items: InventoryCountItemEntity[];
}
