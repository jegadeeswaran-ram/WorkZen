-- CreateEnum
CREATE TYPE "RateType" AS ENUM ('BASIC', 'OT', 'HOLIDAY', 'NIGHT_SHIFT');

-- CreateEnum
CREATE TYPE "EscalationType" AS ENUM ('PERCENTAGE', 'FIXED_AMOUNT');

-- CreateEnum
CREATE TYPE "BillingCycle" AS ENUM ('MONTHLY', 'WEEKLY', 'FORTNIGHTLY', 'CUSTOM');

-- CreateEnum
CREATE TYPE "BillingSheetStatus" AS ENUM ('DRAFT', 'SUBMITTED', 'APPROVED', 'POSTED', 'REJECTED');

-- CreateEnum
CREATE TYPE "GSTDirection" AS ENUM ('OUTPUT', 'INPUT');

-- CreateEnum
CREATE TYPE "VoucherType" AS ENUM ('PAYMENT', 'RECEIPT', 'CONTRA', 'JOURNAL', 'PURCHASE', 'SALES');

-- CreateEnum
CREATE TYPE "VoucherStatus" AS ENUM ('DRAFT', 'POSTED', 'CANCELLED');

-- AlterTable
ALTER TABLE "clients" ADD COLUMN     "creditLimitUsed" DECIMAL(15,2) DEFAULT 0,
ADD COLUMN     "lastReminderAt" TIMESTAMP(3),
ADD COLUMN     "remindersSent" INTEGER NOT NULL DEFAULT 0;

-- AlterTable
ALTER TABLE "invoices" ADD COLUMN     "billingSheetId" TEXT;

