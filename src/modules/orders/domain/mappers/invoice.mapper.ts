import { InvoiceEntity }     from '@modules/invoices/domain/entities/invoice.entity';
import { InvoiceStatusEnum } from '@modules/orders/domain/enums/invoice-status.enum';
import { UserLightMapper }   from '@modules/users/domain/mappers/user-light.mapper';
import { ClientLightMapper } from '@modules/clients/domain/mappers/client-light.mapper';

export class InvoiceMapper {
  readonly id: string;
  readonly invoiceNumber: number;
  readonly status: InvoiceStatusEnum;
  readonly emissionDate: string;
  readonly dueDate?: string;
  readonly isPaid?: boolean;
  readonly isActive?: boolean;
  readonly paymentDate?: string;
  readonly netAmount?: number;
  readonly taxAmount?: number;
  readonly totalAmount?: number;
  readonly deliveryAssignment?: UserLightMapper;
  readonly observations?: string;
  readonly createdAt: Date;
  readonly client: ClientLightMapper;
  readonly order: { id: string, orderNumber: string };

  constructor(partial: Partial<InvoiceMapper>) {
    Object.assign(this, partial);
  }

  static map(entity: InvoiceEntity): InvoiceMapper {
    return new InvoiceMapper({
      id: entity.id,
      invoiceNumber: entity.invoiceNumber,
      status: entity.status,
      emissionDate: entity.emissionDate,
      dueDate: entity.dueDate,
      isPaid: entity.isPaid,
      isActive: entity.isActive,
      paymentDate: entity.paymentDate,
      netAmount: entity.netAmount,
      taxAmount: entity.taxAmount,
      totalAmount: entity.totalAmount,
      deliveryAssignment: entity.deliveryAssignment && UserLightMapper.map(entity.deliveryAssignment),
      observations: entity.observations,
      createdAt: entity.createdAt,
      client: entity.client && ClientLightMapper.map(entity.client),
      order: entity.order && {id: entity.order.id, orderNumber: entity.order.orderNumber},
    });
  }

  static mapAll(entities: InvoiceEntity[]): InvoiceMapper[] {
    return entities.map((entity) => this.map(entity));
  }
}
