import { Injectable, Logger }       from '@nestjs/common';
import { InjectRepository }         from '@nestjs/typeorm';
import { VehicleGpsProviderEntity } from '@modules/logistics/domain/entities/vehicle-gps-provider.entity';
import { Repository }               from 'typeorm';
import { OnEvent }                  from '@nestjs/event-emitter';
import { VehicleDiscovery }         from '@modules/gps/domain/interfaces/vehicle-discovery.interface';
import { VehicleEntity }            from '@modules/logistics/domain/entities/vehicle.entity';

@Injectable()
export class GpsHandler {
  private readonly logger = new Logger(GpsHandler.name);

  constructor(
    @InjectRepository(VehicleEntity) private readonly vehicleRepository: Repository<VehicleEntity>,
    @InjectRepository(VehicleGpsProviderEntity) private readonly vehicleGpsProviderRepository: Repository<VehicleGpsProviderEntity>,
  ) {}

  @OnEvent('vehicle.gps.provider.added')
  async handleVehicleGpsProviderAddedEvent(vehicleDiscovery: VehicleDiscovery) {
    const {vehicles} = vehicleDiscovery;

    for (const vehicle of vehicles) {
      const vehicleEntity = await this.vehicleRepository.findOne({where: {licensePlate: vehicle.licensePlate}});

      if (!vehicleEntity) continue;

      // Check if the vehicle already has a GPS provider
      const existingGpsProvider = await this.vehicleGpsProviderRepository.findOne({where: {vehicleId: vehicleEntity.id}});

      if (existingGpsProvider) continue;

      const gpsProvider = new VehicleGpsProviderEntity();
      gpsProvider.providerId = vehicle.providerId;
      gpsProvider.vehicleId = vehicleEntity.id;
      gpsProvider.provider = vehicleDiscovery.provider;

      await this.vehicleGpsProviderRepository.save(gpsProvider);
    }
  }
}
