import { DocumentType, VehicleDocumentEntity } from '@modules/logistics/domain/entities/vehicle-document.entity';
import { VehicleMapper }                       from '@modules/logistics/domain/mappers/vehicle.mapper';
import { FileMapper }                          from '@modules/files/domain/mappers/file.mapper';
import { FileType }                            from '@modules/files/domain/file';

export class VehicleDocumentMapper {
  id: string;
  vehicleId: string;
  fileId: string;
  type: DocumentType;
  name: string;
  expiryDate: string;
  notes: string;
  createdAt: Date;

  // Relationships
  vehicle: VehicleMapper;
  file: FileType;

  constructor(values: Partial<VehicleDocumentMapper>) {
    Object.assign(this, values);
  }

  static toDomain(entity: VehicleDocumentEntity): VehicleDocumentMapper {
    return new VehicleDocumentMapper({
      id: entity.id,
      vehicleId: entity.vehicleId,
      fileId: entity.fileId,
      type: entity.type,
      name: entity.name,
      expiryDate: entity.expiryDate,
      notes: entity.notes,
      createdAt: entity.createdAt,
      vehicle: entity.vehicle && VehicleMapper.toDomain(entity.vehicle),
      file: entity.file && FileMapper.toDomain(entity.file),
    });
  }

  static toDomainAll(entities: VehicleDocumentEntity[]): VehicleDocumentMapper[] {
    return entities.map(entity => this.toDomain(entity));
  }
}
