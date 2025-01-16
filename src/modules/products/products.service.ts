import { Injectable }       from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { ProductEntity }    from '@modules/products/domain/entities/product.entity';
import { Repository }       from 'typeorm';

@Injectable()
export class ProductsService {

  constructor(
    @InjectRepository(ProductEntity) private readonly productRepository: Repository<ProductEntity>,
  ) {}

  async findAll(): Promise<ProductEntity[]> {
    return this.productRepository.find();
  }

  async findOne(id: string): Promise<ProductEntity> {
    return this.productRepository.findOne({where: {id}});
  }

  async create(product: ProductEntity): Promise<ProductEntity> {
    return this.productRepository.save(product);
  }

  async update(product: ProductEntity): Promise<ProductEntity> {
    return this.productRepository.save(product);
  }

  async delete(id: string): Promise<void> {
    await this.productRepository.delete(id);
  }
}
