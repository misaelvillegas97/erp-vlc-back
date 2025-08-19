import { Injectable, Logger } from '@nestjs/common';
import { ConfigService }      from '@nestjs/config';
import { HttpService }        from '@nestjs/axios';
import { firstValueFrom }     from 'rxjs';
import { AllConfigType }      from '@core/config/config.type';
import {
  IOsrmService,
  OsrmMatchLeg,
  OsrmMatchOptions,
  OsrmMatchResponse,
  OsrmMatchRoute,
  OsrmRouteGeometry,
  OsrmRoutePoint,
  OsrmRouteResponse,
  OsrmValidationConfig,
  OsrmValidationResult
}                             from '../domain/interfaces/osrm.interface';
import { AxiosError }         from 'axios';

/**
 * Service for handling OSRM (Open Source Routing Machine) route generation
 */
@Injectable()
export class OsrmService implements IOsrmService {
  private readonly logger = new Logger(OsrmService.name);
  private readonly osrmApiUrl: string;

  constructor(
    private readonly configService: ConfigService<AllConfigType>,
    private readonly httpService: HttpService,
  ) {
    this.osrmApiUrl = this.configService.get('gps.osrm.apiUrl', {infer: true});
  }

  isEnabled = (): boolean => {
    return this.osrmApiUrl !== undefined;
  };

  /**
   * Generate route polygon from GPS history points using map matching
   * @param points Array of GPS points with latitude, longitude and optional timestamp
   * @param options Optional parameters for the match service
   * @param validationConfig Optional validation configuration
   * @returns Promise with route geometry data
   */
  async generateRouteFromPoints(
    points: OsrmRoutePoint[],
    options?: OsrmMatchOptions,
    validationConfig?: OsrmValidationConfig
  ): Promise<OsrmRouteResponse | null> {
    this.logger.debug(typeof this.osrmApiUrl, this.osrmApiUrl);
    if (!this.osrmApiUrl) return;

    const maxRetries = validationConfig?.maxRetries || 1;
    let attempt = 0;

    while (attempt < maxRetries) {
      try {
        const routeResponse = await this.generateRouteInternal(points, options);

        if (!routeResponse) return null;

        // Perform validation if enabled
        if (validationConfig?.enableValidation) {
          const expectedValues = validationConfig.expectedDistance !== undefined && validationConfig.expectedDuration !== undefined
            ? {distance: validationConfig.expectedDistance, duration: validationConfig.expectedDuration}
            : this.calculateExpectedValues(points);
          const validationResult = this.validateRouteResponse(routeResponse, expectedValues, validationConfig);

          this.logger.debug(`Route validation result:`, validationResult);

          if (!validationResult.isValid) {
            attempt++;
            this.logger.warn(`Route validation failed (attempt ${ attempt }/${ maxRetries }): ${ validationResult.reason }`);

            if (attempt < maxRetries) {
              this.logger.log(`Retrying route generation...`);
              continue;
            } else {
              this.logger.error(`Route validation failed after ${ maxRetries } attempts. Returning null.`);
              return null;
            }
          } else {
            this.logger.log(`Route validation passed: Distance ${ validationResult.actualDistance.toFixed(0) }m, Duration ${ validationResult.actualDuration.toFixed(0) }s`);
          }
        }

        return routeResponse;
      } catch (error) {
        attempt++;
        this.logger.error(`Error generating route from OSRM (attempt ${ attempt }/${ maxRetries }): ${ error.message }`, error.stack);

        if (attempt >= maxRetries) {
          return null;
        }
      }
    }

    return null;
  }

