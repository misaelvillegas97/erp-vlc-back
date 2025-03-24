import { SupplierEntity } from '@modules/supplier/domain/entities/supplier.entity';

export class SupplierMapper {
  /**
   * Mapea un proveedor a un formato simple con datos básicos
   */
  static toSimpleDto(supplier: SupplierEntity) {
    return {
      id: supplier.id,
      rut: supplier.rut,
      businessName: supplier.businessName,
      fantasyName: supplier.fantasyName,
      type: supplier.type,
      isActive: supplier.isActive,
      phone: supplier.phone,
      email: supplier.email
    };
  }

  /**
   * Mapea un proveedor a un formato completo con todos los datos
   */
  static toCompleteDto(supplier: SupplierEntity) {
    return {
      id: supplier.id,
      rut: supplier.rut,
      businessName: supplier.businessName,
      fantasyName: supplier.fantasyName,
      type: supplier.type,
      taxCategory: supplier.taxCategory,
      siiCode: supplier.siiCode,
      economicActivity: supplier.economicActivity,
      address: supplier.address,
      commune: supplier.commune,
      city: supplier.city,
      phone: supplier.phone,
      email: supplier.email,
      contactPerson: supplier.contactPerson,
      contactPhone: supplier.contactPhone,
      isActive: supplier.isActive,
      notes: supplier.notes,
      tags: supplier.tags,
      paymentTermDays: supplier.paymentTermDays,
      createdAt: supplier.createdAt,
      updatedAt: supplier.updatedAt
    };
  }

  /**
   * Mapea una lista de proveedores a formato simple
   */
  static toSimpleDtoList(suppliers: SupplierEntity[]) {
    return suppliers.map(supplier => this.toSimpleDto(supplier));
  }

  /**
   * Mapea una lista de proveedores a formato completo
   */
  static toCompleteDtoList(suppliers: SupplierEntity[]) {
    return suppliers.map(supplier => this.toCompleteDto(supplier));
  }
}