-- CreateTable
CREATE TABLE "rate_masters" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "tenderId" TEXT,
    "clientId" TEXT,
    "designationId" TEXT,
    "rateType" "RateType" NOT NULL DEFAULT 'BASIC',
    "amount" DECIMAL(10,2) NOT NULL,
    "currency" TEXT NOT NULL DEFAULT 'INR',
    "effectiveFrom" DATE NOT NULL,
    "effectiveTo" DATE,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "notes" TEXT,
    "createdBy" TEXT,
    "updatedBy" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "rate_masters_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "escalation_rules" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "rateMasterId" TEXT NOT NULL,
    "escalationType" "EscalationType" NOT NULL DEFAULT 'PERCENTAGE',
    "value" DECIMAL(10,4) NOT NULL,
    "applicableFrom" DATE NOT NULL,
    "notes" TEXT,
    "createdBy" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "escalation_rules_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "billing_sheets" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "sheetNo" TEXT NOT NULL,
    "tenderId" TEXT NOT NULL,
    "clientId" TEXT NOT NULL,
    "billingCycle" "BillingCycle" NOT NULL DEFAULT 'MONTHLY',
    "periodFrom" DATE NOT NULL,
    "periodTo" DATE NOT NULL,
    "status" "BillingSheetStatus" NOT NULL DEFAULT 'DRAFT',
    "totalMandays" DECIMAL(10,2) NOT NULL DEFAULT 0,
    "totalBillableAmount" DECIMAL(15,2) NOT NULL DEFAULT 0,
    "adjustments" DECIMAL(15,2) NOT NULL DEFAULT 0,
    "penaltyAmount" DECIMAL(15,2) NOT NULL DEFAULT 0,
    "shortfallAmount" DECIMAL(15,2) NOT NULL DEFAULT 0,
    "netAmount" DECIMAL(15,2) NOT NULL DEFAULT 0,
    "approvedBy" TEXT,
    "approvedAt" TIMESTAMP(3),
    "notes" TEXT,
    "createdBy" TEXT,
    "updatedBy" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "deletedAt" TIMESTAMP(3),

    CONSTRAINT "billing_sheets_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "billing_sheet_lines" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "billingSheetId" TEXT NOT NULL,
    "employeeId" TEXT NOT NULL,
    "designationId" TEXT,
    "presentDays" DECIMAL(5,2) NOT NULL DEFAULT 0,
    "otHours" DECIMAL(6,2) NOT NULL DEFAULT 0,
    "holidayCount" INTEGER NOT NULL DEFAULT 0,
    "nightShiftCount" INTEGER NOT NULL DEFAULT 0,
    "rate" DECIMAL(10,2) NOT NULL DEFAULT 0,
    "otRate" DECIMAL(10,2) NOT NULL DEFAULT 0,
    "billableAmount" DECIMAL(15,2) NOT NULL DEFAULT 0,
    "adjustmentAmount" DECIMAL(15,2) NOT NULL DEFAULT 0,
    "finalAmount" DECIMAL(15,2) NOT NULL DEFAULT 0,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "billing_sheet_lines_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "hsn_master" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "hsnCode" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "defaultTaxRate" DECIMAL(5,2) NOT NULL DEFAULT 18,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdBy" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "hsn_master_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "gst_ledger" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "invoiceId" TEXT,
    "paymentId" TEXT,
    "transactionDate" DATE NOT NULL,
    "direction" "GSTDirection" NOT NULL DEFAULT 'OUTPUT',
    "taxableAmount" DECIMAL(15,2) NOT NULL,
    "cgstRate" DECIMAL(5,2) NOT NULL DEFAULT 0,
    "cgstAmount" DECIMAL(15,2) NOT NULL DEFAULT 0,
    "sgstRate" DECIMAL(5,2) NOT NULL DEFAULT 0,
    "sgstAmount" DECIMAL(15,2) NOT NULL DEFAULT 0,
    "igstRate" DECIMAL(5,2) NOT NULL DEFAULT 0,
    "igstAmount" DECIMAL(15,2) NOT NULL DEFAULT 0,
    "totalTax" DECIMAL(15,2) NOT NULL DEFAULT 0,
    "hsn" TEXT,
    "period" TEXT NOT NULL,
    "isReconciled" BOOLEAN NOT NULL DEFAULT false,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "gst_ledger_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "customer_ledger" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "clientId" TEXT NOT NULL,
    "transactionDate" DATE NOT NULL,
    "invoiceId" TEXT,
    "paymentId" TEXT,
    "description" TEXT NOT NULL,
    "debit" DECIMAL(15,2) NOT NULL DEFAULT 0,
    "credit" DECIMAL(15,2) NOT NULL DEFAULT 0,
    "runningBalance" DECIMAL(15,2) NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "customer_ledger_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "financial_years" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "label" TEXT NOT NULL,
    "startDate" DATE NOT NULL,
    "endDate" DATE NOT NULL,
    "isCurrent" BOOLEAN NOT NULL DEFAULT false,
    "isLocked" BOOLEAN NOT NULL DEFAULT false,
    "createdBy" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "financial_years_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "cost_centers" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "type" TEXT NOT NULL DEFAULT 'DEPARTMENT',
    "referenceId" TEXT,
    "parentId" TEXT,
    "description" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdBy" TEXT,
    "updatedBy" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "cost_centers_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "vouchers" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "voucherNo" TEXT NOT NULL,
    "voucherType" "VoucherType" NOT NULL DEFAULT 'JOURNAL',
    "date" DATE NOT NULL,
    "narration" TEXT NOT NULL,
    "amount" DECIMAL(15,2) NOT NULL,
    "status" "VoucherStatus" NOT NULL DEFAULT 'DRAFT',
    "referenceNo" TEXT,
    "bankAccountId" TEXT,
    "reconciledAt" TIMESTAMP(3),
    "postedAt" TIMESTAMP(3),
    "postedBy" TEXT,
    "createdBy" TEXT,
    "updatedBy" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "vouchers_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "voucher_lines" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "voucherId" TEXT NOT NULL,
    "accountId" TEXT NOT NULL,
    "debit" DECIMAL(15,2) NOT NULL DEFAULT 0,
    "credit" DECIMAL(15,2) NOT NULL DEFAULT 0,
    "narration" TEXT,
    "costCenterId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "voucher_lines_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "tender_cost_entries" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "tenderId" TEXT NOT NULL,
    "costCenterId" TEXT,
    "period" TEXT NOT NULL,
    "costType" TEXT NOT NULL DEFAULT 'OTHER',
    "amount" DECIMAL(15,2) NOT NULL,
    "description" TEXT,
    "source" TEXT NOT NULL DEFAULT 'MANUAL',
    "sourceId" TEXT,
    "createdBy" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "tender_cost_entries_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "tender_profitability" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "tenderId" TEXT NOT NULL,
    "period" TEXT NOT NULL,
    "revenue" DECIMAL(15,2) NOT NULL DEFAULT 0,
    "salaryCost" DECIMAL(15,2) NOT NULL DEFAULT 0,
    "pfCost" DECIMAL(15,2) NOT NULL DEFAULT 0,
    "esiCost" DECIMAL(15,2) NOT NULL DEFAULT 0,
    "adminCost" DECIMAL(15,2) NOT NULL DEFAULT 0,
    "travelCost" DECIMAL(15,2) NOT NULL DEFAULT 0,
    "uniformCost" DECIMAL(15,2) NOT NULL DEFAULT 0,
    "assetCost" DECIMAL(15,2) NOT NULL DEFAULT 0,
    "otherCost" DECIMAL(15,2) NOT NULL DEFAULT 0,
    "totalCost" DECIMAL(15,2) NOT NULL DEFAULT 0,
    "grossProfit" DECIMAL(15,2) NOT NULL DEFAULT 0,
    "netMargin" DECIMAL(7,4) NOT NULL DEFAULT 0,
    "calculatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "tender_profitability_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "revenue_schedules" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "invoiceId" TEXT NOT NULL,
    "period" TEXT NOT NULL,
    "scheduledAmount" DECIMAL(15,2) NOT NULL,
    "recognizedAmount" DECIMAL(15,2) NOT NULL DEFAULT 0,
    "isRecognized" BOOLEAN NOT NULL DEFAULT false,
    "recognizedAt" TIMESTAMP(3),
    "createdBy" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "revenue_schedules_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "rate_masters_tenantId_idx" ON "rate_masters"("tenantId");

