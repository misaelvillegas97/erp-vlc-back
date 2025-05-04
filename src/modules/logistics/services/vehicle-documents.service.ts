import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { InjectRepository }                      from '@nestjs/typeorm';
import { Repository }                            from 'typeorm';
import { VehicleEntity }                         from '../domain/entities/vehicle.entity';
import { DocumentType, VehicleDocumentEntity }   from '../domain/entities/vehicle-document.entity';
import { DateTime }                              from 'luxon';
import { CreateVehicleDocumentDto }              from '../domain/dto/create-vehicle-document.dto';
import { VehicleDocumentMapper }                 from '../domain/mappers/vehicle-document.mapper';

interface DocumentExpiryCheck {
  vehicleId: string;
  licensePlate: string;
  documentType: string;
  documentId: string;
  documentName: string;
  expiryDate: string;
  daysRemaining: number;
}

@Injectable()
export class VehicleDocumentsService {
  private readonly logger = new Logger(VehicleDocumentsService.name);

  constructor(
    @InjectRepository(VehicleEntity)
    private readonly vehicleRepository: Repository<VehicleEntity>,
    @InjectRepository(VehicleDocumentEntity)
    private readonly documentRepository: Repository<VehicleDocumentEntity>
  ) {}

  async addVehicleDocument(vehicleId: string, documentDto: CreateVehicleDocumentDto): Promise<VehicleEntity> {
    const vehicle = await this.vehicleRepository.findOne({where: {id: vehicleId}});
    if (!vehicle) {
      throw new NotFoundException(`Vehicle with ID ${ vehicleId } not found`);
    }

    // Create document entity
    const document = new VehicleDocumentEntity();
    document.vehicleId = vehicleId;
    document.fileId = documentDto.file.id;
    document.type = documentDto.type;
    document.name = documentDto.name;
    document.expiryDate = documentDto.expiryDate;
    document.notes = documentDto.notes;

    // Save document
    await this.documentRepository.save(document);

    // Update expiry dates based on document type
    if (documentDto.type === DocumentType.INSURANCE && documentDto.expiryDate) {
      vehicle.insuranceExpiry = documentDto.expiryDate;
    } else if (documentDto.type === DocumentType.TECHNICAL_INSPECTION && documentDto.expiryDate) {
      vehicle.technicalInspectionExpiry = documentDto.expiryDate;
    } else if (documentDto.type === DocumentType.CIRCULATION_PERMIT && documentDto.expiryDate) {
      vehicle.circulationPermitExpiry = documentDto.expiryDate;
    }

    return this.vehicleRepository.save(vehicle);
  }

  async removeVehicleDocument(vehicleId: string, documentId: string): Promise<VehicleEntity> {
    const vehicle = await this.vehicleRepository.findOne({where: {id: vehicleId}});
    if (!vehicle) {
      throw new NotFoundException(`Vehicle with ID ${ vehicleId } not found`);
    }

    const document = await this.documentRepository.findOne({
      where: {id: documentId, vehicleId}
    });

    if (!document) {
      throw new NotFoundException(`Document with ID ${ documentId } not found for vehicle ${ vehicleId }`);
    }

    // Get document type before removing
    const documentType = document.type;

    // Remove document
    await this.documentRepository.remove(document);

    // Note: File deletion is handled by the FileModule, we don't need to delete it here

    // If we removed a document that was setting an expiry date, check if we need to update the vehicle
    if (documentType === DocumentType.INSURANCE || documentType === DocumentType.TECHNICAL_INSPECTION || documentType === DocumentType.CIRCULATION_PERMIT) {
      // Find if there's another document of the same type with a later expiry date
      const latestDoc = await this.documentRepository.findOne({
        where: {vehicleId, type: documentType},
        order: {expiryDate: 'DESC'}
      });

      // Update the corresponding expiry date field
      if (documentType === DocumentType.INSURANCE) {
        vehicle.insuranceExpiry = latestDoc ? latestDoc.expiryDate : null;
      } else if (documentType === DocumentType.TECHNICAL_INSPECTION) {
        vehicle.technicalInspectionExpiry = latestDoc ? latestDoc.expiryDate : null;
      } else if (documentType === DocumentType.CIRCULATION_PERMIT) {
        vehicle.circulationPermitExpiry = latestDoc ? latestDoc.expiryDate : null;
      }
    }

    return this.vehicleRepository.save(vehicle);
  }

