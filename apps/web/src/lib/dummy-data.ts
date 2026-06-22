// Fallback placeholder data — shown instantly while real API data loads.
// placeholderData in TanStack Query never pollutes the cache; real data
// replaces it transparently on success.

// ── Finance ──────────────────────────────────────────────────────────────────

export const DUMMY_FINANCE_DASH = {
  kpis: {
    totalRevenue: 42500000, totalExpenses: 28750000,
    netProfit: 13750000,   cashBalance: 8200000,
    revenueGrowth: 12.4,
  },
  topClients: [
    { name: 'NHAI Headquarters',  outstanding: 8500000, invoiced: 24000000 },
    { name: 'AAI Terminal 2',     outstanding: 3200000, invoiced: 18500000 },
    { name: 'NMRC Phase-II',      outstanding: 6200000, invoiced: 14200000 },
    { name: 'IOCL Refinery',      outstanding: 1100000, invoiced: 9800000  },
    { name: 'ONGC Mumbai',        outstanding: 0,        invoiced: 22000000 },
  ],
  recentInvoices: [
    { id: 'i1', invoiceNumber: 'INV-2026-0042', clientName: 'NHAI Headquarters', amount: 12500000, status: 'SENT',    dueDate: '2026-06-30' },
    { id: 'i2', invoiceNumber: 'INV-2026-0041', clientName: 'AAI Terminal 2',    amount: 8750000,  status: 'PAID',    dueDate: '2026-06-15' },
    { id: 'i3', invoiceNumber: 'INV-2026-0040', clientName: 'NMRC Phase-II',     amount: 6200000,  status: 'OVERDUE', dueDate: '2026-06-10' },
    { id: 'i4', invoiceNumber: 'INV-2026-0039', clientName: 'IOCL Refinery',     amount: 4100000,  status: 'DRAFT',   dueDate: '2026-07-05' },
  ],
};

export const DUMMY_REVENUE_CHART = [
  { month: 'Jul', revenue: 3200000 }, { month: 'Aug', revenue: 3800000 },
  { month: 'Sep', revenue: 4100000 }, { month: 'Oct', revenue: 3600000 },
  { month: 'Nov', revenue: 4500000 }, { month: 'Dec', revenue: 5200000 },
  { month: 'Jan', revenue: 4800000 }, { month: 'Feb', revenue: 5600000 },
  { month: 'Mar', revenue: 6100000 }, { month: 'Apr', revenue: 5400000 },
  { month: 'May', revenue: 6800000 }, { month: 'Jun', revenue: 7200000 },
];

export const DUMMY_AR_AGING = {
  current: 6500000, days30: 4200000, days60: 2800000, days90: 1500000, over90: 800000,
};

// ── Billing ──────────────────────────────────────────────────────────────────

export const DUMMY_BILLING_DASH = {
  totalRevenue: 45000000, outstanding: 8500000,
  collected: 36500000,   overdueCount: 3,
  overdueAmount: 6200000, avgDso: 28,
};

export const DUMMY_INVOICES_DATA = {
  data: [
    { id: 'i1', invoiceNumber: 'INV-2026-0042', clientName: 'NHAI Headquarters', tenderName: 'Security WO-2026-0018', amount: 12500000, gstAmount: 2250000, totalAmount: 14750000, status: 'SENT',    issueDate: '2026-06-01', dueDate: '2026-06-30' },
    { id: 'i2', invoiceNumber: 'INV-2026-0041', clientName: 'AAI Terminal 2',    tenderName: 'Housekeeping WO-2026-0017', amount: 8750000, gstAmount: 1575000, totalAmount: 10325000, status: 'PAID',    issueDate: '2026-05-20', dueDate: '2026-06-15' },
    { id: 'i3', invoiceNumber: 'INV-2026-0040', clientName: 'NMRC Phase-II',     tenderName: 'Metro Guards',          amount: 6200000,  gstAmount: 1116000, totalAmount: 7316000,  status: 'OVERDUE', issueDate: '2026-05-10', dueDate: '2026-06-10' },
    { id: 'i4', invoiceNumber: 'INV-2026-0039', clientName: 'IOCL Refinery',     tenderName: 'Fire Safety',           amount: 4100000,  gstAmount: 738000,  totalAmount: 4838000,  status: 'DRAFT',   issueDate: '2026-06-18', dueDate: '2026-07-05' },
    { id: 'i5', invoiceNumber: 'INV-2026-0038', clientName: 'ONGC Mumbai',       tenderName: 'Plant Security',        amount: 9800000,  gstAmount: 1764000, totalAmount: 11564000, status: 'PAID',    issueDate: '2026-05-01', dueDate: '2026-05-31' },
  ],
  meta: { total: 42, page: 1, totalPages: 3, limit: 15 },
};

