import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../common/prisma/prisma.service';

@Injectable()
export class VoucherService {
  constructor(private prisma: PrismaService) {}

  private async generateVoucherNo(tenantId: string, voucherType: string): Promise<string> {
    const prefix = voucherType.slice(0, 3).toUpperCase();
    const year = new Date().getFullYear();
    const count = await this.prisma.voucher.count({ where: { tenantId, voucherType: voucherType as any } });
    return `${prefix}-${year}-${String(count + 1).padStart(5, '0')}`;
  }

  async createVoucher(tenantId: string, dto: { voucherType: string; date: string; narration: string; amount: number; bankAccountId?: string; referenceNo?: string; lines: { accountId: string; debit: number; credit: number; narration?: string; costCenterId?: string }[] }, userId: string) {
    const totalDebit = dto.lines.reduce((s, l) => s + (l.debit || 0), 0);
    const totalCredit = dto.lines.reduce((s, l) => s + (l.credit || 0), 0);
    if (dto.voucherType === 'JOURNAL' && Math.abs(totalDebit - totalCredit) > 0.01) {
      throw new BadRequestException('Journal voucher: debit must equal credit');
    }
    const voucherNo = await this.generateVoucherNo(tenantId, dto.voucherType);
    const voucher = await this.prisma.voucher.create({
      data: {
        tenantId, voucherNo,
        voucherType: dto.voucherType as any,
        date: new Date(dto.date),
        narration: dto.narration,
        amount: dto.amount,
        bankAccountId: dto.bankAccountId,
        referenceNo: dto.referenceNo,
        status: 'DRAFT',
        createdBy: userId,
        lines: {
          create: dto.lines.map(l => ({
            tenantId, accountId: l.accountId, debit: l.debit || 0, credit: l.credit || 0, narration: l.narration, costCenterId: l.costCenterId,
          })),
        },
      },
      include: { lines: { include: { account: { select: { name: true, code: true, type: true } } } } },
    });
    return voucher;
  }

  async postVoucher(tenantId: string, id: string, userId: string) {
    const voucher = await this.prisma.voucher.findFirst({ where: { id, tenantId }, include: { lines: { include: { account: true } } } });
    if (!voucher) throw new NotFoundException('Voucher not found');
    if (voucher.status !== 'DRAFT') throw new BadRequestException('Only DRAFT vouchers can be posted');
    for (const line of voucher.lines) {
      const acc = line.account;
      let balanceDelta = 0;
      if (['ASSET', 'EXPENSE'].includes(acc.type)) {
        balanceDelta = Number(line.debit) - Number(line.credit);
      } else {
        balanceDelta = Number(line.credit) - Number(line.debit);
      }
      await this.prisma.account.update({ where: { id: acc.id }, data: { currentBalance: { increment: balanceDelta } } });
    }
    return this.prisma.voucher.update({ where: { id }, data: { status: 'POSTED', postedAt: new Date(), postedBy: userId, updatedBy: userId } });
  }

  async cancelVoucher(tenantId: string, id: string, userId: string) {
    const voucher = await this.prisma.voucher.findFirst({ where: { id, tenantId }, include: { lines: { include: { account: true } } } });
    if (!voucher) throw new NotFoundException('Voucher not found');
    if (voucher.status === 'CANCELLED') throw new BadRequestException('Voucher already cancelled');
    if (voucher.status === 'POSTED') {
      for (const line of voucher.lines) {
        const acc = line.account;
        let balanceDelta = 0;
        if (['ASSET', 'EXPENSE'].includes(acc.type)) {
          balanceDelta = Number(line.debit) - Number(line.credit);
        } else {
          balanceDelta = Number(line.credit) - Number(line.debit);
        }
        await this.prisma.account.update({ where: { id: acc.id }, data: { currentBalance: { decrement: balanceDelta } } });
      }
    }
    return this.prisma.voucher.update({ where: { id }, data: { status: 'CANCELLED', updatedBy: userId } });
  }

  async listVouchers(tenantId: string, query: { voucherType?: string; from?: string; to?: string; status?: string; page?: number; limit?: number }) {
    const { voucherType, from, to, status, page = 1, limit = 20 } = query;
    const where = {
      tenantId,
      ...(voucherType && { voucherType: voucherType as any }),
      ...(status && { status: status as any }),
      ...(from && { date: { gte: new Date(from) } }),
      ...(to && { date: { lte: new Date(to) } }),
    };
    const skip = (page - 1) * limit;
    const [data, total] = await Promise.all([
      this.prisma.voucher.findMany({ where, include: { lines: { include: { account: { select: { name: true, code: true } } } } }, orderBy: { date: 'desc' }, skip, take: limit }),
      this.prisma.voucher.count({ where }),
    ]);
    return { data, meta: { total, page, limit, totalPages: Math.ceil(total / limit) } };
  }

  async getVoucher(tenantId: string, id: string) {
    const v = await this.prisma.voucher.findFirst({ where: { id, tenantId }, include: { lines: { include: { account: { select: { name: true, code: true, type: true } }, costCenter: { select: { name: true } } } } } });
    if (!v) throw new NotFoundException('Voucher not found');
    return v;
  }

  async getDayBook(tenantId: string, date: string) {
    const d = new Date(date);
    const nextDay = new Date(d);
    nextDay.setDate(d.getDate() + 1);
    const vouchers = await this.prisma.voucher.findMany({
      where: { tenantId, status: 'POSTED', date: { gte: d, lt: nextDay } },
      include: { lines: { include: { account: { select: { name: true, code: true } } } } },
      orderBy: { voucherNo: 'asc' },
    });
    const totalDebit = vouchers.flatMap(v => v.lines).reduce((s, l) => s + Number(l.debit), 0);
    const totalCredit = vouchers.flatMap(v => v.lines).reduce((s, l) => s + Number(l.credit), 0);
    return { date, vouchers, totalDebit, totalCredit };
  }

  async getGeneralLedger(tenantId: string, accountId: string, query: { from?: string; to?: string }) {
    const account = await this.prisma.account.findFirst({ where: { id: accountId, tenantId } });
    if (!account) throw new NotFoundException('Account not found');
    const where = {
      accountId,
      voucher: {
        tenantId,
        status: 'POSTED' as any,
        ...(query.from && { date: { gte: new Date(query.from) } }),
        ...(query.to && { date: { lte: new Date(query.to) } }),
      },
    };
    const lines = await this.prisma.voucherLine.findMany({
      where,
      include: { voucher: { select: { voucherNo: true, date: true, narration: true, voucherType: true } } },
      orderBy: { voucher: { date: 'asc' } },
    });
    let runningBalance = Number(account.openingBalance);
    const entries = lines.map(l => {
      const debit = Number(l.debit);
      const credit = Number(l.credit);
      if (['ASSET', 'EXPENSE'].includes(account.type)) runningBalance += debit - credit;
      else runningBalance += credit - debit;
      return { ...l, runningBalance };
    });
    return { account, openingBalance: Number(account.openingBalance), entries, closingBalance: runningBalance };
  }
}
