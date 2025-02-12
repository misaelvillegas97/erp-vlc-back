import { forwardRef, Inject, Injectable, UnprocessableEntityException } from '@nestjs/common';
import { InjectRepository }                                             from '@nestjs/typeorm';
import { InvoiceEntity }                                                from '@modules/invoices/domain/entities/invoice.entity';
import { Repository }                                                   from 'typeorm';
import { CreateInvoiceDto }                                             from '@modules/orders/domain/dtos/create-invoice.dto';
import { OrderEntity }                                                  from '@modules/orders/domain/entities/order.entity';
import { ClientEntity }                                                 from '@modules/clients/domain/entities/client.entity';
import { InvoiceQueryDto }                                              from '@modules/invoices/domain/dtos/query.dto';
import { InvoiceStatusEnum }                                            from '@modules/orders/domain/enums/invoice-status.enum';
import { OrderStatusEnum }                                              from '@modules/orders/domain/enums/order-status.enum';
import { StatusUpdateDto }                                              from '@modules/invoices/domain/dtos/status-update.dto';
import { OrderService }                                                 from '@modules/orders/order.service';
import { UserEntity }                                                   from '@modules/users/domain/entities/user.entity';

@Injectable()
export class InvoicesService {
  constructor(
    @InjectRepository(InvoiceEntity) private readonly invoiceRepository: Repository<InvoiceEntity>,
    @Inject(forwardRef(() => OrderService)) private readonly ordersService: OrderService
  ) {}

  async findAll(query?: InvoiceQueryDto): Promise<InvoiceEntity[]> {
    const qb = this.invoiceRepository.createQueryBuilder('inv');

    qb.leftJoinAndSelect('inv.order', 'order');
    qb.leftJoinAndSelect('inv.client', 'client');

    if (query?.invoiceNumber) qb.andWhere('inv.invoiceNumber ilike :invoiceNumber', {invoiceNumber: `%${ query.invoiceNumber }%`});
    if (query?.clientId && Array.isArray(query.clientId)) qb.andWhere('inv.client.id IN (:...clientId)', {clientId: query.clientId});
    if (query?.clientId && !Array.isArray(query.clientId)) qb.andWhere('inv.client.id = :clientId', {clientId: query.clientId});
    if (query?.orderNumber) qb.andWhere('order.orderNumber ilike :orderNumber', {orderNumber: `%${ query.orderNumber }%`});
    if (query?.status && Array.isArray(query.status)) qb.andWhere('inv.status IN (:...status)', {status: query.status});
    if (query?.status && !Array.isArray(query.status)) qb.andWhere('inv.status = :status', {status: query.status});
    if (query?.emissionDate?.from) qb.andWhere('inv.emissionDate >= :from', {from: query.emissionDate.from});
    if (query?.emissionDate?.to) qb.andWhere('inv.emissionDate <= :to', {to: query.emissionDate.to});
    if (query?.dueDate?.from) qb.andWhere('inv.dueDate >= :from', {from: query.dueDate.from});
    if (query?.dueDate?.to) qb.andWhere('inv.dueDate <= :to', {to: query.dueDate.to});
    if (query?.netAmount?.from) qb.andWhere('inv.netAmount >= :from', {from: query.netAmount.from});
    if (query?.netAmount?.to) qb.andWhere('inv.netAmount <= :to', {to: query.netAmount.to});
    if (query?.taxAmount?.from) qb.andWhere('inv.taxAmount >= :from', {from: query.taxAmount.from});
    if (query?.taxAmount?.to) qb.andWhere('inv.taxAmount <= :to', {to: query.taxAmount.to});
    if (query?.totalAmount?.from) qb.andWhere('inv.totalAmount >= :from', {from: query.totalAmount.from});
    if (query?.totalAmount?.to) qb.andWhere('inv.totalAmount <= :to', {to: query.totalAmount.to});
    if (query?.deliveryAssignment) qb.andWhere('inv.deliveryAssignment.id = :deliveryAssignment', {deliveryAssignment: query.deliveryAssignment});

    return qb.getMany();
  }

