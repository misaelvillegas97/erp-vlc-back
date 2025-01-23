import { InvoiceEntity }     from '@modules/orders/domain/entities/invoice.entity';
import { InvoiceStatusEnum } from '@modules/orders/domain/enums/invoice-status.enum';

export class InvoiceMapper implements Partial<InvoiceEntity> {
  readonly invoiceNumber: number;
  readonly status: InvoiceStatusEnum;
  readonly observations?: string;
  readonly emissionDate: string;
  readonly netAmount?: number;
  readonly taxAmount?: number;
  readonly totalAmount?: number;
  readonly createdAt: Date;

  constructor(partial: Partial<InvoiceMapper>) {
    Object.assign(this, partial);
  }

  static map(entity: InvoiceEntity): InvoiceMapper {
    return new InvoiceMapper({
      invoiceNumber: entity.invoiceNumber,
      status: entity.status,
      observations: entity.observations,
      emissionDate: entity.emissionDate,
      netAmount: entity.netAmount,
      taxAmount: entity.taxAmount,
      totalAmount: entity.totalAmount,
      createdAt: entity.createdAt,
    });
  }

  static mapAll(entities: InvoiceEntity[]): InvoiceMapper[] {
    return entities.map((entity) => this.map(entity));
  }
}
