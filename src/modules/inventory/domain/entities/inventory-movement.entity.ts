import { Column, Entity, JoinColumn, ManyToOne } from 'typeorm';
import { AbstractEntity }                        from '@shared/domain/entities/abstract.entity';
import { InventoryItemEntity }                   from './inventory-item.entity';

export enum MovementType {
  RECEIPT = 'RECEIPT',
  SHIPMENT = 'SHIPMENT',
  ADJUSTMENT = 'ADJUSTMENT',
  TRANSFER = 'TRANSFER',
  RETURN = 'RETURN',
  RESERVATION = 'RESERVATION',
  RELEASE = 'RELEASE'
}

@Entity('inventory_movements')
export class InventoryMovementEntity extends AbstractEntity {
  @ManyToOne(() => InventoryItemEntity)
  @JoinColumn({name: 'inventory_item_id'})
  inventoryItem: InventoryItemEntity;

  @Column({name: 'inventory_item_id'})
  inventoryItemId: string;

  @Column({type: 'enum', enum: MovementType})
  type: MovementType;

  @Column({type: 'decimal', precision: 10, scale: 2})
  quantity: number;

  @Column({nullable: true})
  reference: string;

  @Column({type: 'json', nullable: true})
  metadata: Record<string, any>;
}
