import { OrderStatusEnum } from '@modules/orders/domain/enums/order-status.enum';

export class OrderStatusProvider {
  public static parseFromCencoB2B(status: string) {
    switch (status) {
      case 'Aceptada':
        return OrderStatusEnum.PENDING;
      case 'Rechazada':
        return OrderStatusEnum.CANCELED;
      case 'Pendiente':
        return OrderStatusEnum.PENDING;
      case 'Liberada':
        return OrderStatusEnum.IN_PROGRESS;
      default:
        return OrderStatusEnum.PENDING;
    }
  }
}
