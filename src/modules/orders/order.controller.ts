import { Body, Controller, Get, Inject, Logger, NotFoundException, Param, Post, Put, Query, UseGuards } from '@nestjs/common';
import { REQUEST }                                                                                      from '@nestjs/core';
import { ApiTags, ApiBearerAuth, ApiOperation, ApiQuery, ApiResponse, ApiParam, ApiBody }                from '@nestjs/swagger';
import { OrderStatusEnum }                                                                              from './domain/enums/order-status.enum';
import { OrderMapper }                                                                                  from './domain/mappers/order.mapper';
import { CreateInvoiceDto }                                                                             from './domain/dtos/create-invoice.dto';
import { OrderQueryDto }                                                                                from './domain/dtos/order-query.dto';
import { OrderService }                                                                                 from './order.service';
import { Request }                                                                                      from 'express';
import { AuthGuard }                                                                                    from '@nestjs/passport';
import { CreateOrderDto }                                                                               from '@modules/orders/domain/dtos/create-order.dto';

@ApiTags('Orders')
@ApiBearerAuth()
@UseGuards(AuthGuard('jwt'))
@Controller('orders')
export class OrderController {
  readonly #logger = new Logger(OrderController.name);

  constructor(
    @Inject(REQUEST) private readonly request: Request,
    private readonly orderService: OrderService,
  ) {}

  @Get()
  @ApiOperation({ summary: 'Find all orders (paginated)' })
  @ApiQuery({ name: 'page', required: false, type: Number, description: 'Page number for pagination' })
  @ApiQuery({ name: 'limit', required: false, type: Number, description: 'Number of items per page (max 50)' })
  @ApiQuery({ name: 'status', required: false, enum: OrderStatusEnum, description: 'Filter by order status' })
  @ApiQuery({ name: 'sort', required: false, type: String, description: 'Sort criteria (e.g., createdAt:ASC)' })
  @ApiQuery({ name: 'search', required: false, type: String, description: 'Search term for orders' })
  @ApiQuery({ name: 'startDate', required: false, type: String, format: 'date-time', description: 'Start date filter' })
  @ApiQuery({ name: 'endDate', required: false, type: String, format: 'date-time', description: 'End date filter' })
  @ApiQuery({ name: 'driverId', required: false, type: String, description: 'Filter by driver ID' })
  @ApiQuery({ name: 'vehicleId', required: false, type: String, description: 'Filter by vehicle ID' })
  @ApiQuery({ name: 'clientId', required: false, type: String, description: 'Filter by client ID' })
  @ApiResponse({ status: 200, description: 'List of orders retrieved successfully.' })
  @ApiResponse({ status: 401, description: 'Unauthorized.' })
  @ApiResponse({ status: 403, description: 'Forbidden resource.' })
  async findAll(@Query() query: OrderQueryDto) {
    const page = query?.page ?? 1;
    let limit = query?.limit ?? 10;
    if (limit > 50) limit = 50;

    const orders = await this.orderService.findAll(query, {page, limit});

    return {
      ...orders,
      items: OrderMapper.mapAll(orders.items),
    };
  }

  @Get('dashboard/overview')
  @ApiOperation({ summary: 'Get dashboard overview data for orders' })
  @ApiResponse({ status: 200, description: 'Dashboard overview retrieved successfully.' })
  @ApiResponse({ status: 401, description: 'Unauthorized.' })
  @ApiResponse({ status: 403, description: 'Forbidden resource.' })
  async getDashboardOverview(): Promise<any> {
    return this.orderService.ordersOverview();
  }

  @Get('dashboard/summary')
  @ApiOperation({ summary: 'Get orders summary' })
  @ApiQuery({ name: 'startDate', required: false, type: String, format: 'date-time', description: 'Start date for summary' })
  @ApiQuery({ name: 'endDate', required: false, type: String, format: 'date-time', description: 'End date for summary' })
  @ApiResponse({ status: 200, description: 'Orders summary retrieved successfully.' })
  @ApiResponse({ status: 401, description: 'Unauthorized.' })
  @ApiResponse({ status: 403, description: 'Forbidden resource.' })
  async getSummary(): Promise<any> {
    return this.orderService.getSummary();
  }

  @Get('today')
  @ApiOperation({ summary: 'Get orders for today' })
  @ApiResponse({ status: 200, description: 'Today\'s orders retrieved successfully.' })
  @ApiResponse({ status: 401, description: 'Unauthorized.' })
  @ApiResponse({ status: 403, description: 'Forbidden resource.' })
  async getOrdersToday(): Promise<OrderMapper[]> {
    const order = await this.orderService.getOrdersToday();

    return OrderMapper.mapAll(order);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Find a single order by ID' })
  @ApiParam({ name: 'id', description: 'Order ID', type: String, example: 'clx2i465y0000qxtofy1z1r6k' })
  @ApiResponse({ status: 200, description: 'Order retrieved successfully.' })
  @ApiResponse({ status: 401, description: 'Unauthorized.' })
  @ApiResponse({ status: 403, description: 'Forbidden resource.' })
  @ApiResponse({ status: 404, description: 'Order not found.' })
  async findOne(@Param('id') id: string) {
    const order = await this.orderService.findOne(id);

    if (!order) throw new NotFoundException({code: 'ORDER_NOT_FOUND', message: 'Order not found'});

    return OrderMapper.map(order);
  }

  @Post()
  @ApiOperation({ summary: 'Create a new order' })
  @ApiBody({ type: CreateOrderDto })
  @ApiResponse({ status: 201, description: 'Order created successfully.' })
  @ApiResponse({ status: 400, description: 'Bad Request.' })
  @ApiResponse({ status: 401, description: 'Unauthorized.' })
  @ApiResponse({ status: 403, description: 'Forbidden resource.' })
  async create(@Body() createOrderDto: CreateOrderDto) {
    return this.orderService.create(createOrderDto);
  }

  @Post(':id/invoice')
  @ApiOperation({ summary: 'Create an invoice for an order' })
  @ApiParam({ name: 'id', description: 'Order ID to create invoice for', type: String, example: 'clx2i465y0000qxtofy1z1r6k' })
  @ApiBody({ type: CreateInvoiceDto })
  @ApiResponse({ status: 201, description: 'Invoice created successfully.' })
  @ApiResponse({ status: 400, description: 'Bad Request.' })
  @ApiResponse({ status: 401, description: 'Unauthorized.' })
  @ApiResponse({ status: 403, description: 'Forbidden resource.' })
  @ApiResponse({ status: 404, description: 'Order not found.' })
  async createInvoice(@Param('id') id: string, @Body() createInvoiceDto: CreateInvoiceDto) {
    return this.orderService.createInvoice(id, createInvoiceDto);
  }

  @Put(':id/status')
  @ApiOperation({ summary: 'Update order status' })
  @ApiParam({ name: 'id', description: 'Order ID', type: String, example: 'clx2i465y0000qxtofy1z1r6k' })
  @ApiBody({ schema: { type: 'object', properties: { status: { enum: Object.values(OrderStatusEnum), example: OrderStatusEnum.PENDING } } } })
  @ApiResponse({ status: 200, description: 'Order status updated successfully.' })
  @ApiResponse({ status: 400, description: 'Bad Request (e.g., invalid status).' })
  @ApiResponse({ status: 401, description: 'Unauthorized.' })
  @ApiResponse({ status: 403, description: 'Forbidden resource.' })
  @ApiResponse({ status: 404, description: 'Order not found.' })
  async updateStatus(@Param('id') id: string, @Body('status') status: OrderStatusEnum) {
    return this.orderService.updateStatus(id, status);
  }
}
