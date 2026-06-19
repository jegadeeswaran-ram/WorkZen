import { Process, Processor } from '@nestjs/bull';
import { Job } from 'bull';
import { Logger } from '@nestjs/common';
import { PrismaService } from '../common/prisma/prisma.service';

// Professional Tax slab (Maharashtra)
function calcProfessionalTax(gross: number): number {
  if (gross <= 7500) return 0;
  if (gross <= 10000) return 175;
  return 200;
}

@Processor('payroll')
export class PayrollProcessor {
  private readonly logger = new Logger(PayrollProcessor.name);
  constructor(private prisma: PrismaService) {}

  @Process('process-payroll')
  async processPayroll(job: Job<{ tenantId: string; runId: string; month: number; year: number; employmentType?: string }>) {
    const { tenantId, runId, month, year, employmentType } = job.data;
    this.logger.log(`Processing payroll run ${runId} for ${month}/${year}`);

    const where: any = { tenantId, status: 'ACTIVE' };
    if (employmentType) where.employmentType = employmentType;

    const employees = await this.prisma.employee.findMany({
      where,
      include: {
        salaryStructures: { where: { effectiveTo: null }, take: 1 },
        designation: { select: { name: true } },
        department: { select: { name: true } },
      },
    });

    const periodStart = new Date(year, month - 1, 1);
    const periodEnd = new Date(year, month, 0);
    const calendarDays = periodEnd.getDate();
    const workingDays = this.getWorkingDays(periodStart, periodEnd);

    let totalGross = 0, totalDeductions = 0, totalNet = 0, processedCount = 0;

    for (const emp of employees) {
      const structure = emp.salaryStructures[0];
      if (!structure) continue;

      // ── Attendance ──────────────────────────────────────
      const attendance = await this.prisma.attendanceRecord.findMany({
        where: { tenantId, employeeId: emp.id, date: { gte: periodStart, lte: periodEnd } },
      });

      const presentDays = attendance.filter(a => ['PRESENT', 'HALF_DAY'].includes(a.status as string)).reduce((s, a) => s + (a.status === 'HALF_DAY' ? 0.5 : 1), 0);
      const leaveDays = attendance.filter(a => a.status === 'LEAVE' as any).length;
      const paidDays = Math.min(presentDays + leaveDays, workingDays);
      const absentDays = Math.max(0, workingDays - paidDays);
      const ratio = workingDays > 0 ? paidDays / workingDays : 0;

      // ── Overtime ────────────────────────────────────────
      const overtimeHours = attendance.reduce((s, a) => s + Number((a as any).overtimeHours ?? 0), 0);

      const isOffice = ['PERMANENT', 'CONTRACT_EMPLOYEE'].includes(emp.employmentType ?? '');
      const isContract = ['CONTRACT', 'TEMPORARY'].includes(emp.employmentType ?? '');

      // ── Earnings ────────────────────────────────────────
      const basic         = Number(structure.basic) * ratio;
      const da            = Number(structure.da) * ratio;
      const hra           = isOffice ? Number(structure.hra) * ratio : 0; // no HRA for site staff
      const special       = Number(structure.specialAllowance) * ratio;

      // Overtime: 2× hourly rate for site staff, 1.5× for office
      const hourlyRate    = Number(structure.basic) / (workingDays * 8);
      const otMultiplier  = isContract ? 2 : 1.5;
      const overtimePay   = overtimeHours * hourlyRate * otMultiplier;

      const grossEarnings = basic + da + hra + special + overtimePay;

      // ── Deductions ───────────────────────────────────────
      const pfEmployee    = Math.min(basic * 0.12, 1800);
      const pfEmployer    = Math.min(basic * 0.12, 1800); // for record
      const esiEmployee   = grossEarnings <= 21000 ? grossEarnings * 0.0075 : 0;
      const esiEmployer   = grossEarnings <= 21000 ? grossEarnings * 0.0325 : 0;
      const professionalTax = calcProfessionalTax(grossEarnings);
      const totalDeductionsAmt = pfEmployee + esiEmployee + professionalTax;
      const netPay        = grossEarnings - totalDeductionsAmt;

      await this.prisma.payslip.create({
        data: {
          tenantId, payrollRunId: runId, employeeId: emp.id, month, year,
          workingDays, presentDays: paidDays, absentDays, leaveDays,
          overtimeHours,
          basic, da, hra, specialAllowance: special,
          grossEarnings,
          pfEmployee, esiEmployee, professionalTax,
          totalDeductions: totalDeductionsAmt,
          netPay,
          otherEarnings: overtimePay > 0 ? { overtime: overtimePay } : {},
          otherDeductions: {},
          paymentStatus: 'PENDING',
        },
      });

      totalGross      += grossEarnings;
      totalDeductions += totalDeductionsAmt;
      totalNet        += netPay;
      processedCount++;
    }

    await this.prisma.payrollRun.update({
      where: { id: runId },
      data: {
        status: 'PENDING_APPROVAL',
        totalEmployees: processedCount,
        totalGross, totalDeductions, totalNet,
        processedAt: new Date(),
      },
    });

    this.logger.log(`Payroll run ${runId} complete: ${processedCount} employees processed`);
  }

  private getWorkingDays(start: Date, end: Date): number {
    let count = 0;
    const d = new Date(start);
    while (d <= end) {
      if (d.getDay() !== 0 && d.getDay() !== 6) count++;
      d.setDate(d.getDate() + 1);
    }
    return count;
  }
}
