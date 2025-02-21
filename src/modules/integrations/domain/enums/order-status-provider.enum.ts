import { OrderStatusEnum } from '@modules/orders/domain/enums/order-status.enum';

export class OrderStatusProvider {
  public static parseFromCencoB2B(status: string) {
    switch (status) {
      case 'Aceptada':
        return OrderStatusEnum.CREATED;
      case 'Liberada':
        return OrderStatusEnum.CREATED;
      default:
        return OrderStatusEnum.CREATED;
    }
  }
}
