import { Injectable }                                            from '@nestjs/common';
import { InjectRepository }                                      from '@nestjs/typeorm';
import { Repository }                                            from 'typeorm';
import { VehicleSessionEntity, VehicleSessionStatus }            from '../domain/entities/vehicle-session.entity';
import { VehicleSessionLocationEntity }                          from '../domain/entities/vehicle-session-location.entity';
import { VehicleEntity, VehicleType }                            from '../domain/entities/vehicle.entity';
import { AlertStatus, MaintenanceAlertEntity }                   from '../domain/entities/maintenance-alert.entity';
import { SessionsService }                                       from './sessions.service';
import { VehiclesService }                                       from './vehicles.service';
import { DriversService }                                        from './drivers.service';
import { MaintenanceService }                                    from './maintenance.service';
import { DashboardQueryDto }                                     from '../domain/dto/dashboards/dashboard-query.dto';
import { ActiveSessionsDashboardDto }                            from '../domain/dto/dashboards/active-sessions-dashboard.dto';
import { HistoricalAnalysisDashboardDto }                        from '../domain/dto/dashboards/historical-analysis-dashboard.dto';
import { DriverPerformanceDashboardDto }                         from '../domain/dto/dashboards/driver-performance-dashboard.dto';
import { VehicleUtilizationDashboardDto }                        from '../domain/dto/dashboards/vehicle-utilization-dashboard.dto';
import { GeographicalAnalysisDashboardDto }                      from '../domain/dto/dashboards/geographical-analysis-dashboard.dto';
import { ComplianceSafetyDashboardDto, MaintenanceAlertItemDto } from '../domain/dto/dashboards/compliance-safety-dashboard.dto';
import { UserEntity }                                            from '@modules/users/domain/entities/user.entity';
import { DriverLicenseEntity }                                   from '@modules/users/domain/entities/driver-license.entity';
import { DateTime }                                              from 'luxon';

@Injectable()
export class FleetDashboardsService {
  constructor(
    private readonly sessionsService: SessionsService,
    private readonly vehiclesService: VehiclesService,
    private readonly driversService: DriversService,
    private readonly maintenanceService: MaintenanceService,
    @InjectRepository(VehicleSessionEntity)
    private sessionRepository: Repository<VehicleSessionEntity>,
    @InjectRepository(VehicleSessionLocationEntity)
    private locationRepository: Repository<VehicleSessionLocationEntity>,
    @InjectRepository(VehicleEntity)
    private vehicleRepository: Repository<VehicleEntity>,
    @InjectRepository(UserEntity)
    private userRepository: Repository<UserEntity>,
    @InjectRepository(DriverLicenseEntity)
    private driverLicenseRepository: Repository<DriverLicenseEntity>,
    @InjectRepository(MaintenanceAlertEntity)
    private maintenanceAlertRepository: Repository<MaintenanceAlertEntity>
  ) {}

  /**
   * Get Active Sessions Dashboard data
   */
  async getActiveSessionsDashboard(query: DashboardQueryDto): Promise<ActiveSessionsDashboardDto> {
    const {dateFrom, dateTo} = query;

    console.log(`Fetching active sessions from ${ dateFrom } to ${ dateTo }`);

    // Get active sessions
    const activeSessions = await this.sessionsService.findAllActive(true);

    // Calculate total vehicles
    const totalVehicles = await this.vehicleRepository.count();

    // Calculate active vehicles
    const activeVehicles = activeSessions.length;

    // Calculate total distance
    let totalDistance = 0;
    let totalDurationMinutes = 0;

    // Process each session to calculate metrics
    const sessionDurations = [];
    const averageSpeeds = [];
    const mapVehicles = [];

    for (const session of activeSessions) {
      // Calculate session duration in minutes
      const startTime = new Date(session.startTime);
      const now = new Date();
      const durationMinutes = Math.round((now.getTime() - startTime.getTime()) / (1000 * 60));
      totalDurationMinutes += durationMinutes;

      // Calculate session distance
      let sessionDistance = 0;
      let totalSpeed = 0;
      let speedPoints = 0;

      if (session.gps && session.gps.length > 1) {
        // Calculate distance from location points
        for (let i = 1; i < session.gps.length; i++) {
          const prevLoc = session.gps[i - 1];
          const currLoc = session.gps[i];
          sessionDistance += this.calculateDistance(
            prevLoc.latitude, prevLoc.longitude,
            currLoc.latitude, currLoc.longitude
          );

          // Accumulate speed data if available
          if (currLoc.speed) {
            totalSpeed += currLoc.speed;
            speedPoints++;
          }
        }
      }

      totalDistance += sessionDistance;

      // Add to session durations array
      sessionDurations.push({
        sessionId: session.id,
        driverName: `${ session.driver.firstName } ${ session.driver.lastName }`,
        vehicleLicensePlate: session.vehicle.licensePlate,
        durationMinutes
      });

      // Calculate average speed
      const averageSpeed = speedPoints > 0 ? totalSpeed / speedPoints : 0;
      averageSpeeds.push({
        sessionId: session.id,
        driverName: `${ session.driver.firstName } ${ session.driver.lastName }`,
        vehicleLicensePlate: session.vehicle.licensePlate,
        averageSpeed
      });

      // Get latest location for map
      if (session.gps && session.gps.length > 0) {
        const latestLocation = session.gps[session.gps.length - 1];
        mapVehicles.push({
          sessionId: session.id,
          vehicleId: session.vehicleId,
          driverId: session.driverId,
          vehicleLicensePlate: session.vehicle.licensePlate,
          driverName: `${ session.driver.firstName } ${ session.driver.lastName }`,
          latitude: latestLocation.latitude,
          longitude: latestLocation.longitude,
          heading: 0, // Would need to calculate from previous points
          speed: latestLocation.speed || 0
        });
      }
    }

    // Calculate average duration
    const averageDurationMinutes = activeSessions.length > 0
      ? Math.round(totalDurationMinutes / activeSessions.length)
      : 0;

    // Calculate vehicles in use percentage
    const vehiclesInUsePercentage = totalVehicles > 0
      ? (activeVehicles / totalVehicles) * 100
      : 0;

    return {
      activeSessions: {
        count: activeSessions.length
      },
      averageDuration: {
        averageMinutes: averageDurationMinutes
      },
      totalDistance: {
        totalKm: parseFloat(totalDistance.toFixed(2))
      },
      vehiclesInUsePercentage: {
        percentage: parseFloat(vehiclesInUsePercentage.toFixed(2)),
        activeCount: activeVehicles,
        totalCount: totalVehicles
      },
      sessionDurationChart: {
        sessions: sessionDurations
      },
      averageSpeedChart: {
        sessions: averageSpeeds
      },
      mapData: {
        vehicles: mapVehicles
      }
    };
  }

