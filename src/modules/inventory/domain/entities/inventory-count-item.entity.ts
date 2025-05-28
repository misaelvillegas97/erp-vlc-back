import { Column, Entity, JoinColumn, ManyToOne } from 'typeorm';
import { AbstractEntity }                        from '@shared/domain/entities/abstract.entity';
import { InventoryCountEntity }                  from './inventory-count.entity';
import { InventoryItemEntity }                   from './inventory-item.entity';

@Entity('inventory_count_items')
export class InventoryCountItemEntity extends AbstractEntity {
  @ManyToOne(() => InventoryCountEntity)
  @JoinColumn({name: 'inventory_count_id'})
  inventoryCount: InventoryCountEntity;

  @Column({name: 'inventory_count_id'})
  inventoryCountId: string;

  @ManyToOne(() => InventoryItemEntity)
  @JoinColumn({name: 'inventory_item_id'})
  inventoryItem: InventoryItemEntity;

  @Column({name: 'inventory_item_id'})
  inventoryItemId: string;

  @Column({type: 'decimal', precision: 10, scale: 2, nullable: true})
  expectedQuantity: number;

  @Column({type: 'decimal', precision: 10, scale: 2, nullable: true})
  countedQuantity: number;

  @Column({type: 'decimal', precision: 10, scale: 2, nullable: true})
  discrepancy: number;

  @Column({nullable: true})
  notes: string;
}
