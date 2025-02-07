import { OrderTypeEnum } from '@modules/orders/domain/enums/order-type.enum';
import { OrderMapper }   from '@modules/orders/domain/mappers/order.mapper';

export interface IClientOrderStats {
  id: string;
  businessName: string;
  fantasyName: string;
  completed: number;
  pending: number;
  middle: number;
  canceled: number;
  totalOrders: number;
}

export interface ICountOverview {
  completed: number;
  middle: number;
  pending: number;
  canceled: number;
}

export interface ICountsByType {
  [key: string]: number;
}

export interface ICountsByStatus {
  [key: string]: number;
}

export interface IDashboardOverview {
  orders: OrderMapper[];
  sumAmount: number;
  countOverview: ICountOverview;
  countsByType: ICountsByType;
  countsByStatus: ICountsByStatus;
  countsByClient: { [key: string]: IClientOrderStats };
  nextDeliveries: INextDelivery[];
}

export interface IProductMini {
  upcCode: string;
  description: string;
  unitaryPrice: number;
  quantity: number;
}

export interface INextDelivery {
  orderNumber: string;
  deliveryDate: string;
  deliveryLocation: string;
  type: OrderTypeEnum;
  client: string;
  products: IProductMini[];
}

export interface OrdersOverview {
  ordersCountByDate: { date: string, total: string }[];
  ordersByStatus: { status: string, total: string }[];
  ordersWithoutInvoiceCount: number;
  overdueOrdersCount: number;
  averageDeliveryTime: number;
  ordersByClient: { clientId: string, totalOrders: string }[];
  ordersRevenueByDate: { date: string, revenue: string }[];
}