  /**
   * Get Historical Analysis Dashboard data
   */
  async getHistoricalAnalysisDashboard(query: DashboardQueryDto): Promise<HistoricalAnalysisDashboardDto> {
    // Define date range for queries
    const dateFrom = query.dateFrom ? new Date(query.dateFrom) : new Date(new Date().setMonth(new Date().getMonth() - 1));
    const dateTo = query.dateTo ? new Date(query.dateTo) : new Date();

    // Get all sessions in the date range
    const queryBuilder = this.sessionRepository.createQueryBuilder('session')
      .leftJoinAndSelect('session.vehicle', 'vehicle')
      .leftJoinAndSelect('session.driver', 'driver')
      .leftJoinAndSelect('session.gps', 'locations')
      .where('session.startTime BETWEEN :dateFrom AND :dateTo', {dateFrom, dateTo});

    if (query.vehicleType) {
      queryBuilder.andWhere('vehicle.type = :vehicleType', {vehicleType: query.vehicleType});
    }

    if (query.vehicleId) {
      queryBuilder.andWhere('session.vehicleId = :vehicleId', {vehicleId: query.vehicleId});
    }

    if (query.driverId) {
      queryBuilder.andWhere('session.driverId = :driverId', {driverId: query.driverId});
    }

    const sessions = await queryBuilder.getMany();

    // Calculate total distance and time in route
    let totalDistance = 0;
    let totalTimeInRouteMinutes = 0;

    // Prepare data for charts
    const sessionsPerDay = new Map<string, number>();
    const durationByDayOfWeek = new Map<number, { total: number, count: number }>();
    const statusDistribution = new Map<string, number>();
    const durationHistogram = new Map<string, { min: number, max: number, count: number }>();

    // Define duration ranges for histogram (in minutes)
    const durationRanges = [
      {range: '0-30min', min: 0, max: 30},
      {range: '30min-1h', min: 30, max: 60},
      {range: '1-2h', min: 60, max: 120},
      {range: '2-4h', min: 120, max: 240},
      {range: '4-8h', min: 240, max: 480},
      {range: '8h+', min: 480, max: Infinity}
    ];

    // Initialize duration histogram
    durationRanges.forEach(range => {
      durationHistogram.set(range.range, {min: range.min, max: range.max, count: 0});
    });

    // Process each session
    for (const session of sessions) {
      // Calculate session distance
      let sessionDistance = 0;

      if (session.gps && session.gps.length > 1) {
        for (let i = 1; i < session.gps.length; i++) {
          const prevLoc = session.gps[i - 1];
          const currLoc = session.gps[i];
          sessionDistance += this.calculateDistance(
            prevLoc.latitude, prevLoc.longitude,
            currLoc.latitude, currLoc.longitude
          );
        }
      }

      totalDistance += sessionDistance;

      // Calculate session duration
      const startTime = new Date(session.startTime);
      const endTime = session.endTime ? new Date(session.endTime) : new Date();
      const durationMinutes = Math.round((endTime.getTime() - startTime.getTime()) / (1000 * 60));
      totalTimeInRouteMinutes += durationMinutes;

      // Add to sessions per day
      const dateKey = startTime.toISOString().split('T')[0]; // YYYY-MM-DD
      sessionsPerDay.set(dateKey, (sessionsPerDay.get(dateKey) || 0) + 1);

      // Add to duration by day of week
      const dayOfWeek = startTime.getDay(); // 0-6, where 0 is Sunday
      const dayData = durationByDayOfWeek.get(dayOfWeek) || {total: 0, count: 0};
      dayData.total += durationMinutes;
      dayData.count += 1;
      durationByDayOfWeek.set(dayOfWeek, dayData);

      // Add to status distribution
      statusDistribution.set(session.status, (statusDistribution.get(session.status) || 0) + 1);

      // Add to duration histogram
      for (const [ , data ] of durationHistogram.entries()) {
        if (durationMinutes >= data.min && durationMinutes < data.max) {
          data.count += 1;
          break;
        }
      }
    }

    // Calculate average distance per session
    const averageDistance = sessions.length > 0 ? totalDistance / sessions.length : 0;

    // Prepare sessions per day chart data
    const sessionsPerDayData = Array.from(sessionsPerDay.entries())
      .map(([ date, count ]) => ({date, count}))
      .sort((a, b) => a.date.localeCompare(b.date));

    // Prepare duration by day of week chart data
    const dayNames = [ 'Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday' ];
    const durationByDayOfWeekData = Array.from(durationByDayOfWeek.entries())
      .map(([ day, data ]) => ({
        dayOfWeek: dayNames[day],
        dayNumber: day,
        averageDurationMinutes: data.count > 0 ? Math.round(data.total / data.count) : 0
      }))
      .sort((a, b) => a.dayNumber - b.dayNumber);

    // Prepare status distribution chart data
    const statusLabels = {
      [VehicleSessionStatus.ACTIVE]: 'Active',
      [VehicleSessionStatus.COMPLETED]: 'Completed',
      [VehicleSessionStatus.CANCELLED]: 'Cancelled',
      [VehicleSessionStatus.EXPIRED]: 'Expired'
    };

    const statusDistributionData = Array.from(statusDistribution.entries())
      .map(([ status, count ]) => ({
        status,
        statusLabel: statusLabels[status] || status,
        count
      }));

    // Prepare duration histogram chart data
    const durationHistogramData = Array.from(durationHistogram.entries())
      .map(([ range, data ]) => ({
        range,
        minMinutes: data.min,
        maxMinutes: data.max === Infinity ? null : data.max,
        count: data.count
      }));

    return {
      totalSessions: {
        count: sessions.length
      },
      totalDistance: {
        totalKm: parseFloat(totalDistance.toFixed(2))
      },
      totalTimeInRoute: {
        totalMinutes: totalTimeInRouteMinutes
      },
      averageDistancePerSession: {
        averageKm: parseFloat(averageDistance.toFixed(2))
      },
      sessionsPerDayChart: {
        data: sessionsPerDayData
      },
      averageDurationByDayOfWeekChart: {
        data: durationByDayOfWeekData
      },
      sessionStatusDistributionChart: {
        data: statusDistributionData
      },
      sessionDurationHistogramChart: {
        data: durationHistogramData
      }
    };
  }

