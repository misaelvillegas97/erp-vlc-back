import { Controller, Get, Post } from '@nestjs/common';
import { OrderService }          from '../services/order.service';
import { CreateOrderDto }        from '@modules/orders/domain/dtos/create-order.dto';

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
  async findOne(id: string) {
    return this.orderService.findOne(id);
  }

  @Post()
  async create(createOrderDto: CreateOrderDto) {
    return this.orderService.create(createOrderDto);
  }

}
