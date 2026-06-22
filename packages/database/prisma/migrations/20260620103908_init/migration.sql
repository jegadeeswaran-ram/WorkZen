-- DropForeignKey
ALTER TABLE "tender_documents" DROP CONSTRAINT "tender_documents_tenderId_fkey";

-- DropForeignKey
ALTER TABLE "tender_renewals" DROP CONSTRAINT "tender_renewals_tenderId_fkey";

-- AlterTable
ALTER TABLE "sites" ADD COLUMN     "supervisorId" TEXT;

-- AlterTable
ALTER TABLE "work_orders" ADD COLUMN     "currentVersion" INTEGER NOT NULL DEFAULT 1,
ADD COLUMN     "governmentRef" TEXT,
ADD COLUMN     "issuedDate" DATE,
ADD COLUMN     "sanctionedStrength" INTEGER NOT NULL DEFAULT 0;

-- CreateTable
CREATE TABLE "candidate_assessments" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "candidateId" TEXT NOT NULL,
    "assessmentType" TEXT NOT NULL DEFAULT 'WRITTEN',
    "title" TEXT NOT NULL,
    "scheduledAt" TIMESTAMP(3),
    "conductedAt" TIMESTAMP(3),
    "score" DECIMAL(5,2),
    "maxScore" DECIMAL(5,2),
    "result" TEXT DEFAULT 'PENDING',
    "remarks" TEXT,
    "assessedBy" TEXT,
    "createdBy" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "candidate_assessments_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "interview_feedbacks" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "interviewId" TEXT NOT NULL,
    "skillsRating" INTEGER,
    "communicationRating" INTEGER,
    "behaviourRating" INTEGER,
    "experienceRating" INTEGER,
    "overallRating" INTEGER,
    "recommendation" TEXT DEFAULT 'ON_HOLD',
    "strengths" TEXT,
    "weaknesses" TEXT,
    "remarks" TEXT,
    "submittedBy" TEXT,
    "submittedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "interview_feedbacks_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "onboarding_records" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "candidateId" TEXT NOT NULL,
    "employeeId" TEXT,
    "joiningDate" DATE NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'INITIATED',
    "documentStatus" JSONB NOT NULL DEFAULT '{}',
    "pfRegistered" BOOLEAN NOT NULL DEFAULT false,
    "esiRegistered" BOOLEAN NOT NULL DEFAULT false,
    "uniformIssued" BOOLEAN NOT NULL DEFAULT false,
    "idCardIssued" BOOLEAN NOT NULL DEFAULT false,
    "bankVerified" BOOLEAN NOT NULL DEFAULT false,
    "trainingAssigned" BOOLEAN NOT NULL DEFAULT false,
    "deploymentReady" BOOLEAN NOT NULL DEFAULT false,
    "completedAt" TIMESTAMP(3),
    "remarks" TEXT,
    "createdBy" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "onboarding_records_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "warning_records" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "employeeId" TEXT NOT NULL,
    "warningType" TEXT NOT NULL DEFAULT 'WRITTEN',
    "subject" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "incidentDate" DATE NOT NULL,
    "issuedDate" DATE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "issuedBy" TEXT,
    "acknowledgedAt" TIMESTAMP(3),
    "actionTaken" TEXT,
    "status" TEXT NOT NULL DEFAULT 'ISSUED',
    "documentId" TEXT,
    "createdBy" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "warning_records_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "employee_trips" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "employeeId" TEXT NOT NULL,
    "tripType" TEXT NOT NULL DEFAULT 'SITE_VISIT',
    "purpose" TEXT NOT NULL,
    "fromLocation" TEXT NOT NULL,
    "toLocation" TEXT NOT NULL,
    "departureDate" DATE NOT NULL,
    "returnDate" DATE,
    "travelMode" TEXT,
    "advanceAmount" DECIMAL(10,2),
    "actualExpense" DECIMAL(10,2),
    "settledAmount" DECIMAL(10,2),
    "status" TEXT NOT NULL DEFAULT 'REQUESTED',
    "approvedBy" TEXT,
    "approvedAt" TIMESTAMP(3),
    "settledAt" TIMESTAMP(3),
    "remarks" TEXT,
    "createdBy" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "employee_trips_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "performance_review_cycles" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "cycleType" TEXT NOT NULL DEFAULT 'ANNUAL',
    "startDate" DATE NOT NULL,
    "endDate" DATE NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'PLANNED',
    "description" TEXT,
    "createdBy" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "performance_review_cycles_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "employee_goals" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "employeeId" TEXT NOT NULL,
    "cycleId" TEXT,
    "title" TEXT NOT NULL,
    "goalType" TEXT NOT NULL DEFAULT 'PERFORMANCE',
    "description" TEXT,
    "targetValue" DECIMAL(10,2),
    "actualValue" DECIMAL(10,2),
    "unit" TEXT,
    "dueDate" DATE,
    "status" TEXT NOT NULL DEFAULT 'ACTIVE',
    "progress" INTEGER NOT NULL DEFAULT 0,
    "createdBy" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "employee_goals_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "performance_reviews" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "employeeId" TEXT NOT NULL,
    "cycleId" TEXT,
    "reviewPeriodStart" DATE NOT NULL,
    "reviewPeriodEnd" DATE NOT NULL,
    "selfRating" INTEGER,
    "managerRating" INTEGER,
    "hrRating" INTEGER,
    "finalRating" INTEGER,
    "selfComments" TEXT,
    "managerComments" TEXT,
    "hrComments" TEXT,
    "attendanceScore" DECIMAL(5,2),
    "punctualityScore" DECIMAL(5,2),
    "productivityScore" DECIMAL(5,2),
    "behaviourScore" DECIMAL(5,2),
    "status" TEXT NOT NULL DEFAULT 'PENDING_SELF',
    "completedAt" TIMESTAMP(3),
    "createdBy" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "performance_reviews_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "training_programs" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "code" TEXT,
    "programType" TEXT NOT NULL DEFAULT 'INDUCTION',
    "description" TEXT,
    "durationHours" INTEGER,
    "isMandatory" BOOLEAN NOT NULL DEFAULT false,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "passScore" INTEGER DEFAULT 60,
    "createdBy" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "training_programs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "training_sessions" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "programId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "sessionType" TEXT NOT NULL DEFAULT 'CLASSROOM',
    "trainerId" TEXT,
    "trainerName" TEXT,
    "scheduledDate" DATE NOT NULL,
    "startTime" TEXT,
    "endTime" TEXT,
    "venue" TEXT,
    "maxCapacity" INTEGER,
    "status" TEXT NOT NULL DEFAULT 'SCHEDULED',
    "completedAt" TIMESTAMP(3),
    "notes" TEXT,
    "createdBy" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "training_sessions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "employee_trainings" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "employeeId" TEXT NOT NULL,
    "programId" TEXT NOT NULL,
    "sessionId" TEXT,
    "status" TEXT NOT NULL DEFAULT 'ASSIGNED',
    "enrolledAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "completedAt" TIMESTAMP(3),
    "score" DECIMAL(5,2),
    "passed" BOOLEAN,
    "certificateId" TEXT,
    "attendanceMarked" BOOLEAN NOT NULL DEFAULT false,
    "remarks" TEXT,
    "createdBy" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "employee_trainings_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "training_certificates" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "employeeId" TEXT NOT NULL,
    "programId" TEXT NOT NULL,
    "trainingId" TEXT,
    "certificateNo" TEXT NOT NULL,
    "issuedDate" DATE NOT NULL,
    "expiryDate" DATE,
    "qrCode" TEXT,
    "isValid" BOOLEAN NOT NULL DEFAULT true,
    "revokedAt" TIMESTAMP(3),
    "revokeReason" TEXT,
    "createdBy" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "training_certificates_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "work_order_positions" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "workOrderId" TEXT NOT NULL,
    "designation" TEXT NOT NULL,
    "requiredCount" INTEGER NOT NULL,
    "deployedCount" INTEGER NOT NULL DEFAULT 0,
    "rate" DECIMAL(10,2) NOT NULL,
    "rateType" TEXT NOT NULL DEFAULT 'MONTHLY',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "work_order_positions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "work_order_fulfillments" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "workOrderId" TEXT NOT NULL,
    "positionId" TEXT NOT NULL,
    "employeeId" TEXT NOT NULL,
    "deployedDate" DATE NOT NULL,
    "releasedDate" DATE,
    "status" TEXT NOT NULL DEFAULT 'ACTIVE',
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "work_order_fulfillments_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "work_order_milestones" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "workOrderId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "percentage" INTEGER NOT NULL,
    "amount" DECIMAL(15,2) NOT NULL,
    "dueDate" DATE,
    "status" TEXT NOT NULL DEFAULT 'PENDING',
    "completedDate" DATE,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "work_order_milestones_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "work_order_invoices" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "workOrderId" TEXT NOT NULL,
    "milestoneId" TEXT,
    "invoiceNumber" TEXT NOT NULL,
    "invoiceDate" DATE NOT NULL,
    "period" TEXT NOT NULL,
    "deployedCount" INTEGER NOT NULL DEFAULT 0,
    "amount" DECIMAL(15,2) NOT NULL,
    "gstAmount" DECIMAL(15,2) NOT NULL DEFAULT 0,
    "totalAmount" DECIMAL(15,2) NOT NULL,
    "paidAmount" DECIMAL(15,2) NOT NULL DEFAULT 0,
    "status" TEXT NOT NULL DEFAULT 'DRAFT',
    "notes" TEXT,
    "createdBy" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "work_order_invoices_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "work_order_payments" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "workOrderId" TEXT NOT NULL,
    "invoiceId" TEXT,
    "amount" DECIMAL(15,2) NOT NULL,
    "paymentDate" DATE NOT NULL,
    "paymentMode" TEXT NOT NULL,
    "referenceNumber" TEXT,
    "remarks" TEXT,
    "recordedBy" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "work_order_payments_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "work_order_amendments" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "workOrderId" TEXT NOT NULL,
    "version" INTEGER NOT NULL,
    "amendmentRef" TEXT,
    "changeDescription" TEXT NOT NULL,
    "previousValue" DECIMAL(15,2),
    "newValue" DECIMAL(15,2),
    "previousStrength" INTEGER,
    "newStrength" INTEGER,
    "previousEndDate" DATE,
    "newEndDate" DATE,
    "effectiveDate" DATE NOT NULL,
    "createdBy" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "work_order_amendments_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "courier_vendors" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "code" TEXT,
    "contactPhone" TEXT,
    "trackingUrl" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "courier_vendors_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "logistics_dispatches" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "dispatchNo" TEXT NOT NULL,
    "trackingNumber" TEXT,
    "courierVendorId" TEXT,
    "dispatchDate" DATE NOT NULL,
    "toName" TEXT NOT NULL,
    "toAddress" TEXT NOT NULL,
    "toPhone" TEXT,
    "contentType" TEXT NOT NULL,
    "contentDescription" TEXT,
    "weight" DECIMAL(8,2),
    "charges" DECIMAL(10,2),
    "status" TEXT NOT NULL DEFAULT 'DISPATCHED',
    "expectedDelivery" DATE,
    "deliveredDate" DATE,
    "relatedModule" TEXT,
    "relatedId" TEXT,
    "notes" TEXT,
    "dispatchedBy" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "logistics_dispatches_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "logistics_receipts" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "receiptNo" TEXT NOT NULL,
    "trackingNumber" TEXT,
    "courierVendorId" TEXT,
    "receivedDate" DATE NOT NULL,
    "fromName" TEXT NOT NULL,
    "fromAddress" TEXT,
    "fromPhone" TEXT,
    "contentType" TEXT NOT NULL,
    "contentDescription" TEXT,
    "receivedBy" TEXT,
    "handedTo" TEXT,
    "relatedModule" TEXT,
    "relatedId" TEXT,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "logistics_receipts_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "visitors" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "company" TEXT,
    "phone" TEXT NOT NULL,
    "email" TEXT,
    "idType" TEXT NOT NULL DEFAULT 'AADHAAR',
    "idNumber" TEXT,
    "isBlacklisted" BOOLEAN NOT NULL DEFAULT false,
    "blacklistReason" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "visitors_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "visitor_logs" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "visitorId" TEXT NOT NULL,
    "hostEmployeeId" TEXT,
    "purpose" TEXT NOT NULL,
    "purposeCategory" TEXT NOT NULL DEFAULT 'OTHER',
    "checkIn" TIMESTAMP(3) NOT NULL,
    "checkOut" TIMESTAMP(3),
    "badgeNumber" TEXT,
    "vehicleNumber" TEXT,
    "remarks" TEXT,
    "createdBy" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "visitor_logs_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "candidate_assessments_tenantId_idx" ON "candidate_assessments"("tenantId");

