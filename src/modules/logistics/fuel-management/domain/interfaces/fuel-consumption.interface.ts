/**
 * Interface for the summary of fuel consumption by vehicle
 */
export interface FuelConsumptionSummary {
  vehicleId: string;
  vehicleInfo: {
    brand: string;
    model: string;
    licensePlate: string;
  };
  totalRecords: number;        // Total number of records
  totalLiters: number;         // Total liters consumed
  totalCost: number;           // Total cost
  totalDistance: number;       // Total distance traveled
  averageEfficiency: number;   // Average efficiency (km/l)
  averageCostPerKm: number;    // Average cost per kilometer
}

/**
 * Interface for the analysis of fuel consumption by period
 */
export interface FuelConsumptionByPeriod {
  period: string;              // Period (year-month)
  totalLiters: number;         // Total liters consumed
  totalCost: number;           // Total cost
  totalDistance: number;       // Total distance traveled
  averageEfficiency: number;   // Average efficiency (km/l)
}
