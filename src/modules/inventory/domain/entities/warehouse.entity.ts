import { Column, Entity, OneToMany } from 'typeorm';
import { AbstractEntity }            from '@shared/domain/entities/abstract.entity';
import { InventoryItemEntity }       from './inventory-item.entity';
import { WarehouseZoneEntity }       from './warehouse-zone.entity';

@Entity('warehouses')
export class WarehouseEntity extends AbstractEntity {
  @Column()
  name: string;

  @Column({nullable: true})
  description: string;

  @Column()
  address: string;

  @Column({nullable: true})
  contactPerson: string;

  @Column({nullable: true})
  contactPhone: string;

  @Column({nullable: true})
  contactEmail: string;

  @Column({type: 'boolean', default: true})
  isActive: boolean;

  @OneToMany(() => InventoryItemEntity, item => item.warehouse)
  inventoryItems: InventoryItemEntity[];

  @OneToMany(() => WarehouseZoneEntity, zone => zone.warehouse)
  zones: WarehouseZoneEntity[];
}