-- CreateIndex
CREATE INDEX "candidate_assessments_candidateId_idx" ON "candidate_assessments"("candidateId");

-- CreateIndex
CREATE UNIQUE INDEX "interview_feedbacks_interviewId_key" ON "interview_feedbacks"("interviewId");

-- CreateIndex
CREATE INDEX "interview_feedbacks_tenantId_idx" ON "interview_feedbacks"("tenantId");

-- CreateIndex
CREATE UNIQUE INDEX "onboarding_records_candidateId_key" ON "onboarding_records"("candidateId");

-- CreateIndex
CREATE UNIQUE INDEX "onboarding_records_employeeId_key" ON "onboarding_records"("employeeId");

-- CreateIndex
CREATE INDEX "onboarding_records_tenantId_idx" ON "onboarding_records"("tenantId");

-- CreateIndex
CREATE INDEX "warning_records_tenantId_idx" ON "warning_records"("tenantId");

-- CreateIndex
CREATE INDEX "warning_records_employeeId_idx" ON "warning_records"("employeeId");

-- CreateIndex
CREATE INDEX "employee_trips_tenantId_idx" ON "employee_trips"("tenantId");

-- CreateIndex
CREATE INDEX "employee_trips_employeeId_idx" ON "employee_trips"("employeeId");

