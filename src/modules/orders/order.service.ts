import { Inject, Injectable, Logger, UnprocessableEntityException } from '@nestjs/common';
import { EventEmitter2, OnEvent }                                   from '@nestjs/event-emitter';
import { InjectDataSource, InjectRepository }                       from '@nestjs/typeorm';
import { REQUEST }                                                  from '@nestjs/core';

import { Request }                         from 'express';
import { DateTime }                        from 'luxon';
import { DataSource, In, Not, Repository } from 'typeorm';

import { ClientEntity }      from '@modules/clients/domain/entities/client.entity';
import { InvoiceEntity }     from '@modules/invoices/domain/entities/invoice.entity';
import { INVOICE_DELIVERED } from '@modules/invoices/domain/events.constant';
import { InvoicesService }   from '@modules/invoices/invoices.service';
import { ProductEntity }     from '@modules/products/domain/entities/product.entity';
import { ProductsService }   from '@modules/products/products.service';
import { UsersService }      from '@modules/users/users.service';

import { CreateExternalOrderDto }   from './domain/dtos/create-external-order.dto';
import { OrderStatusEnum }          from './domain/enums/order-status.enum';
import { OrderEntity }              from './domain/entities/order.entity';
import { OrderProductEntity }       from './domain/entities/order-product.entity';
import { OrdersObservationsEntity } from './domain/entities/orders-observations.entity';
import { CreateInvoiceDto }         from './domain/dtos/create-invoice.dto';
import { CreateOrderDto }           from './domain/dtos/create-order.dto';
import { OrderQueryDto }            from './domain/dtos/order-query.dto';
import { OrdersOverview }           from './domain/interfaces/dashboard-overview.interface';
import { DeliveryHistoryService }   from './services/delivery-history.service';
import { IPaginationOptions }       from '@shared/utils/types/pagination-options';
import { PaginationDto }            from '@shared/utils/dto/pagination.dto';

@Injectable()
export class OrderService {
  private readonly logger = new Logger(OrderService.name);

  constructor(
    @Inject(REQUEST) private readonly request: Request,
    @InjectDataSource() private dataSource: DataSource,
    @InjectRepository(OrderEntity) private orderRepository: Repository<OrderEntity>,
    @InjectRepository(OrderProductEntity) private orderProductRepository: Repository<OrderProductEntity>,
    private readonly deliveryHistoryService: DeliveryHistoryService,
    private readonly invoicesService: InvoicesService,
    private readonly productsService: ProductsService,
    private readonly userService: UsersService,
    private readonly eventEmitter: EventEmitter2
  ) {}

  async findAll(query: OrderQueryDto, {page, limit}: IPaginationOptions): Promise<PaginationDto<OrderEntity>> {
    const qb = this.orderRepository.createQueryBuilder('order');

    qb.leftJoinAndSelect('order.client', 'client');
    qb.leftJoinAndSelect('order.invoices', 'invoices', 'invoices.isActive = true');
    qb.leftJoinAndSelect('order.products', 'products');

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

    if (query.invoice)
      qb.andWhere('invoices.invoiceNumber = :invoice', {invoice: `${ query.invoice }`});

    qb.groupBy('order.id');
    qb.addGroupBy('client.id');
    qb.addGroupBy('invoices.id');
    qb.addGroupBy('products.id');

    if (query.amount)
      qb.having('SUM(products.unitaryPrice * products.quantity) = :amount', {amount: query.amount});

    const countQb = qb.clone();
    countQb.skip(undefined).take(undefined);
    const rawCount = await countQb.getRawMany();
    let total = rawCount.length;

    qb.orderBy('order.orderNumber', 'DESC');
    qb.take(limit);
    qb.skip((page - 1) * limit);
    qb.cache(30_000);

    const [ orders, count ] = await qb.getManyAndCount();

    if (count !== 0 && total > count) {
      total = count;
    }

    return new PaginationDto({total, page, limit, items: orders});
  }

  async findOne(id: string): Promise<OrderEntity> {
    return this.orderRepository.findOne({where: {id}, relations: [ 'products', 'invoices', 'observations' ]});
  }

  async create(order: CreateOrderDto): Promise<OrderEntity> {
    const nextOrderNumber = await this.generateOrderNumber('O');
    order.products = await Promise.all(order.products.map((product) => ({
      ...product,
      product: new ProductEntity({id: product.id})
    } as OrderProductEntity)));

    const newOrder = await this.orderRepository.save(this.orderRepository.create({
      ...order,
      client: new ClientEntity({id: order.clientId}),
      orderNumber: nextOrderNumber,
      observations: order.observations && [ new OrdersObservationsEntity({observation: order.observations}) ],
    }));

    await this.deliveryHistoryService.addHistory(newOrder.id, OrderStatusEnum.CREATED);

    return newOrder;
  }

