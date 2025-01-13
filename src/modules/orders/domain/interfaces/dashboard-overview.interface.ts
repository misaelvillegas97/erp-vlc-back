import { OrderEntity } from '@modules/orders/domain/entities/order.entity';

export interface IDashboardOverview {
  orders: OrderEntity[],
  countOverview: {
    completed: number,
    middle: number,
    pending: number,
  },
  countsByType: { [key: string]: number },
  countsByStatus: { [key: string]: number },
  countsByClient: { [key: string]: number },
  nextDeliveries: {
    orderNumber: string,
    deliveryDate: string,
    client: string,
  }[],
}
