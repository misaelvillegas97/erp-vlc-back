import { Injectable, UnprocessableEntityException } from '@nestjs/common';
import { InjectRepository }                         from '@nestjs/typeorm';

import { Between, Repository } from 'typeorm';

import { CreateOrderDto }       from '@modules/orders/domain/dtos/create-order.dto';
import { OrderStatusEnum }      from '@modules/orders/domain/enums/order-status.enum';
import { OrderEntity }          from './domain/entities/order.entity';
import { ProductRequestEntity } from './domain/entities/product-request.entity';
import { ClientEntity }         from '@modules/clients/domain/entities/client.entity';
import {
  IDashboardOverview,
  INextDelivery,
  IProductMini,
  OrdersOverview
}                               from '@modules/orders/domain/interfaces/dashboard-overview.interface';
import { OrderMapper }          from '@modules/orders/domain/mappers/order.mapper';
import { CreateInvoiceDto }     from '@modules/orders/domain/dtos/create-invoice.dto';
import { OrderQueryDto }        from '@modules/orders/domain/dtos/order-query.dto';
import { InvoicesService }      from '@modules/invoices/invoices.service';

@Injectable()
export class OrderService {
  constructor(
    @InjectRepository(OrderEntity) private orderRepository: Repository<OrderEntity>,
    @InjectRepository(ProductRequestEntity) private orderProductRepository: Repository<ProductRequestEntity>,
    private readonly invoicesService: InvoicesService
  ) {}

  async findAll(query: OrderQueryDto): Promise<OrderEntity[]> {
    const qb = this.orderRepository.createQueryBuilder('order');
    qb.leftJoinAndSelect('order.client', 'client');
    qb.leftJoinAndSelect('order.products', 'products');
    qb.leftJoinAndSelect('order.invoice', 'invoice');

    if (query.orderNumber)
      qb.where('order.orderNumber ilike :orderNumber', {orderNumber: `%${ query.orderNumber }%`});

    if (query.clientId)
      qb.andWhere('client.id IN (:...clientId)', {clientId: Array.isArray(query.clientId) ? query.clientId : [ query.clientId ]});

    if (query.type)
      qb.andWhere('order.type in (:...type)', {type: Array.isArray(query.type) ? query.type : [ query.type ]});

    if (query.status)
      qb.andWhere('order.status in (:...status)', {status: Array.isArray(query.status) ? query.status : [ query.status ]});

    if (query.deliveryLocation)
      qb.andWhere('order.deliveryLocation ilike :deliveryLocation', {deliveryLocation: `%${ query.deliveryLocation }%`});

    if (query.deliveryDate)
      qb.andWhere('order.deliveryDate = :deliveryDate', {deliveryDate: query.deliveryDate});

    if (query.emissionDate)
      qb.andWhere('order.emissionDate = :emissionDate', {emissionDate: query.emissionDate});

    if (query.amount)
      qb.andWhere('order.amount = :amount', {amount: query.amount});

    if (query.invoice)
      qb.andWhere('invoice.invoiceNumber ilike :invoice', {invoice: `%${ query.invoice }%`});

    return qb.getMany();
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
    const order = await this.orderRepository.findOne({where: {id}, relations: [ 'products', 'invoice' ]});

    if (order.invoice) throw new UnprocessableEntityException({code: 'ORDER_ALREADY_INVOICED'});

    if (!createInvoiceDto.netAmount || !createInvoiceDto.taxAmount || !createInvoiceDto.totalAmount) {
      createInvoiceDto.netAmount = order.products.reduce((acc, product) => acc + (product.unitaryPrice * product.quantity), 0);
      createInvoiceDto.taxAmount = createInvoiceDto.netAmount * 0.19;
      createInvoiceDto.totalAmount = createInvoiceDto.netAmount + createInvoiceDto.taxAmount;
    }

    if (order.status !== OrderStatusEnum.DELIVERED)
      order.status = OrderStatusEnum.INVOICED;

    order.invoice = await this.invoicesService.create(order.id, order.client.id, createInvoiceDto);

    return this.orderRepository.save(order);
  }

