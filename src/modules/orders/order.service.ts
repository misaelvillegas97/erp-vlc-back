import { Injectable }       from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';

import { Repository } from 'typeorm';

import { CreateOrderDto }       from '@modules/orders/domain/dtos/create-order.dto';
import { OrderStatusEnum }      from '@modules/orders/domain/enums/order-status.enum';
import { OrderEntity }          from './domain/entities/order.entity';
import { ProductRequestEntity } from './domain/entities/product-request.entity';
import { ClientEntity }         from '@modules/clients/domain/entities/client.entity';
import { IDashboardOverview }   from '@modules/orders/domain/interfaces/dashboard-overview.interface';

@Injectable()
export class OrderService {
  constructor(
    @InjectRepository(OrderEntity) private orderRepository: Repository<OrderEntity>,
    @InjectRepository(ProductRequestEntity) private productRepository: Repository<ProductRequestEntity>,
  ) {}

  async findAll(): Promise<OrderEntity[]> {
    return this.orderRepository.find({join: {alias: 'order', leftJoinAndSelect: {products: 'order.products'}}});
  }

  async findOne(id: string): Promise<OrderEntity> {
    return this.orderRepository.findOne({where: {id}});
  }

  async create(order: CreateOrderDto): Promise<OrderEntity> {
    return this.orderRepository.save(this.orderRepository.create(order));
  }

  async createAll(orders: CreateOrderDto[]): Promise<{ created: OrderEntity[]; updated: OrderEntity[] }> {
    const createdOrders = [];
    const updatedOrders = [];

    // Validate if order already exists by orderNumber, if exists, check status and update if necessary, if not, create new order
    for (const order of orders) {
      const existingOrder = await this.orderRepository.findOne({where: {orderNumber: order.orderNumber}});
      if (existingOrder) {
        if (existingOrder.status !== order.status) {
          existingOrder.status = order.status;
          updatedOrders.push(await this.orderRepository.save(existingOrder));
        }
      } else {
        createdOrders.push(
          await this.orderRepository.save(
            this.orderRepository.create({...order, client: new ClientEntity({id: order.clientId})})
          )
        );
      }
    }

    return {
      created: createdOrders,
      updated: updatedOrders,
    };
  }

  async createInvoice(id: string, invoice: string) {
    const order = await this.orderRepository.findOne({where: {id}});
    order.invoiceNumber = invoice;

    return this.orderRepository.save(order);
  }

  async updateStatus(id: string, status: OrderStatusEnum) {
    const order = await this.orderRepository.findOne({where: {id}});
    order.status = status;

    return this.orderRepository.save(order);
  }

  /**
   * @description Get dashboard info
   * @return {object} Dashboard info
   * @return {object.orders} All orders
   * @return {object.countOverview} Detail count of completed, middle status or pending orders
   * @return {object.countsByType} Counts by order type
   * @return {object.countsByStatus} Counts by order status
   * @return {object.countsByClient} Counts by client
   * @return {object.countsStatusByClient} Counts by status (pending, middle or completed) and client
   * @return {object.nextDeliveries} Next deliveries ordered by closer delivery date
   */
  async getDashboardInfo(): Promise<IDashboardOverview> {
    const countOverview = {
      completed: 0,
      middle: 0,
      pending: 0,
      canceled: 0,
    };
    const countsByType = {};
    const countsByStatus = {};
    const countsByClient = {};

    const orders = await this.orderRepository.find({relations: [ 'client' ]});
    orders.forEach((order) => {
      // Count orders by status
      if (order.status === OrderStatusEnum.DELIVERED)
        countOverview.completed++;
      else if (order.status === OrderStatusEnum.PENDING)
        countOverview.pending++;
      else if (order.status === OrderStatusEnum.CANCELED)
        countOverview.canceled++;
      else
        countOverview.middle++;

      // Count orders by type
      if (countsByType[order.type])
        countsByType[order.type]++;
      else
        countsByType[order.type] = 1;

      // Count orders by status
      if (countsByStatus[order.status])
        countsByStatus[order.status]++;
      else
        countsByStatus[order.status] = 1;

      // Count orders by client with additional information
      const clientId = order.client?.id || 'unassigned';
      const clientFantasyName = order.client?.fantasyName || 'unassigned';
      const clientBusinessName = order.client?.businessName || 'unassigned';

      if (!countsByClient[clientId]) {
        countsByClient[clientId] = {
          id: clientId,
          businessName: clientBusinessName,
          fantasyName: clientFantasyName,
          completed: 0,
          pending: 0,
          middle: 0,
          canceled: 0,
          totalOrders: 0
        };
      }

      // Increment the order count and status count for the client
      countsByClient[clientId].totalOrders++;

      if (order.status === OrderStatusEnum.DELIVERED)
        countsByClient[clientId].completed++;
      else if (order.status === OrderStatusEnum.PENDING)
        countsByClient[clientId].pending++;
      else if (order.status === OrderStatusEnum.CANCELED)
        countsByClient[clientId].canceled++;
      else
        countsByClient[clientId].middle++;
    });

    // Sort orders by delivery date
    orders.sort((a, b) => new Date(a.deliveryDate).getTime() - new Date(b.deliveryDate).getTime());

    // Get next deliveries, limit to 10
    const nextDeliveries = orders.slice(0, 10).map((order) => ({
      orderNumber: order.orderNumber,
      deliveryDate: order.deliveryDate,
      client: order.client.fantasyName,
    }));

    return {
      orders,
      countOverview,
      countsByType,
      countsByStatus,
      countsByClient,
      nextDeliveries,
    };
  }
}
