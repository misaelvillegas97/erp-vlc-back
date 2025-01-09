import { Injectable }           from '@nestjs/common';
import { InjectRepository }     from '@nestjs/typeorm';
import { OrderEntity }          from '../domain/entities/order.entity';
import { ProductRequestEntity } from '../domain/entities/product-request.entity';
import { Repository }           from 'typeorm';

@Injectable()
export class OrderService {
  constructor(
    @InjectRepository(OrderEntity) private orderRepository: Repository<OrderEntity>,
    @InjectRepository(ProductRequestEntity) private productRepository: Repository<ProductRequestEntity>,
  ) {}

  async findAll(): Promise<OrderEntity[]> {
    return this.orderRepository.find({join: {alias: 'order', leftJoinAndSelect: {products: 'order.products'}}});
  }

  async findOne(id: string): Promise<OrderEntity> {
    return this.orderRepository.findOne({where: {id}});
  }

  async create(order: OrderEntity): Promise<OrderEntity> {
    return this.orderRepository.save(order);
  }

  async createAll(orders: OrderEntity[]): Promise<{ created: OrderEntity[]; updated: OrderEntity[] }> {
    const createdOrders = [];
    const updatedOrders = [];

    // Validate if order already exists by orderNumber, if exists, check status and update if necessary, if not, create new order
    for (const order of orders) {
      const existingOrder = await this.orderRepository.findOne({where: {orderNumber: order.orderNumber}});
      if (existingOrder) {
        if (existingOrder.status !== order.status) {
          existingOrder.status = order.status;
          updatedOrders.push(await this.orderRepository.save(existingOrder));
        }
      } else {
        createdOrders.push(await this.orderRepository.save(order));
      }
    }

    const result = {
      created: createdOrders,
      updated: updatedOrders,
    };

    console.log(result);

    return result;
  }
}