  /**
   * Get Driver Performance Dashboard data
   */
  async getDriverPerformanceDashboard(query: DashboardQueryDto): Promise<DriverPerformanceDashboardDto> {
    // Define date range for queries
    const dateFrom = query.dateFrom ? new Date(query.dateFrom) : new Date(new Date().setMonth(new Date().getMonth() - 1));
    const dateTo = query.dateTo ? new Date(query.dateTo) : new Date();

    // Get all sessions in the date range
    const queryBuilder = this.sessionRepository.createQueryBuilder('session')
      .leftJoinAndSelect('session.vehicle', 'vehicle')
      .leftJoinAndSelect('session.driver', 'driver')
      .leftJoinAndSelect('session.gps', 'locations')
      .leftJoinAndSelect('driver.driverLicense', 'driverLicense')
      .where('session.startTime BETWEEN :dateFrom AND :dateTo', {dateFrom, dateTo});

    if (query.vehicleType) {
      queryBuilder.andWhere('vehicle.type = :vehicleType', {vehicleType: query.vehicleType});
    }

    if (query.licenseType) {
      queryBuilder.andWhere('driverLicense.licenseType = :licenseType', {licenseType: query.licenseType});
    }

    const sessions = await queryBuilder.getMany();

    // Group sessions by driver
    const driverSessions = new Map<string, {
      driver: any,
      sessions: VehicleSessionEntity[],
      totalDistance: number
    }>();

    // Process each session
    for (const session of sessions) {
      const driverId = session.driverId;

      if (!driverSessions.has(driverId)) {
        driverSessions.set(driverId, {
          driver: session.driver,
          sessions: [],
          totalDistance: 0
        });
      }

      const driverData = driverSessions.get(driverId);
      driverData.sessions.push(session);

      // Calculate session distance
      let sessionDistance = 0;

      if (session.gps && session.gps.length > 1) {
        for (let i = 1; i < session.gps.length; i++) {
          const prevLoc = session.gps[i - 1];
          const currLoc = session.gps[i];
          sessionDistance += this.calculateDistance(
            prevLoc.latitude, prevLoc.longitude,
            currLoc.latitude, currLoc.longitude
          );
        }
      }

      driverData.totalDistance += sessionDistance;
    }

    // Calculate metrics
    const activeDrivers = driverSessions.size;

    // Find most active driver
    let mostActiveDriver = null;
    let maxSessions = 0;

    for (const [ driverId, data ] of driverSessions.entries()) {
      if (data.sessions.length > maxSessions) {
        maxSessions = data.sessions.length;
        mostActiveDriver = {
          driverId,
          firstName: data.driver.firstName,
          lastName: data.driver.lastName,
          sessionCount: data.sessions.length
        };
      }
    }

    // Calculate average sessions per driver
    const totalSessions = sessions.length;
    const averageSessionsPerDriver = activeDrivers > 0 ? totalSessions / activeDrivers : 0;

    // Calculate average distance per driver
    let totalDistance = 0;
    for (const data of driverSessions.values()) {
      totalDistance += data.totalDistance;
    }
    const averageDistancePerDriver = activeDrivers > 0 ? totalDistance / activeDrivers : 0;

    // Prepare top drivers by sessions chart data
    const topDriversBySessionsData = Array.from(driverSessions.entries())
      .map(([ driverId, data ]) => ({
        driverId,
        firstName: data.driver.firstName,
        lastName: data.driver.lastName,
        sessionCount: data.sessions.length
      }))
      .sort((a, b) => b.sessionCount - a.sessionCount)
      .slice(0, 10);

    // Prepare top drivers by distance chart data
    const topDriversByDistanceData = Array.from(driverSessions.entries())
      .map(([ driverId, data ]) => ({
        driverId,
        firstName: data.driver.firstName,
        lastName: data.driver.lastName,
        totalDistance: parseFloat(data.totalDistance.toFixed(2))
      }))
      .sort((a, b) => b.totalDistance - a.totalDistance)
      .slice(0, 10);

    // Prepare sessions by license type chart data
    const sessionsByLicenseType = new Map<string, { type: string, count: number }>();

    for (const session of sessions) {
      if (session.driver.driverLicense && session.driver.driverLicense.length > 0) {
        // A driver can have multiple licenses, one per type
        for (const license of session.driver.driverLicense) {
          const licenseType = license.licenseType;
          if (!sessionsByLicenseType.has(licenseType)) {
            sessionsByLicenseType.set(licenseType, {type: licenseType, count: 0});
          }
          sessionsByLicenseType.get(licenseType).count += 1;
        }
      }
    }

    const sessionsByLicenseTypeData = Array.from(sessionsByLicenseType.values())
      .map(data => ({
        licenseType: data.type,
        licenseLabel: `Type ${ data.type }`,
        sessionCount: data.count
      }));

    // Prepare driver activity trend chart data
    // Get weeks in the date range
    const weeks = [];
    const currentDate = new Date(dateFrom);
    while (currentDate <= dateTo) {
      // Get the start of the week (Sunday)
      const startOfWeek = new Date(currentDate);
      startOfWeek.setDate(currentDate.getDate() - currentDate.getDay());

      const weekKey = startOfWeek.toISOString().split('T')[0]; // YYYY-MM-DD
      if (!weeks.includes(weekKey)) {
        weeks.push(weekKey);
      }

      // Move to next week
      currentDate.setDate(currentDate.getDate() + 7);
    }

    // Get top 5 drivers by session count
    const top5Drivers = topDriversBySessionsData.slice(0, 5);

    // Calculate sessions by week for each driver
    const driverActivityTrend = top5Drivers.map(driver => {
      const driverData = driverSessions.get(driver.driverId);
      const sessionsByWeek = weeks.map(weekStart => {
        const weekStartDate = new Date(weekStart);
        const weekEndDate = new Date(weekStartDate);
        weekEndDate.setDate(weekEndDate.getDate() + 6);

        return driverData.sessions.filter(session => {
          const sessionDate = new Date(session.startTime);
          return sessionDate >= weekStartDate && sessionDate <= weekEndDate;
        }).length;
      });

      return {
        driverId: driver.driverId,
        firstName: driver.firstName,
        lastName: driver.lastName,
        sessionsByWeek
      };
    });

    return {
      totalActiveDrivers: {
        count: activeDrivers
      },
      mostActiveDriver: mostActiveDriver || {
        driverId: '',
        firstName: '',
        lastName: '',
        sessionCount: 0
      },
      averageSessionsPerDriver: {
        average: parseFloat(averageSessionsPerDriver.toFixed(2))
      },
      averageDistancePerDriver: {
        averageKm: parseFloat(averageDistancePerDriver.toFixed(2))
      },
      topDriversBySessionsChart: {
        drivers: topDriversBySessionsData
      },
      topDriversByDistanceChart: {
        drivers: topDriversByDistanceData
      },
      sessionsByLicenseTypeChart: {
        data: sessionsByLicenseTypeData
      },
      driverActivityTrendChart: {
        weeks,
        drivers: driverActivityTrend
      }
    };
  }

