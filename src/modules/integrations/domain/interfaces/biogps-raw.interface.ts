export interface BiogpsRawItem {
  name: string;
  online: string;
  lat: number;
  lng: number;
  timestamp: number;
  speed: number;
  tail: Array<{ lat: string; lng: string }>;
  total_distance?: number;
  device_data?: {
    plate_number?: string;
  };
}

export interface BiogpsRawGroup {
  items: BiogpsRawItem[];
}
