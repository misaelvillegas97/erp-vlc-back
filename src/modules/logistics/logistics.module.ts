import { Module }                       from '@nestjs/common';
import { TypeOrmModule }                from '@nestjs/typeorm';
import { VehicleEntity }                from './domain/entities/vehicle.entity';
import { DriverEntity }                 from './domain/entities/driver.entity';
import { VehicleSessionEntity }         from './domain/entities/vehicle-session.entity';
import { VehicleSessionLocationEntity } from './domain/entities/vehicle-session-location.entity';
import { VehiclesController }           from './controllers/vehicles.controller';
import { DriversController }            from './controllers/drivers.controller';
import { SessionsController }           from './controllers/sessions.controller';
import { VehiclesService }              from './services/vehicles.service';
import { DriversService }               from './services/drivers.service';
import { SessionsService }              from './services/sessions.service';
import { SessionSchedulerService }      from './schedulers/session-scheduler.service';
import { FilesModule }                  from '../files/files.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      VehicleEntity,
      DriverEntity,
      VehicleSessionEntity,
      VehicleSessionLocationEntity
    ]),
    FilesModule
  ],
  controllers: [
    VehiclesController,
    DriversController,
    SessionsController
  ],
  providers: [
    VehiclesService,
    DriversService,
    SessionsService,
    SessionSchedulerService
  ],
  exports: [
    VehiclesService,
    DriversService,
    SessionsService
  ]
})
export class LogisticsModule {}
