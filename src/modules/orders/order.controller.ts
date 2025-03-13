import { Body, Controller, Get, Inject, Param, Post, Put, Query, UseGuards } from '@nestjs/common';
import { REQUEST }                                                           from '@nestjs/core';
import { OrderStatusEnum }                                                   from './domain/enums/order-status.enum';
import { OrderMapper }                                                       from './domain/mappers/order.mapper';
import { CreateInvoiceDto }                                                  from './domain/dtos/create-invoice.dto';
import { OrderQueryDto }                                                     from './domain/dtos/order-query.dto';
import { OrderService }                                                      from './order.service';
import { Request }                                                           from 'express';
import { AuthGuard }                                                         from '@nestjs/passport';
import { CreateOrderDto }                                                    from '@modules/orders/domain/dtos/create-order.dto';

@UseGuards(AuthGuard('jwt'))
@Controller('orders')
export class OrderController {
  constructor(
    @Inject(REQUEST) private readonly request: Request,
    private readonly orderService: OrderService,
  ) {}

  @Get()
  async findAll(@Query() query: OrderQueryDto) {
    const orders = await this.orderService.findAll(query);

    return OrderMapper.mapAll(orders);
  }

  @Get('dashboard/overview')
  async getDashboardOverview(): Promise<any> {
    return this.orderService.ordersOverview();
  }

  @Get('dashboard/summary')
  async getSummary(): Promise<any> {
    return this.orderService.getSummary();
  }

  @Get('today')
  async getOrdersToday(): Promise<OrderMapper[]> {
    const order = await this.orderService.getOrdersToday();

    return OrderMapper.mapAll(order);
  }

  @Get(':id')
  async findOne(@Param('id') id: string) {
    const order = await this.orderService.findOne(id);

    return OrderMapper.map(order);
  }

  @Post()
  async create(@Body() createOrderDto: CreateOrderDto) {
    return this.orderService.create(createOrderDto);
  }

  @Post(':id/invoice')
  async createInvoice(@Param('id') id: string, @Body() createInvoiceDto: CreateInvoiceDto) {
    return this.orderService.createInvoice(id, createInvoiceDto);
  }

  @Put(':id/status')
  async updateStatus(@Param('id') id: string, @Body('status') status: OrderStatusEnum) {
    return this.orderService.updateStatus(id, status);
  }
}
