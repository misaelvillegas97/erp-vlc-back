import { Body, Controller, Get, Param, Post, Put } from '@nestjs/common';
import { ProductsService }                         from '@modules/products/products.service';

@Controller('products')
export class ProductsController {
  constructor(private readonly productsService: ProductsService) {}

  @Get()
  findAll() {
    return this.productsService.findAll();
  }

  @Post()
  create(product: any) {
    return this.productsService.create(product);
  }

  @Put(':id')
  update(@Param('id') productId: string, @Body() product: any) {
    return this.productsService.update(productId, product);
  }

}
