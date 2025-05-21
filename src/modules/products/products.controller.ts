import { Body, Controller, Get, Param, Post, Put, Query } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiQuery, ApiResponse, ApiParam, ApiBody } from '@nestjs/swagger';
import { ProductsService }                                from '@modules/products/products.service';
import { AssignProductToClientDto }                       from '@modules/products/domain/dtos/assign-product-to-client.dto';
import { CreateProductDto }                               from '@modules/products/domain/dtos/create-product.dto';
import { QueryProductDto }                                from '@modules/products/domain/dtos/query-product.dto';
import { ProductMapper }                                  from '@modules/products/domain/mappers/product.mapper';

@ApiTags('Products')
@Controller('products')
export class ProductsController {
  constructor(private readonly productsService: ProductsService) {}

  @Get()
  @ApiOperation({ summary: 'Find all products (paginated)' })
  @ApiQuery({ name: 'page', required: false, type: Number, description: 'Page number for pagination' })
  @ApiQuery({ name: 'limit', required: false, type: Number, description: 'Number of items per page' })
  @ApiQuery({ name: 'name', required: false, type: String, description: 'Filter by product name' })
  @ApiQuery({ name: 'description', required: false, type: String, description: 'Filter by product description' })
  @ApiQuery({ name: 'category', required: false, type: String, description: 'Filter by product category' })
  @ApiQuery({ name: 'brand', required: false, type: String, description: 'Filter by product brand' })
  @ApiQuery({ name: 'supplierId', required: false, type: String, description: 'Filter by supplier ID' })
  @ApiResponse({ status: 200, description: 'List of products retrieved successfully.', type: [ProductMapper] })
  async findAll(@Query() query: QueryProductDto) {
    const products = await this.productsService.findAll(query);

    return ProductMapper.mapAll(products);
  }

  @Post()
  @ApiOperation({ summary: 'Create a new product' })
  @ApiBody({ type: CreateProductDto })
  @ApiResponse({ status: 201, description: 'Product created successfully.', type: ProductMapper })
  @ApiResponse({ status: 400, description: 'Bad Request (e.g., validation error).' })
  create(@Body() createProductDto: CreateProductDto) {
    return this.productsService.create(createProductDto);
  }

  @Put(':id')
  @ApiOperation({ summary: 'Update an existing product' })
  @ApiParam({ name: 'id', description: 'ID of the product to update', type: String, example: 'clx2i465y0000qxtofy1z1r6k' })
  @ApiBody({ description: 'Product data to update. Fields are optional.', type: CreateProductDto }) // Ideally UpdateProductDto
  @ApiResponse({ status: 200, description: 'Product updated successfully.', type: ProductMapper })
  @ApiResponse({ status: 400, description: 'Bad Request (e.g., validation error).' })
  @ApiResponse({ status: 404, description: 'Product not found.' })
  update(@Param('id') productId: string, @Body() product: Partial<CreateProductDto>) { // Changed 'any' to Partial<CreateProductDto>
    return this.productsService.update(productId, product);
  }

  @Post(':id/provider-code')
  @ApiOperation({ summary: 'Add or update provider code for a product (assign to client)' })
  @ApiParam({ name: 'id', description: 'ID of the product', type: String, example: 'clx2i465y0000qxtofy1z1r6k' })
  @ApiBody({ type: AssignProductToClientDto })
  @ApiResponse({ status: 200, description: 'Provider code added/updated successfully.' }) // Assuming it returns the updated product or a success message
  @ApiResponse({ status: 400, description: 'Bad Request.' })
  @ApiResponse({ status: 404, description: 'Product not found.' })
  addProviderCode(@Param('id') productId: string, @Body() assignProductToClientDto: AssignProductToClientDto) {
    return this.productsService.assignToClient(productId, assignProductToClientDto);
  }
}
