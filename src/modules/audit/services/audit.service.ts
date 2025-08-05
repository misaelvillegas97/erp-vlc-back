import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { AuditLogEntity } from '../domain/entities/audit-log.entity';

@Injectable()
export class AuditService {
  constructor(
    @InjectRepository(AuditLogEntity)
    private readonly repository: Repository<AuditLogEntity>,
  ) {}

  async log(data: Partial<AuditLogEntity>): Promise<AuditLogEntity> {
    const entity = this.repository.create(data);
    return this.repository.save(entity);
  }
}