-- CreateIndex
CREATE INDEX "performance_review_cycles_tenantId_idx" ON "performance_review_cycles"("tenantId");

-- CreateIndex
CREATE INDEX "employee_goals_tenantId_idx" ON "employee_goals"("tenantId");

-- CreateIndex
CREATE INDEX "employee_goals_employeeId_idx" ON "employee_goals"("employeeId");

-- CreateIndex
CREATE INDEX "performance_reviews_tenantId_idx" ON "performance_reviews"("tenantId");

-- CreateIndex
CREATE INDEX "performance_reviews_employeeId_idx" ON "performance_reviews"("employeeId");

-- CreateIndex
CREATE INDEX "training_programs_tenantId_idx" ON "training_programs"("tenantId");

-- CreateIndex
CREATE INDEX "training_sessions_tenantId_idx" ON "training_sessions"("tenantId");

-- CreateIndex
CREATE INDEX "training_sessions_programId_idx" ON "training_sessions"("programId");

-- CreateIndex
CREATE INDEX "employee_trainings_tenantId_idx" ON "employee_trainings"("tenantId");

-- CreateIndex
CREATE INDEX "employee_trainings_employeeId_idx" ON "employee_trainings"("employeeId");

-- CreateIndex
CREATE INDEX "training_certificates_tenantId_idx" ON "training_certificates"("tenantId");