-- CreateIndex
CREATE INDEX "rate_masters_tenantId_tenderId_idx" ON "rate_masters"("tenantId", "tenderId");

-- CreateIndex
CREATE INDEX "rate_masters_tenantId_isActive_idx" ON "rate_masters"("tenantId", "isActive");

-- CreateIndex
CREATE INDEX "escalation_rules_rateMasterId_idx" ON "escalation_rules"("rateMasterId");

-- CreateIndex
CREATE INDEX "escalation_rules_tenantId_idx" ON "escalation_rules"("tenantId");

-- CreateIndex
CREATE INDEX "billing_sheets_tenantId_idx" ON "billing_sheets"("tenantId");

-- CreateIndex
CREATE INDEX "billing_sheets_tenantId_status_idx" ON "billing_sheets"("tenantId", "status");

-- CreateIndex
CREATE INDEX "billing_sheets_tenderId_idx" ON "billing_sheets"("tenderId");

-- CreateIndex
CREATE UNIQUE INDEX "billing_sheets_tenantId_sheetNo_key" ON "billing_sheets"("tenantId", "sheetNo");

-- CreateIndex
CREATE INDEX "billing_sheet_lines_billingSheetId_idx" ON "billing_sheet_lines"("billingSheetId");

-- CreateIndex
CREATE INDEX "billing_sheet_lines_tenantId_idx" ON "billing_sheet_lines"("tenantId");

-- CreateIndex
CREATE INDEX "hsn_master_tenantId_idx" ON "hsn_master"("tenantId");

-- CreateIndex
CREATE UNIQUE INDEX "hsn_master_tenantId_hsnCode_key" ON "hsn_master"("tenantId", "hsnCode");

-- CreateIndex
CREATE INDEX "gst_ledger_tenantId_idx" ON "gst_ledger"("tenantId");

-- CreateIndex
CREATE INDEX "gst_ledger_tenantId_period_idx" ON "gst_ledger"("tenantId", "period");

-- CreateIndex
CREATE INDEX "gst_ledger_tenantId_direction_idx" ON "gst_ledger"("tenantId", "direction");

-- CreateIndex
CREATE INDEX "customer_ledger_tenantId_idx" ON "customer_ledger"("tenantId");

-- CreateIndex
CREATE INDEX "customer_ledger_tenantId_clientId_idx" ON "customer_ledger"("tenantId", "clientId");

-- CreateIndex
CREATE INDEX "customer_ledger_clientId_idx" ON "customer_ledger"("clientId");

-- CreateIndex
CREATE INDEX "financial_years_tenantId_idx" ON "financial_years"("tenantId");

-- CreateIndex
CREATE UNIQUE INDEX "financial_years_tenantId_label_key" ON "financial_years"("tenantId", "label");

-- CreateIndex
CREATE INDEX "cost_centers_tenantId_idx" ON "cost_centers"("tenantId");

-- CreateIndex
CREATE UNIQUE INDEX "cost_centers_tenantId_code_key" ON "cost_centers"("tenantId", "code");

-- CreateIndex
CREATE INDEX "vouchers_tenantId_idx" ON "vouchers"("tenantId");

-- CreateIndex
CREATE INDEX "vouchers_tenantId_voucherType_idx" ON "vouchers"("tenantId", "voucherType");

-- CreateIndex
CREATE INDEX "vouchers_tenantId_status_idx" ON "vouchers"("tenantId", "status");

-- CreateIndex
CREATE INDEX "vouchers_tenantId_date_idx" ON "vouchers"("tenantId", "date");

-- CreateIndex
CREATE UNIQUE INDEX "vouchers_tenantId_voucherNo_key" ON "vouchers"("tenantId", "voucherNo");

-- CreateIndex
CREATE INDEX "voucher_lines_voucherId_idx" ON "voucher_lines"("voucherId");

-- CreateIndex
CREATE INDEX "voucher_lines_accountId_idx" ON "voucher_lines"("accountId");

-- CreateIndex
CREATE INDEX "voucher_lines_tenantId_idx" ON "voucher_lines"("tenantId");