export const DUMMY_BILLING_AGING = {
  current: 6500000, days30: 4200000, days60: 2800000, days90: 1500000, over90: 800000,
};

export const DUMMY_BILLING_DSO = { dso: 28, trend: -3 };

// ── Recruitment ───────────────────────────────────────────────────────────────

export const DUMMY_REQUISITIONS_DATA = {
  data: [
    { id: 'r1', requisitionNumber: 'JR-2026-0009', jobTitle: 'Senior Security Guard',   department: 'Operations', location: 'NHAI HQ, Delhi',     vacancies: 12, status: 'OPEN',      postedDate: '2026-06-01', closingDate: '2026-07-01', candidateCount: 34, priority: 'HIGH' },
    { id: 'r2', requisitionNumber: 'JR-2026-0008', jobTitle: 'Housekeeping Supervisor', department: 'Facilities', location: 'AAI Terminal 2',      vacancies: 3,  status: 'OPEN',      postedDate: '2026-06-05', closingDate: '2026-06-30', candidateCount: 11, priority: 'MEDIUM' },
    { id: 'r3', requisitionNumber: 'JR-2026-0007', jobTitle: 'Fire Safety Officer',     department: 'Safety',     location: 'IOCL Refinery',       vacancies: 5,  status: 'IN_REVIEW', postedDate: '2026-05-20', closingDate: '2026-06-20', candidateCount: 22, priority: 'HIGH' },
    { id: 'r4', requisitionNumber: 'JR-2026-0006', jobTitle: 'Field Officer',           department: 'Operations', location: 'NMRC Metro Stations',  vacancies: 20, status: 'OPEN',      postedDate: '2026-06-10', closingDate: '2026-07-10', candidateCount: 58, priority: 'URGENT' },
    { id: 'r5', requisitionNumber: 'JR-2026-0005', jobTitle: 'Security Supervisor',     department: 'Operations', location: 'ONGC Mumbai Offshore', vacancies: 8,  status: 'CLOSED',    postedDate: '2026-05-01', closingDate: '2026-05-31', candidateCount: 41, priority: 'MEDIUM' },
  ],
  meta: { total: 28, page: 1, totalPages: 3 },
};

export const DUMMY_CANDIDATES_DATA = {
  data: [
    { id: 'c1', name: 'Ravi Kumar Singh',    phone: '9876543210', email: 'ravi.singh@email.com',    status: 'SHORTLISTED', appliedDate: '2026-06-05', experience: '4 years', jobTitle: 'Senior Security Guard',   source: 'Naukri' },
    { id: 'c2', name: 'Sunita Devi',         phone: '9876543211', email: 'sunita.devi@email.com',   status: 'INTERVIEWED', appliedDate: '2026-06-07', experience: '2 years', jobTitle: 'Housekeeping Supervisor', source: 'Walk-in' },
    { id: 'c3', name: 'Manoj Yadav',         phone: '9876543212', email: 'manoj.yadav@email.com',   status: 'APPLIED',     appliedDate: '2026-06-10', experience: '6 years', jobTitle: 'Field Officer',           source: 'Referral' },
    { id: 'c4', name: 'Priya Sharma',        phone: '9876543213', email: 'priya.sharma@email.com',  status: 'OFFERED',     appliedDate: '2026-05-28', experience: '3 years', jobTitle: 'Fire Safety Officer',     source: 'LinkedIn' },
    { id: 'c5', name: 'Deepak Gupta',        phone: '9876543214', email: 'deepak.gupta@email.com',  status: 'REJECTED',    appliedDate: '2026-06-01', experience: '1 year',  jobTitle: 'Security Guard',          source: 'IndeedIn' },
  ],
  meta: { total: 58, page: 1, totalPages: 6 },
};