-- CreateIndex
CREATE INDEX "training_certificates_employeeId_idx" ON "training_certificates"("employeeId");

-- CreateIndex
CREATE INDEX "work_order_positions_tenantId_idx" ON "work_order_positions"("tenantId");

-- CreateIndex
CREATE INDEX "work_order_positions_workOrderId_idx" ON "work_order_positions"("workOrderId");

-- CreateIndex
CREATE INDEX "work_order_fulfillments_tenantId_idx" ON "work_order_fulfillments"("tenantId");

-- CreateIndex
CREATE INDEX "work_order_fulfillments_workOrderId_idx" ON "work_order_fulfillments"("workOrderId");

-- CreateIndex
CREATE INDEX "work_order_milestones_tenantId_idx" ON "work_order_milestones"("tenantId");

-- CreateIndex
CREATE INDEX "work_order_milestones_workOrderId_idx" ON "work_order_milestones"("workOrderId");

-- CreateIndex
CREATE INDEX "work_order_invoices_tenantId_idx" ON "work_order_invoices"("tenantId");

-- CreateIndex
CREATE INDEX "work_order_invoices_workOrderId_idx" ON "work_order_invoices"("workOrderId");

-- CreateIndex
CREATE INDEX "work_order_payments_tenantId_idx" ON "work_order_payments"("tenantId");

-- CreateIndex
CREATE INDEX "work_order_payments_workOrderId_idx" ON "work_order_payments"("workOrderId");

-- CreateIndex
CREATE INDEX "work_order_amendments_tenantId_idx" ON "work_order_amendments"("tenantId");

-- CreateIndex
CREATE INDEX "work_order_amendments_workOrderId_idx" ON "work_order_amendments"("workOrderId");

-- CreateIndex
CREATE INDEX "courier_vendors_tenantId_idx" ON "courier_vendors"("tenantId");

-- CreateIndex
CREATE INDEX "logistics_dispatches_tenantId_idx" ON "logistics_dispatches"("tenantId");

-- CreateIndex
CREATE INDEX "logistics_receipts_tenantId_idx" ON "logistics_receipts"("tenantId");

-- CreateIndex
CREATE INDEX "visitors_tenantId_idx" ON "visitors"("tenantId");

-- CreateIndex
CREATE INDEX "visitor_logs_tenantId_idx" ON "visitor_logs"("tenantId");

-- CreateIndex
CREATE INDEX "visitor_logs_visitorId_idx" ON "visitor_logs"("visitorId");

-- CreateIndex
CREATE INDEX "sites_supervisorId_idx" ON "sites"("supervisorId");

