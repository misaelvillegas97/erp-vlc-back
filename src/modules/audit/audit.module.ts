import { Module }           from '@nestjs/common';
import { TypeOrmModule }    from '@nestjs/typeorm';
import { APP_INTERCEPTOR }  from '@nestjs/core';
import { AuditLogEntity }   from './domain/entities/audit-log.entity';
import { AuditService }     from './services/audit.service';
import { AuditInterceptor } from '@core/interceptors/audit.interceptor';

@Module({
  imports: [TypeOrmModule.forFeature([AuditLogEntity])],
  providers: [
    AuditService,
    {
      provide: APP_INTERCEPTOR,
      useClass: AuditInterceptor,
    },
  ],
  exports: [AuditService],
})
export class AuditModule {}
