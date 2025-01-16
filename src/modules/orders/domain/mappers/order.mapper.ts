import { OrderTypeEnum }      from '@modules/orders/domain/enums/order-type.enum';
import { OrderStatusEnum }    from '@modules/orders/domain/enums/order-status.enum';
import { OrderProductMapper } from '@modules/orders/domain/mappers/order-product.mapper';
import { OrderEntity }        from '@modules/orders/domain/entities/order.entity';
import { ClientLightMapper }  from '@modules/clients/domain/mappers/client-light.mapper';

export class OrderMapper {
  readonly id: string;
  readonly orderNumber: string;
  readonly businessName: string;
  readonly type: OrderTypeEnum;
  readonly status: OrderStatusEnum;
  readonly deliveryLocation: string;
  readonly deliveryDate: string;
  readonly emissionDate: string;
  readonly observations: string;
  readonly totalAmount: number;
  readonly client: ClientLightMapper;
  readonly products: OrderProductMapper[];

  constructor(partial: Partial<OrderMapper>) {
    Object.assign(this, partial);
  }

  static map(entity: OrderEntity): OrderMapper {
    const totalAmount = entity.products.reduce((acc, product) => acc + (product.quantity * product.unitaryPrice), 0);

    return new OrderMapper({
      id: entity.id,
      orderNumber: entity.orderNumber,
      businessName: entity.client.businessName,
      type: entity.type,
      status: entity.status,
      deliveryLocation: entity.deliveryLocation,
      deliveryDate: entity.deliveryDate,
      emissionDate: entity.emissionDate,
      observations: entity.observations,
      products: OrderProductMapper.mapAll(entity.products),
      client: ClientLightMapper.map(entity.client),
      totalAmount,
    });
  }

  static mapAll(entities: OrderEntity[]): OrderMapper[] {
    return entities.map((entity) => this.map(entity));
  }
}
