/*
  Warnings:

  - Made the column `employmentType` on table `employees` required. This step will fail if there are existing NULL values in that column.

*/
-- CreateEnum
CREATE TYPE "EmployeeLifecycleStatus" AS ENUM ('CANDIDATE', 'SELECTED', 'JOINED', 'TRAINING', 'PROBATION', 'DEPLOYED', 'TRANSFERRED', 'PROMOTED', 'RESIGNED', 'TERMINATED', 'RETIRED', 'ARCHIVED');

-- CreateEnum
CREATE TYPE "PunchType" AS ENUM ('IN', 'OUT', 'BREAK_START', 'BREAK_END');

-- CreateEnum
CREATE TYPE "RegularizationType" AS ENUM ('MISSING_PUNCH', 'LATE_MARK', 'WRONG_SHIFT', 'WRONG_SITE', 'ATTENDANCE_DISPUTE');

-- CreateEnum
CREATE TYPE "RegularizationStatus" AS ENUM ('PENDING', 'APPROVED', 'REJECTED', 'CANCELLED');

-- CreateEnum
CREATE TYPE "AccrualType" AS ENUM ('MONTHLY', 'YEARLY', 'PER_WORKING_DAY', 'NONE');

-- CreateEnum
CREATE TYPE "TransferStatus" AS ENUM ('DRAFT', 'PENDING_APPROVAL', 'APPROVED', 'REJECTED', 'COMPLETED', 'CANCELLED');

-- CreateEnum
CREATE TYPE "SeparationType" AS ENUM ('RESIGNATION', 'TERMINATION', 'RETIREMENT', 'ABSCONDING', 'CONTRACT_END', 'MUTUAL_SEPARATION', 'DEATH');

-- CreateEnum
CREATE TYPE "AnnouncementType" AS ENUM ('COMPANY_NEWS', 'HR_CIRCULAR', 'POLICY_UPDATE', 'CONTRACT_NOTIFICATION', 'EMERGENCY_ALERT', 'NOTICE_BOARD');

-- CreateEnum
CREATE TYPE "AwardType" AS ENUM ('EMPLOYEE_OF_MONTH', 'BEST_ATTENDANCE', 'BEST_PERFORMER', 'LONG_SERVICE', 'SAFETY_AWARD', 'CUSTOM');

-- AlterTable
ALTER TABLE "departments" ADD COLUMN     "createdBy" TEXT;

-- AlterTable
ALTER TABLE "employees" ADD COLUMN     "lifecycleStatus" "EmployeeLifecycleStatus" NOT NULL DEFAULT 'JOINED',
ADD COLUMN     "noticePeriodDays" INTEGER DEFAULT 30,
ADD COLUMN     "reportingManagerId" TEXT,
ALTER COLUMN "employmentType" SET NOT NULL,
ALTER COLUMN "employmentType" SET DEFAULT 'CONTRACT';