// ── Work Orders ───────────────────────────────────────────────────────────────

export const DUMMY_WO_DASH = {
  active: 8, pending: 3, completed: 24, totalValue: 89500000,
  totalDeployed: 312,
};

export const DUMMY_WO_DATA = {
  data: [
    { id: 'w1', workOrderNumber: 'WO-2026-0018', title: 'Security Deployment — NHAI HQ',  clientName: 'NHAI Headquarters', status: 'ACTIVE',    startDate: '2026-05-01', endDate: '2026-10-31', value: 18500000, employeesDeployed: 42, sites: 3 },
    { id: 'w2', workOrderNumber: 'WO-2026-0017', title: 'Housekeeping — AAI Terminal',    clientName: 'AAI Terminal 2',    status: 'ACTIVE',    startDate: '2026-04-15', endDate: '2026-12-31', value: 12000000, employeesDeployed: 28, sites: 1 },
    { id: 'w3', workOrderNumber: 'WO-2026-0016', title: 'Metro Station Guards',           clientName: 'NMRC Phase-II',     status: 'PENDING',   startDate: '2026-07-01', endDate: '2027-06-30', value: 9600000,  employeesDeployed: 0,  sites: 5 },
    { id: 'w4', workOrderNumber: 'WO-2026-0015', title: 'Fire Safety Team — IOCL',       clientName: 'IOCL Refinery',     status: 'COMPLETED', startDate: '2025-10-01', endDate: '2026-03-31', value: 7200000,  employeesDeployed: 18, sites: 2 },
    { id: 'w5', workOrderNumber: 'WO-2026-0014', title: 'Plant Security — ONGC Mumbai',  clientName: 'ONGC Mumbai',       status: 'ACTIVE',    startDate: '2026-01-01', endDate: '2026-12-31', value: 22000000, employeesDeployed: 55, sites: 4 },
  ],
  meta: { total: 35, page: 1, totalPages: 4 },
};

// ── Payroll ───────────────────────────────────────────────────────────────────

export const DUMMY_PAYROLL_DASH = {
  currentMonthRuns: 2, pendingApproval: 1, disbursed: 1,
  totalEmployees: 312, grossPayroll: 6200000, netPayroll: 5460000,
  pf: 744000, esi: 186000,
};

export const DUMMY_PAYROLL_RUNS = {
  data: [
    { id: 'pr1', runNumber: 'PR-2026-06-01', month: 6, year: 2026, employmentType: 'CONTRACT',  status: 'PENDING_APPROVAL', employeeCount: 248, grossAmount: 4960000, netAmount: 4365000, createdAt: '2026-06-18T10:00:00Z' },
    { id: 'pr2', runNumber: 'PR-2026-06-02', month: 6, year: 2026, employmentType: 'PERMANENT', status: 'APPROVED',         employeeCount: 64,  grossAmount: 1240000, netAmount: 1092000, createdAt: '2026-06-18T11:00:00Z' },
    { id: 'pr3', runNumber: 'PR-2026-05-01', month: 5, year: 2026, employmentType: 'CONTRACT',  status: 'PAID',             employeeCount: 244, grossAmount: 4880000, netAmount: 4295000, createdAt: '2026-05-18T10:00:00Z' },
    { id: 'pr4', runNumber: 'PR-2026-05-02', month: 5, year: 2026, employmentType: 'PERMANENT', status: 'PAID',             employeeCount: 62,  grossAmount: 1210000, netAmount: 1065000, createdAt: '2026-05-18T11:00:00Z' },
  ],
  meta: { total: 18, page: 1, totalPages: 2 },
};