  @OnEvent('order-providers.createAll')
  async createAll(orders: CreateExternalOrderDto[]): Promise<{ created: OrderEntity[]; updated: OrderEntity[] }> {
    const createdOrders = [];
    const updatedOrders = [];

    // Validate if order already exists by orderNumber, if exists, check status and update if necessary, if not, create new order
    for (const order of orders) {
      const existingOrder = await this.orderRepository.findOne({where: {referenceId: order.orderNumber}});
      if (!existingOrder) {
        const nextOrderNumber = await this.generateOrderNumber('R');
        order.products = await Promise.all(order.products.map(async (product) => {
          const productEntity = await this.productsService.findClientProducts(order.clientId, +product.providerCode);

          if (!productEntity) return product;

          product.description = productEntity.product.name;
          product.upcCode = productEntity.product.upcCode;

          return {
            ...product,
            product: productEntity?.product && productEntity.product,
          } as OrderProductEntity;
        }));

        createdOrders.push(
          await this.orderRepository.save(
            this.orderRepository.create({
              ...order,
              orderNumber: nextOrderNumber,
              referenceId: order.orderNumber,
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
    // Fetch the order with necessary relations
    const order = await this.orderRepository.findOne({
      where: {id},
      relations: [ 'products', 'invoices' ],
    });

    // Check if the order already has invoices
    if (order.invoices?.length > 0) throw new UnprocessableEntityException({code: 'ORDER_ALREADY_INVOICED'});

    // Calculate amounts if not provided
    if (!createInvoiceDto.netAmount || !createInvoiceDto.taxAmount || !createInvoiceDto.totalAmount) {
      const netAmount = order.products.reduce((acc, product) => acc + product.unitaryPrice * product.quantity, 0);

      createInvoiceDto.netAmount = netAmount;
      createInvoiceDto.taxAmount = netAmount * 0.19;
      createInvoiceDto.totalAmount = netAmount + createInvoiceDto.taxAmount;
    }

    // Update order status if applicable
    if (order.status !== OrderStatusEnum.DELIVERED && createInvoiceDto.markAsPendingDelivery) {
      order.status = OrderStatusEnum.PENDING_DELIVERY;
    }

    // Save the updated order status
    await this.orderRepository.save(order);

    const invoice = await this.invoicesService.create(order.id, order.client.id, createInvoiceDto);

    this.eventEmitter.emit(
      'notifications.user',
      createInvoiceDto.deliveryAssignmentId,
      'NEW_DELIVERY_ASSIGNMENT',
      {invoiceNumber: invoice.invoiceNumber, orderNumber: order.orderNumber}
    );

    return invoice;
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

    // // Información para Accountant
    // if (user.role.name === 'ACCOUNTANT') {
    //   summary.ordersWithoutInvoice = await this.orderRepository.count({
    //     where: {invoice: {id: IsNull()}}
    //   });
    //   summary.pendingInvoices = await this.orderRepository.count({
    //     where: {
    //       invoice: {status: In([ 'ISSUED', 'RECEIVED_WITH_OBSERVATIONS', 'RECEIVED_WITHOUT_OBSERVATIONS' ])}
    //     }
    //   });
    // }

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

  async getOrdersToday(): Promise<OrderEntity[]> {
    const today = DateTime.now().toISODate();
    const excludedStatuses = [ OrderStatusEnum.DELIVERED, OrderStatusEnum.CANCELED ];

    return this.orderRepository
      .createQueryBuilder('o')
      .where('o.deliveryDate = :today', {today})
      .andWhere('o.status NOT IN (:...excluded)', {excluded: excludedStatuses})
      .getMany();
  }

  async updateStatus(id: string, status: OrderStatusEnum) {
    const order = await this.orderRepository.findOne({where: {id}});
    order.status = status;

    if (status === OrderStatusEnum.DELIVERED) order.deliveredDate = DateTime.now().toJSDate();

    await this.deliveryHistoryService.addHistory(order.id, status);

    return this.orderRepository.save(order);
  }

  @OnEvent(INVOICE_DELIVERED, {async: true})
  async markAsDelivered({order}: InvoiceEntity) {
    if (!order || order.status === OrderStatusEnum.DELIVERED)
      this.logger.warn(`Order ${ order.orderNumber } already marked as delivered`);

    order.status = OrderStatusEnum.DELIVERED;
    order.deliveredDate = DateTime.now().toJSDate();

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
      .leftJoinAndSelect('o.invoices', 'i')
      .where('i.id IS NULL')
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
      .select('AVG(DATE_PART(\'day\', o."delivered_date"::timestamp - o."delivery_date"::timestamp))', 'avgDeliveryDays')
      .where('o.delivered_date IS NOT NULL')
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
      .leftJoin('p.order', 'o')
      .select('to_char(o.emission_date, \'YYYY-MM-DD\')', 'date')
      .addSelect('SUM(p."total_price")', 'revenue')
      .groupBy('to_char(o.emission_date, \'YYYY-MM-DD\')')
      .orderBy('to_char(o.emission_date, \'YYYY-MM-DD\')', 'ASC')
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

  async generateOrderNumber(prefix: string = 'R', period: 'year' | 'month' = 'month'): Promise<string> {
    const now = new Date();
    let periodString: string;

    if (period === 'year') {
      periodString = now.getFullYear().toString();
    } else {
      const month = (now.getMonth() + 1).toString().padStart(2, '0');
      periodString = `${ now.getFullYear() }${ month }`;
    }

    const sequenceName = `order_number_seq_${ periodString }`;

    await this.dataSource.query(`
    CREATE SEQUENCE IF NOT EXISTS ${ sequenceName }
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;
  `);

    // Obtener el siguiente valor de la secuencia
    const result = await this.dataSource.query(`SELECT nextval('${ sequenceName }') as seq`);
    const seqNumber = result[0].seq;

    const formattedCounter = seqNumber.toString().padStart(4, '0');

    return `${ prefix }-${ periodString }-${ formattedCounter }`;
  }

}
