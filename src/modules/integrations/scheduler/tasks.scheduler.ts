import { Injectable, Logger }   from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';

import { ClientService } from '@modules/clients/client.service';

import { OrderService }       from '../../orders/order.service';
import { ComercioNetService } from '../services/comercio-net.service';
import { CencosudB2bService } from '../services/cencosud-b2b.service';
import { OrderRequestDto }    from '../domain/dto/order-request.dto';

@Injectable()
export class TasksScheduler {
  private readonly logger = new Logger(TasksScheduler.name);

  constructor(
    private readonly comercioNetService: ComercioNetService,
    private readonly cencosudB2bService: CencosudB2bService,
    private readonly clientService: ClientService,
    private readonly orderService: OrderService,
  ) {}

  @Cron(CronExpression.EVERY_HOUR, {disabled: true})
  async checkComercioNet() {
    await this.comercioNetService.run();
  }

  @Cron(CronExpression.EVERY_5_MINUTES, {disabled: true})
  async checkCencoB2B() {
    this.logger.log(`Initializing CencosudB2B task at ${ new Date().toISOString() }`);

    const clientEntity = await this.clientService.findByCode('CencosudB2B');

    const beginningTimestamp = new Date().getTime();
    const orders = await this.cencosudB2bService.run();
    const endingTimestamp = new Date().getTime();

    this.logger.log(`CencosudB2B task finished at ${ new Date().toISOString() } in ${ endingTimestamp - beginningTimestamp }ms`);

    if (!orders) {
      this.logger.log('No orders found');
      return;
    }

    const mappedOrders: OrderRequestDto[] = orders?.map((order: any) => ({
      ...OrderRequestDto.mapFromCencoB2B(order),
      clientId: clientEntity.id
    } as OrderRequestDto));

    await this.orderService.createAll(mappedOrders);
  }
}
