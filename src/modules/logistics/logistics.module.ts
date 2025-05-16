import { Module }        from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';

import { VehiclesController } from './controllers/vehicles.controller';
import { DriversController }  from './controllers/drivers.controller';
import { SessionsController } from './controllers/sessions.controller';
import { GpsController }      from './controllers/gps.controller';

import { VehiclesService }         from './services/vehicles.service';
import { DriversService }          from './services/drivers.service';
import { SessionsService }         from './services/sessions.service';
import { GpsService }              from './services/gps.service';
import { MaintenanceService }      from './services/maintenance.service';
import { VehicleDocumentsService } from './services/vehicle-documents.service';

import { SessionSchedulerService } from './schedulers/session-scheduler.service';
import { MaintenanceScheduler }    from './schedulers/maintenance.scheduler';

import { VehicleEntity }                from './domain/entities/vehicle.entity';
import { VehicleSessionEntity }         from './domain/entities/vehicle-session.entity';
import { VehicleSessionLocationEntity } from './domain/entities/vehicle-session-location.entity';
import { GpsEntity }                    from './domain/entities/gps.entity';
import { MaintenanceRecordEntity }      from './domain/entities/maintenance-record.entity';
import { MaintenanceAlertEntity }       from './domain/entities/maintenance-alert.entity';
import { VehicleDocumentEntity }        from './domain/entities/vehicle-document.entity';

import { UserEntity }          from '@modules/users/domain/entities/user.entity';
import { DriverLicenseEntity } from '@modules/users/domain/entities/driver-license.entity';
import { RoleUserEntity }      from '@modules/roles/domain/entities/role-user.entity';

import { FilesModule }              from '../files/files.module';
import { UsersModule }              from '@modules/users/users.module';
import { VehicleGpsProviderEntity } from '@modules/logistics/domain/entities/vehicle-gps-provider.entity';

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
      VehicleDocumentEntity
    ]),
    FilesModule,
    UsersModule
  ],
  controllers: [
    VehiclesController,
    DriversController,
    SessionsController,
    GpsController
  ],
  providers: [
    VehiclesService,
    DriversService,
    SessionsService,
    SessionSchedulerService,
    GpsService,
    MaintenanceService,
    VehicleDocumentsService,
    MaintenanceScheduler
  ],
  exports: [
    VehiclesService,
    DriversService,
    SessionsService,
    GpsService,
    MaintenanceService,
    VehicleDocumentsService
  ]
})
export class LogisticsModule {}
