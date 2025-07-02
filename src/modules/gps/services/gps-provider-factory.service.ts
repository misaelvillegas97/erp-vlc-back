import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { InjectRepository }                      from '@nestjs/typeorm';
import { Repository }                            from 'typeorm';
import { IGpsProvider }                          from '../domain/interfaces/gps-provider.interface';
import { BiogpsService }                         from './biogps.service';
import { AppConfigService }                      from '@modules/config/app-config.service';
import { GPSProviderEnum }                       from '../domain/enums/provider.enum';
import { VehicleGpsProviderEntity }              from '@modules/logistics/fleet-management/domain/entities/vehicle-gps-provider.entity';
import { ModuleRef }                             from '@nestjs/core';

@Injectable()
export class GpsProviderFactoryService {
  private readonly logger = new Logger(GpsProviderFactoryService.name);

  constructor(
    private readonly moduleRef: ModuleRef,
    private readonly configService: AppConfigService,
    @InjectRepository(VehicleGpsProviderEntity)
    private readonly vehicleGpsProviderRepository: Repository<VehicleGpsProviderEntity>,
  ) {}

  async getProviderForVehicle(vehicleId: string): Promise<{ provider: IGpsProvider, config: any, historyConfig: any }> {
    // Find the GPS provider assigned to the vehicle
    const vehicleGpsProvider = await this.getVehicleGpsProvider(vehicleId);

    if (!vehicleGpsProvider) {
      throw new NotFoundException(`No GPS provider found for vehicle ${ vehicleId }`);
    }

    // Get the provider configuration
    const config = await this.configService.findFeatureToggleByName(`${ vehicleGpsProvider.provider }-provider`);
    const historyConfig = await this.configService.findFeatureToggleByName(`${ vehicleGpsProvider.provider }-history`);

    if (!config?.enabled) {
      throw new NotFoundException(`GPS provider ${ vehicleGpsProvider.provider } is not enabled`);
    }

    // Load the provider service dynamically
    let providerService: IGpsProvider;

    switch (vehicleGpsProvider.provider) {
      case GPSProviderEnum.BIOGPS:
        providerService = this.moduleRef.get(BiogpsService, {strict: false});
        break;
      // Add cases for future providers here
      default:
        throw new NotFoundException(`GPS provider ${ vehicleGpsProvider.provider } is not implemented`);
    }

    return {provider: providerService, config, historyConfig};
  }

  private async getVehicleGpsProvider(vehicleId: string): Promise<VehicleGpsProviderEntity> {
    // Find the GPS provider assigned to the vehicle
    return await this.vehicleGpsProviderRepository.findOne({where: {vehicleId}});
  }
}
