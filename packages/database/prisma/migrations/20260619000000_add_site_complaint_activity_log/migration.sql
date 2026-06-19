-- CreateEnum
CREATE TYPE "ComplaintCategory" AS ENUM ('LABOUR_HR', 'SAFETY', 'OPERATIONS', 'COMPLIANCE', 'CLIENT_SITE', 'RESOURCE');

-- CreateEnum
CREATE TYPE "ComplaintSeverity" AS ENUM ('LOW', 'MEDIUM', 'HIGH', 'CRITICAL');

-- CreateEnum
CREATE TYPE "ComplaintStatus" AS ENUM ('OPEN', 'IN_REVIEW', 'ESCALATED', 'RESOLVED', 'CLOSED');

-- CreateTable
CREATE TABLE "site_complaints" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "siteId" TEXT NOT NULL,
    "reportedById" TEXT NOT NULL,
    "assignedToId" TEXT,
    "category" "ComplaintCategory" NOT NULL,
    "severity" "ComplaintSeverity" NOT NULL DEFAULT 'MEDIUM',
    "status" "ComplaintStatus" NOT NULL DEFAULT 'OPEN',
    "title" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "attachments" JSONB NOT NULL DEFAULT '[]',
    "resolvedAt" TIMESTAMP(3),
    "resolutionNote" TEXT,
    "escalatedAt" TIMESTAMP(3),
    "escalatedToId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "deletedAt" TIMESTAMP(3),

    CONSTRAINT "site_complaints_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "site_activity_logs" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "siteId" TEXT NOT NULL,
    "supervisorId" TEXT NOT NULL,
    "logDate" DATE NOT NULL,
    "workDone" TEXT NOT NULL,
    "headcount" INTEGER NOT NULL,
    "hasIncident" BOOLEAN NOT NULL DEFAULT false,
    "incidentType" TEXT,
    "incidentDesc" TEXT,
    "photoUrls" JSONB NOT NULL DEFAULT '[]',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "deletedAt" TIMESTAMP(3),

    CONSTRAINT "site_activity_logs_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "site_complaints_tenantId_idx" ON "site_complaints"("tenantId");

-- CreateIndex
CREATE INDEX "site_complaints_siteId_idx" ON "site_complaints"("siteId");

-- CreateIndex
CREATE INDEX "site_complaints_reportedById_idx" ON "site_complaints"("reportedById");

-- CreateIndex
CREATE INDEX "site_complaints_status_idx" ON "site_complaints"("status");

-- CreateIndex
CREATE INDEX "site_activity_logs_tenantId_idx" ON "site_activity_logs"("tenantId");

-- CreateIndex
CREATE INDEX "site_activity_logs_siteId_idx" ON "site_activity_logs"("siteId");

-- CreateIndex
CREATE INDEX "site_activity_logs_logDate_idx" ON "site_activity_logs"("logDate");

-- CreateIndex
CREATE UNIQUE INDEX "site_activity_logs_tenantId_siteId_supervisorId_logDate_key" ON "site_activity_logs"("tenantId", "siteId", "supervisorId", "logDate");

-- AddForeignKey
ALTER TABLE "site_complaints" ADD CONSTRAINT "site_complaints_siteId_fkey" FOREIGN KEY ("siteId") REFERENCES "sites"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "site_complaints" ADD CONSTRAINT "site_complaints_reportedById_fkey" FOREIGN KEY ("reportedById") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "site_complaints" ADD CONSTRAINT "site_complaints_assignedToId_fkey" FOREIGN KEY ("assignedToId") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "site_activity_logs" ADD CONSTRAINT "site_activity_logs_siteId_fkey" FOREIGN KEY ("siteId") REFERENCES "sites"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "site_activity_logs" ADD CONSTRAINT "site_activity_logs_supervisorId_fkey" FOREIGN KEY ("supervisorId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
