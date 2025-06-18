import { Logger, Module } from '@nestjs/common';
import { TypeOrmModule }  from '@nestjs/typeorm';

// Controllers
import { InventoryController }      from './controllers/inventory.controller';
import { WarehouseController }      from './controllers/warehouse.controller';
import { InventoryAlertController } from './controllers/inventory-alert.controller';
import { InventoryCountController } from './controllers/inventory-count.controller';

// Services
import { InventoryService }      from './services/inventory.service';
import { WarehouseService }      from './services/warehouse.service';
import { InventoryAlertService } from './services/inventory-alert.service';
import { InventoryCountService } from './services/inventory-count.service';

// Schedulers
import { InventoryAlertScheduler } from './schedulers/inventory-alert.scheduler';
import { InventoryCountScheduler } from './schedulers/inventory-count.scheduler';

// Entities
import { InventoryItemEntity }      from './domain/entities/inventory-item.entity';
import { WarehouseEntity }          from './domain/entities/warehouse.entity';
import { WarehouseZoneEntity }      from './domain/entities/warehouse-zone.entity';
import { InventoryMovementEntity }  from './domain/entities/inventory-movement.entity';
import { InventoryAlertEntity }     from './domain/entities/inventory-alert.entity';
import { InventoryCountEntity }     from './domain/entities/inventory-count.entity';
import { InventoryCountItemEntity } from './domain/entities/inventory-count-item.entity';
import { InventoryBatchEntity }     from './domain/entities/inventory-batch.entity';

// External modules
import { ProductsModule }      from '@modules/products/products.module';
import { UsersModule }         from '@modules/users/users.module';
import { NotificationsModule } from '@modules/notifications/notifications.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      InventoryItemEntity,
      WarehouseEntity,
      WarehouseZoneEntity,
      InventoryMovementEntity,
      InventoryAlertEntity,
      InventoryCountEntity,
      InventoryCountItemEntity,
      InventoryBatchEntity
    ]),
    ProductsModule,
    UsersModule,
    NotificationsModule
  ],
  controllers: [
    InventoryController,
    WarehouseController,
    InventoryAlertController,
    InventoryCountController
  ],
  providers: [
    InventoryService,
    WarehouseService,
    InventoryAlertService,
    InventoryCountService,
    InventoryAlertScheduler,
    InventoryCountScheduler,
    Logger
  ],
  exports: [
    TypeOrmModule,
    InventoryService,
    WarehouseService,
    InventoryAlertService,
    InventoryCountService
  ]
})
export class InventoryModule {}
