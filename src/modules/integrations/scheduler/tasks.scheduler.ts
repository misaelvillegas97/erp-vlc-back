import { Injectable, Logger }   from '@nestjs/common';
import { ComercioNetService }   from '../services/comercio-net.service';
import { Cron, CronExpression } from '@nestjs/schedule';
import { CencosudB2bService }   from '../services/cencosud-b2b.service';
import { OrderRequestDto }      from '../domain/dto/order-request.dto';
import { OrderService }         from '../../orders/services/order.service';

@Injectable()
export class TasksScheduler {
  private readonly logger = new Logger(TasksScheduler.name);

  constructor(
    private readonly comercioNetService: ComercioNetService,
    private readonly cencosudB2bService: CencosudB2bService,
    private readonly orderService: OrderService,
  ) {}

  @Cron(CronExpression.EVERY_HOUR, {disabled: true})
  async checkComercioNet() {
    await this.comercioNetService.run();
  }

  @Cron(CronExpression.EVERY_5_MINUTES, {disabled: true})
  async checkCencoB2B() {
    this.logger.log(`Initializing CencosudB2B task at ${ new Date().toISOString() }`);

    console.time('CencoB2B');
    const orders = await this.cencosudB2bService.run();
    console.timeEnd('CencoB2B');
    const mappedOrders: OrderRequestDto[] = orders.map((order: any) => OrderRequestDto.mapFromCencoB2B(order));

    await this.orderService.createAll(mappedOrders.map((order) => order.toEntity()));
  }
}
