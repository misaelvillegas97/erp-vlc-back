// src/modules/orders/controllers/delivery-history.controller.ts
import { Controller, Get, Param } from '@nestjs/common';
import { DeliveryHistoryService } from '../services/delivery-history.service';
import { DeliveryHistoryEntity }  from '../domain/entities/delivery-history.entity';

@Controller('orders/:orderId/history')
export class DeliveryHistoryController {
  constructor(private readonly deliveryHistoryService: DeliveryHistoryService) {}

  @Get()
  async getHistory(@Param('orderId') orderId: string): Promise<DeliveryHistoryEntity[]> {
    return this.deliveryHistoryService.getHistory(orderId);
  }
}
