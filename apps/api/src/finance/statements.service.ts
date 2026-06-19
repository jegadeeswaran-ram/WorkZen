import { Injectable } from '@nestjs/common';
import { PrismaService } from '../common/prisma/prisma.service';

@Injectable()
export class StatementsService {
  constructor(private prisma: PrismaService) {}

  async getTrialBalance(tenantId: string, query: { asOf?: string }) {
    const asOf = query.asOf ? new Date(query.asOf) : new Date();
    const accounts = await this.prisma.account.findMany({
      where: { tenantId, isActive: true },
      orderBy: [{ type: 'asc' }, { code: 'asc' }],
    });
    const rows = await Promise.all(accounts.map(async (acc) => {
      const agg = await this.prisma.voucherLine.aggregate({
        where: { tenantId, accountId: acc.id, voucher: { status: 'POSTED', date: { lte: asOf } } },
        _sum: { debit: true, credit: true },
      });
      const totalDebit = Number(agg._sum.debit ?? 0);
      const totalCredit = Number(agg._sum.credit ?? 0);
      const openingBal = Number(acc.openingBalance);
      let closingDebit = 0;
      let closingCredit = 0;
      if (['ASSET', 'EXPENSE'].includes(acc.type)) {
        const net = openingBal + totalDebit - totalCredit;
        if (net >= 0) closingDebit = net; else closingCredit = Math.abs(net);
      } else {
        const net = openingBal + totalCredit - totalDebit;
        if (net >= 0) closingCredit = net; else closingDebit = Math.abs(net);
      }
      return { accountId: acc.id, code: acc.code, name: acc.name, type: acc.type, openingBalance: openingBal, debit: totalDebit, credit: totalCredit, closingDebit, closingCredit };
    }));
    const totalDebit = rows.reduce((s, r) => s + r.closingDebit, 0);
    const totalCredit = rows.reduce((s, r) => s + r.closingCredit, 0);
    return { asOf, rows, totalDebit, totalCredit, isBalanced: Math.abs(totalDebit - totalCredit) < 0.01 };
  }

  async getProfitAndLoss(tenantId: string, query: { from?: string; to?: string }) {
    const from = query.from ? new Date(query.from) : new Date(new Date().getFullYear(), 3, 1);
    const to = query.to ? new Date(query.to) : new Date();
    const accounts = await this.prisma.account.findMany({
      where: { tenantId, isActive: true, type: { in: ['INCOME', 'EXPENSE'] } },
      orderBy: [{ type: 'asc' }, { code: 'asc' }],
    });
    const rows = await Promise.all(accounts.map(async (acc) => {
      const agg = await this.prisma.voucherLine.aggregate({
        where: { tenantId, accountId: acc.id, voucher: { status: 'POSTED', date: { gte: from, lte: to } } },
        _sum: { debit: true, credit: true },
      });
      const debit = Number(agg._sum.debit ?? 0);
      const credit = Number(agg._sum.credit ?? 0);
      const amount = acc.type === 'INCOME' ? credit - debit : debit - credit;
      return { accountId: acc.id, code: acc.code, name: acc.name, type: acc.type, amount };
    }));
    const income = rows.filter(r => r.type === 'INCOME');
    const expenses = rows.filter(r => r.type === 'EXPENSE');
    const totalIncome = income.reduce((s, r) => s + r.amount, 0);
    const totalExpense = expenses.reduce((s, r) => s + r.amount, 0);
    const netProfit = totalIncome - totalExpense;
    return { from, to, income, expenses, totalIncome, totalExpense, netProfit, netMargin: totalIncome > 0 ? Math.round((netProfit / totalIncome) * 10000) / 100 : 0 };
  }

  async getBalanceSheet(tenantId: string, query: { asOf?: string }) {
    const asOf = query.asOf ? new Date(query.asOf) : new Date();
    const accounts = await this.prisma.account.findMany({
      where: { tenantId, isActive: true, type: { in: ['ASSET', 'LIABILITY', 'EQUITY'] } },
      orderBy: [{ type: 'asc' }, { code: 'asc' }],
    });
    const rows = await Promise.all(accounts.map(async (acc) => {
      const agg = await this.prisma.voucherLine.aggregate({
        where: { tenantId, accountId: acc.id, voucher: { status: 'POSTED', date: { lte: asOf } } },
        _sum: { debit: true, credit: true },
      });
      const debit = Number(agg._sum.debit ?? 0);
      const credit = Number(agg._sum.credit ?? 0);
      const opening = Number(acc.openingBalance);
      const balance = acc.type === 'ASSET' ? opening + debit - credit : opening + credit - debit;
      return { accountId: acc.id, code: acc.code, name: acc.name, type: acc.type, balance };
    }));
    const assets = rows.filter(r => r.type === 'ASSET');
    const liabilities = rows.filter(r => r.type === 'LIABILITY');
    const equity = rows.filter(r => r.type === 'EQUITY');
    const pnl = await this.getProfitAndLoss(tenantId, {});
    const totalAssets = assets.reduce((s, r) => s + r.balance, 0);
    const totalLiabilities = liabilities.reduce((s, r) => s + r.balance, 0);
    const totalEquity = equity.reduce((s, r) => s + r.balance, 0) + pnl.netProfit;
    return { asOf, assets, liabilities, equity, netProfit: pnl.netProfit, totalAssets, totalLiabilities, totalEquity, isBalanced: Math.abs(totalAssets - (totalLiabilities + totalEquity)) < 1 };
  }

  async getCashFlow(tenantId: string, query: { from?: string; to?: string }) {
    const from = query.from ? new Date(query.from) : new Date(new Date().getFullYear(), 3, 1);
    const to = query.to ? new Date(query.to) : new Date();
    const [receipts, payments] = await Promise.all([
      this.prisma.voucherLine.aggregate({
        where: { tenantId, voucher: { status: 'POSTED', voucherType: 'RECEIPT', date: { gte: from, lte: to } } },
        _sum: { credit: true },
      }),
      this.prisma.voucherLine.aggregate({
        where: { tenantId, voucher: { status: 'POSTED', voucherType: 'PAYMENT', date: { gte: from, lte: to } } },
        _sum: { debit: true },
      }),
    ]);
    return { from, to, operatingReceipts: Number(receipts._sum.credit ?? 0), operatingPayments: Number(payments._sum.debit ?? 0), netCashFlow: Number(receipts._sum.credit ?? 0) - Number(payments._sum.debit ?? 0) };
  }

  async getChartOfAccounts(tenantId: string) {
    return this.prisma.account.findMany({ where: { tenantId, isActive: true }, orderBy: [{ type: 'asc' }, { code: 'asc' }] });
  }
}
