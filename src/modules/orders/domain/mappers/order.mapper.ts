import { OrderTypeEnum }      from '@modules/orders/domain/enums/order-type.enum';
import { OrderStatusEnum }    from '@modules/orders/domain/enums/order-status.enum';
import { OrderProductMapper } from '@modules/orders/domain/mappers/order-product.mapper';
import { OrderEntity }        from '@modules/orders/domain/entities/order.entity';
import { ClientLightMapper }  from '@modules/clients/domain/mappers/client-light.mapper';
import { InvoiceMapper }      from '@modules/orders/domain/mappers/invoice.mapper';

export class OrderMapper {
  readonly id: string;
  readonly orderNumber: string;
  readonly type: OrderTypeEnum;
  readonly status: OrderStatusEnum;
  readonly deliveryLocation: string;
  readonly deliveryDate: string;
  readonly deliveredDate: Date;
  readonly emissionDate: string;
  readonly observations: any;
  readonly totalAmount: number;
  readonly client: ClientLightMapper;
  readonly invoices: InvoiceMapper[];
  readonly products: OrderProductMapper[];

  constructor(partial: Partial<OrderMapper>) {
    Object.assign(this, partial);
  }

  static map(entity: OrderEntity, {skipInvoices}: { skipInvoices: boolean } = defaultOptions): OrderMapper {
    const totalAmount = entity.products.reduce((acc, product) => acc + (product.quantity * product.unitaryPrice), 0);

    return new OrderMapper({
      id: entity.id,
      orderNumber: entity.orderNumber,
      type: entity.type,
      status: entity.status,
      deliveryLocation: entity.deliveryLocation,
      deliveryDate: entity.deliveryDate,
      deliveredDate: entity.deliveredDate,
      emissionDate: entity.emissionDate,
      observations: entity.observations,
      products: OrderProductMapper.mapAll(entity.products),
      invoices: (entity.invoices && !skipInvoices) && InvoiceMapper.mapAll(entity.invoices),
      client: ClientLightMapper.map(entity.client),
      totalAmount,
    });
  }

  static mapAll(entities: OrderEntity[]): OrderMapper[] {
    return entities.map((entity) => this.map(entity));
  }
}

const defaultOptions = {skipInvoices: false};
