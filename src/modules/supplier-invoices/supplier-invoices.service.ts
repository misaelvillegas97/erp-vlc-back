import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository }              from '@nestjs/typeorm';
import { Repository }                    from 'typeorm';
import { SupplierInvoiceEntity }         from './domain/entities/supplier-invoice.entity';
import { SupplierPaymentEntity }         from './domain/entities/supplier-payment.entity';
import { CreateSupplierInvoiceDto }      from '@modules/supplier-invoices/domain/dtos/create-supplier-invoice.dto';

@Injectable()
export class SupplierInvoicesService {
  constructor(
    @InjectRepository(SupplierInvoiceEntity) private readonly supplierInvoiceRepository: Repository<SupplierInvoiceEntity>,
    @InjectRepository(SupplierPaymentEntity) private readonly supplierPaymentRepository: Repository<SupplierPaymentEntity>
  ) {}

  async createInvoice(invoiceData: CreateSupplierInvoiceDto): Promise<SupplierInvoiceEntity> {
    try {
      const invoice = this.supplierInvoiceRepository.create({
        ...invoiceData,
        supplier: {id: invoiceData.supplierId},
        expenseType: {id: invoiceData.expenseTypeId},
      });
      return await this.supplierInvoiceRepository.save(invoice);
    } catch (error) {
      throw new Error(`Error creating invoice: ${ error.message }`);
    }
  }

  async getInvoices(): Promise<SupplierInvoiceEntity[]> {
    return this.supplierInvoiceRepository.find({relations: [ 'payments', 'supplier', 'expenseType' ]});
  }

  async getInvoiceById(id: string): Promise<SupplierInvoiceEntity> {
    return this.supplierInvoiceRepository.findOne({where: {id}, relations: [ 'payments' ]});
  }

  async updateInvoice(id: string, updateData: Partial<SupplierInvoiceEntity>): Promise<SupplierInvoiceEntity> {
    await this.supplierInvoiceRepository.update(id, updateData);
    return this.getInvoiceById(id);
  }

  async deleteInvoice(id: string): Promise<void> {
    await this.supplierInvoiceRepository.delete(id);
  }

  async schedulePayment(invoiceId: string, paymentData: Partial<SupplierPaymentEntity>): Promise<SupplierPaymentEntity> {
    const invoice = await this.getInvoiceById(invoiceId);
    if (!invoice) throw new NotFoundException('Invoice not found');

    const payment = this.supplierPaymentRepository.create({...paymentData, invoice});
    return this.supplierPaymentRepository.save(payment);
  }

  async getPaymentsByInvoiceId(invoiceId: string): Promise<SupplierPaymentEntity[]> {
    return this.supplierPaymentRepository.find({where: {invoice: {id: invoiceId}}});
  }


  async generateCashFlowReport(): Promise<any> {
    const invoices = await this.supplierInvoiceRepository.find({relations: [ 'payments' ]});
    const report = invoices.map(invoice => {
      const totalPayments = invoice.payments.reduce((sum, payment) => sum + payment.amount, 0);
      return {
        invoiceNumber: invoice.invoiceNumber,
        supplierName: invoice.supplier.fantasyName,
        amount: invoice.grossAmount,
        totalPayments,
        balance: invoice.grossAmount - totalPayments,
        dueDate: invoice.dueDate,
      };
    });

    const totalInflow = report.reduce((sum, item) => sum + item.amount, 0);
    const totalOutflow = report.reduce((sum, item) => sum + item.totalPayments, 0);
    const projectedBalance = totalInflow - totalOutflow;

    return {
      report,
      totalInflow,
      totalOutflow,
      projectedBalance,
    };
  }
}
