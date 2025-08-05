import { Column, CreateDateColumn, Entity, PrimaryGeneratedColumn } from 'typeorm';

@Entity('audit_logs')
export class AuditLogEntity {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ nullable: true })
  userId?: string;

  @Column({ nullable: true })
  sessionId?: string;

  @Column({ nullable: true })
  deviceId?: string;

  @Column({ nullable: true })
  ip?: string;

  @Column({ name: 'user_agent', nullable: true })
  userAgent?: string;

  @Column({ nullable: true })
  authType?: string;

  @Column({ type: 'json', nullable: true })
  userRoles?: string[];

  @Column({ type: 'json', nullable: true })
  scopes?: string[];

  @Column({ nullable: true })
  requestId?: string;

  @Column({ nullable: true })
  traceId?: string;

  @Column({ type: 'int', nullable: true })
  durationMs?: number;

  @Column({ type: 'int', nullable: true })
  payloadSizeBytes?: number;

  @Column({ name: 'app_version', nullable: true })
  appVersion?: string;

  @Column({ nullable: true })
  environment?: string;

  @Column({ name: 'geo_country', nullable: true })
  geoCountry?: string;

  @Column({ name: 'geo_city', nullable: true })
  geoCity?: string;

  @Column({name: 'record_hash', unique: true})
  recordHash: string;

  @CreateDateColumn({ name: 'created_at', type: 'timestamp with time zone' })
  createdAt: Date;
}
