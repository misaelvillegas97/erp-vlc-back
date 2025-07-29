export interface OsrmRoutePoint {
  latitude: number;
  longitude: number;
  timestamp?: Date;
}

export interface OsrmRouteGeometry {
  coordinates: number[][];
  type: string;
}

export interface OsrmRouteResponse {
  geometry: OsrmRouteGeometry;
  distance: number;
  duration: number;
}

export interface OsrmMatchOptions {
  steps?: boolean;
  geometries?: 'polyline' | 'polyline6' | 'geojson';
  annotations?: boolean | 'nodes' | 'distance' | 'duration' | 'datasources' | 'weight' | 'speed';
  overview?: 'simplified' | 'full' | 'false';
  timestamps?: number[];
  radiuses?: number[];
  gaps?: 'split' | 'ignore';
  tidy?: boolean;
  waypoints?: number[];
}

export interface OsrmMatchLeg {
  distance: number;
  duration: number;
  steps?: any[];
}

export interface OsrmMatchRoute {
  geometry: OsrmRouteGeometry;
  legs: OsrmMatchLeg[];
  distance: number;
  duration: number;
  weight_name?: string;
  weight?: number;
}

export interface OsrmMatchResponse {
  matchings: OsrmMatchRoute[];
  tracepoints: Array<{
    waypoint_index?: number;
    matchings_index?: number;
    alternatives_count?: number;
    distance?: number;
    location?: number[];
  } | null>;
}

export interface IOsrmService {
  /**
   * Generate route polygon from GPS history points using map matching
   * @param points Array of GPS points with latitude, longitude and optional timestamp
   * @param options Optional parameters for the match service
   * @returns Promise with route geometry data
   */
  generateRouteFromPoints(points: OsrmRoutePoint[], options?: OsrmMatchOptions): Promise<OsrmRouteResponse | null>;
}