  async updateStatus(id: string, status: OrderStatusEnum) {
    const order = await this.orderRepository.findOne({where: {id}});
    order.status = status;

    return this.orderRepository.save(order);
  }

  async ordersOverview(): Promise<OrdersOverview> {
    // 1. Órdenes por fecha (usando la fecha de emisión)
    const ordersCountByDate = await this.orderRepository
      .createQueryBuilder('o')
      .select('to_char(o.emissionDate, \'YYYY-MM-DD\')', 'date')
      .addSelect('COUNT(o.id)', 'total')
      .groupBy('to_char(o.emissionDate, \'YYYY-MM-DD\')')
      .orderBy('to_char(o.emissionDate, \'YYYY-MM-DD\')', 'ASC')
      .getRawMany();

    // 2. Órdenes por estado
    let ordersByStatus = await this.orderRepository
      .createQueryBuilder('o')
      .select('o.status', 'status')
      .addSelect('COUNT(o.id)', 'total')
      .groupBy('o.status')
      .getRawMany();

    ordersByStatus = Object.values(OrderStatusEnum).map((status) => {
      const found = ordersByStatus.find((item) => item.status === status);
      return {
        status,
        total: found ? +found.total : 0,
      };
    });

    // 3. Órdenes sin factura asociada (invoice_id es null)
    const ordersWithoutInvoiceCount = await this.orderRepository
      .createQueryBuilder('o')
      .where('o.invoice_id IS NULL')
      .getCount();

    // 4. Órdenes vencidas: donde la fecha de entrega ya pasó y el estado NO es DELIVERED ni CANCELED.
    // Usamos la fecha de entrega (deliveryDate) y comparamos con la fecha actual.
    const now = new Date().toISOString().split('T')[0]; // Formato YYYY-MM-DD
    const overdueOrdersCount = await this.orderRepository
      .createQueryBuilder('o')
      .where('o.deliveryDate < :now', {now})
      .andWhere('o.status NOT IN (:...statuses)', {statuses: [ OrderStatusEnum.DELIVERED, OrderStatusEnum.CANCELED ]})
      .getCount();

    // 5. Tiempo promedio de entrega (en días) para órdenes que ya fueron entregadas
    // Calculamos la diferencia entre deliveredDate y deliveryDate
    const averageDeliveryTimeResult = await this.orderRepository
      .createQueryBuilder('o')
      .select('AVG(DATE_PART(\'day\', o."deliveredDate"::timestamp - o."deliveryDate"::timestamp))', 'avgDeliveryDays')
      .where('o.deliveredDate IS NOT NULL')
      .getRawOne();
    const averageDeliveryTime = averageDeliveryTimeResult ? +averageDeliveryTimeResult.avgDeliveryDays : 0;

    // 6. Órdenes por cliente (Top 5 según cantidad de órdenes)
    const ordersByClient = await this.orderRepository
      .createQueryBuilder('o')
      .select('o.client_id', 'clientId')
      .addSelect('COUNT(o.id)', 'totalOrders')
      .groupBy('o.client_id')
      .orderBy('COUNT(o.id)', 'DESC')
      .limit(5)
      .getRawMany();

    // 7. Recaudación por órdenes: Sumatoria de totalPrice de cada producto (tabla orders_products)
    //    agrupado por la fecha de emisión de la orden.
    const ordersRevenueByDate = await this.orderProductRepository
      .createQueryBuilder('p')
      .leftJoin('p.orderRequest', 'o')
      .select('to_char(o.emissionDate, \'YYYY-MM-DD\')', 'date')
      .addSelect('SUM(p."totalPrice")', 'revenue')
      .groupBy('to_char(o.emissionDate, \'YYYY-MM-DD\')')
      .orderBy('to_char(o.emissionDate, \'YYYY-MM-DD\')', 'ASC')
      .getRawMany();

    return {
      ordersCountByDate,
      ordersByStatus,
      ordersWithoutInvoiceCount,
      overdueOrdersCount,
      averageDeliveryTime,
      ordersByClient,
      ordersRevenueByDate,
    } as OrdersOverview;
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