export const DUMMY_SALARY_STRUCTURES = {
  data: [
    { id: 's1', employeeName: 'Ravi Kumar Singh',  employeeCode: 'EMP-001', department: 'Operations', employmentType: 'CONTRACT',  basic: 12000, da: 1200, hra: 2400, specialAllowance: 1400, grossSalary: 17000, effectiveFrom: '2026-04-01' },
    { id: 's2', employeeName: 'Sunita Devi',        employeeCode: 'EMP-002', department: 'Facilities', employmentType: 'PERMANENT', basic: 18000, da: 1800, hra: 3600, specialAllowance: 2600, grossSalary: 26000, effectiveFrom: '2026-04-01' },
    { id: 's3', employeeName: 'Manoj Yadav',        employeeCode: 'EMP-003', department: 'Operations', employmentType: 'CONTRACT',  basic: 13000, da: 1300, hra: 2600, specialAllowance: 1600, grossSalary: 18500, effectiveFrom: '2026-01-01' },
    { id: 's4', employeeName: 'Priya Sharma',       employeeCode: 'EMP-004', department: 'Safety',     employmentType: 'PERMANENT', basic: 22000, da: 2200, hra: 4400, specialAllowance: 3400, grossSalary: 32000, effectiveFrom: '2026-04-01' },
    { id: 's5', employeeName: 'Deepak Gupta',       employeeCode: 'EMP-005', department: 'Operations', employmentType: 'CONTRACT',  basic: 11500, da: 1150, hra: 2300, specialAllowance: 1050, grossSalary: 16000, effectiveFrom: '2026-04-01' },
  ],
  meta: { total: 312, page: 1, totalPages: 21 },
};

// ── Work Orders (web) detail ──────────────────────────────────────────────────

export const DUMMY_WO_DETAIL = DUMMY_WO_DATA.data[0];

// ── Documents ─────────────────────────────────────────────────────────────────

export const DUMMY_DOCUMENTS_DATA = {
  data: [
    { id: 'doc1', name: 'Employment Contract — Ravi Kumar Singh',  fileName: 'contract-ravi-kumar.pdf',  fileType: 'pdf',  fileSize: 245760,  documentType: 'CONTRACT',    description: 'Permanent employment contract',     tags: 'HR,Legal',     createdAt: '2026-06-01T10:00:00Z' },
    { id: 'doc2', name: 'Salary Slip — May 2026',                  fileName: 'payslip-may-2026.pdf',    fileType: 'pdf',  fileSize: 102400,  documentType: 'PAYSLIP',     description: 'Monthly salary slip',               tags: 'Payroll',      createdAt: '2026-06-05T10:00:00Z' },
    { id: 'doc3', name: 'NHAI Work Order WO-2026-0018',            fileName: 'nhai-wo-2026-0018.pdf',   fileType: 'pdf',  fileSize: 512000,  documentType: 'TENDER',      description: 'Security deployment work order',    tags: 'Tender,NHAI',  createdAt: '2026-05-20T10:00:00Z' },
    { id: 'doc4', name: 'Aadhaar Card — Sunita Devi',              fileName: 'aadhaar-sunita.jpg',      fileType: 'jpg',  fileSize: 180224,  documentType: 'IDENTITY',    description: 'Government issued ID',              tags: 'KYC',          createdAt: '2026-05-15T10:00:00Z' },
    { id: 'doc5', name: 'Security Training Certificate',           fileName: 'cert-security-2026.pdf',  fileType: 'pdf',  fileSize: 163840,  documentType: 'CERTIFICATE', description: 'PSARA training certificate',        tags: 'Training',     createdAt: '2026-04-10T10:00:00Z' },
    { id: 'doc6', name: 'Invoice INV-2026-0042',                   fileName: 'invoice-2026-0042.pdf',   fileType: 'pdf',  fileSize: 98304,   documentType: 'INVOICE',     description: 'NHAI billing invoice June 2026',    tags: 'Billing,NHAI', createdAt: '2026-06-01T10:00:00Z' },
    { id: 'doc7', name: 'GST Registration Certificate',            fileName: 'gst-certificate.pdf',     fileType: 'pdf',  fileSize: 204800,  documentType: 'CERTIFICATE', description: 'Company GST registration',           tags: 'Legal',        createdAt: '2024-01-15T10:00:00Z' },
    { id: 'doc8', name: 'Site Inspection Report — AAI Terminal',   fileName: 'inspection-aai-jun26.docx', fileType: 'docx', fileSize: 307200, documentType: 'OTHER',      description: 'Monthly inspection summary',        tags: 'Operations',   createdAt: '2026-06-10T10:00:00Z' },
  ],
  meta: { total: 48, page: 1, totalPages: 4, limit: 12 },
};

