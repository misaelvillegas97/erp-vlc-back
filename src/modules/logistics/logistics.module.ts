import { forwardRef, Module } from '@nestjs/common';
import { TypeOrmModule }      from '@nestjs/typeorm';

import { VehiclesController }        from './fleet-management/controllers/vehicles.controller';
import { DriversController }         from './fleet-management/controllers/drivers.controller';
import { SessionsController }        from './fleet-management/controllers/sessions.controller';
import { MaintenanceController }     from './fleet-management/controllers/maintenance.controller';
import { FleetDashboardsController } from './fleet-management/controllers/fleet-dashboards.controller';
import { FuelController }            from './fuel-management/controllers/fuel.controller';

import { VehiclesService }         from './fleet-management/services/vehicles.service';
import { DriversService }          from './fleet-management/services/drivers.service';
import { SessionsService }         from './fleet-management/services/sessions.service';
import { MaintenanceService }      from './fleet-management/services/maintenance.service';
import { FleetDashboardsService }  from './fleet-management/services/fleet-dashboards.service';
import { VehicleDocumentsService } from './fleet-management/services/vehicle-documents.service';
import { FuelService }             from './fuel-management/services/fuel.service';

import { SessionSchedulerService } from '@modules/logistics/fleet-management/schedulers/session-scheduler.service';
import { MaintenanceScheduler }    from '@modules/logistics/fleet-management/schedulers/maintenance.scheduler';

import { VehicleEntity }                from './fleet-management/domain/entities/vehicle.entity';
import { VehicleSessionEntity }         from './fleet-management/domain/entities/vehicle-session.entity';
import { VehicleSessionLocationEntity } from './fleet-management/domain/entities/vehicle-session-location.entity';
import { VehicleSessionRouteEntity }    from './fleet-management/domain/entities/vehicle-session-route.entity';
import { MaintenanceRecordEntity }      from './fleet-management/domain/entities/maintenance-record.entity';
import { MaintenanceAlertEntity }       from './fleet-management/domain/entities/maintenance-alert.entity';
import { VehicleDocumentEntity }        from './fleet-management/domain/entities/vehicle-document.entity';
import { FuelRecordEntity }             from './fuel-management/domain/entities/fuel-record.entity';

import { UserEntity }          from '@modules/users/domain/entities/user.entity';
import { DriverLicenseEntity } from '@modules/users/domain/entities/driver-license.entity';
import { RoleUserEntity }      from '@modules/roles/domain/entities/role-user.entity';

import { FilesModule }              from '../files/files.module';
import { UsersModule }              from '@modules/users/users.module';
import { GpsModule }                from '@modules/gps/gps.module';
import { VehicleGpsProviderEntity } from '@modules/logistics/fleet-management/domain/entities/vehicle-gps-provider.entity';
import { GpsHandler }               from '@modules/logistics/fleet-management/handlers/gps.handler';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      VehicleEntity,
      VehicleSessionEntity,
      VehicleSessionLocationEntity,
      VehicleSessionRouteEntity,
      VehicleGpsProviderEntity,
      UserEntity,
      DriverLicenseEntity,
      RoleUserEntity,
      MaintenanceRecordEntity,
      MaintenanceAlertEntity,
      VehicleDocumentEntity,
      FuelRecordEntity
    ]),
    FilesModule,
    UsersModule,
    forwardRef(() => GpsModule)
  ],
  controllers: [
    VehiclesController,
    DriversController,
    SessionsController,
    MaintenanceController,
    FleetDashboardsController,
    FuelController
  ],
  providers: [
    VehiclesService,
    DriversService,
    SessionsService,
    SessionSchedulerService,
    MaintenanceService,
    FleetDashboardsService,
    VehicleDocumentsService,
    FuelService,
    MaintenanceScheduler,
    GpsHandler
  ],
  exports: [
    TypeOrmModule,
    VehiclesService,
    DriversService,
    SessionsService,
    MaintenanceService,
    FleetDashboardsService,
    VehicleDocumentsService,
    FuelService
  ]
})
export class LogisticsModule {}
