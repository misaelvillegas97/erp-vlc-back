import { Injectable, UnprocessableEntityException } from '@nestjs/common';
import { InjectRepository }                         from '@nestjs/typeorm';

import { Between, Repository } from 'typeorm';

import { CreateOrderDto }                                  from '@modules/orders/domain/dtos/create-order.dto';
import { OrderStatusEnum }                                 from '@modules/orders/domain/enums/order-status.enum';
import { OrderEntity }                                     from './domain/entities/order.entity';
import { ProductRequestEntity }                            from './domain/entities/product-request.entity';
import { ClientEntity }                                    from '@modules/clients/domain/entities/client.entity';
import { IDashboardOverview, INextDelivery, IProductMini } from '@modules/orders/domain/interfaces/dashboard-overview.interface';
import { OrderMapper }                                     from '@modules/orders/domain/mappers/order.mapper';
import { CreateInvoiceDto }                                from '@modules/orders/domain/dtos/create-invoice.dto';
import { InvoiceEntity }                                   from '@modules/orders/domain/entities/invoice.entity';

@Injectable()
export class OrderService {
  constructor(
    @InjectRepository(OrderEntity) private orderRepository: Repository<OrderEntity>,
    @InjectRepository(ProductRequestEntity) private productRepository: Repository<ProductRequestEntity>,
    @InjectRepository(InvoiceEntity) private invoiceRepository: Repository<InvoiceEntity>,
  ) {}

  async findAll(): Promise<OrderEntity[]> {
    return this.orderRepository.find({
      relations: [ 'client', 'products', 'invoice' ],
    });
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

  async createInvoice(id: string, createInvoiceDto: CreateInvoiceDto) {
    const order = await this.orderRepository.findOne({where: {id}});

    const existingInvoice = await this.invoiceRepository.findOne({where: {order: {id: id}}});

    if (existingInvoice) throw new UnprocessableEntityException('Invoice already exists for this order');

    if (!createInvoiceDto.netAmount || !createInvoiceDto.taxAmount || !createInvoiceDto.totalAmount) {
      createInvoiceDto.netAmount = order.products.reduce((acc, product) => acc + (product.unitaryPrice * product.quantity), 0);
      createInvoiceDto.taxAmount = createInvoiceDto.netAmount * 0.19;
      createInvoiceDto.totalAmount = createInvoiceDto.netAmount + createInvoiceDto.taxAmount;
    }

    order.invoice = this.invoiceRepository.create(createInvoiceDto);

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
  async getDashboardInfo(year, month): Promise<IDashboardOverview> {
    if (!year || !month) {
      const date = new Date();
      year = date.getFullYear().toString();
      month = (date.getMonth() + 1).toString();
    }

    const countOverview = {
      completed: 0,
      middle: 0,
      pending: 0,
      canceled: 0,
    };
    const countsByType = {};
    const countsByStatus = {};
    const countsByClient = {};
    let sumAmount = 0;

    const lastDayOfMonth = new Date(year, month, 0).getDate();

    const orders = await this.orderRepository.find({
      where: {
        deliveryDate: Between(`${ year }-${ month }-01`, `${ year }-${ month }-${ lastDayOfMonth }`),
      },
      relations: [ 'client', 'products' ],
      order: {deliveryDate: 'ASC'},
    });

    orders.forEach((order) => {
      let orderTotal = 0;
      order.products.forEach((product) => {
        const productTotal = product.unitaryPrice * product.quantity;
        orderTotal += productTotal;
      });

      if (order.status === OrderStatusEnum.DELIVERED)
        countOverview.completed++;
      else if (order.status === OrderStatusEnum.PENDING)
        countOverview.pending++;
      else if (order.status === OrderStatusEnum.CANCELED)
        countOverview.canceled++;
      else
        countOverview.middle++;

      if (countsByType[order.type])
        countsByType[order.type]++;
      else
        countsByType[order.type] = 1;

      if (countsByStatus[order.status])
        countsByStatus[order.status]++;
      else
        countsByStatus[order.status] = 1;

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
          totalOrders: 0,
          totalAmount: 0,
        };
      }

      countsByClient[clientId].totalOrders++;

      if (order.status === OrderStatusEnum.DELIVERED)
        countsByClient[clientId].completed++;
      else if (order.status === OrderStatusEnum.PENDING)
        countsByClient[clientId].pending++;
      else if (order.status === OrderStatusEnum.CANCELED)
        countsByClient[clientId].canceled++;
      else
        countsByClient[clientId].middle++;

      countsByClient[clientId].totalAmount += orderTotal;

      sumAmount += orderTotal;
    });

    // Get next deliveries, limit to 10
    const nextDeliveries: INextDelivery[] = orders.slice(0, 10).map((order) => ({
      orderNumber: order.orderNumber,
      deliveryDate: order.deliveryDate,
      client: order.client.fantasyName,
      type: order.type,
      deliveryLocation: order.deliveryLocation,
      products: order.products.map((product) => ({
        upcCode: product.upcCode,
        unitaryPrice: product.unitaryPrice,
        quantity: product.quantity,
        description: product.description,
      } as IProductMini)),
    } as INextDelivery));

    return {
      orders: OrderMapper.mapAll(orders),
      sumAmount,
      countOverview,
      countsByType,
      countsByStatus,
      countsByClient,
      nextDeliveries,
    };
  }
}
