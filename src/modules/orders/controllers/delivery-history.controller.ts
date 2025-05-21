// src/modules/orders/controllers/delivery-history.controller.ts
import { Controller, Get, Param } from '@nestjs/common';
import { ApiOperation, ApiParam, ApiResponse, ApiTags, ApiBearerAuth } from '@nestjs/swagger';
import { DeliveryHistoryService } from '../services/delivery-history.service';
import { DeliveryHistoryEntity }  from '../domain/entities/delivery-history.entity';

@ApiTags('Orders - Delivery History')
@ApiBearerAuth()
@Controller('orders/:orderId/history')
export class DeliveryHistoryController {
  constructor(private readonly deliveryHistoryService: DeliveryHistoryService) {}

  @Get()
  @ApiOperation({ summary: 'Get delivery history for an order' })
  @ApiParam({ name: 'orderId', description: 'ID of the order to retrieve history for', type: String })
  @ApiResponse({ status: 200, description: 'Delivery history retrieved successfully.', type: [DeliveryHistoryEntity] })
  @ApiResponse({ status: 404, description: 'Order not found or no history available.' })
  @ApiResponse({ status: 401, description: 'Unauthorized.' })
  async getHistory(@Param('orderId') orderId: string): Promise<DeliveryHistoryEntity[]> {
    return this.deliveryHistoryService.getHistory(orderId);
  }
}
