import { Module }        from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';

import { VehiclesController } from './controllers/vehicles.controller';
import { DriversController }  from './controllers/drivers.controller';
import { SessionsController } from './controllers/sessions.controller';
import { GpsController }      from './controllers/gps.controller';
import { FuelController }     from './controllers/fuel.controller';

import { VehiclesService }         from './services/vehicles.service';
import { DriversService }          from './services/drivers.service';
import { SessionsService }         from './services/sessions.service';
import { GpsService }              from './services/gps.service';
import { MaintenanceService }      from './services/maintenance.service';
import { VehicleDocumentsService } from './services/vehicle-documents.service';
import { FuelService }             from './services/fuel.service';

import { SessionSchedulerService } from './schedulers/session-scheduler.service';
import { MaintenanceScheduler }    from './schedulers/maintenance.scheduler';

import { VehicleEntity }                from './domain/entities/vehicle.entity';
import { VehicleSessionEntity }         from './domain/entities/vehicle-session.entity';
import { VehicleSessionLocationEntity } from './domain/entities/vehicle-session-location.entity';
import { GpsEntity }                    from './domain/entities/gps.entity';
import { MaintenanceRecordEntity }      from './domain/entities/maintenance-record.entity';
import { MaintenanceAlertEntity }       from './domain/entities/maintenance-alert.entity';
import { VehicleDocumentEntity }        from './domain/entities/vehicle-document.entity';
import { FuelRecordEntity }             from './domain/entities/fuel-record.entity';

import { UserEntity }          from '@modules/users/domain/entities/user.entity';
import { DriverLicenseEntity } from '@modules/users/domain/entities/driver-license.entity';
import { RoleUserEntity }      from '@modules/roles/domain/entities/role-user.entity';

import { FilesModule }              from '../files/files.module';
import { UsersModule }              from '@modules/users/users.module';
import { GpsModule }                from '@modules/gps/gps.module';
import { VehicleGpsProviderEntity } from '@modules/logistics/domain/entities/vehicle-gps-provider.entity';
import { GpsHandler }               from '@modules/logistics/handlers/gps.handler';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      VehicleEntity,
      VehicleSessionEntity,
      VehicleSessionLocationEntity,
      VehicleGpsProviderEntity,
      UserEntity,
      DriverLicenseEntity,
      RoleUserEntity,
      GpsEntity,
      MaintenanceRecordEntity,
      MaintenanceAlertEntity,
      VehicleDocumentEntity,
      FuelRecordEntity
    ]),
    FilesModule,
    UsersModule,
    GpsModule
  ],
  controllers: [
    VehiclesController,
    DriversController,
    SessionsController,
    GpsController,
    FuelController
  ],
  providers: [
    VehiclesService,
    DriversService,
    SessionsService,
    SessionSchedulerService,
    GpsService,
    MaintenanceService,
    VehicleDocumentsService,
    FuelService,
    MaintenanceScheduler,
    GpsHandler
  ],
  exports: [
    VehiclesService,
    DriversService,
    SessionsService,
    GpsService,
    MaintenanceService,
    VehicleDocumentsService,
    FuelService
  ]
})
export class LogisticsModule {}