  /**
   * Internal method to generate route from OSRM API
   * @param points Array of GPS points
   * @param options OSRM match options
   * @returns Promise with route response or null
   */
  private async generateRouteInternal(points: OsrmRoutePoint[], options?: OsrmMatchOptions): Promise<OsrmRouteResponse | null> {
    if (!points || points.length < 2) {
      this.logger.warn('Insufficient points to generate route. Need at least 2 points.');
      return null;
    }

    // Sort points by timestamp if available
    const sortedPoints = points.sort((a, b) => a.timestamp && b.timestamp ? a.timestamp - b.timestamp : 0);

    // Remove duplicate points based on coordinates, only adjacent duplicates
    const uniquePoints: OsrmRoutePoint[] = [];
    for (let i = 0; i < sortedPoints.length; i++) {
      const currentPoint = sortedPoints[i];
      if (i === 0 || (currentPoint.latitude !== sortedPoints[i - 1].latitude || currentPoint.longitude !== sortedPoints[i - 1].longitude)) {
        uniquePoints.push(currentPoint);
      }
    }

    // Validate that we have valid coordinates
    const validPoints = sortedPoints.filter(point => this.isValidPoint(point));
    if (validPoints.length < 2) {
      this.logger.warn('Insufficient valid points to generate route. Need at least 2 valid points.');
      return null;
    }

    // Build coordinates string for OSRM API (longitude,latitude format)
    const coordinates = validPoints
      .map(point => `${ point.longitude },${ point.latitude }`)
      .join(';');

    // OSRM match API endpoint
    const url = `${ this.osrmApiUrl }/match/v1/driving/${ coordinates }`;

    // Build query parameters for match service
    const params: any = {
      geometries: options?.geometries || 'geojson',
      overview: options?.overview || 'full',
      steps: options?.steps ? 'true' : 'false',
      annotations: options?.annotations ? 'true' : 'false',
      gaps: options?.gaps || 'split',
      tidy: options?.tidy ? 'true' : 'false'
    };

    // Add timestamps if available (convert to UNIX epoch seconds)
    if (validPoints.every(point => point.timestamp)) {
      const timestamps = validPoints.map(point => point.timestamp);
      params.timestamps = timestamps.join(';');
    }
    console.log(`Timestamps: ${ params.timestamps }`);

    // Add radiuses if provided (standard deviation of GPS precision)
    if (options?.radiuses && options.radiuses.length > 0) {
      // If radiuses array is shorter than points, repeat the last radius
      const radiuses = validPoints.map((_, index) =>
        options.radiuses![Math.min(index, options.radiuses!.length - 1)]
      );
      params.radiuses = radiuses.join(';');
    } else {
      // Default radius for GPS accuracy (typically 5-10 meters for good GPS)
      const defaultRadius = 10;
      params.radiuses = validPoints.map(() => defaultRadius).join(';');
    }

    // Add waypoints if provided
    if (options?.waypoints && options.waypoints.length > 0) {
      params.waypoints = options.waypoints.join(';');
    }

    this.logger.debug(`Match parameters:`, params);

    const response = await firstValueFrom(
      this.httpService.get(url, {params, timeout: 30000})
    ).catch((error: AxiosError) => {
      this.logger.error(`Error calling OSRM match API: ${ error.message }`, error.stack);
      throw new Error(`OSRM match API request failed: ${ error.message }`);
    });

    const matchResponse = response.data as OsrmMatchResponse;

    if (matchResponse && matchResponse.matchings && matchResponse.matchings.length > 0) {
      this.logger.log(`Found ${ matchResponse.matchings.length } matchings from OSRM`);

      // Combine all matchings into a single geometry using flat map approach
      const combinedGeometry = this.combineMatchingGeometries(matchResponse.matchings);
      const combinedLegs = this.combineMatchingLegs(matchResponse.matchings);

      // Calculate total distance and duration from all matchings
      const totalDistance = matchResponse.matchings.reduce((sum, matching) => sum + matching.distance, 0);
      const totalDuration = matchResponse.matchings.reduce((sum, matching) => sum + matching.duration, 0);

      const routeResponse: OsrmRouteResponse = {
        geometry: combinedGeometry,
        distance: totalDistance,
        duration: totalDuration,
        legs: combinedLegs,
        allMatchings: matchResponse.matchings
      };

      this.logger.debug(`Route distance: ${ totalDistance }m, duration: ${ totalDuration }s, legs: ${ combinedLegs.length }, total matchings: ${ matchResponse.matchings.length }`);
      return routeResponse;
    } else {
      this.logger.warn('No matchings found in OSRM response');
      return null;
    }
  }

  /**
   * Combine multiple matching geometries into a single continuous LineString
   * @param matchings Array of OSRM matchings
   * @returns Combined geometry as a single LineString
   */
  private combineMatchingGeometries(matchings: OsrmMatchRoute[]): OsrmRouteGeometry {
    const allCoordinates: number[][] = [];

    for (const matching of matchings) {
      if (matching.geometry && matching.geometry.coordinates) {
        // Add all coordinates from this matching
        allCoordinates.push(...matching.geometry.coordinates);
      }
    }

    return {
      type: 'LineString',
      coordinates: allCoordinates
    };
  }

