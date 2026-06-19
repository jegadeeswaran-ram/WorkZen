import { Test, TestingModule } from '@nestjs/testing';
import { NotFoundException } from '@nestjs/common';
import { BillingService } from './billing.service';
import { PrismaService } from '../common/prisma/prisma.service';

const TENANT_ID = 'tenant-1';
const USER_ID = 'user-1';

const mockInvoice = {
  id: 'inv-1',
  tenantId: TENANT_ID,
  invoiceNo: 'INV-2026-00001',
  status: 'DRAFT',
  totalAmount: 100000,
  paidAmount: 0,
  balanceAmount: 100000,
  client: { name: 'NHAI' },
  tender: { tenderName: 'Security Services' },
  lineItems: [],
  payments: [],
};

describe('BillingService', () => {
  let service: BillingService;
  let prisma: jest.Mocked<PrismaService>;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        BillingService,
        {
          provide: PrismaService,
          useValue: {
            invoice: {
              findFirst: jest.fn(),
              findMany: jest.fn(),
              count: jest.fn(),
              create: jest.fn(),
              update: jest.fn(),
            },
            payment: { create: jest.fn() },
            invoiceLineItem: {
              deleteMany: jest.fn(),
              create: jest.fn(),
            },
            $transaction: jest.fn(),
          },
        },
      ],
    }).compile();

    service = module.get(BillingService);
    prisma = module.get(PrismaService) as jest.Mocked<PrismaService>;
  });

  describe('getInvoice', () => {
    it('throws NotFoundException when invoice not found', async () => {
      jest.spyOn(prisma.invoice, 'findFirst').mockResolvedValue(null);
      await expect(service.getInvoice(TENANT_ID, 'bad-id')).rejects.toThrow(NotFoundException);
    });

    it('returns invoice with related data', async () => {
      jest.spyOn(prisma.invoice, 'findFirst').mockResolvedValue(mockInvoice as any);
      const result = await service.getInvoice(TENANT_ID, 'inv-1');
      expect(result).toEqual(mockInvoice);
      expect(prisma.invoice.findFirst).toHaveBeenCalledWith(
        expect.objectContaining({ where: { id: 'inv-1', tenantId: TENANT_ID } }),
      );
    });
  });

  describe('createInvoice', () => {
    it('auto-generates invoice number based on count', async () => {
      jest.spyOn(prisma.invoice, 'count').mockResolvedValue(0);
      jest.spyOn(prisma.invoice, 'create').mockResolvedValue(mockInvoice as any);

      const dto = { clientId: 'client-1', totalAmount: 50000 };
      await service.createInvoice(TENANT_ID, dto, USER_ID);

      const year = new Date().getFullYear();
      expect(prisma.invoice.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          tenantId: TENANT_ID,
          invoiceNo: `INV-${year}-00001`,
          createdBy: USER_ID,
        }),
      });
    });

    it('pads invoice number to 5 digits', async () => {
      jest.spyOn(prisma.invoice, 'count').mockResolvedValue(99);
      jest.spyOn(prisma.invoice, 'create').mockResolvedValue(mockInvoice as any);

      await service.createInvoice(TENANT_ID, {}, USER_ID);

      const year = new Date().getFullYear();
      expect(prisma.invoice.create).toHaveBeenCalledWith({
        data: expect.objectContaining({ invoiceNo: `INV-${year}-00100` }),
      });
    });
  });

  describe('recordPayment', () => {
    it('throws NotFoundException when invoice not found', async () => {
      jest.spyOn(prisma.invoice, 'findFirst').mockResolvedValue(null);
      await expect(service.recordPayment(TENANT_ID, 'bad-id', { amount: 1000 }, USER_ID)).rejects.toThrow(NotFoundException);
    });

    it('marks invoice as PAID when full amount received', async () => {
      const invoice = { ...mockInvoice, totalAmount: 100000, paidAmount: 0 };
      jest.spyOn(prisma.invoice, 'findFirst').mockResolvedValue(invoice as any);
      jest.spyOn(prisma.payment, 'create').mockResolvedValue({ id: 'pay-1' } as any);
      jest.spyOn(prisma.invoice, 'update').mockResolvedValue({ ...invoice, status: 'PAID' } as any);

      await service.recordPayment(TENANT_ID, 'inv-1', { amount: 100000 }, USER_ID);

      expect(prisma.invoice.update).toHaveBeenCalledWith({
        where: { id: 'inv-1' },
        data: expect.objectContaining({ status: 'PAID', paidAmount: 100000, balanceAmount: 0 }),
      });
    });

    it('marks invoice as PARTIALLY_PAID when partial amount received', async () => {
      const invoice = { ...mockInvoice, totalAmount: 100000, paidAmount: 0 };
      jest.spyOn(prisma.invoice, 'findFirst').mockResolvedValue(invoice as any);
      jest.spyOn(prisma.payment, 'create').mockResolvedValue({ id: 'pay-1' } as any);
      jest.spyOn(prisma.invoice, 'update').mockResolvedValue({ ...invoice, status: 'PARTIALLY_PAID' } as any);

      await service.recordPayment(TENANT_ID, 'inv-1', { amount: 40000 }, USER_ID);

      expect(prisma.invoice.update).toHaveBeenCalledWith({
        where: { id: 'inv-1' },
        data: expect.objectContaining({ status: 'PARTIALLY_PAID', paidAmount: 40000, balanceAmount: 60000 }),
      });
    });
  });

  describe('getInvoices', () => {
    it('filters by tenant and status', async () => {
      jest.spyOn(prisma.invoice, 'findMany').mockResolvedValue([] as any);
      jest.spyOn(prisma.invoice, 'count').mockResolvedValue(0);

      await service.getInvoices(TENANT_ID, { status: 'DRAFT', page: 1, limit: 20 });

      expect(prisma.invoice.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({ tenantId: TENANT_ID, status: 'DRAFT' }),
        }),
      );
    });
  });
});