  async findByInvoiceNumber(invoiceNumber: number): Promise<InvoiceEntity> {
    return this.invoiceRepository.findOne({where: {invoiceNumber}, relations: [ 'order' ]});
  }

  async updateStatus(invoiceId: string, statusUpdateDto: StatusUpdateDto) {
    const invoice = await this.invoiceRepository.findOne({where: {id: invoiceId}, relations: [ 'order' ]});
    if (!invoice) throw new UnprocessableEntityException({code: 'INVOICE_NOT_FOUND'});

    invoice.status = statusUpdateDto.status;

    if (statusUpdateDto.status === InvoiceStatusEnum.PAID)
      invoice.paymentDate = statusUpdateDto.paymentDate ? statusUpdateDto.paymentDate : new Date().toISOString();

    if ([ InvoiceStatusEnum.RECEIVED_WITH_OBSERVATIONS, InvoiceStatusEnum.RECEIVED_WITHOUT_OBSERVATIONS ].includes(statusUpdateDto.status))
      await this.updateOrderToDelivered(invoice);

    if (statusUpdateDto.observations)
      invoice.observations = statusUpdateDto.observations;

    return this.invoiceRepository.save(invoice);
  }

  async create(orderId: string, clientId: string, createInvoiceDto: CreateInvoiceDto) {
    const existingInvoice = await this.invoiceRepository.findOne({
      where: {invoiceNumber: createInvoiceDto.invoiceNumber},
      relations: [ 'order' ]
    });

    if (existingInvoice) throw new UnprocessableEntityException({
      code: 'INVOICE_ALREADY_EXISTS',
      orderNumber: existingInvoice.order.orderNumber
    });

    const invoice = this.invoiceRepository.create(createInvoiceDto);
    invoice.order = new OrderEntity({id: orderId});
    invoice.client = new ClientEntity({id: clientId});
    invoice.deliveryAssignment = new UserEntity({id: createInvoiceDto.deliveryAssignmentId});

    console.log('invoice', invoice);

    return this.invoiceRepository.save(invoice);
  }