-- CreateIndex
CREATE INDEX "tender_cost_entries_tenantId_idx" ON "tender_cost_entries"("tenantId");

-- CreateIndex
CREATE INDEX "tender_cost_entries_tenantId_tenderId_idx" ON "tender_cost_entries"("tenantId", "tenderId");

-- CreateIndex
CREATE INDEX "tender_cost_entries_tenantId_tenderId_period_idx" ON "tender_cost_entries"("tenantId", "tenderId", "period");

-- CreateIndex
CREATE INDEX "tender_profitability_tenantId_idx" ON "tender_profitability"("tenantId");

-- CreateIndex
CREATE UNIQUE INDEX "tender_profitability_tenantId_tenderId_period_key" ON "tender_profitability"("tenantId", "tenderId", "period");

-- CreateIndex
CREATE INDEX "revenue_schedules_tenantId_idx" ON "revenue_schedules"("tenantId");

-- CreateIndex
CREATE UNIQUE INDEX "revenue_schedules_tenantId_invoiceId_period_key" ON "revenue_schedules"("tenantId", "invoiceId", "period");

-- AddForeignKey
ALTER TABLE "invoices" ADD CONSTRAINT "invoices_billingSheetId_fkey" FOREIGN KEY ("billingSheetId") REFERENCES "billing_sheets"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "rate_masters" ADD CONSTRAINT "rate_masters_tenderId_fkey" FOREIGN KEY ("tenderId") REFERENCES "tenders"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "rate_masters" ADD CONSTRAINT "rate_masters_clientId_fkey" FOREIGN KEY ("clientId") REFERENCES "clients"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "rate_masters" ADD CONSTRAINT "rate_masters_designationId_fkey" FOREIGN KEY ("designationId") REFERENCES "designations"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "escalation_rules" ADD CONSTRAINT "escalation_rules_rateMasterId_fkey" FOREIGN KEY ("rateMasterId") REFERENCES "rate_masters"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "billing_sheets" ADD CONSTRAINT "billing_sheets_tenderId_fkey" FOREIGN KEY ("tenderId") REFERENCES "tenders"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "billing_sheets" ADD CONSTRAINT "billing_sheets_clientId_fkey" FOREIGN KEY ("clientId") REFERENCES "clients"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "billing_sheet_lines" ADD CONSTRAINT "billing_sheet_lines_billingSheetId_fkey" FOREIGN KEY ("billingSheetId") REFERENCES "billing_sheets"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "billing_sheet_lines" ADD CONSTRAINT "billing_sheet_lines_employeeId_fkey" FOREIGN KEY ("employeeId") REFERENCES "employees"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "billing_sheet_lines" ADD CONSTRAINT "billing_sheet_lines_designationId_fkey" FOREIGN KEY ("designationId") REFERENCES "designations"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "gst_ledger" ADD CONSTRAINT "gst_ledger_invoiceId_fkey" FOREIGN KEY ("invoiceId") REFERENCES "invoices"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "gst_ledger" ADD CONSTRAINT "gst_ledger_paymentId_fkey" FOREIGN KEY ("paymentId") REFERENCES "payments"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "customer_ledger" ADD CONSTRAINT "customer_ledger_clientId_fkey" FOREIGN KEY ("clientId") REFERENCES "clients"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "customer_ledger" ADD CONSTRAINT "customer_ledger_invoiceId_fkey" FOREIGN KEY ("invoiceId") REFERENCES "invoices"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "customer_ledger" ADD CONSTRAINT "customer_ledger_paymentId_fkey" FOREIGN KEY ("paymentId") REFERENCES "payments"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "cost_centers" ADD CONSTRAINT "cost_centers_parentId_fkey" FOREIGN KEY ("parentId") REFERENCES "cost_centers"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "voucher_lines" ADD CONSTRAINT "voucher_lines_voucherId_fkey" FOREIGN KEY ("voucherId") REFERENCES "vouchers"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "voucher_lines" ADD CONSTRAINT "voucher_lines_accountId_fkey" FOREIGN KEY ("accountId") REFERENCES "accounts"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "voucher_lines" ADD CONSTRAINT "voucher_lines_costCenterId_fkey" FOREIGN KEY ("costCenterId") REFERENCES "cost_centers"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "tender_cost_entries" ADD CONSTRAINT "tender_cost_entries_tenderId_fkey" FOREIGN KEY ("tenderId") REFERENCES "tenders"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "tender_profitability" ADD CONSTRAINT "tender_profitability_tenderId_fkey" FOREIGN KEY ("tenderId") REFERENCES "tenders"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "revenue_schedules" ADD CONSTRAINT "revenue_schedules_invoiceId_fkey" FOREIGN KEY ("invoiceId") REFERENCES "invoices"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