// ── Workflows ─────────────────────────────────────────────────────────────────

export const DUMMY_APPROVALS = [
  { id: 'ap1', workflowInstanceId: 'wi1', createdAt: '2026-06-18T09:00:00Z', instance: { workflow: { name: 'Payroll Approval', module: 'PAYROLL' }, entityType: 'PayrollRun', entityId: 'pr1', status: 'PENDING' } },
  { id: 'ap2', workflowInstanceId: 'wi2', createdAt: '2026-06-17T14:00:00Z', instance: { workflow: { name: 'Leave Approval',    module: 'LEAVE'   }, entityType: 'LeaveRequest', entityId: 'lr1', status: 'PENDING' } },
  { id: 'ap3', workflowInstanceId: 'wi3', createdAt: '2026-06-16T11:00:00Z', instance: { workflow: { name: 'Invoice Approval',  module: 'BILLING' }, entityType: 'Invoice',      entityId: 'i4',  status: 'PENDING' } },
];

export const DUMMY_WORKFLOW_DEFINITIONS = [
  { id: 'wd1', name: 'Payroll Approval',       module: 'PAYROLL',     description: 'Two-step payroll approval before disbursement', isActive: true,  steps: [{ name: 'HR Review', approverRole: 'hr_manager', order: 1 }, { name: 'Finance Approval', approverRole: 'finance_manager', order: 2 }] },
  { id: 'wd2', name: 'Leave Approval',         module: 'LEAVE',       description: 'Supervisor approval for leave requests',        isActive: true,  steps: [{ name: 'Supervisor Review', approverRole: 'site_supervisor', order: 1 }] },
  { id: 'wd3', name: 'Invoice Approval',       module: 'BILLING',     description: 'Finance manager approval for new invoices',     isActive: true,  steps: [{ name: 'Finance Review', approverRole: 'finance_manager', order: 1 }] },
  { id: 'wd4', name: 'Tender Approval',        module: 'TENDER',      description: 'Multi-level tender submission approval',        isActive: true,  steps: [{ name: 'Operations Review', approverRole: 'operations_manager', order: 1 }, { name: 'Director Approval', approverRole: 'company_owner', order: 2 }] },
  { id: 'wd5', name: 'Asset Assignment',       module: 'ASSETS',      description: 'Approval required for asset assignment',        isActive: false, steps: [{ name: 'Manager Approval', approverRole: 'hr_manager', order: 1 }] },
  { id: 'wd6', name: 'Compliance Challan',     module: 'COMPLIANCE',  description: 'Finance sign-off for compliance challans',      isActive: true,  steps: [{ name: 'Finance Approval', approverRole: 'finance_manager', order: 1 }] },
];