  /**
   * Get Vehicle Utilization Dashboard data
   */
  async getVehicleUtilizationDashboard(query: DashboardQueryDto): Promise<VehicleUtilizationDashboardDto> {
    // Define date range for queries
    const dateFrom = query.dateFrom ? new Date(query.dateFrom) : new Date(new Date().setMonth(new Date().getMonth() - 1));
    const dateTo = query.dateTo ? new Date(query.dateTo) : new Date();

    // Get all sessions in the date range
    const queryBuilder = this.sessionRepository.createQueryBuilder('session')
      .leftJoinAndSelect('session.vehicle', 'vehicle')
      .leftJoinAndSelect('session.driver', 'driver')
      .leftJoinAndSelect('session.gps', 'locations')
      .where('session.startTime BETWEEN :dateFrom AND :dateTo', {dateFrom, dateTo});

    if (query.vehicleType) {
      queryBuilder.andWhere('vehicle.type = :vehicleType', {vehicleType: query.vehicleType});
    }

    if (query.vehicleId) {
      queryBuilder.andWhere('session.vehicleId = :vehicleId', {vehicleId: query.vehicleId});
    }

    if (query.driverId) {
      queryBuilder.andWhere('session.driverId = :driverId', {driverId: query.driverId});
    }

    const sessions = await queryBuilder.getMany();

    // Group sessions by vehicle
    const vehicleSessions = new Map<string, {
      vehicle: any,
      sessions: VehicleSessionEntity[],
      totalDistance: number
    }>();

    // Process each session
    for (const session of sessions) {
      const vehicleId = session.vehicleId;

      if (!vehicleSessions.has(vehicleId)) {
        vehicleSessions.set(vehicleId, {
          vehicle: session.vehicle,
          sessions: [],
          totalDistance: 0
        });
      }

      const vehicleData = vehicleSessions.get(vehicleId);
      vehicleData.sessions.push(session);

      // Calculate session distance
      let sessionDistance = 0;

      if (session.gps && session.gps.length > 1) {
        for (let i = 1; i < session.gps.length; i++) {
          const prevLoc = session.gps[i - 1];
          const currLoc = session.gps[i];
          sessionDistance += this.calculateDistance(
            prevLoc.latitude, prevLoc.longitude,
            currLoc.latitude, currLoc.longitude
          );
        }
      }

      vehicleData.totalDistance += sessionDistance;
    }

    // Calculate metrics
    const activeVehicles = vehicleSessions.size;

    // Find most used vehicle
    let mostUsedVehicle = null;
    let maxSessions = 0;

    for (const [ vehicleId, data ] of vehicleSessions.entries()) {
      if (data.sessions.length > maxSessions) {
        maxSessions = data.sessions.length;
        mostUsedVehicle = {
          vehicleId,
          displayName: `${ data.vehicle.brand } ${ data.vehicle.model }`,
          licensePlate: data.vehicle.licensePlate,
          sessionCount: data.sessions.length
        };
      }
    }

    // Calculate average sessions per vehicle
    const totalSessions = sessions.length;
    const averageSessionsPerVehicle = activeVehicles > 0 ? totalSessions / activeVehicles : 0;

    // Calculate average distance per vehicle
    let totalDistance = 0;
    for (const data of vehicleSessions.values()) {
      totalDistance += data.totalDistance;
    }
    const averageDistancePerVehicle = activeVehicles > 0 ? totalDistance / activeVehicles : 0;

    // Prepare top vehicles by usage chart data
    const topVehiclesByUsageData = Array.from(vehicleSessions.entries())
      .map(([ vehicleId, data ]) => ({
        vehicleId,
        displayName: `${ data.vehicle.brand } ${ data.vehicle.model }`,
        licensePlate: data.vehicle.licensePlate,
        sessionCount: data.sessions.length
      }))
      .sort((a, b) => b.sessionCount - a.sessionCount)
      .slice(0, 10);

    // Prepare top vehicles by distance chart data
    const topVehiclesByDistanceData = Array.from(vehicleSessions.entries())
      .map(([ vehicleId, data ]) => ({
        vehicleId,
        displayName: `${ data.vehicle.brand } ${ data.vehicle.model }`,
        licensePlate: data.vehicle.licensePlate,
        totalDistance: parseFloat(data.totalDistance.toFixed(2))
      }))
      .sort((a, b) => b.totalDistance - a.totalDistance)
      .slice(0, 10);

    // Prepare usage by vehicle type chart data
    const usageByVehicleType = new Map<string, { type: string, count: number }>();

    for (const session of sessions) {
      const vehicleType = session.vehicle.type;
      if (!usageByVehicleType.has(vehicleType)) {
        usageByVehicleType.set(vehicleType, {type: vehicleType, count: 0});
      }
      usageByVehicleType.get(vehicleType).count += 1;
    }

    const usageByVehicleTypeData = Array.from(usageByVehicleType.values())
      .map(data => ({
        vehicleType: data.type,
        typeLabel: this.getVehicleTypeLabel(data.type),
        sessionCount: data.count
      }));

    // Get all vehicles for odometer and cost per km
    const allVehicles = await this.vehicleRepository.find();

    // Prepare cost per km by vehicle chart data
    // This is a simplified calculation - in a real app, you would use actual fuel and maintenance costs
    const costPerKmByVehicleData = allVehicles
      .filter(vehicle => vehicleSessions.has(vehicle.id))
      .map(vehicle => {
        const vehicleData = vehicleSessions.get(vehicle.id);
        // Simplified cost calculation - in reality, this would be based on fuel consumption, maintenance, etc.
        const costPerKm = vehicleData.totalDistance > 0
          ? (Math.random() * 0.5 + 0.1) // Random value between 0.1 and 0.6 for demo
          : 0;

        return {
          vehicleId: vehicle.id,
          displayName: `${ vehicle.brand } ${ vehicle.model }`,
          licensePlate: vehicle.licensePlate,
          costPerKm: parseFloat(costPerKm.toFixed(2))
        };
      })
      .sort((a, b) => b.costPerKm - a.costPerKm);

    // Prepare vehicle odometer chart data
    const vehicleOdometerData = allVehicles.map(vehicle => ({
      vehicleId: vehicle.id,
      displayName: `${ vehicle.brand } ${ vehicle.model }`,
      licensePlate: vehicle.licensePlate,
      odometerReading: vehicle.lastKnownOdometer
    }))
      .sort((a, b) => b.odometerReading - a.odometerReading);

    return {
      totalActiveVehicles: {
        count: activeVehicles
      },
      mostUsedVehicle: mostUsedVehicle || {
        vehicleId: '',
        displayName: '',
        licensePlate: '',
        sessionCount: 0
      },
      averageSessionsPerVehicle: {
        average: parseFloat(averageSessionsPerVehicle.toFixed(2))
      },
      averageDistancePerVehicle: {
        averageKm: parseFloat(averageDistancePerVehicle.toFixed(2))
      },
      topVehiclesByUsageChart: {
        vehicles: topVehiclesByUsageData
      },
      topVehiclesByDistanceChart: {
        vehicles: topVehiclesByDistanceData
      },
      usageByVehicleTypeChart: {
        data: usageByVehicleTypeData
      },
      costPerKmByVehicleChart: {
        vehicles: costPerKmByVehicleData
      },
      vehicleOdometerChart: {
        vehicles: vehicleOdometerData
      }
    };
  }