-- CreateTable
CREATE TABLE "zones" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "code" TEXT,
    "createdBy" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "zones_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "regions" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "zoneId" TEXT,
    "name" TEXT NOT NULL,
    "code" TEXT,
    "createdBy" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "regions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "branches" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "regionId" TEXT,
    "code" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "gstin" TEXT,
    "pan" TEXT,
    "address" JSONB NOT NULL DEFAULT '{}',
    "phone" TEXT,
    "email" TEXT,
    "managerId" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdBy" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "branches_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "announcements" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "body" TEXT NOT NULL,
    "type" "AnnouncementType" NOT NULL DEFAULT 'COMPANY_NEWS',
    "targetAudience" JSONB NOT NULL DEFAULT '[]',
    "publishAt" TIMESTAMP(3),
    "expiresAt" TIMESTAMP(3),
    "isPublished" BOOLEAN NOT NULL DEFAULT false,
    "attachmentUrl" TEXT,
    "createdBy" TEXT,
    "updatedBy" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "announcements_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "employee_awards" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "employeeId" TEXT NOT NULL,
    "awardType" "AwardType" NOT NULL,
    "title" TEXT,
    "month" INTEGER,
    "year" INTEGER NOT NULL,
    "description" TEXT,
    "givenBy" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "employee_awards_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "timesheets" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "employeeId" TEXT NOT NULL,
    "periodStart" DATE NOT NULL,
    "periodEnd" DATE NOT NULL,
    "totalHours" DECIMAL(7,2) NOT NULL DEFAULT 0,
    "status" TEXT NOT NULL DEFAULT 'DRAFT',
    "submittedAt" TIMESTAMP(3),
    "approvedBy" TEXT,
    "approvedAt" TIMESTAMP(3),
    "remarks" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "timesheets_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "timesheet_entries" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "timesheetId" TEXT NOT NULL,
    "date" DATE NOT NULL,
    "tenderId" TEXT,
    "siteId" TEXT,
    "hoursWorked" DECIMAL(5,2) NOT NULL,
    "overtimeHours" DECIMAL(5,2) NOT NULL DEFAULT 0,
    "taskDescription" TEXT,
    "isHoliday" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "timesheet_entries_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "biometric_punch_logs" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "employeeId" TEXT NOT NULL,
    "deviceId" TEXT,
    "deviceName" TEXT,
    "punchTime" TIMESTAMP(3) NOT NULL,
    "punchType" "PunchType" NOT NULL DEFAULT 'IN',
    "latitude" DECIMAL(10,8),
    "longitude" DECIMAL(11,8),
    "isProcessed" BOOLEAN NOT NULL DEFAULT false,
    "processedAt" TIMESTAMP(3),
    "attendanceId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "biometric_punch_logs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "attendance_policies" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "isDefault" BOOLEAN NOT NULL DEFAULT false,
    "lateGraceMinutes" INTEGER NOT NULL DEFAULT 15,
    "halfDayMinutes" INTEGER NOT NULL DEFAULT 240,
    "fullDayMinutes" INTEGER NOT NULL DEFAULT 480,
    "overtimeAfterMin" INTEGER NOT NULL DEFAULT 480,
    "lopAfterHalfDays" INTEGER NOT NULL DEFAULT 2,
    "absentDeductDays" DECIMAL(3,1) NOT NULL DEFAULT 1,
    "halfDayDeductDays" DECIMAL(3,1) NOT NULL DEFAULT 0.5,
    "lateDeductPerOccur" DECIMAL(3,1) NOT NULL DEFAULT 0,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdBy" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "attendance_policies_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "attendance_regularizations" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "employeeId" TEXT NOT NULL,
    "date" DATE NOT NULL,
    "requestType" "RegularizationType" NOT NULL DEFAULT 'MISSING_PUNCH',
    "reason" TEXT NOT NULL,
    "requestedIn" TEXT,
    "requestedOut" TEXT,
    "currentIn" TEXT,
    "currentOut" TEXT,
    "status" "RegularizationStatus" NOT NULL DEFAULT 'PENDING',
    "reviewedBy" TEXT,
    "reviewedAt" TIMESTAMP(3),
    "reviewRemarks" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "attendance_regularizations_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "leave_policies" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "leaveTypeId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "accrualType" "AccrualType" NOT NULL DEFAULT 'MONTHLY',
    "accrualValue" DECIMAL(5,2) NOT NULL DEFAULT 1,
    "maxAccrual" DECIMAL(5,2),
    "carryForwardMax" DECIMAL(5,2) NOT NULL DEFAULT 0,
    "encashable" BOOLEAN NOT NULL DEFAULT false,
    "encashMax" DECIMAL(5,2),
    "probationApply" BOOLEAN NOT NULL DEFAULT false,
    "contractApply" BOOLEAN NOT NULL DEFAULT true,
    "sandwichRule" BOOLEAN NOT NULL DEFAULT false,
    "minServiceDays" INTEGER NOT NULL DEFAULT 0,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdBy" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "leave_policies_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "transfer_requests" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "employeeId" TEXT NOT NULL,
    "transferType" TEXT NOT NULL DEFAULT 'SITE',
    "fromSiteId" TEXT,
    "toSiteId" TEXT,
    "fromTenderId" TEXT,
    "toTenderId" TEXT,
    "fromDeptId" TEXT,
    "toDeptId" TEXT,
    "effectiveDate" DATE NOT NULL,
    "reason" TEXT NOT NULL,
    "status" "TransferStatus" NOT NULL DEFAULT 'DRAFT',
    "approvedBy" TEXT,
    "approvedAt" TIMESTAMP(3),
    "completedAt" TIMESTAMP(3),
    "notes" TEXT,
    "createdBy" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "transfer_requests_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "promotion_records" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "employeeId" TEXT NOT NULL,
    "fromDesignationId" TEXT,
    "toDesignationId" TEXT,
    "fromDepartmentId" TEXT,
    "toDepartmentId" TEXT,
    "effectiveDate" DATE NOT NULL,
    "newBasicSalary" DECIMAL(10,2),
    "incrementAmount" DECIMAL(10,2),
    "incrementPercentage" DECIMAL(5,2),
    "reason" TEXT,
    "approvedBy" TEXT,
    "approvedAt" TIMESTAMP(3),
    "documentId" TEXT,
    "createdBy" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "promotion_records_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "separation_records" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "employeeId" TEXT NOT NULL,
    "separationType" "SeparationType" NOT NULL DEFAULT 'RESIGNATION',
    "resignationDate" DATE,
    "lastWorkingDate" DATE,
    "exitInterviewDate" DATE,
    "noticePeriodDays" INTEGER NOT NULL DEFAULT 30,
    "noticePeriodWaived" BOOLEAN NOT NULL DEFAULT false,
    "clearanceStatus" JSONB NOT NULL DEFAULT '{}',
    "finalSettlementAmt" DECIMAL(15,2),
    "settlementDate" DATE,
    "rehireEligible" BOOLEAN NOT NULL DEFAULT true,
    "exitRemarks" TEXT,
    "documentId" TEXT,
    "createdBy" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "separation_records_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "zones_tenantId_idx" ON "zones"("tenantId");

