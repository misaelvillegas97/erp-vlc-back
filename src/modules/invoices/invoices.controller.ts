import { Body, Controller, Get, Param, Post, Put, Query } from '@nestjs/common';
import { InvoicesService }                                from '@modules/invoices/invoices.service';
import { InvoiceMapper }                                  from '@modules/orders/domain/mappers/invoice.mapper';
import { InvoiceQueryDto }                                from '@modules/invoices/domain/dtos/query.dto';
import { StatusUpdateDto }                                from '@modules/invoices/domain/dtos/status-update.dto';
import { CreateCreditNoteDto }                            from '@modules/invoices/domain/dtos/create-credit-note.dto';
import { CreateInvoiceDto }                               from '@modules/orders/domain/dtos/create-invoice.dto';
import { CreatePaymentDto }                               from '@modules/invoices/domain/dtos/create-payment.dto';

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
  async updateStatus(@Param('invoiceId') invoiceId: string, @Body() body: StatusUpdateDto) {
    const invoice = await this.invoicesService.updateStatus(invoiceId, body);


    return InvoiceMapper.map(invoice);
  }

  @Post(':invoiceId/payment')
  async createCreditPayment(
    @Param('invoiceId') invoiceId: string,
    @Body() createPaymentDto: CreatePaymentDto
  ) {
    return await this.invoicesService.addPayment(invoiceId, createPaymentDto);
  }

  @Post(':invoiceId/credit-note')
  async createCreditNote(
    @Param('invoiceId') invoiceId: string,
    @Body() createCreditNoteDto: CreateCreditNoteDto
  ) {
    return await this.invoicesService.createCreditNote(invoiceId, createCreditNoteDto);
  }

  @Post(':invoiceId/re-invoice')
  async reInvoice(@Param('invoiceId') invoiceId: string, @Body() createInvoiceDto: CreateInvoiceDto) {
    const invoice = await this.invoicesService.reInvoice(invoiceId, createInvoiceDto);

    return InvoiceMapper.map(invoice);
  }
}
