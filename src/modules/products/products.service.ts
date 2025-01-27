import { Injectable, UnprocessableEntityException } from '@nestjs/common';
import { InjectRepository }                         from '@nestjs/typeorm';
import { ProductEntity }                            from '@modules/products/domain/entities/product.entity';
import { Repository }                               from 'typeorm';
import { AssignProductToClientDto }                 from '@modules/products/domain/dtos/assign-product-to-client.dto';
import { ProductsClientEntity }                     from '@modules/products/domain/entities/products-client.entity';
import { CreateProductDto }                         from '@modules/products/domain/dtos/create-product.dto';
import { UpdateProductDto }                         from '@modules/products/domain/dtos/update-product.dto';
import { QueryProductDto }                          from '@modules/products/domain/dtos/query-product.dto';

@Injectable()
export class ProductsService {
  constructor(
    @InjectRepository(ProductEntity) private readonly productRepository: Repository<ProductEntity>,
    @InjectRepository(ProductsClientEntity) private readonly clientProductRepository: Repository<ProductsClientEntity>,
  ) {}

  async findAll(queryProductDto: QueryProductDto): Promise<ProductEntity[]> {
    const {upcCode, name, unitaryPrice} = queryProductDto;
    const qb = this.productRepository.createQueryBuilder('product');

    // add relations
    qb.leftJoinAndSelect('product.providerCodes', 'providerCodes')
      .leftJoinAndSelect('providerCodes.client', 'client')
      .leftJoinAndSelect('providerCodes.product', 'providerCodeProduct');

    if (upcCode) qb.andWhere('product.upcCode ilike :upcCode', {upcCode: `%${ upcCode }%`});
    if (name) qb.andWhere('product.name ilike :name', {name: `%${ name }%`});
    if (unitaryPrice) qb.andWhere('product.unitaryPrice = :unitaryPrice', {unitaryPrice});

    const results = await qb.getMany();

    console.log(results.map((product) => product.providerCodes));
    return results;
  }

  async findOne(id: string): Promise<ProductEntity> {
    return this.productRepository.findOne({where: {id}});
  }

  async create(product: CreateProductDto): Promise<ProductEntity> {
    return this.productRepository.save(this.productRepository.create(product));
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

    // Find if the client already has the product assigned
    const tempEntity = await this.clientProductRepository.findOne(
      {where: {client: {id: clientId}, product: {id: productId}}}
    );

    if (tempEntity) {
      throw new UnprocessableEntityException('The client already has the product assigned');
    }

    const clientProduct = this.clientProductRepository.create(
      {client: {id: clientId}, product: {id: productId}, providerCode}
    );

    return this.clientProductRepository.save(clientProduct);
  }
}
