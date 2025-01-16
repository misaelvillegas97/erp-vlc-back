import { OrderStatusEnum } from '@modules/orders/domain/enums/order-status.enum';

export class OrderStatusProvider {
  public static parseFromCencoB2B(status: string) {
    switch (status) {
      case 'Aceptada':
        return OrderStatusEnum.PENDING;
      case 'Liberada':
        return OrderStatusEnum.PENDING;
      default:
        return OrderStatusEnum.PENDING;
    }
  }
}
