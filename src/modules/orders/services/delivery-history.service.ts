import { Injectable }            from '@nestjs/common';
import { InjectRepository }      from '@nestjs/typeorm';
import { Repository }            from 'typeorm';
import { DeliveryHistoryEntity } from '../domain/entities/delivery-history.entity';

@Injectable()
export class DeliveryHistoryService {
  constructor(
    @InjectRepository(DeliveryHistoryEntity)
    private readonly deliveryHistoryRepository: Repository<DeliveryHistoryEntity>,
  ) {}

  async addHistory(orderId: string, status: string): Promise<DeliveryHistoryEntity> {
    const history = this.deliveryHistoryRepository.create({
      orderId,
      status,
      timestamp: new Date(),
    });
    return this.deliveryHistoryRepository.save(history);
  }

  async getHistory(orderId: string): Promise<DeliveryHistoryEntity[]> {
    return this.deliveryHistoryRepository.find({where: {orderId}, order: {timestamp: 'ASC'}});
  }
}
