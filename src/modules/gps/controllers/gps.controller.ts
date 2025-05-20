import { Controller, Get, Param } from '@nestjs/common';
import { GpsService }             from '../services/gps.service';

@Controller('gps')
export class GpsController {
  constructor(private readonly gpsService: GpsService) {}

  @Get()
  findAll() {
    return this.gpsService.findAll();
  }

  @Get(':licensePlate')
  findByLicensePlate(@Param('licensePlate') licensePlate: string) {
    return this.gpsService.findByLicensePlate(licensePlate);
  }

  @Get(':licensePlate/latest')
  findLatestByLicensePlate(@Param('licensePlate') licensePlate: string) {
    return this.gpsService.findLatestByLicensePlate(licensePlate);
  }
}
