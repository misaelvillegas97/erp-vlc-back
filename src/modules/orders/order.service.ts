import { Inject, Injectable, Logger, UnprocessableEntityException } from '@nestjs/common';
import { InjectRepository }                                         from '@nestjs/typeorm';
import { REQUEST }                                                  from '@nestjs/core';

import { Request }                     from 'express';
import { In, IsNull, Not, Repository } from 'typeorm';

import { ClientEntity }    from '@modules/clients/domain/entities/client.entity';
import { InvoicesService } from '@modules/invoices/invoices.service';
import { UsersService }    from '@modules/users/users.service';

import { CreateOrderDto }           from './domain/dtos/create-order.dto';
import { OrderStatusEnum }          from './domain/enums/order-status.enum';
import { OrderEntity }              from './domain/entities/order.entity';
import { ProductRequestEntity }     from './domain/entities/product-request.entity';
import { CreateInvoiceDto }         from './domain/dtos/create-invoice.dto';
import { OrderQueryDto }            from './domain/dtos/order-query.dto';
import { OrdersOverview }           from './domain/interfaces/dashboard-overview.interface';
import { OnEvent }                  from '@nestjs/event-emitter';
import { ProductsService }          from '@modules/products/products.service';
import { DateTime }                 from 'luxon';
import { InvoiceEntity }            from '@modules/invoices/domain/entities/invoice.entity';
import { INVOICE_DELIVERED }        from '@modules/invoices/domain/events.constant';
import { OrdersObservationsEntity } from '@modules/orders/domain/entities/orders-observations.entity';

@Injectable()
export class OrderService {
  private readonly logger = new Logger(OrderService.name);

  constructor(
    @Inject(REQUEST) private readonly request: Request,
    @InjectRepository(OrderEntity) private orderRepository: Repository<OrderEntity>,
    @InjectRepository(ProductRequestEntity) private orderProductRepository: Repository<ProductRequestEntity>,
    private readonly invoicesService: InvoicesService,
    private readonly productsService: ProductsService,
    private readonly userService: UsersService,
  ) {}

  async findAll(query: OrderQueryDto): Promise<OrderEntity[]> {
    const qb = this.orderRepository.createQueryBuilder('order');
    qb.leftJoinAndSelect('order.client', 'client');
    qb.leftJoinAndSelect('order.products', 'products');
    qb.leftJoinAndSelect('order.invoice', 'invoice');
    qb.leftJoinAndSelect('order.observations', 'observations');

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
      qb.andWhere('invoice.invoiceNumber = :invoice', {invoice: `${ query.invoice }`});

    return qb.getMany();
  }

  async findOne(id: string): Promise<OrderEntity> {
    return this.orderRepository.findOne({where: {id}});
  }

  async create(order: CreateOrderDto): Promise<OrderEntity> {
    return this.orderRepository.save(this.orderRepository.create(order));
  }

  @OnEvent('order-providers.createAll')
  async createAll(orders: CreateOrderDto[]): Promise<{ created: OrderEntity[]; updated: OrderEntity[] }> {
    const createdOrders = [];
    const updatedOrders = [];

    // Validate if order already exists by orderNumber, if exists, check status and update if necessary, if not, create new order
    for (const order of orders) {
      const existingOrder = await this.orderRepository.findOne({where: {orderNumber: order.orderNumber}});
      if (!existingOrder) {
        order.products = await Promise.all(order.products.map(async (product) => {
          const productEntity = await this.productsService.findClientProducts(order.clientId, +product.providerCode);

          if (!productEntity) return product;

          product.description = productEntity.product.name;
          product.upcCode = productEntity.product.upcCode;
        }));

        createdOrders.push(
          await this.orderRepository.save(
            this.orderRepository.create({
              ...order,
              observations: order.observation && [ new OrdersObservationsEntity({observation: order.observation}) ],
              client: new ClientEntity({id: order.clientId})
            })
          )
        );
        this.logger.log(`Order ${ order.orderNumber } created from providers`);
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

    if (order.status !== OrderStatusEnum.DELIVERED && createInvoiceDto.markAsPendingDelivery)
      order.status = OrderStatusEnum.PENDING_DELIVERY;

    order.invoice = await this.invoicesService.create(order.id, order.client.id, createInvoiceDto);

    return this.orderRepository.save(order);
  }

  async getSummary() {
    const userId: string = this.request.user.id;
    const user = await this.userService.findById(userId);
    const currentDate = new Date().toISOString().split('T')[0]; // formato YYYY-MM-DD

    const summary: any = {};

    // Información común para todos
    summary.ordersToday = await this.orderRepository.count({
      where: {deliveryDate: currentDate, status: Not(In([ 'DELIVERED', 'CANCELED' ]))}
    });
    summary.overdueOrders = await this.orderRepository
      .createQueryBuilder('o')
      .where('"deliveryDate" < :currentDate', {currentDate})
      .andWhere('o.status NOT IN (:...statuses)', {statuses: [ 'DELIVERED', 'CANCELED' ]})
      .getCount();

    // Información para Admin
    if (user.role.name === 'ADMIN') {
      summary.ordersByStatus = await this.orderRepository
        .createQueryBuilder('o')
        .select('o.status', 'status')
        .addSelect('COUNT(o.id)', 'total')
        .groupBy('o.status')
        .getRawMany();
      // Otras métricas, gráficos, etc.
    }

    // Información para Accountant
    if (user.role.name === 'ACCOUNTANT') {
      summary.ordersWithoutInvoice = await this.orderRepository.count({
        where: {invoice: {id: IsNull()}}
      });
      summary.pendingInvoices = await this.orderRepository.count({
        where: {
          invoice: {status: In([ 'ISSUED', 'RECEIVED_WITH_OBSERVATIONS', 'RECEIVED_WITHOUT_OBSERVATIONS' ])}
        }
      });
    }

    // Información para Driver (o roles que puedan tener asignaciones de entrega)
    if (user.role.name === 'DRIVER' || user.role.name === 'OPERATOR') {
      summary.assignedDeliveries = await this.orderRepository
        .createQueryBuilder('o')
        .leftJoinAndSelect('o.invoice', 'inv')
        .where('o.deliveryDate = :currentDate', {currentDate})
        .andWhere('o.status NOT IN (:...statuses)', {statuses: [ 'DELIVERED', 'CANCELED' ]})
        .andWhere('inv.delivery_assignment_id = :driverId', {driverId: user.id})
        .getMany();
    }

    // Otras secciones comunes: ingresos, estadísticas mensuales, etc.

    return summary;
  }

  async updateStatus(id: string, status: OrderStatusEnum) {
    const order = await this.orderRepository.findOne({where: {id}});
    order.status = status;

    if (status === OrderStatusEnum.DELIVERED) order.deliveredDate = DateTime.now().toISODate();

    return this.orderRepository.save(order);
  }

  @OnEvent(INVOICE_DELIVERED, {async: true})
  async markAsDelivered({order}: InvoiceEntity) {
    order.status = OrderStatusEnum.DELIVERED;
    order.deliveredDate = DateTime.now().toISODate();

    const savedOrder = await this.orderRepository.save(order, {reload: true});

    this.logger.log(`Order ${ order.orderNumber } saved with status ${ savedOrder.status } and deliveredDate ${ savedOrder.deliveredDate }`);
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
      .leftJoinAndSelect('o.client', 'client')
      .select('o.client_id', 'clientId')
      .addSelect('client.fantasyName', 'clientFantasyName')
      .addSelect('COUNT(o.id)', 'totalOrders')
      .groupBy('o.client_id')
      .addGroupBy('client.fantasyName')
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
}
