import { Test, TestingModule }     from '@nestjs/testing';
import { getRepositoryToken }      from '@nestjs/typeorm';
import { Repository }              from 'typeorm';
import { SupplierInvoicesService } from './supplier-invoices.service';
import { SupplierInvoiceEntity }   from './domain/entities/supplier-invoice.entity';
import { SupplierPaymentEntity }   from './domain/entities/supplier-payment.entity';

describe('SupplierInvoicesService', () => {
  let service: SupplierInvoicesService;
  let invoiceRepository: Repository<SupplierInvoiceEntity>;
  let paymentRepository: Repository<SupplierPaymentEntity>;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        SupplierInvoicesService,
        {
          provide: getRepositoryToken(SupplierInvoiceEntity),
          useClass: Repository,
        },
        {
          provide: getRepositoryToken(SupplierPaymentEntity),
          useClass: Repository,
        },
      ],
    }).compile();

    service = module.get<SupplierInvoicesService>(SupplierInvoicesService);
    invoiceRepository = module.get<Repository<SupplierInvoiceEntity>>(getRepositoryToken(SupplierInvoiceEntity));
    paymentRepository = module.get<Repository<SupplierPaymentEntity>>(getRepositoryToken(SupplierPaymentEntity));
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('schedulePayment', () => {
    it('should schedule a payment for an existing invoice', async () => {
      const invoice = new SupplierInvoiceEntity();
      invoice.id = 1;
      invoice.amount = 1000;
      jest.spyOn(invoiceRepository, 'findOne').mockResolvedValue(invoice);
      jest.spyOn(paymentRepository, 'create').mockReturnValue(new SupplierPaymentEntity());
      jest.spyOn(paymentRepository, 'save').mockResolvedValue(new SupplierPaymentEntity());

      const paymentData = {paymentDate: new Date(), amount: 500};
      const result = await service.schedulePayment(1, paymentData);

      expect(result).toBeInstanceOf(SupplierPaymentEntity);
      expect(paymentRepository.create).toHaveBeenCalledWith({...paymentData, invoice});
      expect(paymentRepository.save).toHaveBeenCalled();
    });

    it('should throw an error if the invoice does not exist', async () => {
      jest.spyOn(invoiceRepository, 'findOne').mockResolvedValue(null);

      const paymentData = {paymentDate: new Date(), amount: 500};
      await expect(service.schedulePayment(1, paymentData)).rejects.toThrow('Invoice not found');
    });

    // TODO: Add more tests for edge cases and validation
  });
});
