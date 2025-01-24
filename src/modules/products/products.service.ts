import { Injectable }               from '@nestjs/common';
import { InjectRepository }         from '@nestjs/typeorm';
import { ProductEntity }            from '@modules/products/domain/entities/product.entity';
import { Repository }               from 'typeorm';
import { AssignProductToClientDto } from '@modules/products/domain/dtos/assign-product-to-client.dto';
import { ClientProductEntity }      from '@modules/products/domain/entities/client-product.entity';
import { CreateProductDto }         from '@modules/products/domain/dtos/create-product.dto';
import { UpdateProductDto }         from '@modules/products/domain/dtos/update-product.dto';

@Injectable()
export class ProductsService {
  constructor(
    @InjectRepository(ProductEntity) private readonly productRepository: Repository<ProductEntity>,
    @InjectRepository(ClientProductEntity) private readonly clientProductRepository: Repository<ClientProductEntity>,
  ) {}

  async findAll(): Promise<ProductEntity[]> {
    return this.productRepository.find();
  }

  async findOne(id: string): Promise<ProductEntity> {
    return this.productRepository.findOne({where: {id}});
  }

  async create(product: CreateProductDto): Promise<ProductEntity> {
    return this.productRepository.save(product);
  }

  async update(productId: string, product: UpdateProductDto): Promise<ProductEntity> {
    await this.productRepository.update(productId, product);

    return this.productRepository.findOne({where: {id: productId}});
  }

  async delete(id: string): Promise<void> {
    await this.productRepository.delete(id);
  }

  async assignToClient(productId: string, assignProductToClientDto: AssignProductToClientDto) {
    const {clientId, providerCode} = assignProductToClientDto;

    const clientProduct = new ClientProductEntity();
    clientProduct.id = clientId;

    clientProduct.product = await this.productRepository.findOne({where: {id: productId}});

    if (providerCode) clientProduct.providerCode = providerCode;

    return this.clientProductRepository.save(clientProduct);
  }
}
