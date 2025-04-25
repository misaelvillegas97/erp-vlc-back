export interface GenericGPS {
  licensePlate: string;
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
  totalDistance?: number;
}
