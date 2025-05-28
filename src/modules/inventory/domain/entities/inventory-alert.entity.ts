import { Column, Entity, JoinColumn, ManyToOne } from 'typeorm';
import { AbstractEntity }                        from '@shared/domain/entities/abstract.entity';
import { InventoryItemEntity }                   from './inventory-item.entity';

export enum InventoryAlertType {
  LOW_STOCK = 'LOW_STOCK',
  OVERSTOCK = 'OVERSTOCK',
  EXPIRATION = 'EXPIRATION',
  REORDER = 'REORDER'
}

export enum InventoryAlertStatus {
  ACTIVE = 'ACTIVE',
  ACKNOWLEDGED = 'ACKNOWLEDGED',
  RESOLVED = 'RESOLVED',
  DISMISSED = 'DISMISSED'
}

@Entity('inventory_alerts')
export class InventoryAlertEntity extends AbstractEntity {
  @ManyToOne(() => InventoryItemEntity)
  @JoinColumn({name: 'inventory_item_id'})
  inventoryItem: InventoryItemEntity;

  @Column({name: 'inventory_item_id'})
  inventoryItemId: string;

  @Column({type: 'enum', enum: InventoryAlertType})
  type: InventoryAlertType;

  @Column({type: 'enum', enum: InventoryAlertStatus, default: InventoryAlertStatus.ACTIVE})
  status: InventoryAlertStatus;

  @Column({nullable: true})
  alertKey: string;

  @Column({type: 'json', nullable: true})
  alertParams: Record<string, any>;

  @Column({type: 'boolean', default: false})
  notificationSent: boolean;

  @Column({nullable: true})
  priority: number; // 1-5, where 5 is the highest priority
}