  /**
   * Get Geographical Analysis Dashboard data
   */
  async getGeographicalAnalysisDashboard(query: DashboardQueryDto): Promise<GeographicalAnalysisDashboardDto> {
    // Define date range for queries
    const dateFrom = query.dateFrom ? new Date(query.dateFrom) : new Date(new Date().setMonth(new Date().getMonth() - 1));
    const dateTo = query.dateTo ? new Date(query.dateTo) : new Date();

    // Get all sessions with GPS data in the date range
    const sessionsQueryBuilder = this.sessionRepository.createQueryBuilder('session')
      .leftJoinAndSelect('session.vehicle', 'vehicle')
      .leftJoinAndSelect('session.driver', 'driver')
      .leftJoinAndSelect('session.gps', 'gps')
      .where('session.startTime BETWEEN :dateFrom AND :dateTo', {dateFrom, dateTo});

    if (query.vehicleId) {
      sessionsQueryBuilder.andWhere('session.vehicleId = :vehicleId', {vehicleId: query.vehicleId});
    }

    if (query.driverId) {
      sessionsQueryBuilder.andWhere('session.driverId = :driverId', {driverId: query.driverId});
    }

    const sessions = await sessionsQueryBuilder.getMany();

    console.log(`Found ${ sessions.length } sessions with GPS data from ${ dateFrom } to ${ dateTo }`);

    // Extract all GPS points from sessions
    const gpsPoints = [];
    for (const session of sessions) {
      if (session.gps && session.gps.length > 0) {
        for (const gps of session.gps) {
          // Filter GPS points by date range if timestamp is available
          const gpsTimestamp = DateTime.fromMillis(+gps.timestamp).toJSDate();
          if (gpsTimestamp >= dateFrom && gpsTimestamp <= dateTo) {
            gpsPoints.push({
              ...gps,
              session: session,
              sessionId: session.id
            });
          }
        }
      }
    }

    // Calculate total GPS points
    const totalGpsPoints = gpsPoints.length;

    // Find maximum speed
    let maxSpeed = 0;
    let maxSpeedGpsPoint = null;

    for (const gpsPoint of gpsPoints) {
      if (gpsPoint.speed && gpsPoint.speed > maxSpeed) {
        maxSpeed = gpsPoint.speed;
        maxSpeedGpsPoint = gpsPoint;
      }
    }

    // Calculate average distance per session
    let totalDistance = 0;

    // Group GPS points by session
    const sessionGpsPoints = new Map<string, any[]>();

    for (const gpsPoint of gpsPoints) {
      const sessionId = gpsPoint.sessionId;
      if (!sessionGpsPoints.has(sessionId)) {
        sessionGpsPoints.set(sessionId, []);
      }
      sessionGpsPoints.get(sessionId).push(gpsPoint);
    }

    // Calculate distance for each session
    for (const [ , sessionGps ] of sessionGpsPoints.entries()) {
      // Sort GPS points by timestamp
      sessionGps.sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime());

      let sessionDistance = 0;

      if (sessionGps.length > 1) {
        for (let i = 1; i < sessionGps.length; i++) {
          const prevGps = sessionGps[i - 1];
          const currGps = sessionGps[i];
          sessionDistance += this.calculateDistance(
            prevGps.latitude, prevGps.longitude,
            currGps.latitude, currGps.longitude
          );
        }
      }

      totalDistance += sessionDistance;
    }

