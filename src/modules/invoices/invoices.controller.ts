import { Body, Controller, Get, Param, Put, Query } from '@nestjs/common';
import { InvoicesService }                          from '@modules/invoices/invoices.service';
import { InvoiceMapper }                            from '@modules/orders/domain/mappers/invoice.mapper';
import { InvoiceQueryDto }                          from '@modules/invoices/domain/dtos/query.dto';
import { InvoiceStatusEnum }                        from '@modules/orders/domain/enums/invoice-status.enum';

@Controller('invoices')
export class InvoicesController {
  constructor(private readonly invoicesService: InvoicesService) {}

  @Get()
  async findAll(@Query() query: InvoiceQueryDto) {
    const invoices = await this.invoicesService.findAll(query);

    return InvoiceMapper.mapAll(invoices);
  }

  @Get('overview')
  async getInvoicesOverview() {
    return this.invoicesService.invoicesOverview();
  }

  @Put(':invoiceId/status')
  async updateStatus(@Param('invoiceId') invoiceId: string, @Body() body: { status: InvoiceStatusEnum }) {
    return this.invoicesService.updateStatus(invoiceId, body.status);
  }
}
