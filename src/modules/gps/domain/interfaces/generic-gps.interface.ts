export interface GenericGPS {
  vehicleId?: string;
  licensePlate?: string;
  status: string;
  currentLocation: {
    lat: number;
    lng: number;
    timestamp: number;
  };
  lastLocations: Array<{
    lat: number;
    lng: number;
  }>;
  speed?: number;
  course?: number;
  totalDistance?: number;
  referenceId?: string;
  timestamp?: string;
  provider?: string;
}
