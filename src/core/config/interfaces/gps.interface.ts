export interface GpsConfig {
  config: {
    defaultTimeout: number;
    defaultInterval: number;
  },
  biogps: {
    apiUrl: string;
    apiHash: string;
  };
  osrm: {
    apiUrl: string;
  };
}
