import { Module }        from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';

import { VehiclesController } from './controllers/vehicles.controller';
import { DriversController }  from './controllers/drivers.controller';
import { SessionsController } from './controllers/sessions.controller';
import { GpsController }      from './controllers/gps.controller';

import { VehiclesService } from './services/vehicles.service';
import { DriversService }  from './services/drivers.service';
import { SessionsService } from './services/sessions.service';
import { GpsService }      from './services/gps.service';

import { SessionSchedulerService } from './schedulers/session-scheduler.service';

import { VehicleEntity }                from './domain/entities/vehicle.entity';
import { VehicleSessionEntity }         from './domain/entities/vehicle-session.entity';
import { VehicleSessionLocationEntity } from './domain/entities/vehicle-session-location.entity';
import { GpsEntity }                    from './domain/entities/gps.entity';

import { UserEntity }          from '@modules/users/domain/entities/user.entity';
import { DriverLicenseEntity } from '@modules/users/domain/entities/driver-license.entity';
import { RoleUserEntity }      from '@modules/roles/domain/entities/role-user.entity';

import { FilesModule } from '../files/files.module';
import { UsersModule } from '@modules/users/users.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      VehicleEntity,
      VehicleSessionEntity,
      VehicleSessionLocationEntity,
      UserEntity,
      DriverLicenseEntity,
      RoleUserEntity,
      GpsEntity
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
    GpsService
  ],
  exports: [
    VehiclesService,
    DriversService,
    SessionsService,
    GpsService
  ]
})
export class LogisticsModule {}
