import { registerAs } from '@nestjs/config';

export default registerAs('gps', () => ({
  biogps: {
    apiUrl: process.env.BIOGPS_API_URL || 'https://monitor.biogps.cl/api/get_devices',
    apiHash: process.env.BIOGPS_API_HASH,
  },
  config: {
    defaultTimeout: parseInt(process.env.GPS_DEFAULT_TIMEOUT, 10) || 30000,
    defaultInterval: parseInt(process.env.GPS_DEFAULT_INTERVAL, 10) || 60000,
  },
  osrm: {
    apiUrl: process.env.OSRM_API_URL || 'https://router.project-osrm.org',
  },
}));
