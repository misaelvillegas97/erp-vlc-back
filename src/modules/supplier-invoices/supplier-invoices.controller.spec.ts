import { Test, TestingModule }        from '@nestjs/testing';
import { SupplierInvoicesController } from './supplier-invoices.controller';
import { SupplierInvoicesService }    from './supplier-invoices.service';

describe('SupplierInvoicesController', () => {
  let controller: SupplierInvoicesController;
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  let service: SupplierInvoicesService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [ SupplierInvoicesController ],
      providers: [
        {
          provide: SupplierInvoicesService,
          useValue: {
            createInvoice: jest.fn(),
            getInvoices: jest.fn(),
            getInvoiceById: jest.fn(),
            updateInvoice: jest.fn(),
            deleteInvoice: jest.fn(),
            schedulePayment: jest.fn(),
            getPaymentsByInvoiceId: jest.fn(),
            generateCashFlowReport: jest.fn(),
          },
        },
      ],
    }).compile();

    controller = module.get<SupplierInvoicesController>(SupplierInvoicesController);
    service = module.get<SupplierInvoicesService>(SupplierInvoicesService);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  // TODO: Add more tests for each endpoint in the controller
});
