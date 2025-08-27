export interface BiogpsRawItem {
  id: number;
  name: string;
  online: string;
  lat: number;
  lng: number;
  timestamp: number;
  course: number;
  speed: number;
  tail: Array<{ lat: string; lng: string }>;
  total_distance?: number;
  device_data?: {
    plate_number?: string;
    traccar: {
      latestPosition_id: number
    }
  };
}

export interface BiogpsRawGroup {
  items: BiogpsRawItem[];
}

export interface BiogpsRawHistory {
  items: BiogpsRawHistoryItem[];
}

export interface BiogpsRawHistoryItem {
  status: number;
  time: any;
  show: string;
  raw_time: string;
  distance: number;
  driver: any;
  items: BiogpsRawHistoryItemLocation[];
}

export interface BiogpsRawHistoryItemLocation {
  id: number;
  device_id: number;
  item_id: string;
  time: string;
  raw_time: string;
  altitude: number;
  course: number;
  speed: number;
  latitude: number;
  longitude: number;
  lat: number;
  lng: number;
  distance: number;
  other: string;
  color: string;
  valid: number;
  device_time: string;
  server_time: string;
  other_arr: string[];
  sensors_data: SensorsDaum[];
}

export interface SensorsDaum {
  id: string;
  value: number;
}
