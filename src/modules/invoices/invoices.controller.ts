import { Controller, Get, Query } from '@nestjs/common';
import { InvoicesService }        from '@modules/invoices/invoices.service';
import { InvoiceMapper }          from '@modules/orders/domain/mappers/invoice.mapper';
import { InvoiceQueryDto }        from '@modules/invoices/domain/dtos/query.dto';

@Controller('invoices')
export class InvoicesController {
  constructor(private readonly invoicesService: InvoicesService) {}

  @Get()
  async findAll(@Query() query: InvoiceQueryDto) {
    const invoices = await this.invoicesService.findAll(query);

    return InvoiceMapper.mapAll(invoices);
  }
}
