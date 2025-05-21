import { Injectable, Logger } from '@nestjs/common';
import { OnEvent }            from '@nestjs/event-emitter';
import { InjectRepository }   from '@nestjs/typeorm';
import { VehicleEntity }      from '@modules/logistics/fleet-management/domain/entities/vehicle.entity';
import { Repository }         from 'typeorm';

@Injectable()
export class VehicleHandler {
  private readonly logger = new Logger(VehicleHandler.name);

  constructor(
    @InjectRepository(VehicleEntity) private readonly vehicleRepository: Repository<VehicleEntity>,
  ) {}

  @OnEvent('fuel.refilled')
  async handleFuelLevelChangedEvent(event: any) {
    const {vehicleId, finalOdometer} = event;

    // Find the vehicle by ID
    const vehicle = await this.vehicleRepository.findOne({where: {id: vehicleId}});

    if (!vehicle) {
      console.error(`Vehicle with ID ${ vehicleId } not found.`);
      return;
    }

    // Update the fuel level
    vehicle.lastRefuelingOdometer = finalOdometer;

    // Save the updated vehicle entity
    await this.vehicleRepository.save(vehicle);
  }
}
