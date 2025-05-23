import { Body, Controller, Get, Param, Post, Put, Query } from '@nestjs/common';
import { ProductsService }                                from '@modules/products/products.service';
import { AssignProductToClientDto }                       from '@modules/products/domain/dtos/assign-product-to-client.dto';
import { CreateProductDto }                               from '@modules/products/domain/dtos/create-product.dto';
import { QueryProductDto }                                from '@modules/products/domain/dtos/query-product.dto';
import { ProductMapper }                                  from '@modules/products/domain/mappers/product.mapper';

@Controller('products')
export class ProductsController {
  constructor(private readonly productsService: ProductsService) {}

  @Get()
  async findAll(@Query() query: QueryProductDto) {
    const products = await this.productsService.findAll(query);

    return ProductMapper.mapAll(products);
  }

  @Post()
  create(@Body() createProductDto: CreateProductDto) {
    return this.productsService.create(createProductDto);
  }

  @Put(':id')
  update(@Param('id') productId: string, @Body() product: any) {
    return this.productsService.update(productId, product);
  }

  @Post(':id/provider-code')
  addProviderCode(@Param('id') productId: string, @Body() assignProductToClientDto: AssignProductToClientDto) {
    return this.productsService.assignToClient(productId, assignProductToClientDto);
  }
}
