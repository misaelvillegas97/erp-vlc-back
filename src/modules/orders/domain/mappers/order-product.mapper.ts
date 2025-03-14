import { OrderProductEntity } from '@modules/orders/domain/entities/order-product.entity';

export class OrderProductMapper {
  readonly id: string;
  readonly code: string;
  readonly upcCode: string;
  readonly description: string;
  readonly quantity: number;
  readonly unitaryPrice: number;
  readonly totalPrice: number;

  constructor(values: Partial<OrderProductMapper>) {
    Object.assign(this, values);
  }

  static map(entity: OrderProductEntity): OrderProductMapper {
    return new OrderProductMapper({
      id: entity.id,
      code: entity.code,
      upcCode: entity.upcCode,
      description: entity.description,
      quantity: entity.quantity,
      unitaryPrice: entity.unitaryPrice,
      totalPrice: entity.totalPrice,
    });
  }

  static mapAll(entities: OrderProductEntity[]): OrderProductMapper[] {
    return entities.map(entity => this.map(entity));
  }
}
