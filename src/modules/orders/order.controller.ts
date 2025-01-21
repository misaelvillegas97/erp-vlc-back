import { Body, Controller, Get, Param, Post, Put, Query } from '@nestjs/common';
import { OrderService }                                   from './order.service';
import { CreateOrderDto }                                 from '@modules/orders/domain/dtos/create-order.dto';
import { OrderStatusEnum }                                from '@modules/orders/domain/enums/order-status.enum';
import { IDashboardOverview }                             from '@modules/orders/domain/interfaces/dashboard-overview.interface';
import { OrderMapper }                                    from '@modules/orders/domain/mappers/order.mapper';

@Controller('orders')
export class OrderController {
  constructor(
    private readonly orderService: OrderService
  ) {}

  @Get()
  async findAll() {
    const orders = await this.orderService.findAll();

    return OrderMapper.mapAll(orders);
  }

  @Get('dashboard')
  async getDashboardInfo(@Query('month') month: string, @Query('year') year: string): Promise<IDashboardOverview> {
    return this.orderService.getDashboardInfo(year, month);
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
