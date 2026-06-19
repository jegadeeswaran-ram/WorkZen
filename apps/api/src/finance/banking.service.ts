import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../common/prisma/prisma.service';

@Injectable()
export class BankingService {
  constructor(private prisma: PrismaService) {}

  async getBankAccounts(tenantId: string) {
    // Account model has no subType; filter ASSET accounts whose name contains "bank" or "cash"
    return this.prisma.account.findMany({
      where: {
        tenantId,
        isActive: true,
        type: 'ASSET',
        OR: [
          { name: { contains: 'bank', mode: 'insensitive' } },
          { name: { contains: 'cash', mode: 'insensitive' } },
        ],
      },
      orderBy: { name: 'asc' },
    });
  }

  async importStatement(
    tenantId: string,
    bankAccountId: string,
    lines: {
      date: string;
      description: string;
      debit?: number;
      credit?: number;
      balance?: number;
      referenceNo?: string;
    }[],
  ) {
    const account = await this.prisma.account.findFirst({ where: { id: bankAccountId, tenantId } });
    if (!account) throw new NotFoundException('Bank account not found');
    const created = await this.prisma.bankStatementLine.createMany({
      data: lines.map(l => ({
        tenantId,
        bankAccountId,
        date: new Date(l.date),
        description: l.description,
        debit: l.debit ?? 0,
        credit: l.credit ?? 0,
        balance: l.balance ?? 0,
        referenceNo: l.referenceNo,
      })),
      skipDuplicates: true,
    });
    return { imported: created.count };
  }

  async getUnreconciledLines(tenantId: string, bankAccountId: string, query: { page?: number; limit?: number }) {
    const { page = 1, limit = 30 } = query;
    const skip = (page - 1) * limit;
    const where = { tenantId, bankAccountId, isReconciled: false };
    const [data, total] = await Promise.all([
      this.prisma.bankStatementLine.findMany({ where, orderBy: { date: 'asc' }, skip, take: limit }),
      this.prisma.bankStatementLine.count({ where }),
    ]);
    return { data, meta: { total, page, limit, totalPages: Math.ceil(total / limit) } };
  }

  async reconcileLine(tenantId: string, lineId: string, voucherId: string, note?: string) {
    const line = await this.prisma.bankStatementLine.findFirst({ where: { id: lineId, tenantId } });
    if (!line) throw new NotFoundException('Statement line not found');
    return this.prisma.bankStatementLine.update({
      where: { id: lineId },
      data: { isReconciled: true, voucherId, reconcileNote: note },
    });
  }

  async getReconciliationSummary(tenantId: string, bankAccountId: string) {
    const account = await this.prisma.account.findFirst({ where: { id: bankAccountId, tenantId } });
    if (!account) throw new NotFoundException('Bank account not found');
    const [total, reconciled, unreconciled, unreconciledAmt] = await Promise.all([
      this.prisma.bankStatementLine.count({ where: { tenantId, bankAccountId } }),
      this.prisma.bankStatementLine.count({ where: { tenantId, bankAccountId, isReconciled: true } }),
      this.prisma.bankStatementLine.count({ where: { tenantId, bankAccountId, isReconciled: false } }),
      this.prisma.bankStatementLine.aggregate({
        where: { tenantId, bankAccountId, isReconciled: false },
        _sum: { credit: true, debit: true },
      }),
    ]);
    return {
      bankAccount: account.name,
      bookBalance: Number(account.currentBalance),
      totalLines: total,
      reconciledLines: reconciled,
      unreconciledLines: unreconciled,
      unreconciledCredit: Number(unreconciledAmt._sum.credit ?? 0),
      unreconciledDebit: Number(unreconciledAmt._sum.debit ?? 0),
    };
  }
}
