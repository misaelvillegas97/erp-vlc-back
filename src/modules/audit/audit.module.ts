import { Module }         from '@nestjs/common';
import { TypeOrmModule }  from '@nestjs/typeorm';
import { AuditLogEntity } from './domain/entities/audit-log.entity';
import { AuditService }   from './services/audit.service';

@Module({
  imports: [TypeOrmModule.forFeature([AuditLogEntity])],
  providers: [
    AuditService,
    // {
    //   provide: APP_INTERCEPTOR,
    //   useClass: AuditInterceptor,
    // },
  ],
  exports: [AuditService],
})
export class AuditModule {}