  /**
   * Combine legs from all matchings into a single legs array
   * @param matchings Array of OSRM matchings
   * @returns Combined legs array
   */
  private combineMatchingLegs(matchings: OsrmMatchRoute[]): OsrmMatchLeg[] {
    const allLegs: OsrmMatchLeg[] = [];

    for (const matching of matchings) {
      if (matching.legs && matching.legs.length > 0) {
        allLegs.push(...matching.legs);
      }
    }

    return allLegs;
  }

  /**
   * Validate if a point has valid coordinates
   * @param point GPS point to validate
   * @returns boolean indicating if coordinates are valid
   */
  private isValidPoint(point: OsrmRoutePoint): boolean {
    return (
      point &&
      typeof point.latitude === 'number' &&
      typeof point.longitude === 'number' &&
      point.latitude >= -90 &&
      point.latitude <= 90 &&
      point.longitude >= -180 &&
      point.longitude <= 180
    );
  }

  /**
   * Calculate distance between two GPS points using Haversine formula
   * @param point1 First GPS point
   * @param point2 Second GPS point
   * @returns Distance in meters
   */
  private calculateDistance(point1: OsrmRoutePoint, point2: OsrmRoutePoint): number {
    const R = 6371000; // Earth's radius in meters
    const lat1Rad = (point1.latitude * Math.PI) / 180;
    const lat2Rad = (point2.latitude * Math.PI) / 180;
    const deltaLatRad = ((point2.latitude - point1.latitude) * Math.PI) / 180;
    const deltaLngRad = ((point2.longitude - point1.longitude) * Math.PI) / 180;

    const a = Math.sin(deltaLatRad / 2) * Math.sin(deltaLatRad / 2) +
      Math.cos(lat1Rad) * Math.cos(lat2Rad) *
      Math.sin(deltaLngRad / 2) * Math.sin(deltaLngRad / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

    return R * c;
  }

  /**
   * Calculate expected distance and duration from GPS points
   * @param points Array of GPS points
   * @returns Object with expected distance (meters) and duration (seconds)
   */
  private calculateExpectedValues(points: OsrmRoutePoint[]): { distance: number; duration: number } {
    let totalDistance = 0;
    let totalDuration = 0;

    for (let i = 1; i < points.length; i++) {
      const prevPoint = points[i - 1];
      const currentPoint = points[i];

      // Calculate distance between consecutive points
      totalDistance += this.calculateDistance(prevPoint, currentPoint);

      if (prevPoint.timestamp && currentPoint.timestamp) {
        const timeDiff = Math.abs(currentPoint.timestamp - prevPoint.timestamp);
        totalDuration += timeDiff / 1000;
      }
    }

    return {distance: totalDistance, duration: totalDuration};
  }

  /**
   * Validate OSRM route response against expected values from GPS points
   * @param routeResponse OSRM route response
   * @param expectedValues Expected distance and duration from GPS points
   * @param config Validation configuration
   * @returns Validation result
   */
  private validateRouteResponse(
    routeResponse: OsrmRouteResponse,
    expectedValues: { distance: number; duration: number },
    config: OsrmValidationConfig
  ): OsrmValidationResult {
    const distanceDifferencePercent = expectedValues.distance > 0
      ? Math.abs(routeResponse.distance - expectedValues.distance) / expectedValues.distance
      : 0;

    const durationDifferencePercent = expectedValues.duration > 0
      ? Math.abs(routeResponse.duration - expectedValues.duration) / expectedValues.duration
      : 0;

    const isDistanceValid = distanceDifferencePercent <= config.distanceTolerancePercent;
    const isDurationValid = durationDifferencePercent <= config.durationTolerancePercent;
    const isValid = isDistanceValid && isDurationValid;

    let reason: string | undefined;
    if (!isValid) {
      const reasons: string[] = [];
      if (!isDistanceValid) {
        reasons.push(`Distance difference: ${ (distanceDifferencePercent * 100).toFixed(1) }% (expected: ${ expectedValues.distance.toFixed(0) }m, actual: ${ routeResponse.distance.toFixed(0) }m)`);
      }
      if (!isDurationValid) {
        reasons.push(`Duration difference: ${ (durationDifferencePercent * 100).toFixed(1) }% (expected: ${ expectedValues.duration.toFixed(0) }s, actual: ${ routeResponse.duration.toFixed(0) }s)`);
      }
      reason = reasons.join('; ');
    }

    return {
      isValid,
      expectedDistance: expectedValues.distance,
      actualDistance: routeResponse.distance,
      expectedDuration: expectedValues.duration,
      actualDuration: routeResponse.duration,
      distanceDifferencePercent,
      durationDifferencePercent,
      reason
    };
  }
}


