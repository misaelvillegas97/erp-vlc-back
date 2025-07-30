export interface OsrmRoutePoint {
  latitude: number;
  longitude: number;
  timestamp?: number;
}

export interface OsrmRouteGeometry {
  coordinates: number[][];
  type: string;
}

export interface OsrmRouteResponse {
  geometry: OsrmRouteGeometry;
  distance: number;
  duration: number;
  legs?: OsrmMatchLeg[];
  allMatchings?: OsrmMatchRoute[];
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

export interface OsrmValidationConfig {
  /** Maximum allowed percentage difference for distance validation (e.g., 0.5 = 50%) */
  distanceTolerancePercent: number;
  /** Maximum allowed percentage difference for duration validation (e.g., 0.5 = 50%) */
  durationTolerancePercent: number;
  /** Maximum number of retry attempts when validation fails */
  maxRetries: number;
  /** Enable/disable validation */
  enableValidation: boolean;
  /** Expected distance in meters (if provided, will use this instead of calculating from GPS points) */
  expectedDistance?: number;
  /** Expected duration in seconds (if provided, will use this instead of calculating from GPS points) */
  expectedDuration?: number;
}

export interface OsrmValidationResult {
  isValid: boolean;
  expectedDistance: number;
  actualDistance: number;
  expectedDuration: number;
  actualDuration: number;
  distanceDifferencePercent: number;
  durationDifferencePercent: number;
  reason?: string;
}

export interface IOsrmService {
  /**
   * Generate route polygon from GPS history points using map matching
   * @param points Array of GPS points with latitude, longitude and optional timestamp
   * @param options Optional parameters for the match service
   * @param validationConfig Optional validation configuration
   * @returns Promise with route geometry data
   */
  generateRouteFromPoints(
    points: OsrmRoutePoint[],
    options?: OsrmMatchOptions,
    validationConfig?: OsrmValidationConfig
  ): Promise<OsrmRouteResponse | null>;
}
