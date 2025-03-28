import { Body, Controller, Delete, Get, Param, Post, Put } from '@nestjs/common';
import { SupplierInvoicesService }                         from './supplier-invoices.service';
import { SupplierInvoiceEntity }                           from './domain/entities/supplier-invoice.entity';
import { SupplierPaymentEntity }                           from '@modules/supplier-invoices/domain/entities/supplier-payment.entity';

@Controller('supplier-invoices')
export class SupplierInvoicesController {
  constructor(private readonly supplierInvoicesService: SupplierInvoicesService) {}

  @Post()
  async createInvoice(@Body() invoiceData: Partial<SupplierInvoiceEntity>): Promise<SupplierInvoiceEntity> {
    return this.supplierInvoicesService.createInvoice(invoiceData);
  }

  @Get()
  async getInvoices(): Promise<SupplierInvoiceEntity[]> {
    return this.supplierInvoicesService.getInvoices();
  }

  @Get('reports/cash-flow')
  async generateCashFlowReport(): Promise<any> {
    return this.supplierInvoicesService.generateCashFlowReport();
  }

  @Get(':id')
  async getInvoiceById(@Param('id') id: string): Promise<SupplierInvoiceEntity> {
    return this.supplierInvoicesService.getInvoiceById(id);
  }

  @Put(':id')
  async updateInvoice(@Param('id') id: string, @Body() updateData: Partial<SupplierInvoiceEntity>): Promise<SupplierInvoiceEntity> {
    return this.supplierInvoicesService.updateInvoice(id, updateData);
  }

  @Delete(':id')
  async deleteInvoice(@Param('id') id: string): Promise<void> {
    return this.supplierInvoicesService.deleteInvoice(id);
  }

  @Post(':id/payments')
  async schedulePayment(@Param('id') invoiceId: string, @Body() paymentData: Partial<SupplierPaymentEntity>): Promise<SupplierPaymentEntity> {
    return this.supplierInvoicesService.schedulePayment(invoiceId, paymentData);
  }

  @Get(':id/payments')
  async getPaymentsByInvoiceId(@Param('id') invoiceId: string): Promise<SupplierPaymentEntity[]> {
    return this.supplierInvoicesService.getPaymentsByInvoiceId(invoiceId);
  }
}
