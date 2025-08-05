import { CallHandler, ExecutionContext, Injectable, NestInterceptor } from '@nestjs/common';
import { mergeMap, Observable }                                       from 'rxjs';
import { AuditService }                                               from '@modules/audit/services/audit.service';
import { createHash }                                                 from 'crypto';
import geoip                                                          from 'geoip-lite';
import { v4 }                                                         from 'uuid';

@Injectable()
export class AuditInterceptor implements NestInterceptor {
  constructor(private readonly auditService: AuditService) {}

  intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
    const request = context.switchToHttp().getRequest();
    const start = Date.now();

    const { headers, user, ip, body } = request;
    const userId = user?.id;
    const sessionId = headers['x-session-id'];
    const deviceId = headers['x-device-id'];
    const userAgent = headers['user-agent'];
    const authHeader = headers['authorization'];
    const authType = authHeader ? authHeader.split(' ')[0] : undefined;
    const userRoles = user?.roles;
    const scopes = user?.scopes;
    const requestId = headers['x-request-id'] || request.id || v4();
    const traceId = headers['x-trace-id'];
    const appVersion = headers['x-app-version'];
    const environment = process.env.NODE_ENV;
    const payloadSizeBytes = body ? Buffer.byteLength(JSON.stringify(body)) : 0;
    const geo = ip ? geoip.lookup(ip) : undefined;
    const geoCountry = geo?.country;
    const geoCity = geo?.city;

    return next.handle().pipe(
      mergeMap(async (data) => {
        const durationMs = Date.now() - start;
        const logData = {
          userId,
          sessionId,
          deviceId,
          ip,
          userAgent,
          authType,
          userRoles,
          scopes,
          requestId,
          traceId,
          durationMs,
          payloadSizeBytes,
          appVersion,
          environment,
          geoCountry,
          geoCity,
        };
        const recordHash = createHash('sha256')
          .update(JSON.stringify(logData))
          .digest('hex');
        this.auditService.log({...logData, recordHash}).catch((er) => {console.log(er);});

        return data;
      }),
    );
  }
}