    const averageDistance = sessions.length > 0 ? totalDistance / sessions.length : 0;

    // Calculate most visited areas
    // This is a simplified approach - in a real app, you would use clustering algorithms
    const gridSize = 0.01; // Approximately 1km grid
    const visitedAreas = new Map<string, { lat: number, lng: number, count: number }>();

    for (const gpsPoint of gpsPoints) {
      // Round coordinates to grid
      const gridLat = Math.round(gpsPoint.latitude / gridSize) * gridSize;
      const gridLng = Math.round(gpsPoint.longitude / gridSize) * gridSize;
      const gridKey = `${ gridLat },${ gridLng }`;

      if (!visitedAreas.has(gridKey)) {
        visitedAreas.set(gridKey, {lat: gridLat, lng: gridLng, count: 0});
      }

      visitedAreas.get(gridKey).count += 1;
    }

    // Get top visited areas
    const mostVisitedAreas = Array.from(visitedAreas.values())
      .sort((a, b) => b.count - a.count)
      .slice(0, 20)
      .map(area => ({
        latitude: area.lat,
        longitude: area.lng,
        count: area.count
      }));

    // Prepare speed distribution chart data
    const speedRanges = [
      {range: '0-20 km/h', min: 0, max: 20},
      {range: '20-40 km/h', min: 20, max: 40},
      {range: '40-60 km/h', min: 40, max: 60},
      {range: '60-80 km/h', min: 60, max: 80},
      {range: '80-100 km/h', min: 80, max: 100},
      {range: '100+ km/h', min: 100, max: Infinity}
    ];

    const speedDistribution = new Map<string, { min: number, max: number, count: number }>();

    // Initialize speed distribution
    speedRanges.forEach(range => {
      speedDistribution.set(range.range, {min: range.min, max: range.max, count: 0});
    });

    // Count GPS points in each speed range
    for (const gpsPoint of gpsPoints) {
      if (gpsPoint.speed !== null && gpsPoint.speed !== undefined) {
        for (const [ , data ] of speedDistribution.entries()) {
          if (gpsPoint.speed >= data.min && gpsPoint.speed < data.max) {
            data.count += 1;
            break;
          }
        }
      }
    }

    const speedDistributionData = Array.from(speedDistribution.entries())
      .map(([ range, data ]) => ({
        range,
        minSpeed: data.min,
        maxSpeed: data.max === Infinity ? null : data.max,
        count: data.count
      }));

    // Prepare session start time distribution chart data
    const hourDistribution = Array(24).fill(0).map((_, i) => ({
      hour: i,
      label: `${ i }:00`,
      count: 0
    }));

    for (const session of sessions) {
      const startHour = new Date(session.startTime).getHours();
      hourDistribution[startHour].count += 1;
    }

    // Prepare session end time distribution chart data
    const endHourDistribution = Array(24).fill(0).map((_, i) => ({
      hour: i,
      label: `${ i }:00`,
      count: 0
    }));

    for (const session of sessions) {
      if (session.endTime) {
        const endHour = new Date(session.endTime).getHours();
        endHourDistribution[endHour].count += 1;
      }
    }

    // Prepare heat map data
    // For simplicity, we'll use all GPS points with a random weight
    const heatMapData = gpsPoints.map(gpsPoint => ({
      latitude: gpsPoint.latitude,
      longitude: gpsPoint.longitude,
      weight: Math.random() * 0.5 + 0.5 // Random weight between 0.5 and 1
    }));

    // Prepare frequent routes data
    // This is a simplified approach - in a real app, you would use route clustering algorithms
    const frequentRoutes = [];

    // For demo purposes, we'll create some sample routes
    for (let i = 0; i < 5; i++) {
      const routePoints = [];
      const routeLength = Math.floor(Math.random() * 10) + 5; // 5-15 points

      // Start with a random GPS point
      const startIndex = Math.floor(Math.random() * gpsPoints.length);
      let currentLat = gpsPoints[startIndex].latitude;
      let currentLng = gpsPoints[startIndex].longitude;

      routePoints.push({latitude: currentLat, longitude: currentLng});

      // Generate route points
      for (let j = 1; j < routeLength; j++) {
        // Add small random changes to lat/lng
        currentLat += (Math.random() - 0.5) * 0.01;
        currentLng += (Math.random() - 0.5) * 0.01;

        routePoints.push({latitude: currentLat, longitude: currentLng});
      }

      frequentRoutes.push({
        id: `route-${ i + 1 }`,
        count: Math.floor(Math.random() * 20) + 1, // 1-20 times traveled
        path: routePoints
      });
    }

