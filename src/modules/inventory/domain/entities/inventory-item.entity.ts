import { Column, Entity, JoinColumn, ManyToOne, OneToMany } from 'typeorm';
import { AbstractEntity }                                   from '@shared/domain/entities/abstract.entity';
import { ProductEntity }                                    from '@modules/products/domain/entities/product.entity';
import { WarehouseEntity }                                  from './warehouse.entity';
import { InventoryMovementEntity }                          from './inventory-movement.entity';
import { InventoryAlertEntity }                             from './inventory-alert.entity';

@Entity('inventory_items')
export class InventoryItemEntity extends AbstractEntity {
  @ManyToOne(() => ProductEntity)
  @JoinColumn({name: 'product_id'})
  product: ProductEntity;

  @Column({name: 'product_id'})
  productId: string;

  @ManyToOne(() => WarehouseEntity)
  @JoinColumn({name: 'warehouse_id'})
  warehouse: WarehouseEntity;

  @Column({name: 'warehouse_id'})
  warehouseId: string;

  @Column({type: 'decimal', precision: 10, scale: 2})
  quantity: number;

  @Column({type: 'decimal', precision: 10, scale: 2, nullable: true})
  minimumStock: number;

  @Column({type: 'decimal', precision: 10, scale: 2, nullable: true})
  maximumStock: number;

  @Column({type: 'decimal', precision: 10, scale: 2, nullable: true})
  reorderPoint: number;

  @Column({type: 'varchar', nullable: true})
  location: string;

  @Column({type: 'varchar', nullable: true})
  batchNumber: string;

  @Column({type: 'date', nullable: true})
  expirationDate: Date;

  @Column({type: 'boolean', default: false})
  isReserved: boolean;

  @OneToMany(() => InventoryMovementEntity, movement => movement.inventoryItem)
  movements: InventoryMovementEntity[];

  @OneToMany(() => InventoryAlertEntity, alert => alert.inventoryItem)
  alerts: InventoryAlertEntity[];
}