-- AddForeignKey
ALTER TABLE "tender_documents" ADD CONSTRAINT "tender_documents_tenderId_fkey" FOREIGN KEY ("tenderId") REFERENCES "tenders"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "tender_renewals" ADD CONSTRAINT "tender_renewals_tenderId_fkey" FOREIGN KEY ("tenderId") REFERENCES "tenders"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "sites" ADD CONSTRAINT "sites_supervisorId_fkey" FOREIGN KEY ("supervisorId") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "candidate_assessments" ADD CONSTRAINT "candidate_assessments_candidateId_fkey" FOREIGN KEY ("candidateId") REFERENCES "candidates"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "interview_feedbacks" ADD CONSTRAINT "interview_feedbacks_interviewId_fkey" FOREIGN KEY ("interviewId") REFERENCES "interviews"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "onboarding_records" ADD CONSTRAINT "onboarding_records_candidateId_fkey" FOREIGN KEY ("candidateId") REFERENCES "candidates"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "warning_records" ADD CONSTRAINT "warning_records_employeeId_fkey" FOREIGN KEY ("employeeId") REFERENCES "employees"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "employee_trips" ADD CONSTRAINT "employee_trips_employeeId_fkey" FOREIGN KEY ("employeeId") REFERENCES "employees"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "employee_goals" ADD CONSTRAINT "employee_goals_employeeId_fkey" FOREIGN KEY ("employeeId") REFERENCES "employees"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "performance_reviews" ADD CONSTRAINT "performance_reviews_employeeId_fkey" FOREIGN KEY ("employeeId") REFERENCES "employees"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "performance_reviews" ADD CONSTRAINT "performance_reviews_cycleId_fkey" FOREIGN KEY ("cycleId") REFERENCES "performance_review_cycles"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "training_sessions" ADD CONSTRAINT "training_sessions_programId_fkey" FOREIGN KEY ("programId") REFERENCES "training_programs"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "employee_trainings" ADD CONSTRAINT "employee_trainings_employeeId_fkey" FOREIGN KEY ("employeeId") REFERENCES "employees"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "employee_trainings" ADD CONSTRAINT "employee_trainings_sessionId_fkey" FOREIGN KEY ("sessionId") REFERENCES "training_sessions"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "training_certificates" ADD CONSTRAINT "training_certificates_employeeId_fkey" FOREIGN KEY ("employeeId") REFERENCES "employees"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "work_order_positions" ADD CONSTRAINT "work_order_positions_workOrderId_fkey" FOREIGN KEY ("workOrderId") REFERENCES "work_orders"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "work_order_fulfillments" ADD CONSTRAINT "work_order_fulfillments_workOrderId_fkey" FOREIGN KEY ("workOrderId") REFERENCES "work_orders"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "work_order_fulfillments" ADD CONSTRAINT "work_order_fulfillments_positionId_fkey" FOREIGN KEY ("positionId") REFERENCES "work_order_positions"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "work_order_fulfillments" ADD CONSTRAINT "work_order_fulfillments_employeeId_fkey" FOREIGN KEY ("employeeId") REFERENCES "employees"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "work_order_milestones" ADD CONSTRAINT "work_order_milestones_workOrderId_fkey" FOREIGN KEY ("workOrderId") REFERENCES "work_orders"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "work_order_invoices" ADD CONSTRAINT "work_order_invoices_workOrderId_fkey" FOREIGN KEY ("workOrderId") REFERENCES "work_orders"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "work_order_invoices" ADD CONSTRAINT "work_order_invoices_milestoneId_fkey" FOREIGN KEY ("milestoneId") REFERENCES "work_order_milestones"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "work_order_payments" ADD CONSTRAINT "work_order_payments_workOrderId_fkey" FOREIGN KEY ("workOrderId") REFERENCES "work_orders"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "work_order_payments" ADD CONSTRAINT "work_order_payments_invoiceId_fkey" FOREIGN KEY ("invoiceId") REFERENCES "work_order_invoices"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "work_order_amendments" ADD CONSTRAINT "work_order_amendments_workOrderId_fkey" FOREIGN KEY ("workOrderId") REFERENCES "work_orders"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "logistics_dispatches" ADD CONSTRAINT "logistics_dispatches_courierVendorId_fkey" FOREIGN KEY ("courierVendorId") REFERENCES "courier_vendors"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "logistics_receipts" ADD CONSTRAINT "logistics_receipts_courierVendorId_fkey" FOREIGN KEY ("courierVendorId") REFERENCES "courier_vendors"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "visitor_logs" ADD CONSTRAINT "visitor_logs_visitorId_fkey" FOREIGN KEY ("visitorId") REFERENCES "visitors"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "visitor_logs" ADD CONSTRAINT "visitor_logs_hostEmployeeId_fkey" FOREIGN KEY ("hostEmployeeId") REFERENCES "employees"("id") ON DELETE SET NULL ON UPDATE CASCADE;