    return {
      totalGpsPoints: {
        count: totalGpsPoints
      },
      maxSpeed: maxSpeedGpsPoint ? {
        maxSpeedKmh: parseFloat(maxSpeed.toFixed(2)),
        sessionId: maxSpeedGpsPoint.sessionId,
        driverId: maxSpeedGpsPoint.session.driverId,
        vehicleId: maxSpeedGpsPoint.session.vehicleId,
        timestamp: DateTime.fromMillis(+maxSpeedGpsPoint.timestamp).toISO()
      } : {
        maxSpeedKmh: 0,
        sessionId: '',
        driverId: '',
        vehicleId: '',
        timestamp: ''
      },
      averageDistance: {
        averageKm: parseFloat(averageDistance.toFixed(2))
      },
      mostVisitedAreas: {
        areas: mostVisitedAreas
      },
      speedDistributionChart: {
        data: speedDistributionData
      },
      sessionStartTimeDistributionChart: {
        data: hourDistribution
      },
      sessionEndTimeDistributionChart: {
        data: endHourDistribution
      },
      heatMapData: {
        points: heatMapData
      },
      frequentRoutesData: {
        routes: frequentRoutes
      }
    };
  }

  /**
   * Get Compliance & Safety Dashboard data
   */
  async getComplianceSafetyDashboard(query: DashboardQueryDto): Promise<ComplianceSafetyDashboardDto> {
    // Define date range for queries
    const dateFrom = query.dateFrom ? new Date(query.dateFrom) : new Date(new Date().setMonth(new Date().getMonth() - 1));
    const dateTo = query.dateTo ? new Date(query.dateTo) : new Date();

    // Get all sessions in the date range
    const queryBuilder = this.sessionRepository.createQueryBuilder('session')
      .leftJoinAndSelect('session.vehicle', 'vehicle')
      .leftJoinAndSelect('session.driver', 'driver')
      .leftJoinAndSelect('session.gps', 'gps')
      .where('session.startTime BETWEEN :dateFrom AND :dateTo', {dateFrom, dateTo});

    if (query.vehicleType) {
      queryBuilder.andWhere('vehicle.type = :vehicleType', {vehicleType: query.vehicleType});
    }

    if (query.vehicleId) {
      queryBuilder.andWhere('session.vehicleId = :vehicleId', {vehicleId: query.vehicleId});
    }

    if (query.driverId) {
      queryBuilder.andWhere('session.driverId = :driverId', {driverId: query.driverId});
    }

    const sessions = await queryBuilder.getMany();

    // Count expired sessions
    const expiredSessions = sessions.filter(session => session.status === VehicleSessionStatus.EXPIRED);
    const expiredSessionsCount = expiredSessions.length;
    const expiredSessionsPercentage = sessions.length > 0
      ? (expiredSessionsCount / sessions.length) * 100
      : 0;

    // Define speed limit (could be configurable)
    const speedLimit = 120; // km/h

    // Count speed violations
    let speedViolationsCount = 0;
    const speedViolations = [];

    for (const session of sessions) {
      if (session.gps) {
        for (const _gps of session.gps) {
          if (_gps.speed && _gps.speed > speedLimit) {
            speedViolationsCount++;
            speedViolations.push({
              sessionId: session.id,
              driverId: session.driverId,
              firstName: session.driver.firstName,
              lastName: session.driver.lastName,
              vehicleId: session.vehicleId,
              licensePlate: session.vehicle.licensePlate,
              timestamp: DateTime.fromMillis(+_gps.timestamp).toISO(),
              speed: _gps.speed,
              speedLimit,
              excess: _gps.speed - speedLimit
            });
          }
        }
      }
    }

    // Get expiring licenses (next 30 days)
    const thirtyDaysFromNow = new Date();
    thirtyDaysFromNow.setDate(thirtyDaysFromNow.getDate() + 30);

    const expiringLicenses = await this.driverLicenseRepository.createQueryBuilder('license')
      .leftJoinAndSelect('license.user', 'user')
      .where('license.licenseValidTo BETWEEN :now AND :thirtyDays', {
        now: new Date(),
        thirtyDays: thirtyDaysFromNow
      })
      .getMany();

    const expiringLicensesData = expiringLicenses.map(license => {
      const expiryDate = new Date(license.licenseValidTo);
      const today = new Date();
      const daysUntilExpiry = Math.ceil((expiryDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));

      return {
        driverId: license.userId,
        firstName: license.user.firstName,
        lastName: license.user.lastName,
        licenseType: license.licenseType,
        expiryDate: license.licenseValidTo,
        daysUntilExpiry
      };
    }).sort((a, b) => a.daysUntilExpiry - b.daysUntilExpiry);

    // Get maintenance alerts
    const maintenanceAlerts = await this.maintenanceAlertRepository.createQueryBuilder('alert')
      .leftJoinAndSelect('alert.vehicle', 'vehicle')
      .where('alert.status = :resolved', {resolved: AlertStatus.RESOLVED})
      .getMany();

    const maintenanceAlertsData = maintenanceAlerts.map<MaintenanceAlertItemDto>(alert => {
      const today = new Date();
      let daysUntilDue = null;
      let kmUntilDue = null;

      if (alert.dueDate) {
        const dueDate = new Date(alert.dueDate);
        daysUntilDue = Math.ceil((dueDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
      }

      if (alert.thresholdKm && alert.vehicle.lastKnownOdometer) {
        kmUntilDue = alert.thresholdKm - alert.vehicle.lastKnownOdometer;
      }

      return {
        vehicleId: alert.vehicleId,
        brand: alert.vehicle.brand,
        model: alert.vehicle.model,
        licensePlate: alert.vehicle.licensePlate,
        alertType: alert.dueDate ? 'date' : 'odometer',
        dueDate: alert.dueDate,
        dueKm: alert.thresholdKm,
        daysUntilDue,
        kmUntilDue
      };
    }).sort((a, b) => {
      // Sort by days until due (date alerts first)
      if (a.daysUntilDue !== null && b.daysUntilDue !== null) {
        return a.daysUntilDue - b.daysUntilDue;
      }
      // Then by km until due
      if (a.kmUntilDue !== null && b.kmUntilDue !== null) {
        return a.kmUntilDue - b.kmUntilDue;
      }
      // Date alerts before odometer alerts
      if (a.daysUntilDue !== null) return -1;
      if (b.daysUntilDue !== null) return 1;
      return 0;
    });

    // Prepare expired sessions trend chart data
    // Group sessions by month
    const sessionsByMonth = new Map<string, { total: number, expired: number }>();

    for (const session of sessions) {
      const date = new Date(session.startTime);
      const monthKey = `${ date.getFullYear() }-${ String(date.getMonth() + 1).padStart(2, '0') }`;

      if (!sessionsByMonth.has(monthKey)) {
        sessionsByMonth.set(monthKey, {total: 0, expired: 0});
      }

      const monthData = sessionsByMonth.get(monthKey);
      monthData.total += 1;

      if (session.status === VehicleSessionStatus.EXPIRED) {
        monthData.expired += 1;
      }
    }

    const monthNames = [ 'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec' ];

    const expiredSessionsTrendData = Array.from(sessionsByMonth.entries())
      .map(([ month, data ]) => {
        const [ year, monthNum ] = month.split('-');
        const monthIndex = parseInt(monthNum) - 1;
        const percentage = data.total > 0 ? (data.expired / data.total) * 100 : 0;

        return {
          month,
          label: `${ monthNames[monthIndex] } ${ year }`,
          percentage: parseFloat(percentage.toFixed(2))
        };
      })
      .sort((a, b) => a.month.localeCompare(b.month));

    // Prepare incidents by vehicle type chart data
    // For this demo, we'll consider incidents as a combination of expired sessions and speed violations
    const incidentsByVehicleType = new Map<string, number>();

    // Count expired sessions by vehicle type
    for (const session of expiredSessions) {
      const vehicleType = session.vehicle.type;
      incidentsByVehicleType.set(vehicleType, (incidentsByVehicleType.get(vehicleType) || 0) + 1);
    }

    // Add speed violations by vehicle type
    for (const violation of speedViolations) {
      const session = sessions.find(s => s.id === violation.sessionId);
      if (session) {
        const vehicleType = session.vehicle.type;
        incidentsByVehicleType.set(vehicleType, (incidentsByVehicleType.get(vehicleType) || 0) + 1);
      }
    }

    const incidentsByVehicleTypeData = Array.from(incidentsByVehicleType.entries())
      .map(([ type, count ]) => ({
        vehicleType: type,
        typeLabel: this.getVehicleTypeLabel(type),
        incidentCount: count
      }))
      .sort((a, b) => b.incidentCount - a.incidentCount);

    // Prepare incidents by driver chart data
    const incidentsByDriver = new Map<string, { driver: any, count: number }>();

    // Count expired sessions by driver
    for (const session of expiredSessions) {
      const driverId = session.driverId;

      if (!incidentsByDriver.has(driverId)) {
        incidentsByDriver.set(driverId, {
          driver: session.driver,
          count: 0
        });
      }

      incidentsByDriver.get(driverId).count += 1;
    }

    // Add speed violations by driver
    for (const violation of speedViolations) {
      const driverId = violation.driverId;

      if (!incidentsByDriver.has(driverId)) {
        const session = sessions.find(s => s.driverId === driverId);
        if (session) {
          incidentsByDriver.set(driverId, {
            driver: session.driver,
            count: 0
          });
        }
      }

      if (incidentsByDriver.has(driverId)) {
        incidentsByDriver.get(driverId).count += 1;
      }
    }

    const incidentsByDriverData = Array.from(incidentsByDriver.entries())
      .map(([ driverId, data ]) => ({
        driverId,
        firstName: data.driver.firstName,
        lastName: data.driver.lastName,
        incidentCount: data.count
      }))
      .sort((a, b) => b.incidentCount - a.incidentCount);

    return {
      expiredSessions: {
        count: expiredSessionsCount,
        percentage: parseFloat(expiredSessionsPercentage.toFixed(2))
      },
      speedViolations: {
        count: speedViolationsCount,
        speedLimit
      },
      expiringLicenses: {
        count: expiringLicenses.length
      },
      expiredSessionsTrendChart: {
        data: expiredSessionsTrendData
      },
      incidentsByVehicleTypeChart: {
        data: incidentsByVehicleTypeData
      },
      incidentsByDriverChart: {
        drivers: incidentsByDriverData
      },
      expiringLicensesTable: {
        licenses: expiringLicensesData
      },
      maintenanceAlertsTable: {
        alerts: maintenanceAlertsData
      },
      speedViolationsTable: {
        violations: speedViolations.sort((a, b) => b.excess - a.excess).slice(0, 20)
      }
    };
  }

  /**
   * Helper method to calculate distance between two coordinates using Haversine formula
   */
  private calculateDistance(lat1: number, lon1: number, lat2: number, lon2: number): number {
    const R = 6371; // Radius of the earth in km
    const dLat = this.deg2rad(lat2 - lat1);
    const dLon = this.deg2rad(lon2 - lon1);
    const a =
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos(this.deg2rad(lat1)) * Math.cos(this.deg2rad(lat2)) *
      Math.sin(dLon / 2) * Math.sin(dLon / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    const distance = R * c; // Distance in km
    return distance;
  }

  private deg2rad(deg: number): number {
    return deg * (Math.PI / 180);
  }

  /**
   * Helper method to get vehicle type label
   */
  private getVehicleTypeLabel(type: string): string {
    const labels = {
      [VehicleType.SEDAN]: 'Sedan',
      [VehicleType.HATCHBACK]: 'Hatchback',
      [VehicleType.SUV]: 'SUV',
      [VehicleType.PICKUP]: 'Pickup',
      [VehicleType.VAN]: 'Van',
      [VehicleType.TRUCK]: 'Truck',
      [VehicleType.BUS]: 'Bus',
      [VehicleType.MOTORCYCLE]: 'Motorcycle',
      [VehicleType.OTHER]: 'Other'
    };

    return labels[type] || type;
  }
}