-- CreateIndex
CREATE UNIQUE INDEX "zones_tenantId_name_key" ON "zones"("tenantId", "name");

-- CreateIndex
CREATE INDEX "regions_tenantId_idx" ON "regions"("tenantId");

-- CreateIndex
CREATE UNIQUE INDEX "regions_tenantId_name_key" ON "regions"("tenantId", "name");

-- CreateIndex
CREATE INDEX "branches_tenantId_idx" ON "branches"("tenantId");

-- CreateIndex
CREATE UNIQUE INDEX "branches_tenantId_code_key" ON "branches"("tenantId", "code");

-- CreateIndex
CREATE INDEX "announcements_tenantId_idx" ON "announcements"("tenantId");

-- CreateIndex
CREATE INDEX "announcements_tenantId_isPublished_idx" ON "announcements"("tenantId", "isPublished");

-- CreateIndex
CREATE INDEX "employee_awards_tenantId_idx" ON "employee_awards"("tenantId");

-- CreateIndex
CREATE INDEX "employee_awards_employeeId_idx" ON "employee_awards"("employeeId");

-- CreateIndex
CREATE INDEX "timesheets_tenantId_idx" ON "timesheets"("tenantId");

-- CreateIndex
CREATE INDEX "timesheets_employeeId_idx" ON "timesheets"("employeeId");

-- CreateIndex
CREATE UNIQUE INDEX "timesheets_tenantId_employeeId_periodStart_periodEnd_key" ON "timesheets"("tenantId", "employeeId", "periodStart", "periodEnd");

-- CreateIndex
CREATE INDEX "timesheet_entries_timesheetId_idx" ON "timesheet_entries"("timesheetId");

-- CreateIndex
CREATE INDEX "timesheet_entries_tenantId_date_idx" ON "timesheet_entries"("tenantId", "date");

-- CreateIndex
CREATE INDEX "biometric_punch_logs_tenantId_idx" ON "biometric_punch_logs"("tenantId");

