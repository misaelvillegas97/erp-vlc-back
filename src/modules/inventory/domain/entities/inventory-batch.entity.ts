import { Column, Entity, JoinColumn, ManyToOne } from 'typeorm';
import { AbstractEntity }                        from '@shared/domain/entities/abstract.entity';
import { InventoryItemEntity }                   from './inventory-item.entity';

@Entity('inventory_batches')
export class InventoryBatchEntity extends AbstractEntity {
  @ManyToOne(() => InventoryItemEntity, item => item.batches)
  @JoinColumn({name: 'inventory_item_id'})
  inventoryItem: InventoryItemEntity;

  @Column({name: 'inventory_item_id'})
  inventoryItemId: string;

  @Column({type: 'decimal', precision: 10, scale: 2})
  quantity: number;

  @Column({type: 'varchar', nullable: true})
  batchNumber: string;

  @Column({type: 'date', nullable: true})
  expirationDate: Date;

  @Column({type: 'timestamp', default: () => 'CURRENT_TIMESTAMP'})
  receiptDate: Date;

  @Column({type: 'boolean', default: false})
  isReserved: boolean;
}
