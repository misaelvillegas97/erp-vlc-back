import { Injectable, Logger }   from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';

import { ClientService }      from '@modules/clients/client.service';
import { ComercioNetService } from '../services/comercio-net.service';
import { CencosudB2bService } from '../services/cencosud-b2b.service';
import { OrderRequestDto }    from '../domain/dto/order-request.dto';
import { EventEmitter2 }      from '@nestjs/event-emitter';
import { Environment }        from '@core/config/app.config';
import { ConfigService }      from '@nestjs/config';
import { AppConfigService }   from '@modules/config/app-config.service';

@Injectable()
export class TasksScheduler {
  private readonly logger = new Logger(TasksScheduler.name);
  private readonly environment!: Environment;

  constructor(
    private readonly comercioNetService: ComercioNetService,
    private readonly cencosudB2bService: CencosudB2bService,
    private readonly eventEmitter: EventEmitter2,
    private readonly clientService: ClientService,
    private readonly configService: AppConfigService,
    private readonly cs: ConfigService
  ) {
    this.environment = this.cs.get<Environment>('app.nodeEnv', {infer: true}) as Environment || Environment.Development;
  }

  // eslint-disable-next-line @typescript-eslint/ban-ts-comment
  // @ts-ignore
  @Cron(CronExpression.EVERY_3_HOURS, {disabled: this.environment === Environment.Development})
  async checkExternalOrders() {
    await this.checkCencoB2B();
    await this.checkComercioNet();
  }

  async checkComercioNet() {
    this.logger.log(`[WallmartB2B] Initializing task at ${ new Date().toISOString() }`);

    const clientEntity = await this.clientService.findByCode('WallmartB2B');

    const beginningTimestamp = new Date().getTime();
    const orders = await this.comercioNetService.run();
    const endingTimestamp = new Date().getTime();

    this.logger.log(`[WallmartB2B] Task finished at ${ new Date().toISOString() } in ${ endingTimestamp - beginningTimestamp }ms`);

    if (!orders) {
      this.logger.log('[WallmartB2B] No orders found');
      return;
    }

    const mappedOrders: OrderRequestDto[] = orders?.map((order: any) => ({
      ...OrderRequestDto.mapFromComercioNet(order),
      clientId: clientEntity.id
    } as OrderRequestDto));

    this.eventEmitter.emit('order-providers.createAll', mappedOrders);
  }

  async checkCencoB2B() {
    this.logger.log(`[CencosudB2B] Initializing task at ${ new Date().toISOString() }`);

    const clientEntity = await this.clientService.findByCode('CencosudB2B');

    const beginningTimestamp = new Date().getTime();
    const orders = await this.cencosudB2bService.run();
    const endingTimestamp = new Date().getTime();

    this.logger.log(`[CencosudB2B] Task finished at ${ new Date().toISOString() } in ${ endingTimestamp - beginningTimestamp }ms`);

    if (!orders) {
      this.logger.log('[CencosudB2B] No orders found');
      return;
    }

    const mappedOrders: OrderRequestDto[] = orders?.map((order: any) => ({
      ...OrderRequestDto.mapFromCencoB2B(order),
      clientId: clientEntity.id
    } as OrderRequestDto));

    this.eventEmitter.emit('order-providers.createAll', mappedOrders);
  }
}