-- CreateIndex
CREATE INDEX "biometric_punch_logs_employeeId_punchTime_idx" ON "biometric_punch_logs"("employeeId", "punchTime");

-- CreateIndex
CREATE INDEX "biometric_punch_logs_tenantId_isProcessed_idx" ON "biometric_punch_logs"("tenantId", "isProcessed");

-- CreateIndex
CREATE INDEX "attendance_policies_tenantId_idx" ON "attendance_policies"("tenantId");

-- CreateIndex
CREATE UNIQUE INDEX "attendance_policies_tenantId_name_key" ON "attendance_policies"("tenantId", "name");

-- CreateIndex
CREATE INDEX "attendance_regularizations_tenantId_idx" ON "attendance_regularizations"("tenantId");

-- CreateIndex
CREATE INDEX "attendance_regularizations_employeeId_idx" ON "attendance_regularizations"("employeeId");

-- CreateIndex
CREATE INDEX "attendance_regularizations_tenantId_status_idx" ON "attendance_regularizations"("tenantId", "status");

-- CreateIndex
CREATE INDEX "leave_policies_tenantId_idx" ON "leave_policies"("tenantId");

-- CreateIndex
CREATE UNIQUE INDEX "leave_policies_tenantId_leaveTypeId_name_key" ON "leave_policies"("tenantId", "leaveTypeId", "name");

-- CreateIndex
CREATE INDEX "transfer_requests_tenantId_idx" ON "transfer_requests"("tenantId");

-- CreateIndex
CREATE INDEX "transfer_requests_employeeId_idx" ON "transfer_requests"("employeeId");

-- CreateIndex
CREATE INDEX "transfer_requests_tenantId_status_idx" ON "transfer_requests"("tenantId", "status");

-- CreateIndex
CREATE INDEX "promotion_records_tenantId_idx" ON "promotion_records"("tenantId");

-- CreateIndex
CREATE INDEX "promotion_records_employeeId_idx" ON "promotion_records"("employeeId");

-- CreateIndex
CREATE UNIQUE INDEX "separation_records_employeeId_key" ON "separation_records"("employeeId");

-- CreateIndex
CREATE INDEX "separation_records_tenantId_idx" ON "separation_records"("tenantId");

-- AddForeignKey
ALTER TABLE "employees" ADD CONSTRAINT "employees_branchId_fkey" FOREIGN KEY ("branchId") REFERENCES "branches"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "regions" ADD CONSTRAINT "regions_zoneId_fkey" FOREIGN KEY ("zoneId") REFERENCES "zones"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "branches" ADD CONSTRAINT "branches_regionId_fkey" FOREIGN KEY ("regionId") REFERENCES "regions"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "employee_awards" ADD CONSTRAINT "employee_awards_employeeId_fkey" FOREIGN KEY ("employeeId") REFERENCES "employees"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "timesheets" ADD CONSTRAINT "timesheets_employeeId_fkey" FOREIGN KEY ("employeeId") REFERENCES "employees"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "timesheet_entries" ADD CONSTRAINT "timesheet_entries_timesheetId_fkey" FOREIGN KEY ("timesheetId") REFERENCES "timesheets"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "biometric_punch_logs" ADD CONSTRAINT "biometric_punch_logs_employeeId_fkey" FOREIGN KEY ("employeeId") REFERENCES "employees"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "attendance_regularizations" ADD CONSTRAINT "attendance_regularizations_employeeId_fkey" FOREIGN KEY ("employeeId") REFERENCES "employees"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "leave_policies" ADD CONSTRAINT "leave_policies_leaveTypeId_fkey" FOREIGN KEY ("leaveTypeId") REFERENCES "leave_types"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "transfer_requests" ADD CONSTRAINT "transfer_requests_employeeId_fkey" FOREIGN KEY ("employeeId") REFERENCES "employees"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "promotion_records" ADD CONSTRAINT "promotion_records_employeeId_fkey" FOREIGN KEY ("employeeId") REFERENCES "employees"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "separation_records" ADD CONSTRAINT "separation_records_employeeId_fkey" FOREIGN KEY ("employeeId") REFERENCES "employees"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