  async getVehicleDocuments(vehicleId: string): Promise<VehicleDocumentMapper[]> {
    const vehicle = await this.vehicleRepository.findOne({where: {id: vehicleId}});
    if (!vehicle) {
      throw new NotFoundException(`Vehicle with ID ${ vehicleId } not found`);
    }

    const documents = await this.documentRepository.find({
      where: {vehicleId},
      relations: [ 'file', 'vehicle' ],
      order: {createdAt: 'DESC'}
    });

    return VehicleDocumentMapper.toDomainAll(documents);
  }

  async getVehicleDocument(vehicleId: string, documentId: string): Promise<VehicleDocumentMapper> {
    const document = await this.documentRepository.findOne({
      where: {id: documentId, vehicleId},
      relations: [ 'file', 'vehicle' ]
    });

    if (!document) {
      throw new NotFoundException(`Document with ID ${ documentId } not found for vehicle ${ vehicleId }`);
    }

    return VehicleDocumentMapper.toDomain(document);
  }

  async checkDocumentExpirations(): Promise<DocumentExpiryCheck[]> {
    const today = DateTime.now().toISODate();
    const threeMonthsLater = DateTime.now().plus({months: 3}).toISODate();

    const vehicles = await this.vehicleRepository.find();
    const expiringDocuments: DocumentExpiryCheck[] = [];

    for (const vehicle of vehicles) {
      // Check insurance
      if (vehicle.insuranceExpiry && vehicle.insuranceExpiry >= today && vehicle.insuranceExpiry <= threeMonthsLater) {
        const daysRemaining = DateTime.fromISO(vehicle.insuranceExpiry).diff(DateTime.now(), 'days').days;
        const document = await this.findDocumentByTypeAndVehicle(vehicle.id, DocumentType.INSURANCE);

        expiringDocuments.push({
          vehicleId: vehicle.id,
          licensePlate: vehicle.licensePlate,
          documentType: DocumentType.INSURANCE,
          documentId: document?.id || null,
          documentName: 'Insurance',
          expiryDate: vehicle.insuranceExpiry,
          daysRemaining: Math.floor(daysRemaining)
        });
      }

      // Check technical inspection
      if (vehicle.technicalInspectionExpiry && vehicle.technicalInspectionExpiry >= today && vehicle.technicalInspectionExpiry <= threeMonthsLater) {
        const daysRemaining = DateTime.fromISO(vehicle.technicalInspectionExpiry).diff(DateTime.now(), 'days').days;
        const document = await this.findDocumentByTypeAndVehicle(vehicle.id, DocumentType.TECHNICAL_INSPECTION);

        expiringDocuments.push({
          vehicleId: vehicle.id,
          licensePlate: vehicle.licensePlate,
          documentType: DocumentType.TECHNICAL_INSPECTION,
          documentId: document?.id || null,
          documentName: 'Technical Inspection',
          expiryDate: vehicle.technicalInspectionExpiry,
          daysRemaining: Math.floor(daysRemaining)
        });
      }

      // Check circulation permit
      if (vehicle.circulationPermitExpiry && vehicle.circulationPermitExpiry >= today && vehicle.circulationPermitExpiry <= threeMonthsLater) {
        const daysRemaining = DateTime.fromISO(vehicle.circulationPermitExpiry).diff(DateTime.now(), 'days').days;
        const document = await this.findDocumentByTypeAndVehicle(vehicle.id, DocumentType.CIRCULATION_PERMIT);

        expiringDocuments.push({
          vehicleId: vehicle.id,
          licensePlate: vehicle.licensePlate,
          documentType: DocumentType.CIRCULATION_PERMIT,
          documentId: document?.id || null,
          documentName: 'Circulation Permit',
          expiryDate: vehicle.circulationPermitExpiry,
          daysRemaining: Math.floor(daysRemaining)
        });
      }
    }

    return expiringDocuments.sort((a, b) => a.daysRemaining - b.daysRemaining);
  }

  private async findDocumentByTypeAndVehicle(vehicleId: string, type: DocumentType): Promise<VehicleDocumentEntity | null> {
    return this.documentRepository.findOne({
      where: {vehicleId, type},
      order: {expiryDate: 'DESC'}
    });
  }
}
