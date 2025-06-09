import { FuelConsumptionSummary } from '@modules/logistics/fuel-management/domain/interfaces/fuel-consumption.interface';

export class FuelConsumptionSummaryMapper {
  vehicleId: string;
  vehicle: {
    brand: string;
    model: string;
    licensePlate: string;
  };
  totalRecords: number;
  totalLiters: number;
  totalCost: number;
  totalDistance: number;
  averageEfficiency: number;
  averageCostPerKm: number;

  // Generated properties
  displayName: string;

  constructor(values: Partial<FuelConsumptionSummaryMapper>) {
    Object.assign(this, values);
  }

  static toDomain(summary: FuelConsumptionSummary): FuelConsumptionSummaryMapper {
    const displayName = `${ summary.vehicle.licensePlate } - ${ summary.vehicle.brand } ${ summary.vehicle.model }`;

    return new FuelConsumptionSummaryMapper({
      vehicleId: summary.vehicleId,
      vehicle: summary.vehicle,
      totalRecords: summary.totalRecords,
      totalLiters: summary.totalLiters,
      totalCost: summary.totalCost,
      totalDistance: summary.totalDistance,
      averageEfficiency: summary.averageEfficiency,
      averageCostPerKm: summary.averageCostPerKm,
      displayName,
    });
  }

  static toDomainAll(summaries: FuelConsumptionSummary[]): FuelConsumptionSummaryMapper[] {
    return summaries.map(summary => this.toDomain(summary));
  }
}