  async invoicesOverview() {
    // 1. Facturas emitidas vs pagadas vs pendientes
    let invoicesByStatus = await this.invoiceRepository
      .createQueryBuilder('inv')
      .select('inv.status', 'status')
      .addSelect('COUNT(inv.id)', 'total')
      .groupBy('inv.status')
      .getRawMany();

    invoicesByStatus = Object.values(InvoiceStatusEnum).map((status) => {
      const statusItem = invoicesByStatus.find((item) => item.status === status);
      return {status, total: statusItem ? statusItem.total : 0};
    });

    // 2. Monto total facturado por período (por día)
    const totalInvoicedByDate = await this.invoiceRepository
      .createQueryBuilder('inv')
      .select('to_char(inv.emissionDate, \'YYYY-MM-DD\')', 'date')
      .addSelect('SUM(inv."totalAmount")', 'total')
      .groupBy('to_char(inv.emissionDate, \'YYYY-MM-DD\')')
      .orderBy('to_char(inv.emissionDate, \'YYYY-MM-DD\')', 'ASC')
      .getRawMany();

    // 3. Facturas por cliente (TOP 5 en monto facturado)
    const invoicesByClient = await this.invoiceRepository
      .createQueryBuilder('inv')
      .leftJoinAndSelect('inv.client', 'client')
      .select('inv.client_id', 'clientId')
      .addSelect('client.fantasyName', 'clientFantasyName')
      .addSelect('SUM(inv."totalAmount")', 'totalAmount')
      .groupBy('inv.client_id')
      .addGroupBy('client.fantasyName')
      .orderBy('SUM(inv."totalAmount")', 'DESC')
      .limit(5)
      .getRawMany();

    // 4. % de facturas vencidas o pendientes (donde dueDate < hoy y status distinto de PAID)
    const now = new Date();
    const overdueInvoicesCount = await this.invoiceRepository
      .createQueryBuilder('inv')
      .where('inv."dueDate" < :now', {now})
      .andWhere('inv."dueDate" IS NOT NULL')
      .andWhere('inv.status != :paidStatus', {paidStatus: 'PAID'})
      .getCount();

    const totalInvoicesCount = await this.invoiceRepository.count();
    const overduePercentage = totalInvoicesCount
      ? (overdueInvoicesCount / totalInvoicesCount) * 100
      : 0;

    // 5. Edad de las facturas (Aging)
    const agingQuery = `
      SELECT CASE
               WHEN "dueDate" < NOW() THEN 'Overdue'
               WHEN "dueDate" BETWEEN NOW() AND NOW() + INTERVAL '30 days' THEN '0-30'
               WHEN "dueDate" BETWEEN NOW() + INTERVAL '30 days' AND NOW() + INTERVAL '60 days' THEN '30-60'
               ELSE '60+'
               END AS bucket,
             COUNT(*) as total
      FROM orders_invoice
      WHERE "dueDate" IS NOT NULL
      GROUP BY bucket
    `;
    const agingResults = await this.invoiceRepository.query(agingQuery);

    // 6. Tiempo promedio de pago (en días) para facturas pagadas
    const averagePaymentTimeResult = await this.invoiceRepository
      .createQueryBuilder('inv')
      .select(
        `AVG(DATE_PART('day', inv."paymentDate"::timestamp - inv."emissionDate"::timestamp))`,
        'avgPaymentDays',
      )
      .where('inv.status = :paidStatus', {paidStatus: InvoiceStatusEnum.PAID})
      .getRawOne();
    const averagePaymentTime = averagePaymentTimeResult
      ? Number(averagePaymentTimeResult.avgPaymentDays)
      : 0;

    // 7. Porcentaje de facturas pagadas por período (por día)
    const paidInvoicesByDate = await this.invoiceRepository
      .createQueryBuilder('inv')
      .select('to_char(inv.emissionDate, \'YYYY-MM-DD\')', 'date')
      .addSelect(
        `SUM(CASE WHEN inv.status = '${ InvoiceStatusEnum.PAID }' THEN 1 ELSE 0 END)`,
        'paidCount',
      )
      .addSelect('COUNT(inv.id)', 'totalCount')
      .groupBy('to_char(inv.emissionDate, \'YYYY-MM-DD\')')
      .orderBy('to_char(inv.emissionDate, \'YYYY-MM-DD\')', 'ASC')
      .getRawMany();

    // 8. Distribución de facturas por asignación de entrega
    //    Se agrupa por el ID del repartidor asignado (delivery_assignment_id)
    const invoicesByDeliveryAssignment = await this.invoiceRepository
      .createQueryBuilder('inv')
      .select('inv.delivery_assignment_id', 'deliveryAssignmentId')
      .addSelect('COUNT(inv.id)', 'total')
      .groupBy('inv.delivery_assignment_id')
      .getRawMany();

    // 9. Monto total pendiente (facturas no pagadas) por período (por día)
    const outstandingAmountByDate = await this.invoiceRepository
      .createQueryBuilder('inv')
      .select('to_char(inv.emissionDate, \'YYYY-MM-DD\')', 'date')
      .addSelect('SUM(inv."totalAmount")', 'outstandingTotal')
      .where('inv.status != :paidStatus', {paidStatus: 'PAID'})
      .groupBy('to_char(inv.emissionDate, \'YYYY-MM-DD\')')
      .orderBy('to_char(inv.emissionDate, \'YYYY-MM-DD\')', 'ASC')
      .getRawMany();

    return {
      invoicesByStatus,
      totalInvoicedByDate,
      invoicesByClient,
      overduePercentage,
      agingResults,
      averagePaymentTime,
      paidInvoicesByDate,
      invoicesByDeliveryAssignment,
      outstandingAmountByDate,
    };
  }

  private async updateOrderToDelivered(invoice: InvoiceEntity) {
    invoice.order.status = OrderStatusEnum.DELIVERED;
    invoice.order.deliveredDate = new Date().toISOString();

    return this.ordersService.updateStatus(invoice.order.id, OrderStatusEnum.DELIVERED);
  }
}
