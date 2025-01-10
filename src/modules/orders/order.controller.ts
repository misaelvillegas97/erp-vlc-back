import { Body, Controller, Get, Param, Post, Put } from '@nestjs/common';
import { OrderService }                            from './order.service';
import { CreateOrderDto }                          from '@modules/orders/domain/dtos/create-order.dto';
import { OrderStatusEnum }                         from '@modules/orders/domain/enums/order-status.enum';

@Controller('orders')
export class OrderController {
  constructor(
    private readonly orderService: OrderService
  ) {}

  @Get()
  async findAll() {
    return this.orderService.findAll();
  }

  @Get(':id')
  async findOne(@Param('id') id: string) {
    return this.orderService.findOne(id);
  }

  @Post()
  async create(@Body() createOrderDto: CreateOrderDto) {
    return this.orderService.create(createOrderDto);
  }

  @Put(':id/invoice')
  async createInvoice(@Param('id') id: string, @Body('invoice') invoice: string) {
    return this.orderService.createInvoice(id, invoice);
  }

  @Put(':id/status')
  async updateStatus(@Param('id') id: string, @Body('status') status: OrderStatusEnum) {
    return this.orderService.updateStatus(id, status);
  }
}
