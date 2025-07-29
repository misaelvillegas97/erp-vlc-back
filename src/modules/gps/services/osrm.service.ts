import { Injectable, Logger }                                                                   from '@nestjs/common';
import { ConfigService }                                                                        from '@nestjs/config';
import { HttpService }                                                                          from '@nestjs/axios';
import { firstValueFrom }                                                                       from 'rxjs';
import { AllConfigType }                                                                        from '@core/config/config.type';
import { IOsrmService, OsrmMatchOptions, OsrmMatchResponse, OsrmRoutePoint, OsrmRouteResponse } from '../domain/interfaces/osrm.interface';

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

  /**
   * Generate route polygon from GPS history points using map matching
   * @param points Array of GPS points with latitude, longitude and optional timestamp
   * @param options Optional parameters for the match service
   * @returns Promise with route geometry data
   */
  async generateRouteFromPoints(points: OsrmRoutePoint[], options?: OsrmMatchOptions): Promise<OsrmRouteResponse | null> {
    try {
      if (!points || points.length < 2) {
        this.logger.warn('Insufficient points to generate route. Need at least 2 points.');
        return null;
      }

      // Sort points by timestamp if available
      const sortedPoints = points.sort((a, b) => {
        if (a.timestamp && b.timestamp) {
          return a.timestamp.getTime() - b.timestamp.getTime();
        }
        return 0;
      });

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
        const timestamps = validPoints.map(point =>
          Math.floor(point.timestamp!.getTime() / 1000)
        );
        params.timestamps = timestamps.join(';');
      }

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

      this.logger.log(`Calling OSRM Match API: ${ url }`);
      this.logger.debug(`Match parameters:`, params);

      const response = await firstValueFrom(
        this.httpService.get(url, {params, timeout: 30000})
      );

      const matchResponse = response.data as OsrmMatchResponse;

      if (matchResponse && matchResponse.matchings && matchResponse.matchings.length > 0) {
        const matching = matchResponse.matchings[0];

        // Calculate total distance and duration from all legs
        const totalDistance = matching.legs.reduce((sum, leg) => sum + leg.distance, 0);
        const totalDuration = matching.legs.reduce((sum, leg) => sum + leg.duration, 0);

        const routeResponse: OsrmRouteResponse = {
          geometry: matching.geometry,
          distance: totalDistance,
          duration: totalDuration
        };

        this.logger.log(`Successfully generated matched route with ${ matching.geometry.coordinates.length } points`);
        this.logger.debug(`Route distance: ${ totalDistance }m, duration: ${ totalDuration }s`);
        return routeResponse;
      } else {
        this.logger.warn('No matchings found in OSRM response');
        return null;
      }
    } catch (error) {
      this.logger.error(`Error generating route from OSRM: ${ error.message }`, error.stack);
      return null;
    }
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
}
