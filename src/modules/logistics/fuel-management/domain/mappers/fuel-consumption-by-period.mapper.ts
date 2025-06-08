import { FuelConsumptionByPeriod } from '@modules/logistics/fuel-management/domain/interfaces/fuel-consumption.interface';

export class FuelConsumptionByPeriodMapper {
  period: string;
  totalLiters: number;
  totalCost: number;
  totalDistance: number;
  averageEfficiency: number;

  // Generated properties
  formattedPeriod: string;
  costPerLiter: number;

  constructor(values: Partial<FuelConsumptionByPeriodMapper>) {
    Object.assign(this, values);
  }

  static toDomain(periodData: FuelConsumptionByPeriod): FuelConsumptionByPeriodMapper {
    // Format period from YYYY-MM to Month YYYY
    const [ year, month ] = periodData.period.split('-');
    const date = new Date(parseInt(year), parseInt(month) - 1);
    const formattedPeriod = date.toLocaleDateString('en-US', {month: 'long', year: 'numeric'});

    // Calculate cost per liter
    const costPerLiter = periodData.totalLiters > 0
      ? parseFloat((periodData.totalCost / periodData.totalLiters).toFixed(2))
      : 0;

    return new FuelConsumptionByPeriodMapper({
      period: periodData.period,
      totalLiters: periodData.totalLiters,
      totalCost: periodData.totalCost,
      totalDistance: periodData.totalDistance,
      averageEfficiency: periodData.averageEfficiency,
      formattedPeriod,
      costPerLiter,
    });
  }

  static toDomainAll(periodsData: FuelConsumptionByPeriod[]): FuelConsumptionByPeriodMapper[] {
    return periodsData.map(periodData => this.toDomain(periodData));
  }
}
