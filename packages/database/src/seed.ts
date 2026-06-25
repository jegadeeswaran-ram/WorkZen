import {
  PrismaClient, SubscriptionPlan,
  TenderStatus, ContractType, ClientType,
  EmployeeStatus, Gender, MaritalStatus,
  ComplianceType, ComplianceStatus,
  InvoiceStatus, InvoiceType, PaymentStatus,
  AssetCategory, AssetStatus,
  DeploymentStatus, ShiftType,
  AttendanceStatus, AttendanceMethod,
  PayrollStatus, RecruitmentStatus, CandidateStatus,
  WorkflowStatus, AccountType,
  DocumentType, LeaveCategory, LeaveStatus,
  ComplaintCategory, ComplaintSeverity, ComplaintStatus,
} from '@prisma/client';
import { Decimal } from '@prisma/client/runtime/library';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

// ─── Permissions & Role config (unchanged) ───────────────────────────────────

const SYSTEM_PERMISSIONS = [
  'tender:read', 'tender:write', 'tender:delete',
  'work_order:read', 'work_order:write',
  'client:read', 'client:write', 'client:delete',
  'employee:read', 'employee:write', 'employee:delete', 'employee:salary_view',
  'recruitment:read', 'recruitment:write',
  'interview:read', 'interview:write',
  'offer_letter:read', 'offer_letter:write',
  'deployment:read', 'deployment:write',
  'roster:read', 'roster:write',
  'attendance:read', 'attendance:write', 'attendance:mark',
  'leave:read', 'leave:write', 'leave:approve',
  'payroll:read', 'payroll:write', 'payroll:approve', 'payroll:run',
  'payslip:read',
  'compliance:read', 'compliance:write',
  'invoice:read', 'invoice:write', 'invoice:approve',
  'payment:read', 'payment:write',
  'finance:read', 'finance:write', 'finance:approve',
  'asset:read', 'asset:write', 'asset:assign',
  'document:read', 'document:write', 'document:delete',
  'workflow:read', 'approval:approve',
  'report:read', 'report:export',
  'settings:read', 'settings:write',
  'user:read', 'user:write', 'user:delete',
  'role:read', 'role:write',
  'audit:read',
];

const ROLE_PERMISSIONS: Record<string, string[]> = {
  SUPER_ADMIN: SYSTEM_PERMISSIONS,
  COMPANY_OWNER: SYSTEM_PERMISSIONS,
  HR_MANAGER: [
    'employee:read', 'employee:write', 'recruitment:read', 'recruitment:write',
    'interview:read', 'interview:write', 'offer_letter:read', 'offer_letter:write',
    'attendance:read', 'leave:read', 'leave:approve', 'leave:write',
    'payroll:read', 'document:read', 'document:write', 'report:read',
  ],
  TENDER_MANAGER: [
    'tender:read', 'tender:write', 'work_order:read', 'work_order:write',
    'client:read', 'document:read', 'document:write', 'report:read',
  ],
  OPERATIONS_MANAGER: [
    'tender:read', 'client:read', 'deployment:read', 'deployment:write',
    'roster:read', 'roster:write', 'attendance:read', 'report:read',
  ],
  PAYROLL_MANAGER: [
    'employee:read', 'employee:salary_view', 'payroll:read', 'payroll:write',
    'payroll:run', 'payroll:approve', 'payslip:read', 'compliance:read',
    'compliance:write', 'report:read', 'report:export',
  ],
  FINANCE_MANAGER: [
    'invoice:read', 'invoice:write', 'invoice:approve',
    'payment:read', 'payment:write', 'finance:read', 'finance:write',
    'payroll:read', 'compliance:read', 'report:read', 'report:export',
  ],
  COMPLIANCE_OFFICER: [
    'compliance:read', 'compliance:write', 'employee:read',
    'payroll:read', 'document:read', 'document:write', 'report:read',
  ],
  RECRUITER: [
    'recruitment:read', 'recruitment:write', 'interview:read', 'interview:write',
    'offer_letter:read', 'offer_letter:write', 'document:read',
  ],
  SITE_SUPERVISOR: [
    'employee:read', 'attendance:read', 'attendance:mark',
    'leave:read', 'leave:write', 'leave:approve', 'deployment:read', 'roster:read',
    'complaint:read', 'complaint:write', 'activity-log:read', 'activity-log:write',
  ],
  FIELD_OFFICER: ['attendance:mark', 'attendance:read', 'deployment:read', 'roster:read'],
  CLIENT_USER: ['invoice:read', 'deployment:read', 'report:read'],
  EMPLOYEE: ['attendance:mark', 'leave:read', 'leave:write', 'payslip:read', 'document:read'],
};

// ─── Site Employee Name Arrays ────────────────────────────────────────────────

const firstNames = ['Arun','Priya','Rahul','Sunita','Manoj','Kavita','Deepak','Neha','Vijay','Anita','Suresh','Pooja','Amit','Rekha','Ravi'];
const lastNames = ['Sharma','Kumar','Singh','Verma','Patel','Gupta','Yadav','Mishra','Tiwari','Joshi','Shah','Nair','Reddy','Pillai','Das'];

// ─── Helpers ──────────────────────────────────────────────────────────────────

function d(dateStr: string) { return new Date(dateStr); }

async function main() {
  console.log('🌱 Seeding WorkZen database with comprehensive demo data...');

  // ── 1. Permissions ──────────────────────────────────────────────────────────
  console.log('Creating permissions...');
  await prisma.permission.createMany({
    data: SYSTEM_PERMISSIONS.map(p => {
      const [resource, action] = p.split(':');
      return { resource, action, description: `${action} on ${resource}` };
    }),
    skipDuplicates: true,
  });

  // ── 2. Roles ────────────────────────────────────────────────────────────────
  console.log('Creating roles...');
  for (const [roleName, permissions] of Object.entries(ROLE_PERMISSIONS)) {
    let role = await prisma.role.findFirst({ where: { tenantId: null, name: roleName } });
    if (!role) {
      role = await prisma.role.create({
        data: { name: roleName, displayName: roleName.replace(/_/g, ' '), description: `${roleName.replace(/_/g, ' ')} role`, isSystem: true },
      });
    }
    const permPairs = permissions.map(p => { const [resource, action] = p.split(':'); return { resource, action }; });
    const perms = await prisma.permission.findMany({ where: { OR: permPairs } });
    await prisma.rolePermission.createMany({
      data: perms.map(p => ({ roleId: role!.id, permissionId: p.id })),
      skipDuplicates: true,
    });
  }

  // ── 3. Demo Tenant ──────────────────────────────────────────────────────────
  console.log('Creating demo tenant...');
  const tenant = await prisma.tenant.upsert({
    where: { slug: 'demo' },
    update: {},
    create: {
      name: 'WorkZen Demo Co.',
      slug: 'demo',
      plan: SubscriptionPlan.ENTERPRISE,
      status: 'ACTIVE',
      maxEmployees: 10000,
    },
  });
  const T = tenant.id;

  // ── 4. Core users ───────────────────────────────────────────────────────────
  console.log('Creating users...');
  const hashedPass = await bcrypt.hash('Admin@123!', 12);

  const superAdmin = await prisma.user.upsert({
    where: { tenantId_email: { tenantId: T, email: 'admin@workzen.in' } },
    update: {},
    create: { tenantId: T, firstName: 'Super', lastName: 'Admin', email: 'admin@workzen.in', passwordHash: hashedPass, status: 'ACTIVE', emailVerifiedAt: new Date() },
  });
  const hrUser = await prisma.user.upsert({
    where: { tenantId_email: { tenantId: T, email: 'hr@workzen.in' } },
    update: {},
    create: { tenantId: T, firstName: 'Priya', lastName: 'Sharma', email: 'hr@workzen.in', passwordHash: hashedPass, status: 'ACTIVE', emailVerifiedAt: new Date() },
  });
  const payrollUser = await prisma.user.upsert({
    where: { tenantId_email: { tenantId: T, email: 'payroll@workzen.in' } },
    update: {},
    create: { tenantId: T, firstName: 'Rajan', lastName: 'Verma', email: 'payroll@workzen.in', passwordHash: hashedPass, status: 'ACTIVE', emailVerifiedAt: new Date() },
  });
  const financeUser = await prisma.user.upsert({
    where: { tenantId_email: { tenantId: T, email: 'finance@workzen.in' } },
    update: {},
    create: { tenantId: T, firstName: 'Kavita', lastName: 'Nair', email: 'finance@workzen.in', passwordHash: hashedPass, status: 'ACTIVE', emailVerifiedAt: new Date() },
  });
  await prisma.user.upsert({
    where: { tenantId_email: { tenantId: T, email: 'supervisor@workzen.in' } },
    update: {},
    create: { tenantId: T, firstName: 'Arjun', lastName: 'Singh', email: 'supervisor@workzen.in', passwordHash: hashedPass, status: 'ACTIVE', emailVerifiedAt: new Date() },
  });

  for (const [name, email] of [
    ['SUPER_ADMIN', 'admin@workzen.in'], ['HR_MANAGER', 'hr@workzen.in'],
    ['PAYROLL_MANAGER', 'payroll@workzen.in'], ['FINANCE_MANAGER', 'finance@workzen.in'],
    ['SITE_SUPERVISOR', 'supervisor@workzen.in'],
  ]) {
    const user = await prisma.user.findFirst({ where: { tenantId: T, email } });
    const role = await prisma.role.findFirst({ where: { name } });
    if (user && role) {
      await prisma.userRole.upsert({
        where: { userId_roleId: { userId: user.id, roleId: role.id } },
        update: {},
        create: { userId: user.id, roleId: role.id },
      });
    }
  }

  // ── 4b. Site Supervisor Users (one per named site) ──────────────────────────
  console.log('Creating site supervisor users...');
  const supervisorUsers = await Promise.all([
    prisma.user.upsert({
      where: { tenantId_email: { tenantId: T, email: 'supervisor.ggn@workzen.in' } },
      update: {},
      create: {
        tenantId: T,
        email: 'supervisor.ggn@workzen.in',
        passwordHash: await bcrypt.hash('Supervisor@123', 10),
        firstName: 'Vikram',
        lastName: 'Patel',
        status: 'ACTIVE',
        emailVerifiedAt: new Date(),
      },
    }),
    prisma.user.upsert({
      where: { tenantId_email: { tenantId: T, email: 'supervisor.del@workzen.in' } },
      update: {},
      create: {
        tenantId: T,
        email: 'supervisor.del@workzen.in',
        passwordHash: await bcrypt.hash('Supervisor@123', 10),
        firstName: 'Anita',
        lastName: 'Verma',
        status: 'ACTIVE',
        emailVerifiedAt: new Date(),
      },
    }),
    prisma.user.upsert({
      where: { tenantId_email: { tenantId: T, email: 'supervisor.fbd@workzen.in' } },
      update: {},
      create: {
        tenantId: T,
        email: 'supervisor.fbd@workzen.in',
        passwordHash: await bcrypt.hash('Supervisor@123', 10),
        firstName: 'Suresh',
        lastName: 'Yadav',
        status: 'ACTIVE',
        emailVerifiedAt: new Date(),
      },
    }),
  ]);
  const [supGgn, supDel, supFbd] = supervisorUsers;

  // Assign SITE_SUPERVISOR role to new supervisor users
  const siteSupervisorRole = await prisma.role.findFirst({ where: { name: 'SITE_SUPERVISOR' } });
  if (siteSupervisorRole) {
    for (const supUser of supervisorUsers) {
      await prisma.userRole.upsert({
        where: { userId_roleId: { userId: supUser.id, roleId: siteSupervisorRole.id } },
        update: {},
        create: { userId: supUser.id, roleId: siteSupervisorRole.id },
      });
    }
  }

  // ── 5. Departments ──────────────────────────────────────────────────────────
  console.log('Creating departments & designations...');
  const deptData = [
    { name: 'Security Services', code: 'SEC', description: 'Armed and unarmed security deployment' },
    { name: 'Housekeeping Services', code: 'HSK', description: 'Sanitation and facility management' },
    { name: 'Technical Operations', code: 'TEC', description: 'Electrical, mechanical and IT support' },
    { name: 'Administration', code: 'ADM', description: 'HR, finance and admin functions' },
  ];
  const departments: Record<string, string> = {};
  for (const d of deptData) {
    const dept = await prisma.department.upsert({
      where: { tenantId_name: { tenantId: T, name: d.name } },
      update: {},
      create: { tenantId: T, ...d },
    });
    departments[d.code] = dept.id;
  }

  // ── 6. Designations ─────────────────────────────────────────────────────────
  const desgData = [
    { name: 'Security Guard', code: 'SG', level: 1 },
    { name: 'Head Guard', code: 'HG', level: 2 },
    { name: 'Shift Incharge', code: 'SI', level: 3 },
    { name: 'Housekeeping Staff', code: 'HKS', level: 1 },
    { name: 'Housekeeping Supervisor', code: 'HKP', level: 2 },
    { name: 'Technical Operator', code: 'TO', level: 2 },
    { name: 'Site Incharge', code: 'SIC', level: 4 },
    { name: 'HR Executive', code: 'HRE', level: 2 },
  ];
  const designations: Record<string, string> = {};
  for (const d of desgData) {
    const desg = await prisma.designation.upsert({
      where: { tenantId_name: { tenantId: T, name: d.name } },
      update: {},
      create: { tenantId: T, ...d },
    });
    designations[d.code] = desg.id;
  }

  // ── 7. Leave Types ──────────────────────────────────────────────────────────
  const leaveTypes: Record<string, string> = {};
  for (const lt of [
    { name: 'Casual Leave', code: 'CL', category: LeaveCategory.CASUAL, maxDays: 12, isPaid: true },
    { name: 'Sick Leave', code: 'SL', category: LeaveCategory.SICK, maxDays: 10, isPaid: true },
    { name: 'Earned Leave', code: 'EL', category: LeaveCategory.EARNED, maxDays: 20, isPaid: true, isCarryForward: true },
  ]) {
    const existing = await prisma.leaveType.findFirst({ where: { tenantId: T, code: lt.code } });
    if (!existing) {
      const ltype = await prisma.leaveType.create({ data: { tenantId: T, ...lt } });
      leaveTypes[lt.code] = ltype.id;
    } else {
      leaveTypes[lt.code] = existing.id;
    }
  }

  // ── 8. Clients ──────────────────────────────────────────────────────────────
  console.log('Creating clients...');
  const clientData = [
    {
      clientCode: 'CLI-001', name: 'National Highways Authority of India', shortName: 'NHAI',
      clientType: ClientType.GOVERNMENT_DEPARTMENT, gstin: '07AAFCN3127Q1Z4', pan: 'AAFCN3127Q',
      address: { line1: 'G-5/6, Sector 10, Dwarka', city: 'New Delhi', state: 'Delhi', pincode: '110075' },
      paymentTerms: 45, creditLimit: 50000000,
    },
    {
      clientCode: 'CLI-002', name: 'Delhi Metro Rail Corporation', shortName: 'DMRC',
      clientType: ClientType.PSU, gstin: '07AABCD1234E1Z5', pan: 'AABCD1234E',
      address: { line1: 'Metro Bhawan, Fire Brigade Lane, Barakhamba Road', city: 'New Delhi', state: 'Delhi', pincode: '110001' },
      paymentTerms: 30, creditLimit: 30000000,
    },
    {
      clientCode: 'CLI-003', name: 'Airports Authority of India', shortName: 'AAI',
      clientType: ClientType.PSU, gstin: '07AACCA0782E1Z0', pan: 'AACCA0782E',
      address: { line1: 'Rajiv Gandhi Bhavan, Safdarjung Airport', city: 'New Delhi', state: 'Delhi', pincode: '110003' },
      paymentTerms: 30, creditLimit: 40000000,
    },
    {
      clientCode: 'CLI-004', name: 'North Delhi Municipal Corporation', shortName: 'NDMC',
      clientType: ClientType.GOVERNMENT_DEPARTMENT, gstin: '07AAACN0317J1Z5', pan: 'AAACN0317J',
      address: { line1: 'Dr. S.P. Mukherjee Civic Centre, Jawaharlal Nehru Marg', city: 'New Delhi', state: 'Delhi', pincode: '110002' },
      paymentTerms: 60, creditLimit: 15000000,
    },
    {
      clientCode: 'CLI-005', name: 'GAIL India Limited', shortName: 'GAIL',
      clientType: ClientType.PSU, gstin: '07AAACG0113D1Z3', pan: 'AAACG0113D',
      address: { line1: '16, Bhikaiji Cama Place', city: 'New Delhi', state: 'Delhi', pincode: '110066' },
      paymentTerms: 30, creditLimit: 25000000,
    },
  ];
  const clients: Record<string, string> = {};
  for (const c of clientData) {
    const existing = await prisma.client.findFirst({ where: { tenantId: T, clientCode: c.clientCode } });
    if (!existing) {
      const client = await prisma.client.create({ data: { tenantId: T, ...c, createdBy: superAdmin.id } });
      clients[c.clientCode] = client.id;
    } else {
      clients[c.clientCode] = existing.id;
    }
  }

  // ── 9. Tenders ──────────────────────────────────────────────────────────────
  console.log('Creating tenders...');
  const tenderData = [
    {
      tenderNumber: 'TND-2024-001', tenderName: 'NHAI NH-48 Security Services Contract',
      departmentId: clients['CLI-001'], tenderValue: 12500000, estimatedValue: 13000000,
      bidDate: d('2024-03-15'), awardDate: d('2024-06-01'), startDate: d('2024-07-01'), endDate: d('2026-06-30'),
      status: TenderStatus.ACTIVE, requiredEmployees: 45, emdAmount: 250000,
      description: 'Provision of security guards at 5 toll plazas on NH-48 corridor',
      contractType: ContractType.FIXED_TERM,
    },
    {
      tenderNumber: 'TND-2024-002', tenderName: 'DMRC Metro Station Housekeeping',
      departmentId: clients['CLI-002'], tenderValue: 8750000, estimatedValue: 9000000,
      bidDate: d('2024-04-10'), awardDate: d('2024-07-15'), startDate: d('2024-08-01'), endDate: d('2025-07-31'),
      status: TenderStatus.ACTIVE, requiredEmployees: 30, emdAmount: 175000,
      description: 'Housekeeping services for 10 metro stations on Blue Line',
      contractType: ContractType.FIXED_TERM,
    },
    {
      tenderNumber: 'TND-2024-003', tenderName: 'AAI Terminal-3 Integrated Facility Management',
      departmentId: clients['CLI-003'], tenderValue: 22000000, estimatedValue: 23000000,
      bidDate: d('2024-05-20'), awardDate: d('2024-08-30'), startDate: d('2024-10-01'), endDate: d('2027-09-30'),
      status: TenderStatus.ACTIVE, requiredEmployees: 80, emdAmount: 440000,
      description: 'Security, housekeeping and technical support at IGI Terminal 3',
      contractType: ContractType.FIXED_TERM,
    },
    {
      tenderNumber: 'TND-2024-004', tenderName: 'NDMC Ward Office Sanitation Services',
      departmentId: clients['CLI-004'], tenderValue: 3200000, estimatedValue: 3500000,
      bidDate: d('2024-01-20'), awardDate: d('2024-03-01'), startDate: d('2024-04-01'), endDate: d('2025-03-31'),
      status: TenderStatus.ACTIVE, requiredEmployees: 20, emdAmount: 64000,
      description: 'Sanitation and cleaning services for 8 ward offices',
      contractType: ContractType.FIXED_TERM,
    },
    {
      tenderNumber: 'TND-2025-001', tenderName: 'GAIL Piyala Compressor Station Security',
      departmentId: clients['CLI-005'], tenderValue: 5800000, estimatedValue: 6200000,
      bidDate: d('2025-01-10'), awardDate: d('2025-03-01'), startDate: d('2025-04-01'), endDate: d('2027-03-31'),
      status: TenderStatus.ACTIVE, requiredEmployees: 18, emdAmount: 116000,
      description: 'Round-the-clock security at GAIL compressor stations',
      contractType: ContractType.FIXED_TERM,
    },
  ];
  const tenders: Record<string, string> = {};
  for (const t of tenderData) {
    const existing = await prisma.tender.findFirst({ where: { tenantId: T, tenderNumber: t.tenderNumber } });
    if (!existing) {
      const tender = await prisma.tender.create({ data: { tenantId: T, ...t, createdBy: superAdmin.id } });
      tenders[t.tenderNumber] = tender.id;
    } else {
      tenders[t.tenderNumber] = existing.id;
    }
  }

  // ── 10. Work Orders ─────────────────────────────────────────────────────────
  const workOrderData = [
    { workOrderNo: 'WO-2024-001', tenderId: tenders['TND-2024-001'], title: 'NH-48 Security Phase 1', startDate: d('2024-07-01'), endDate: d('2025-06-30'), value: 6000000, requiredCount: 45 },
    { workOrderNo: 'WO-2024-002', tenderId: tenders['TND-2024-002'], title: 'Metro Blue Line HK Contract', startDate: d('2024-08-01'), endDate: d('2025-07-31'), value: 8750000, requiredCount: 30 },
    { workOrderNo: 'WO-2024-003', tenderId: tenders['TND-2024-003'], title: 'T3 Security & HK Annual', startDate: d('2024-10-01'), endDate: d('2025-09-30'), value: 7200000, requiredCount: 80 },
    { workOrderNo: 'WO-2024-004', tenderId: tenders['TND-2024-004'], title: 'NDMC Sanitation Q1-Q4', startDate: d('2024-04-01'), endDate: d('2025-03-31'), value: 3200000, requiredCount: 20 },
    { workOrderNo: 'WO-2025-001', tenderId: tenders['TND-2025-001'], title: 'GAIL Piyala Security Cover', startDate: d('2025-04-01'), endDate: d('2026-03-31'), value: 2800000, requiredCount: 18 },
  ];
  const workOrders: Record<string, string> = {};
  for (const wo of workOrderData) {
    const existing = await prisma.workOrder.findFirst({ where: { tenantId: T, workOrderNo: wo.workOrderNo } });
    if (!existing) {
      const order = await prisma.workOrder.create({ data: { tenantId: T, ...wo, status: 'ACTIVE', createdBy: superAdmin.id } });
      workOrders[wo.workOrderNo] = order.id;
    } else {
      workOrders[wo.workOrderNo] = existing.id;
    }
  }

  // ── 11. Sites ───────────────────────────────────────────────────────────────
  console.log('Creating sites & shifts...');
  const siteData = [
    { code: 'SITE-001', name: 'NHAI NH-48 Toll Plaza Gurugram', address: { city: 'Gurugram', state: 'Haryana', pincode: '122001' }, contactName: 'Suresh Kumar', contactPhone: '9810001001' },
    { code: 'SITE-002', name: 'DMRC Central Secretariat Station', address: { city: 'New Delhi', state: 'Delhi', pincode: '110001' }, contactName: 'Amit Singh', contactPhone: '9810002002' },
    { code: 'SITE-003', name: 'IGI Airport Terminal 3', address: { city: 'New Delhi', state: 'Delhi', pincode: '110037' }, contactName: 'Radhika Mehta', contactPhone: '9810003003' },
    { code: 'SITE-004', name: 'NDMC Sarojini Nagar Ward Office', address: { city: 'New Delhi', state: 'Delhi', pincode: '110023' }, contactName: 'Mohan Lal', contactPhone: '9810004004' },
    { code: 'SITE-005', name: 'GAIL Piyala Compressor Station', address: { city: 'Faridabad', state: 'Haryana', pincode: '121001' }, contactName: 'Vikram Joshi', contactPhone: '9810005005' },
  ];
  const sites: Record<string, string> = {};
  for (const s of siteData) {
    const existing = await prisma.site.findFirst({ where: { tenantId: T, code: s.code } });
    if (!existing) {
      const site = await prisma.site.create({ data: { tenantId: T, ...s } });
      sites[s.code] = site.id;
    } else {
      sites[s.code] = existing.id;
    }
  }

  // ── 11b. Named Sites (supervisor dashboard sites) ───────────────────────────
  const namedSites = await Promise.all([
    prisma.site.upsert({
      where: { tenantId_code: { tenantId: T, code: 'SITE-GGN-01' } },
      update: {},
      create: {
        tenantId: T,
        name: 'Gurugram Metro Station Complex',
        code: 'SITE-GGN-01',
        address: { street: 'Sector 29, Gurugram', city: 'Gurugram', state: 'Haryana', pincode: '122001' },
        latitude: new Decimal('28.4595'),
        longitude: new Decimal('77.0266'),
        geoFenceRadius: 150,
        contactName: 'Rajesh Kumar',
        contactPhone: '9876543210',
        isActive: true,
      },
    }),
    prisma.site.upsert({
      where: { tenantId_code: { tenantId: T, code: 'SITE-DEL-01' } },
      update: {},
      create: {
        tenantId: T,
        name: 'DMRC Rajiv Chowk Operations',
        code: 'SITE-DEL-01',
        address: { street: 'Connaught Place, New Delhi', city: 'New Delhi', state: 'Delhi', pincode: '110001' },
        latitude: new Decimal('28.6328'),
        longitude: new Decimal('77.2197'),
        geoFenceRadius: 200,
        contactName: 'Priya Sharma',
        contactPhone: '9876543211',
        isActive: true,
      },
    }),
    prisma.site.upsert({
      where: { tenantId_code: { tenantId: T, code: 'SITE-FBD-01' } },
      update: {},
      create: {
        tenantId: T,
        name: 'Faridabad Industrial Zone',
        code: 'SITE-FBD-01',
        address: { street: 'Sector 31, Faridabad', city: 'Faridabad', state: 'Haryana', pincode: '121003' },
        latitude: new Decimal('28.4089'),
        longitude: new Decimal('77.3178'),
        geoFenceRadius: 100,
        contactName: 'Amit Singh',
        contactPhone: '9876543212',
        isActive: true,
      },
    }),
  ]);
  const [siteGgn, siteDel, siteFbd] = namedSites;

  // Link supervisors to their sites (now that both sites and supervisors exist)
  await prisma.site.update({ where: { id: siteGgn.id }, data: { supervisorId: supGgn.id } });
  await prisma.site.update({ where: { id: siteDel.id }, data: { supervisorId: supDel.id } });
  await prisma.site.update({ where: { id: siteFbd.id }, data: { supervisorId: supFbd.id } });

  // ── 12. Shifts ──────────────────────────────────────────────────────────────
  const shifts: Record<string, string> = {};
  for (const s of [
    { name: 'General Shift', shiftType: ShiftType.GENERAL, startTime: '09:00', endTime: '18:00', breakDuration: 60 },
    { name: 'Morning Shift', shiftType: ShiftType.MORNING, startTime: '06:00', endTime: '14:00', breakDuration: 30 },
    { name: 'Night Shift', shiftType: ShiftType.NIGHT, startTime: '22:00', endTime: '06:00', breakDuration: 30, isNightShift: true },
  ]) {
    const existing = await prisma.shift.findFirst({ where: { tenantId: T, name: s.name } });
    if (!existing) {
      const shift = await prisma.shift.create({ data: { tenantId: T, ...s } });
      shifts[s.name] = shift.id;
    } else {
      shifts[s.name] = existing.id;
    }
  }

  // ── 13. Salary Components ───────────────────────────────────────────────────
  const salaryComponentData = [
    { name: 'Basic Salary', code: 'BASIC', type: 'EARNING', calculationType: 'FIXED', isSystemDefined: true },
    { name: 'Dearness Allowance', code: 'DA', type: 'EARNING', calculationType: 'PERCENTAGE', isSystemDefined: true },
    { name: 'House Rent Allowance', code: 'HRA', type: 'EARNING', calculationType: 'PERCENTAGE', isSystemDefined: true },
    { name: 'Special Allowance', code: 'SA', type: 'EARNING', calculationType: 'FIXED', isSystemDefined: false },
    { name: 'PF Employee', code: 'PF_EMP', type: 'DEDUCTION', calculationType: 'PERCENTAGE', isTaxable: false },
    { name: 'ESI Employee', code: 'ESI_EMP', type: 'DEDUCTION', calculationType: 'PERCENTAGE', isTaxable: false },
    { name: 'Professional Tax', code: 'PT', type: 'DEDUCTION', calculationType: 'FIXED', isTaxable: false },
  ];
  for (const sc of salaryComponentData) {
    const existing = await prisma.salaryComponent.findFirst({ where: { tenantId: T, code: sc.code } });
    if (!existing) {
      await prisma.salaryComponent.create({ data: { tenantId: T, ...sc } });
    }
  }

  // ── 14. Employees ───────────────────────────────────────────────────────────
  console.log('Creating employees...');
  // empType: PERMANENT = office/supervisory staff, CONTRACT = site/field workers
  const employeeRawData = [
    { code: 'EMP-001', fn: 'Rajesh',   ln: 'Kumar',   phone: '9811001001', gender: Gender.MALE,   dsg: 'HG',  dept: 'SEC', doj: '2022-03-15', basic: 18000, da: 3600, hra: 0,    sa: 1700, aadhaar: '234567890123', pan: 'AKRPK1234A', uan: '100234567890', empType: 'CONTRACT'  },
    { code: 'EMP-002', fn: 'Sunita',   ln: 'Devi',    phone: '9811002002', gender: Gender.FEMALE, dsg: 'HKP', dept: 'HSK', doj: '2022-05-01', basic: 16000, da: 3200, hra: 0,    sa: 1400, aadhaar: '345678901234', pan: 'BKNSD5678B', uan: '100345678901', empType: 'CONTRACT'  },
    { code: 'EMP-003', fn: 'Mohammad', ln: 'Raza',    phone: '9811003003', gender: Gender.MALE,   dsg: 'SG',  dept: 'SEC', doj: '2022-07-10', basic: 15000, da: 3000, hra: 0,    sa: 1250, aadhaar: '456789012345', pan: 'CMRMR9012C', uan: '100456789012', empType: 'CONTRACT'  },
    { code: 'EMP-004', fn: 'Kamla',    ln: 'Devi',    phone: '9811004004', gender: Gender.FEMALE, dsg: 'HKS', dept: 'HSK', doj: '2022-08-20', basic: 14500, da: 2900, hra: 0,    sa: 1175, aadhaar: '567890123456', pan: 'DLKMD3456D', uan: '100567890123', empType: 'CONTRACT'  },
    { code: 'EMP-005', fn: 'Deepak',   ln: 'Sharma',  phone: '9811005005', gender: Gender.MALE,   dsg: 'TO',  dept: 'TEC', doj: '2022-09-05', basic: 20000, da: 4000, hra: 3000, sa: 2000, aadhaar: '678901234567', pan: 'EPKDS7890E', uan: '100678901234', empType: 'PERMANENT' },
    { code: 'EMP-006', fn: 'Laxmi',    ln: 'Bai',     phone: '9811006006', gender: Gender.FEMALE, dsg: 'HKS', dept: 'HSK', doj: '2022-10-12', basic: 14000, da: 2800, hra: 0,    sa: 1100, aadhaar: '789012345678', pan: 'FRLB1234F',  uan: '100789012345', empType: 'CONTRACT'  },
    { code: 'EMP-007', fn: 'Suresh',   ln: 'Yadav',   phone: '9811007007', gender: Gender.MALE,   dsg: 'SG',  dept: 'SEC', doj: '2023-01-15', basic: 15000, da: 3000, hra: 0,    sa: 1250, aadhaar: '890123456789', pan: 'GSUMY5678G', uan: '100890123456', empType: 'CONTRACT'  },
    { code: 'EMP-008', fn: 'Asha',     ln: 'Kumari',  phone: '9811008008', gender: Gender.FEMALE, dsg: 'HKS', dept: 'HSK', doj: '2023-02-01', basic: 14000, da: 2800, hra: 0,    sa: 1100, aadhaar: '901234567890', pan: 'HAKAK9012H', uan: '100901234567', empType: 'CONTRACT'  },
    { code: 'EMP-009', fn: 'Ramesh',   ln: 'Gupta',   phone: '9811009009', gender: Gender.MALE,   dsg: 'SI',  dept: 'SEC', doj: '2023-03-20', basic: 22000, da: 4400, hra: 3300, sa: 2300, aadhaar: '012345678901', pan: 'IRAMG3456I', uan: '100012345678', empType: 'PERMANENT' },
    { code: 'EMP-010', fn: 'Geeta',    ln: 'Singh',   phone: '9811010010', gender: Gender.FEMALE, dsg: 'HKP', dept: 'HSK', doj: '2023-04-10', basic: 16000, da: 3200, hra: 0,    sa: 1400, aadhaar: '123456789012', pan: 'JGETS7890J', uan: '100123456789', empType: 'CONTRACT'  },
    { code: 'EMP-011', fn: 'Manoj',    ln: 'Tiwari',  phone: '9811011011', gender: Gender.MALE,   dsg: 'SG',  dept: 'SEC', doj: '2023-05-15', basic: 15000, da: 3000, hra: 0,    sa: 1250, aadhaar: '234561234561', pan: 'KMTMT1234K', uan: '100234561234', empType: 'CONTRACT'  },
    { code: 'EMP-012', fn: 'Poonam',   ln: 'Verma',   phone: '9811012012', gender: Gender.FEMALE, dsg: 'HRE', dept: 'ADM', doj: '2023-06-01', basic: 25000, da: 5000, hra: 3750, sa: 2750, aadhaar: '345612345612', pan: 'LPVPV5678L', uan: '100345612345', empType: 'PERMANENT' },
    { code: 'EMP-013', fn: 'Vinod',    ln: 'Pandey',  phone: '9811013013', gender: Gender.MALE,   dsg: 'SG',  dept: 'SEC', doj: '2023-07-20', basic: 15000, da: 3000, hra: 0,    sa: 1250, aadhaar: '456123456123', pan: 'MVNVP9012M', uan: '100456123456', empType: 'CONTRACT'  },
    { code: 'EMP-014', fn: 'Sarita',   ln: 'Mishra',  phone: '9811014014', gender: Gender.FEMALE, dsg: 'HKS', dept: 'HSK', doj: '2023-08-01', basic: 14000, da: 2800, hra: 0,    sa: 1100, aadhaar: '561234561234', pan: 'NSRSM3456N', uan: '100561234561', empType: 'CONTRACT'  },
    { code: 'EMP-015', fn: 'Anand',    ln: 'Raj',     phone: '9811015015', gender: Gender.MALE,   dsg: 'TO',  dept: 'TEC', doj: '2023-09-10', basic: 20000, da: 4000, hra: 3000, sa: 2000, aadhaar: '612345612345', pan: 'OANNR7890O', uan: '100612345612', empType: 'PERMANENT' },
    { code: 'EMP-016', fn: 'Rekha',    ln: 'Pal',     phone: '9811016016', gender: Gender.FEMALE, dsg: 'HKS', dept: 'HSK', doj: '2023-10-15', basic: 14000, da: 2800, hra: 0,    sa: 1100, aadhaar: '723456723456', pan: 'PRPRL1234P', uan: '100723456723', empType: 'CONTRACT'  },
    { code: 'EMP-017', fn: 'Ashok',    ln: 'Negi',    phone: '9811017017', gender: Gender.MALE,   dsg: 'SG',  dept: 'SEC', doj: '2023-11-01', basic: 15000, da: 3000, hra: 0,    sa: 1250, aadhaar: '834567834567', pan: 'QASHN5678Q', uan: '100834567834', empType: 'CONTRACT'  },
    { code: 'EMP-018', fn: 'Usha',     ln: 'Rani',    phone: '9811018018', gender: Gender.FEMALE, dsg: 'HKS', dept: 'HSK', doj: '2024-01-10', basic: 14500, da: 2900, hra: 0,    sa: 1175, aadhaar: '945678945678', pan: 'RUSUR9012R', uan: '100945678945', empType: 'CONTRACT'  },
    { code: 'EMP-019', fn: 'Kiran',    ln: 'Bala',    phone: '9811019019', gender: Gender.FEMALE, dsg: 'SIC', dept: 'SEC', doj: '2024-02-15', basic: 28000, da: 5600, hra: 4200, sa: 3200, aadhaar: '056789056789', pan: 'SKIRB3456S', uan: '100056789056', empType: 'PERMANENT' },
    { code: 'EMP-020', fn: 'Dilip',    ln: 'Shah',    phone: '9811020020', gender: Gender.MALE,   dsg: 'HG',  dept: 'SEC', doj: '2024-03-01', basic: 18000, da: 3600, hra: 0,    sa: 1700, aadhaar: '167890167890', pan: 'TDILS7890T', uan: '100167890167', empType: 'CONTRACT'  },
  ];

  const employees: Record<string, string> = {};
  for (const e of employeeRawData) {
    const existing = await prisma.employee.findFirst({ where: { tenantId: T, employeeCode: e.code } });
    if (!existing) {
      const gross = e.basic + e.da + e.hra + e.sa;
      const emp = await prisma.employee.create({
        data: {
          tenantId: T,
          employeeCode: e.code,
          firstName: e.fn,
          lastName: e.ln,
          personalPhone: e.phone,
          gender: e.gender,
          maritalStatus: MaritalStatus.SINGLE,
          dateOfBirth: d('1990-06-15'),
          joiningDate: d(e.doj),
          designationId: designations[e.dsg],
          departmentId: departments[e.dept],
          employmentType: e.empType ?? 'PERMANENT',
          status: EmployeeStatus.ACTIVE,
          aadhaarNumber: e.aadhaar,
          panNumber: e.pan,
          uanNumber: e.uan,
          pfNumber: `PF${e.uan}`,
          esiNumber: `ESI${e.uan}`,
          createdBy: superAdmin.id,
        },
      });
      employees[e.code] = emp.id;

      // Salary structure
      await prisma.salaryStructure.create({
        data: {
          tenantId: T,
          employeeId: emp.id,
          effectiveFrom: d(e.doj),
          basic: e.basic,
          da: e.da,
          hra: e.hra,
          specialAllowance: e.sa,
          grossSalary: gross,
          createdBy: superAdmin.id,
        },
      });

      // Bank detail
      await prisma.bankDetail.create({
        data: {
          tenantId: T,
          employeeId: emp.id,
          accountName: `${e.fn} ${e.ln}`,
          accountNumber: `${3800000000 + parseInt(e.code.split('-')[1])}`,
          ifscCode: 'SBIN0001234',
          bankName: 'State Bank of India',
          branchName: 'Connaught Place, New Delhi',
          accountType: 'SAVINGS',
          isPrimary: true,
          isVerified: true,
        },
      });
    } else {
      employees[e.code] = existing.id;
      // Update employment type on re-run
      await prisma.employee.update({ where: { id: existing.id }, data: { employmentType: e.empType ?? 'PERMANENT' } });
    }
  }

  // ── 15. Deployments ─────────────────────────────────────────────────────────
  console.log('Creating deployments...');
  const deploymentMap: Array<{ empCode: string; siteCode: string; woNo: string; tndNo: string; shift: string }> = [
    { empCode: 'EMP-001', siteCode: 'SITE-001', woNo: 'WO-2024-001', tndNo: 'TND-2024-001', shift: 'General Shift' },
    { empCode: 'EMP-003', siteCode: 'SITE-001', woNo: 'WO-2024-001', tndNo: 'TND-2024-001', shift: 'Morning Shift' },
    { empCode: 'EMP-007', siteCode: 'SITE-001', woNo: 'WO-2024-001', tndNo: 'TND-2024-001', shift: 'Night Shift' },
    { empCode: 'EMP-011', siteCode: 'SITE-001', woNo: 'WO-2024-001', tndNo: 'TND-2024-001', shift: 'General Shift' },
    { empCode: 'EMP-002', siteCode: 'SITE-002', woNo: 'WO-2024-002', tndNo: 'TND-2024-002', shift: 'General Shift' },
    { empCode: 'EMP-004', siteCode: 'SITE-002', woNo: 'WO-2024-002', tndNo: 'TND-2024-002', shift: 'Morning Shift' },
    { empCode: 'EMP-006', siteCode: 'SITE-002', woNo: 'WO-2024-002', tndNo: 'TND-2024-002', shift: 'General Shift' },
    { empCode: 'EMP-008', siteCode: 'SITE-002', woNo: 'WO-2024-002', tndNo: 'TND-2024-002', shift: 'Morning Shift' },
    { empCode: 'EMP-009', siteCode: 'SITE-003', woNo: 'WO-2024-003', tndNo: 'TND-2024-003', shift: 'General Shift' },
    { empCode: 'EMP-013', siteCode: 'SITE-003', woNo: 'WO-2024-003', tndNo: 'TND-2024-003', shift: 'Night Shift' },
    { empCode: 'EMP-015', siteCode: 'SITE-003', woNo: 'WO-2024-003', tndNo: 'TND-2024-003', shift: 'General Shift' },
    { empCode: 'EMP-014', siteCode: 'SITE-004', woNo: 'WO-2024-004', tndNo: 'TND-2024-004', shift: 'General Shift' },
    { empCode: 'EMP-016', siteCode: 'SITE-004', woNo: 'WO-2024-004', tndNo: 'TND-2024-004', shift: 'Morning Shift' },
    { empCode: 'EMP-017', siteCode: 'SITE-005', woNo: 'WO-2025-001', tndNo: 'TND-2025-001', shift: 'General Shift' },
    { empCode: 'EMP-020', siteCode: 'SITE-005', woNo: 'WO-2025-001', tndNo: 'TND-2025-001', shift: 'Night Shift' },
  ];
  const deployedEmpIds = new Set<string>();
  for (const dm of deploymentMap) {
    const empId = employees[dm.empCode];
    if (!empId) continue;
    const existing = await prisma.deployment.findFirst({ where: { tenantId: T, employeeId: empId, status: DeploymentStatus.ACTIVE } });
    if (!existing) {
      await prisma.deployment.create({
        data: {
          tenantId: T, employeeId: empId,
          tenderId: tenders[dm.tndNo],
          workOrderId: workOrders[dm.woNo],
          siteId: sites[dm.siteCode],
          shiftId: shifts[dm.shift],
          startDate: d('2024-07-01'),
          status: DeploymentStatus.ACTIVE,
          createdBy: superAdmin.id,
        },
      });
    }
    deployedEmpIds.add(empId);
  }

  // ── 15b. Site Employees (15 per named site = 45 total) ──────────────────────
  console.log('Creating 45 site employees with deployments...');
  const designationIds = Object.values(designations);
  const shiftIds = Object.values(shifts);
  const siteEmployeeData = [
    { site: siteGgn, prefix: 'GGN' },
    { site: siteDel, prefix: 'DEL' },
    { site: siteFbd, prefix: 'FBD' },
  ];

  for (const { site, prefix } of siteEmployeeData) {
    for (let i = 1; i <= 15; i++) {
      const emp = await prisma.employee.upsert({
        where: { tenantId_employeeCode: { tenantId: T, employeeCode: `EMP-${prefix}-${String(i).padStart(3, '0')}` } },
        update: {},
        create: {
          tenantId: T,
          employeeCode: `EMP-${prefix}-${String(i).padStart(3, '0')}`,
          firstName: firstNames[i % firstNames.length],
          lastName: lastNames[i % lastNames.length],
          personalPhone: `98765${prefix === 'GGN' ? '4' : prefix === 'DEL' ? '5' : '6'}${String(10000 + i)}`,
          gender: i % 3 === 0 ? Gender.FEMALE : Gender.MALE,
          dateOfBirth: new Date(`${1985 + (i % 15)}-${String((i % 12) + 1).padStart(2, '0')}-15`),
          joiningDate: new Date('2024-01-01'),
          designationId: designationIds[i % designationIds.length],
          departmentId: Object.values(departments)[i % Object.values(departments).length],
          employmentType: i % 4 === 0 ? 'PERMANENT' : 'CONTRACT',
          status: EmployeeStatus.ACTIVE,
          lifecycleStatus: 'DEPLOYED',
        },
      });

      // Deploy to site
      const existingDeploy = await prisma.deployment.findFirst({
        where: { tenantId: T, employeeId: emp.id, siteId: site.id, status: DeploymentStatus.ACTIVE },
      });
      if (!existingDeploy) {
        await prisma.deployment.create({
          data: {
            tenantId: T,
            employeeId: emp.id,
            siteId: site.id,
            shiftId: shiftIds[i % shiftIds.length],
            startDate: new Date('2024-01-15'),
            status: DeploymentStatus.ACTIVE,
            reportingManager: `EMP-${prefix}-001`,
          },
        });
      }
    }
  }

  // ── 16. Attendance Records (May 2026) ───────────────────────────────────────
  console.log('Creating attendance records...');
  const attendanceEmpCodes = ['EMP-001','EMP-002','EMP-003','EMP-004','EMP-005','EMP-007','EMP-009','EMP-011','EMP-013','EMP-015'];
  const existingAttCount = await prisma.attendanceRecord.count({ where: { tenantId: T } });
  if (existingAttCount === 0) {
    const attRecords: {
      tenantId: string; employeeId: string; date: Date;
      status: AttendanceStatus; method: AttendanceMethod;
      checkInTime: Date | null; checkOutTime: Date | null;
      workHours: number; isApproved: boolean; createdBy: string;
    }[] = [];
    for (let day = 1; day <= 26; day++) {
      const date = new Date(2026, 4, day); // May 2026
      const dow = date.getDay();
      if (dow === 0) continue; // skip Sundays
      for (const empCode of attendanceEmpCodes) {
        const empId = employees[empCode];
        if (!empId) continue;
        const rand = Math.random();
        let status: AttendanceStatus = AttendanceStatus.PRESENT;
        if (rand < 0.06) status = AttendanceStatus.ABSENT;
        else if (rand < 0.10) status = AttendanceStatus.HALF_DAY;
        attRecords.push({
          tenantId: T, employeeId: empId,
          date: new Date(2026, 4, day),
          status,
          method: AttendanceMethod.BIOMETRIC,
          checkInTime: status !== AttendanceStatus.ABSENT ? new Date(2026, 4, day, 8, 55 + Math.floor(Math.random() * 30)) : null,
          checkOutTime: status !== AttendanceStatus.ABSENT ? new Date(2026, 4, day, 17, 50 + Math.floor(Math.random() * 25)) : null,
          workHours: status === AttendanceStatus.PRESENT ? 8.5 : status === AttendanceStatus.HALF_DAY ? 4.25 : 0,
          isApproved: true,
          createdBy: superAdmin.id,
        });
      }
    }
    await prisma.attendanceRecord.createMany({ data: attRecords, skipDuplicates: true });
  }

  // ── 16b. 90-day Attendance (Apr-Jun 2026) for site employees ────────────────
  console.log('Creating 90-day attendance for site employees (Apr–Jun 2026)...');
  const allSiteEmployees = await prisma.employee.findMany({
    where: {
      tenantId: T,
      status: EmployeeStatus.ACTIVE,
      employeeCode: { in: [
        ...Array.from({ length: 15 }, (_, i) => `EMP-GGN-${String(i + 1).padStart(3, '0')}`),
        ...Array.from({ length: 15 }, (_, i) => `EMP-DEL-${String(i + 1).padStart(3, '0')}`),
        ...Array.from({ length: 15 }, (_, i) => `EMP-FBD-${String(i + 1).padStart(3, '0')}`),
      ] },
    },
    select: { id: true },
  });

  const attendanceStatuses: AttendanceStatus[] = [
    AttendanceStatus.PRESENT, AttendanceStatus.PRESENT, AttendanceStatus.PRESENT,
    AttendanceStatus.PRESENT, AttendanceStatus.PRESENT,
    AttendanceStatus.ABSENT, AttendanceStatus.HALF_DAY,
  ];
  const attStartDate = new Date('2026-04-01');
  const attEndDate = new Date('2026-06-30');

  for (const emp of allSiteEmployees) {
    const current = new Date(attStartDate);
    while (current <= attEndDate) {
      const dayOfWeek = current.getDay();
      if (dayOfWeek !== 0) { // skip Sundays
        const status = attendanceStatuses[Math.floor(Math.random() * attendanceStatuses.length)];
        const dateSnapshot = new Date(current);
        await prisma.attendanceRecord.upsert({
          where: { tenantId_employeeId_date: { tenantId: T, employeeId: emp.id, date: dateSnapshot } },
          update: {},
          create: {
            tenantId: T,
            employeeId: emp.id,
            date: dateSnapshot,
            status,
            method: AttendanceMethod.BIOMETRIC,
            checkInTime: status === AttendanceStatus.PRESENT
              ? new Date(new Date(dateSnapshot).setHours(9, Math.floor(Math.random() * 15), 0, 0))
              : undefined,
            checkOutTime: status === AttendanceStatus.PRESENT
              ? new Date(new Date(dateSnapshot).setHours(18, Math.floor(Math.random() * 15), 0, 0))
              : undefined,
            workHours: status === AttendanceStatus.PRESENT
              ? new Decimal('8.5')
              : status === AttendanceStatus.HALF_DAY
              ? new Decimal('4.0')
              : undefined,
            isApproved: true,
          },
        });
      }
      current.setDate(current.getDate() + 1);
    }
  }

  // ── 16c. Sample Site Complaints (2 per named site = 6 total) ─────────────────
  console.log('Creating sample site complaints...');
  const existingComplaintCount = await prisma.siteComplaint.count({ where: { tenantId: T } });
  if (existingComplaintCount === 0) {
    const complaintSamples = [
      { siteId: siteGgn.id, reportedById: supGgn.id, category: 'SAFETY', severity: 'HIGH', title: 'Faulty electrical panel near Gate 3', description: 'The electrical panel at Gate 3 has exposed wiring and poses shock risk to workers. Immediate repair needed.', status: 'OPEN' },
      { siteId: siteGgn.id, reportedById: supGgn.id, category: 'RESOURCE', severity: 'MEDIUM', title: 'Headcount shortage — 4 workers absent', description: 'Missing 4 security guards for night shift today. Need replacements urgently.', status: 'IN_REVIEW' },
      { siteId: siteDel.id, reportedById: supDel.id, category: 'CLIENT_SITE', severity: 'MEDIUM', title: 'Client requesting scope expansion without amendment', description: 'DMRC site manager asking for additional 10 guards without a revised work order.', status: 'ESCALATED' },
      { siteId: siteDel.id, reportedById: supDel.id, category: 'LABOUR_HR', severity: 'HIGH', title: 'Worker misconduct — verbal harassment', description: 'Guard EMP-DEL-007 reported to have verbally abused a colleague. Witness statements available.', status: 'IN_REVIEW' },
      { siteId: siteFbd.id, reportedById: supFbd.id, category: 'OPERATIONS', severity: 'CRITICAL', title: 'Crane breakdown halting operations', description: 'Primary crane broke down at 10:30 AM. Work stoppage affecting 12 workers. Repair ETA unknown.', status: 'OPEN' },
      { siteId: siteFbd.id, reportedById: supFbd.id, category: 'COMPLIANCE', severity: 'HIGH', title: 'Labour license expiry in 7 days', description: 'Contractor labour license expires on 2026-06-26. Renewal documents not yet submitted.', status: 'ESCALATED' },
    ];

    for (const c of complaintSamples) {
      await prisma.siteComplaint.create({
        data: {
          tenantId: T,
          siteId: c.siteId,
          reportedById: c.reportedById,
          category: c.category as ComplaintCategory,
          severity: c.severity as ComplaintSeverity,
          title: c.title,
          description: c.description,
          status: c.status as ComplaintStatus,
        },
      });
    }
  }

  // ── 16d. Sample Activity Logs (last 7 days per named site = 21 total) ────────
  console.log('Creating sample site activity logs...');
  const supervisorSiteMap = [
    { supervisorId: supGgn.id, siteId: siteGgn.id },
    { supervisorId: supDel.id, siteId: siteDel.id },
    { supervisorId: supFbd.id, siteId: siteFbd.id },
  ];

  for (const { supervisorId, siteId } of supervisorSiteMap) {
    for (let daysAgo = 0; daysAgo < 7; daysAgo++) {
      const logDate = new Date();
      logDate.setDate(logDate.getDate() - daysAgo);
      logDate.setHours(0, 0, 0, 0);
      await prisma.siteActivityLog.upsert({
        where: { tenantId_siteId_supervisorId_logDate: { tenantId: T, siteId, supervisorId, logDate } },
        update: {},
        create: {
          tenantId: T,
          siteId,
          supervisorId,
          logDate,
          workDone: daysAgo === 0
            ? 'Routine security patrol, access gate monitoring, visitor log updated'
            : 'Perimeter inspection, shift handover completed, equipment check done',
          headcount: 12 + (daysAgo % 3),
          hasIncident: daysAgo === 2,
          incidentType: daysAgo === 2 ? 'SAFETY' : null,
          incidentDesc: daysAgo === 2 ? 'Minor slip injury near washroom area. First aid administered. Worker sent home.' : null,
          photoUrls: [],
        },
      });
    }
  }

  // ── 17. Leave Requests ──────────────────────────────────────────────────────
  const leaveReqData = [
    { empCode: 'EMP-002', ltCode: 'CL', start: '2026-05-12', end: '2026-05-13', days: 2, reason: 'Family function', status: LeaveStatus.APPROVED },
    { empCode: 'EMP-005', ltCode: 'SL', start: '2026-05-06', end: '2026-05-07', days: 2, reason: 'Fever and cold', status: LeaveStatus.APPROVED },
    { empCode: 'EMP-009', ltCode: 'CL', start: '2026-05-20', end: '2026-05-20', days: 1, reason: 'Personal work', status: LeaveStatus.APPROVED },
    { empCode: 'EMP-012', ltCode: 'EL', start: '2026-06-15', end: '2026-06-19', days: 5, reason: 'Annual vacation', status: LeaveStatus.PENDING },
    { empCode: 'EMP-015', ltCode: 'SL', start: '2026-06-10', end: '2026-06-10', days: 1, reason: 'Medical appointment', status: LeaveStatus.PENDING },
  ];
  for (const lr of leaveReqData) {
    const empId = employees[lr.empCode];
    const ltId = leaveTypes[lr.ltCode];
    if (!empId || !ltId) continue;
    const existing = await prisma.leaveRequest.findFirst({ where: { tenantId: T, employeeId: empId, startDate: d(lr.start) } });
    if (!existing) {
      await prisma.leaveRequest.create({
        data: {
          tenantId: T, employeeId: empId, leaveTypeId: ltId,
          startDate: d(lr.start), endDate: d(lr.end), days: lr.days,
          reason: lr.reason, status: lr.status,
          approvedBy: lr.status === LeaveStatus.APPROVED ? superAdmin.id : undefined,
          approvedAt: lr.status === LeaveStatus.APPROVED ? new Date() : undefined,
          createdBy: empId,
        },
      });
    }
  }

  // ── 18. Leave Balances ──────────────────────────────────────────────────────
  const existingBalCount = await prisma.leaveBalance.count({ where: { tenantId: T } });
  if (existingBalCount === 0) {
    const balRecords: { tenantId: string; employeeId: string; leaveTypeId: string; year: number; allocated: number; balance: number }[] = [];
    for (const empCode of Object.keys(employees)) {
      const empId = employees[empCode];
      for (const [code, days] of [['CL', 12], ['SL', 10], ['EL', 20]]) {
        const ltId = leaveTypes[code as string];
        if (!ltId) continue;
        balRecords.push({ tenantId: T, employeeId: empId, leaveTypeId: ltId, year: 2026, allocated: days as number, balance: days as number });
      }
    }
    await prisma.leaveBalance.createMany({ data: balRecords, skipDuplicates: true });
  }

  // ── 19. Payroll Run (May 2026) ──────────────────────────────────────────────
  console.log('Creating payroll...');
  let payrollRun = await prisma.payrollRun.findFirst({ where: { tenantId: T, month: 5, year: 2026 } });
  if (!payrollRun) {
    const payrollEmps = employeeRawData.slice(0, 15);
    const totalGross = payrollEmps.reduce((s, e) => s + e.basic + e.da + e.hra + e.sa, 0);
    const totalDeductions = payrollEmps.reduce((s, e) => {
      const gross = e.basic + e.da + e.hra + e.sa;
      const pf = Math.round(e.basic * 0.12);
      const esi = gross <= 21000 ? Math.round(gross * 0.0075) : 0;
      return s + pf + esi + 200;
    }, 0);
    payrollRun = await prisma.payrollRun.create({
      data: {
        tenantId: T, month: 5, year: 2026,
        periodStart: d('2026-05-01'), periodEnd: d('2026-05-31'),
        status: PayrollStatus.APPROVED,
        totalEmployees: payrollEmps.length,
        totalGross, totalDeductions,
        totalNet: totalGross - totalDeductions,
        processedAt: d('2026-05-31'), approvedBy: superAdmin.id, approvedAt: d('2026-06-01'),
        paidAt: d('2026-06-05'), notes: 'May 2026 payroll processed and paid.',
        createdBy: payrollUser.id,
      },
    });
    for (const e of payrollEmps) {
      const empId = employees[e.code];
      if (!empId) continue;
      const gross = e.basic + e.da + e.hra + e.sa;
      const pf = Math.round(e.basic * 0.12);
      const esi = gross <= 21000 ? Math.round(gross * 0.0075) : 0;
      const pt = 200;
      const totalDed = pf + esi + pt;
      await prisma.payslip.create({
        data: {
          tenantId: T, payrollRunId: payrollRun.id, employeeId: empId,
          month: 5, year: 2026, workingDays: 26, presentDays: 25, absentDays: 1,
          leaveDays: 0, overtimeHours: 2,
          basic: e.basic, da: e.da, hra: e.hra, specialAllowance: e.sa,
          grossEarnings: gross,
          pfEmployee: pf, esiEmployee: esi, professionalTax: pt,
          totalDeductions: totalDed, netPay: gross - totalDed,
          otherEarnings: { overtime: Math.round(e.basic / (26 * 8) * 1.5 * 2) },
          paymentStatus: 'PAID', paidAt: d('2026-06-05'),
        },
      });
    }
  }

  // ── 19b. Additional Payroll Runs ─────────────────────────────────────────────
  console.log('Creating additional payroll runs...');

  // Helper to compute payslip figures
  const payslipFigures = (e: typeof employeeRawData[0], presentDays: number, workingDays: number, overtimeHrs: number) => {
    const ratio     = workingDays > 0 ? presentDays / workingDays : 1;
    const basic     = Math.round(e.basic * ratio);
    const da        = Math.round(e.da    * ratio);
    const hra       = Math.round(e.hra   * ratio);
    const special   = Math.round(e.sa    * ratio);
    const hourlyRate = e.basic / (workingDays * 8);
    const otMultiplier = e.empType === 'CONTRACT' ? 2 : 1.5;
    const otPay     = Math.round(overtimeHrs * hourlyRate * otMultiplier);
    const gross     = basic + da + hra + special + otPay;
    const pf        = Math.min(Math.round(basic * 0.12), 1800);
    const esi       = gross <= 21000 ? Math.round(gross * 0.0075) : 0;
    const pt        = gross <= 7500 ? 0 : gross <= 10000 ? 175 : 200;
    const totalDed  = pf + esi + pt;
    const net       = gross - totalDed;
    return { basic, da, hra, special, otPay, gross, pf, esi, pt, totalDed, net };
  };

  // ── April 2026 — DISBURSED ─────────────────────────────────────────────────
  let aprilRun = await prisma.payrollRun.findFirst({ where: { tenantId: T, month: 4, year: 2026 } });
  if (!aprilRun) {
    const aprilEmps = employeeRawData; // all 20 employees
    // Attendance variation for April (25 working days)
    const aprilAttendance: Record<string, { present: number; ot: number }> = {
      'EMP-001': { present: 25, ot: 4 }, 'EMP-002': { present: 24, ot: 0 }, 'EMP-003': { present: 25, ot: 8 },
      'EMP-004': { present: 23, ot: 0 }, 'EMP-005': { present: 25, ot: 0 }, 'EMP-006': { present: 25, ot: 0 },
      'EMP-007': { present: 24, ot: 6 }, 'EMP-008': { present: 25, ot: 0 }, 'EMP-009': { present: 25, ot: 0 },
      'EMP-010': { present: 25, ot: 0 }, 'EMP-011': { present: 22, ot: 4 }, 'EMP-012': { present: 25, ot: 0 },
      'EMP-013': { present: 25, ot: 6 }, 'EMP-014': { present: 24, ot: 0 }, 'EMP-015': { present: 25, ot: 0 },
      'EMP-016': { present: 23, ot: 0 }, 'EMP-017': { present: 25, ot: 4 }, 'EMP-018': { present: 25, ot: 0 },
      'EMP-019': { present: 25, ot: 0 }, 'EMP-020': { present: 24, ot: 8 },
    };
    const workingDays = 25;
    let tGross = 0, tDed = 0, tNet = 0;
    const aprilPayslips: any[] = [];
    for (const e of aprilEmps) {
      const empId = employees[e.code]; if (!empId) continue;
      const att = aprilAttendance[e.code] ?? { present: 24, ot: 0 };
      const f = payslipFigures(e, att.present, workingDays, att.ot);
      tGross += f.gross; tDed += f.totalDed; tNet += f.net;
      aprilPayslips.push({ empId, att, f });
    }
    aprilRun = await prisma.payrollRun.create({
      data: {
        tenantId: T, month: 4, year: 2026,
        periodStart: d('2026-04-01'), periodEnd: d('2026-04-30'),
        status: PayrollStatus.PAID,
        totalEmployees: aprilPayslips.length, totalGross: tGross,
        totalDeductions: tDed, totalNet: tNet,
        processedAt: d('2026-04-30'), approvedBy: superAdmin.id, approvedAt: d('2026-05-01'), paidAt: d('2026-05-05'),
        notes: 'April 2026 payroll disbursed.', createdBy: payrollUser.id,
      },
    });
    for (const { empId, att, f } of aprilPayslips) {
      await prisma.payslip.create({
        data: {
          tenantId: T, payrollRunId: aprilRun.id, employeeId: empId,
          month: 4, year: 2026, workingDays,
          presentDays: att.present, absentDays: workingDays - att.present, leaveDays: 0,
          overtimeHours: att.ot,
          basic: f.basic, da: f.da, hra: f.hra, specialAllowance: f.special,
          grossEarnings: f.gross,
          pfEmployee: f.pf, esiEmployee: f.esi, professionalTax: f.pt,
          totalDeductions: f.totalDed, netPay: f.net,
          otherEarnings: f.otPay > 0 ? { overtime: f.otPay } : {},
          paymentStatus: 'PAID', paidAt: d('2026-05-05'),
        },
      });
    }
  }

  // ── June 2026 — PENDING_APPROVAL ───────────────────────────────────────────
  let juneRun = await prisma.payrollRun.findFirst({ where: { tenantId: T, month: 6, year: 2026 } });
  if (!juneRun) {
    const juneEmps = employeeRawData;
    const juneAttendance: Record<string, { present: number; ot: number }> = {
      'EMP-001': { present: 24, ot: 6 }, 'EMP-002': { present: 25, ot: 0 }, 'EMP-003': { present: 25, ot: 8 },
      'EMP-004': { present: 25, ot: 0 }, 'EMP-005': { present: 24, ot: 0 }, 'EMP-006': { present: 23, ot: 0 },
      'EMP-007': { present: 25, ot: 4 }, 'EMP-008': { present: 25, ot: 0 }, 'EMP-009': { present: 25, ot: 0 },
      'EMP-010': { present: 24, ot: 0 }, 'EMP-011': { present: 25, ot: 6 }, 'EMP-012': { present: 25, ot: 0 },
      'EMP-013': { present: 24, ot: 4 }, 'EMP-014': { present: 25, ot: 0 }, 'EMP-015': { present: 25, ot: 0 },
      'EMP-016': { present: 25, ot: 0 }, 'EMP-017': { present: 23, ot: 8 }, 'EMP-018': { present: 25, ot: 0 },
      'EMP-019': { present: 25, ot: 0 }, 'EMP-020': { present: 24, ot: 6 },
    };
    const workingDays = 25;
    let tGross = 0, tDed = 0, tNet = 0;
    const junePayslips: any[] = [];
    for (const e of juneEmps) {
      const empId = employees[e.code]; if (!empId) continue;
      const att = juneAttendance[e.code] ?? { present: 25, ot: 0 };
      const f = payslipFigures(e, att.present, workingDays, att.ot);
      tGross += f.gross; tDed += f.totalDed; tNet += f.net;
      junePayslips.push({ empId, att, f });
    }
    juneRun = await prisma.payrollRun.create({
      data: {
        tenantId: T, month: 6, year: 2026,
        periodStart: d('2026-06-01'), periodEnd: d('2026-06-30'),
        status: PayrollStatus.PENDING_APPROVAL,
        totalEmployees: junePayslips.length, totalGross: tGross,
        totalDeductions: tDed, totalNet: tNet,
        processedAt: d('2026-06-30'),
        notes: 'June 2026 payroll — awaiting approval.', createdBy: payrollUser.id,
      },
    });
    for (const { empId, att, f } of junePayslips) {
      await prisma.payslip.create({
        data: {
          tenantId: T, payrollRunId: juneRun.id, employeeId: empId,
          month: 6, year: 2026, workingDays,
          presentDays: att.present, absentDays: workingDays - att.present, leaveDays: 0,
          overtimeHours: att.ot,
          basic: f.basic, da: f.da, hra: f.hra, specialAllowance: f.special,
          grossEarnings: f.gross,
          pfEmployee: f.pf, esiEmployee: f.esi, professionalTax: f.pt,
          totalDeductions: f.totalDed, netPay: f.net,
          otherEarnings: f.otPay > 0 ? { overtime: f.otPay } : {},
          paymentStatus: 'PENDING',
        },
      });
    }
  }

  // ── 20. Compliance Items ─────────────────────────────────────────────────────
  console.log('Creating compliance items...');
  const complianceData = [
    { type: ComplianceType.PF, period: 'April-2026', dueDate: '2026-05-15', amount: 185600, status: ComplianceStatus.PAID, filedDate: '2026-05-14', challanNo: 'PF/2026/04/001' },
    { type: ComplianceType.ESI, period: 'April-2026', dueDate: '2026-05-21', amount: 42300, status: ComplianceStatus.PAID, filedDate: '2026-05-20', challanNo: 'ESI/2026/04/001' },
    { type: ComplianceType.PROFESSIONAL_TAX, period: 'April-2026', dueDate: '2026-05-31', amount: 3000, status: ComplianceStatus.PAID, filedDate: '2026-05-30', challanNo: 'PT/2026/04/001' },
    { type: ComplianceType.PF, period: 'May-2026', dueDate: '2026-06-15', amount: 189200, status: ComplianceStatus.PENDING },
    { type: ComplianceType.ESI, period: 'May-2026', dueDate: '2026-06-21', amount: 43100, status: ComplianceStatus.PENDING },
    { type: ComplianceType.PROFESSIONAL_TAX, period: 'May-2026', dueDate: '2026-06-30', amount: 3000, status: ComplianceStatus.PENDING },
    { type: ComplianceType.TDS, period: 'Q4-2025-26', dueDate: '2026-05-31', amount: 125000, status: ComplianceStatus.FILED, filedDate: '2026-05-29', challanNo: 'TDS/2026/Q4/001' },
    { type: ComplianceType.PF, period: 'March-2026', dueDate: '2026-04-15', amount: 181400, status: ComplianceStatus.PAID, filedDate: '2026-04-13', challanNo: 'PF/2026/03/001' },
    { type: ComplianceType.ESI, period: 'March-2026', dueDate: '2026-04-21', amount: 40800, status: ComplianceStatus.PAID, filedDate: '2026-04-20', challanNo: 'ESI/2026/03/001' },
  ];
  const existingCompCount = await prisma.complianceItem.count({ where: { tenantId: T } });
  if (existingCompCount === 0) {
    await prisma.complianceItem.createMany({
      data: complianceData.map(c => ({
        tenantId: T,
        type: c.type,
        period: c.period,
        dueDate: d(c.dueDate),
        amount: c.amount,
        status: c.status,
        filedDate: c.filedDate ? d(c.filedDate) : null,
        paidDate: c.status === ComplianceStatus.PAID ? d(c.filedDate!) : null,
        challanNo: c.challanNo ?? null,
        createdBy: superAdmin.id,
      })),
    });
  }

  // ── 21. Invoices ─────────────────────────────────────────────────────────────
  console.log('Creating invoices...');
  const invoiceData = [
    {
      invoiceNo: 'INV-2026-001', clientId: clients['CLI-001'], tenderId: tenders['TND-2024-001'],
      issueDate: '2026-04-01', dueDate: '2026-05-15',
      periodFrom: '2026-03-01', periodTo: '2026-03-31',
      subtotal: 1025000, taxableAmount: 1025000, cgstAmount: 92250, sgstAmount: 92250,
      totalAmount: 1209500, paidAmount: 1209500, balanceAmount: 0,
      status: InvoiceStatus.PAID,
    },
    {
      invoiceNo: 'INV-2026-002', clientId: clients['CLI-002'], tenderId: tenders['TND-2024-002'],
      issueDate: '2026-04-05', dueDate: '2026-05-05',
      periodFrom: '2026-03-01', periodTo: '2026-03-31',
      subtotal: 720000, taxableAmount: 720000, cgstAmount: 64800, sgstAmount: 64800,
      totalAmount: 849600, paidAmount: 849600, balanceAmount: 0,
      status: InvoiceStatus.PAID,
    },
    {
      invoiceNo: 'INV-2026-003', clientId: clients['CLI-003'], tenderId: tenders['TND-2024-003'],
      issueDate: '2026-05-01', dueDate: '2026-05-31',
      periodFrom: '2026-04-01', periodTo: '2026-04-30',
      subtotal: 1833333, taxableAmount: 1833333, cgstAmount: 165000, sgstAmount: 165000,
      totalAmount: 2163333, paidAmount: 0, balanceAmount: 2163333,
      status: InvoiceStatus.SENT,
    },
    {
      invoiceNo: 'INV-2026-004', clientId: clients['CLI-004'], tenderId: tenders['TND-2024-004'],
      issueDate: '2026-04-10', dueDate: '2026-05-09',
      periodFrom: '2026-03-01', periodTo: '2026-03-31',
      subtotal: 266667, taxableAmount: 266667, cgstAmount: 24000, sgstAmount: 24000,
      totalAmount: 314667, paidAmount: 0, balanceAmount: 314667,
      status: InvoiceStatus.OVERDUE,
    },
    {
      invoiceNo: 'INV-2026-005', clientId: clients['CLI-005'], tenderId: tenders['TND-2025-001'],
      issueDate: '2026-05-05', dueDate: '2026-06-04',
      periodFrom: '2026-04-01', periodTo: '2026-04-30',
      subtotal: 483333, taxableAmount: 483333, cgstAmount: 43500, sgstAmount: 43500,
      totalAmount: 570333, paidAmount: 0, balanceAmount: 570333,
      status: InvoiceStatus.SENT,
    },
    {
      invoiceNo: 'INV-2026-006', clientId: clients['CLI-001'], tenderId: tenders['TND-2024-001'],
      issueDate: '2026-05-01', dueDate: '2026-06-14',
      periodFrom: '2026-04-01', periodTo: '2026-04-30',
      subtotal: 1041667, taxableAmount: 1041667, cgstAmount: 93750, sgstAmount: 93750,
      totalAmount: 1229167, paidAmount: 0, balanceAmount: 1229167,
      status: InvoiceStatus.SENT,
    },
  ];
  const invoiceIds: Record<string, string> = {};
  for (const inv of invoiceData) {
    const existing = await prisma.invoice.findFirst({ where: { tenantId: T, invoiceNo: inv.invoiceNo } });
    if (!existing) {
      const invoice = await prisma.invoice.create({
        data: {
          tenantId: T,
          invoiceNo: inv.invoiceNo,
          invoiceType: InvoiceType.TAX_INVOICE,
          clientId: inv.clientId,
          tenderId: inv.tenderId,
          issueDate: d(inv.issueDate),
          dueDate: d(inv.dueDate),
          periodFrom: d(inv.periodFrom),
          periodTo: d(inv.periodTo),
          subtotal: inv.subtotal,
          taxableAmount: inv.taxableAmount,
          cgstAmount: inv.cgstAmount,
          sgstAmount: inv.sgstAmount,
          totalAmount: inv.totalAmount,
          paidAmount: inv.paidAmount,
          balanceAmount: inv.balanceAmount,
          discount: 0,
          status: inv.status,
          createdBy: financeUser.id,
        },
      });
      invoiceIds[inv.invoiceNo] = invoice.id;

      // Line items
      await prisma.invoiceLineItem.create({
        data: {
          invoiceId: invoice.id,
          description: `Manpower services for ${inv.periodFrom.substring(0, 7)}`,
          quantity: 1,
          rate: inv.subtotal,
          amount: inv.subtotal,
          taxRate: 18,
          taxAmount: inv.cgstAmount + inv.sgstAmount,
          hsn: '998519',
        },
      });

      // Payments for PAID invoices
      if (inv.status === InvoiceStatus.PAID) {
        await prisma.payment.create({
          data: {
            tenantId: T,
            invoiceId: invoice.id,
            amount: inv.totalAmount,
            paymentDate: d(inv.dueDate),
            paymentMethod: 'NEFT',
            referenceNo: `NEFT${inv.invoiceNo.replace(/-/g, '')}`,
            status: PaymentStatus.RECEIVED,
            createdBy: financeUser.id,
          },
        });
      }
    } else {
      invoiceIds[inv.invoiceNo] = existing.id;
    }
  }

  // ── 22. Finance: Chart of Accounts ──────────────────────────────────────────
  console.log('Creating finance data...');
  const accountData = [
    { code: 'ACC-1001', name: 'Cash in Hand', type: AccountType.ASSET, openingBalance: 50000, currentBalance: 68500 },
    { code: 'ACC-1002', name: 'SBI Current Account', type: AccountType.ASSET, openingBalance: 5000000, currentBalance: 4250000 },
    { code: 'ACC-1003', name: 'HDFC OD Account', type: AccountType.LIABILITY, openingBalance: 0, currentBalance: 200000 },
    { code: 'ACC-2001', name: 'Accounts Receivable', type: AccountType.ASSET, openingBalance: 0, currentBalance: 4077833 },
    { code: 'ACC-3001', name: 'Manpower Revenue', type: AccountType.INCOME, openingBalance: 0, currentBalance: 8360833 },
    { code: 'ACC-4001', name: 'Salary & Wages', type: AccountType.EXPENSE, openingBalance: 0, currentBalance: 4800000 },
    { code: 'ACC-4002', name: 'PF & ESI Contributions', type: AccountType.EXPENSE, openingBalance: 0, currentBalance: 740000 },
    { code: 'ACC-4003', name: 'Administrative Expenses', type: AccountType.EXPENSE, openingBalance: 0, currentBalance: 180000 },
    { code: 'ACC-4004', name: 'Travel & Conveyance', type: AccountType.EXPENSE, openingBalance: 0, currentBalance: 65000 },
  ];
  const accounts: Record<string, string> = {};
  for (const acc of accountData) {
    const existing = await prisma.account.findFirst({ where: { tenantId: T, code: acc.code } });
    if (!existing) {
      const a = await prisma.account.create({ data: { tenantId: T, ...acc, isActive: true } });
      accounts[acc.code] = a.id;
    } else {
      accounts[acc.code] = existing.id;
    }
  }

  // Finance: Bank Accounts
  const existingBankAccCount = await prisma.bankAccount.count({ where: { tenantId: T } });
  if (existingBankAccCount === 0) {
    await prisma.bankAccount.createMany({
      data: [
        { tenantId: T, accountName: 'WorkZen Operating Account', accountNumber: '38294750123', bankName: 'State Bank of India', ifscCode: 'SBIN0001234', branchName: 'Connaught Place', accountType: 'CURRENT', openingBalance: 5000000, currentBalance: 4250000 },
        { tenantId: T, accountName: 'WorkZen Payroll Account', accountNumber: '38294750456', bankName: 'HDFC Bank', ifscCode: 'HDFC0001234', branchName: 'Barakhamba Road', accountType: 'CURRENT', openingBalance: 2000000, currentBalance: 820000 },
      ],
    });
  }

  // Finance: Expenses
  const existingExpCount = await prisma.expense.count({ where: { tenantId: T } });
  if (existingExpCount === 0) {
    await prisma.expense.createMany({
      data: [
        { tenantId: T, category: 'OFFICE_SUPPLIES', description: 'A4 paper, stationery for admin', amount: 8500, date: d('2026-05-05'), paymentMode: 'CASH', vendorName: 'Sharma Stationery', status: 'APPROVED', approvedBy: financeUser.id, createdBy: hrUser.id },
        { tenantId: T, category: 'TRAVEL', description: 'Site visit to NHAI toll plazas - fuel', amount: 4200, date: d('2026-05-08'), paymentMode: 'CARD', vendorName: 'IOCL Fuel Station', status: 'APPROVED', approvedBy: financeUser.id, createdBy: superAdmin.id },
        { tenantId: T, category: 'UTILITIES', description: 'Monthly internet and telephone bill', amount: 6800, date: d('2026-05-10'), paymentMode: 'ONLINE', vendorName: 'BSNL', status: 'APPROVED', approvedBy: financeUser.id, createdBy: hrUser.id },
        { tenantId: T, category: 'UNIFORM', description: 'Security guard uniform batch - 20 sets', amount: 42000, date: d('2026-05-12'), paymentMode: 'NEFT', vendorName: 'National Uniform Suppliers', status: 'APPROVED', approvedBy: superAdmin.id, createdBy: hrUser.id },
        { tenantId: T, category: 'TRAINING', description: 'Fire safety training for 30 employees', amount: 18000, date: d('2026-05-15'), paymentMode: 'NEFT', vendorName: 'Safe Skies Training Institute', status: 'APPROVED', approvedBy: superAdmin.id, createdBy: hrUser.id },
        { tenantId: T, category: 'OFFICE_RENT', description: 'Head office rent - May 2026', amount: 55000, date: d('2026-05-01'), paymentMode: 'CHEQUE', vendorName: 'Rajdhani Properties', status: 'APPROVED', approvedBy: financeUser.id, createdBy: financeUser.id },
        { tenantId: T, category: 'TRAVEL', description: 'Airport - DMRC metro station site inspection', amount: 3500, date: d('2026-05-18'), paymentMode: 'CASH', status: 'PENDING', createdBy: superAdmin.id },
        { tenantId: T, category: 'MISC', description: 'First aid kit refill for 5 sites', amount: 7200, date: d('2026-05-20'), paymentMode: 'CASH', vendorName: 'MedPlus', status: 'APPROVED', approvedBy: hrUser.id, createdBy: hrUser.id },
      ],
    });
  }

  // ── 23. Assets ───────────────────────────────────────────────────────────────
  console.log('Creating assets...');
  const assetData = [
    { code: 'AST-001', name: 'Security Uniform Set - Blue', category: AssetCategory.UNIFORM, status: AssetStatus.ASSIGNED, assignedTo: 'EMP-001', purchaseDate: '2024-07-01', cost: 2100 },
    { code: 'AST-002', name: 'Reflective Safety Vest', category: AssetCategory.SAFETY_EQUIPMENT, status: AssetStatus.ASSIGNED, assignedTo: 'EMP-003', purchaseDate: '2024-07-01', cost: 450 },
    { code: 'AST-003', name: 'Employee ID Card - Laminated', category: AssetCategory.ID_CARD, status: AssetStatus.ASSIGNED, assignedTo: 'EMP-002', purchaseDate: '2024-08-01', cost: 80 },
    { code: 'AST-004', name: 'Dell Latitude 5420 Laptop', category: AssetCategory.LAPTOP, status: AssetStatus.ASSIGNED, assignedTo: 'EMP-012', purchaseDate: '2024-03-15', cost: 68000 },
    { code: 'AST-005', name: 'Samsung Galaxy A54 Mobile', category: AssetCategory.MOBILE, status: AssetStatus.ASSIGNED, assignedTo: 'EMP-009', purchaseDate: '2024-06-01', cost: 28000 },
    { code: 'AST-006', name: 'Security Uniform Set - Khaki', category: AssetCategory.UNIFORM, status: AssetStatus.AVAILABLE, purchaseDate: '2024-09-01', cost: 1950 },
    { code: 'AST-007', name: 'Hard Hat Safety Helmet', category: AssetCategory.SAFETY_EQUIPMENT, status: AssetStatus.AVAILABLE, purchaseDate: '2024-09-01', cost: 380 },
    { code: 'AST-008', name: 'HP ProBook 440 Laptop', category: AssetCategory.LAPTOP, status: AssetStatus.AVAILABLE, purchaseDate: '2025-01-10', cost: 52000 },
  ];
  for (const a of assetData) {
    const existing = await prisma.asset.findFirst({ where: { tenantId: T, assetCode: a.code } });
    if (!existing) {
      const empId = a.assignedTo ? employees[a.assignedTo] : null;
      const asset = await prisma.asset.create({
        data: {
          tenantId: T,
          assetCode: a.code,
          name: a.name,
          category: a.category,
          status: a.status,
          purchaseDate: d(a.purchaseDate),
          purchaseValue: a.cost,
          createdBy: superAdmin.id,
        },
      });
      if (empId) {
        await prisma.assetAssignment.create({
          data: {
            tenantId: T, assetId: asset.id, employeeId: empId,
            issuedDate: d('2024-07-01'), createdBy: superAdmin.id,
          },
        });
      }
    }
  }

  // ── 24. Documents ─────────────────────────────────────────────────────────────
  console.log('Creating documents...');
  const existingDocCount = await prisma.document.count({ where: { tenantId: T } });
  if (existingDocCount === 0) {
    await prisma.document.createMany({
      data: [
        { tenantId: T, name: 'NHAI Contract Agreement 2024', fileName: 'nhai-contract-2024.pdf', fileType: 'application/pdf', fileSize: 524288, filePath: 'documents/tender/', s3Key: 'documents/tender/nhai-contract-2024.pdf', documentType: DocumentType.CONTRACT, isPublic: false, uploadedBy: superAdmin.id },
        { tenantId: T, name: 'DMRC Work Order Letter', fileName: 'dmrc-work-order.pdf', fileType: 'application/pdf', fileSize: 131072, filePath: 'documents/tender/', s3Key: 'documents/tender/dmrc-work-order.pdf', documentType: DocumentType.TENDER_DOCUMENT, isPublic: false, uploadedBy: superAdmin.id },
        { tenantId: T, name: 'PF Return April 2026', fileName: 'pf-return-apr-2026.pdf', fileType: 'application/pdf', fileSize: 262144, filePath: 'documents/compliance/', s3Key: 'documents/compliance/pf-return-apr-2026.pdf', documentType: DocumentType.COMPLIANCE_FILE, isPublic: false, uploadedBy: payrollUser.id },
        { tenantId: T, name: 'Rajesh Kumar - Aadhar Card', fileName: 'emp001-aadhaar.pdf', fileType: 'application/pdf', fileSize: 102400, filePath: 'documents/employee/', s3Key: 'documents/employee/emp001-aadhaar.pdf', documentType: DocumentType.ID_PROOF, isPublic: false, uploadedBy: hrUser.id },
        { tenantId: T, name: 'Joining Letter - Poonam Verma', fileName: 'emp012-joining-letter.pdf', fileType: 'application/pdf', fileSize: 65536, filePath: 'documents/employee/', s3Key: 'documents/employee/emp012-joining-letter.pdf', documentType: DocumentType.JOINING_LETTER, isPublic: false, uploadedBy: hrUser.id },
        { tenantId: T, name: 'INV-2026-001 Tax Invoice', fileName: 'inv-2026-001.pdf', fileType: 'application/pdf', fileSize: 153600, filePath: 'documents/invoice/', s3Key: 'documents/invoice/inv-2026-001.pdf', documentType: DocumentType.INVOICE, isPublic: false, uploadedBy: financeUser.id },
        { tenantId: T, name: 'ESI Challan April 2026', fileName: 'esi-challan-apr-2026.pdf', fileType: 'application/pdf', fileSize: 98304, filePath: 'documents/compliance/', s3Key: 'documents/compliance/esi-challan-apr-2026.pdf', documentType: DocumentType.COMPLIANCE_FILE, isPublic: false, uploadedBy: payrollUser.id },
      ],
    });
  }

  // ── 25. Recruitment ──────────────────────────────────────────────────────────
  console.log('Creating recruitment data...');
  const reqData = [
    { reqNo: 'REQ-2026-001', title: 'Security Guards - NHAI NH48', deptCode: 'SEC', dsgCode: 'SG', vacancies: 8, urgency: 'HIGH', status: RecruitmentStatus.IN_PROGRESS, location: 'Gurugram, Haryana' },
    { reqNo: 'REQ-2026-002', title: 'Housekeeping Staff - DMRC Blue Line', deptCode: 'HSK', dsgCode: 'HKS', vacancies: 5, urgency: 'NORMAL', status: RecruitmentStatus.OPEN, location: 'New Delhi' },
    { reqNo: 'REQ-2026-003', title: 'Shift Incharge - AAI Terminal 3', deptCode: 'SEC', dsgCode: 'SI', vacancies: 2, urgency: 'HIGH', status: RecruitmentStatus.OPEN, location: 'New Delhi' },
  ];
  const requisitions: Record<string, string> = {};
  for (const r of reqData) {
    const existing = await prisma.jobRequisition.findFirst({ where: { tenantId: T, requisitionNo: r.reqNo } });
    if (!existing) {
      const req = await prisma.jobRequisition.create({
        data: {
          tenantId: T, requisitionNo: r.reqNo, title: r.title,
          departmentId: departments[r.deptCode], designationId: designations[r.dsgCode],
          vacancies: r.vacancies, urgency: r.urgency, status: r.status,
          location: r.location, targetDate: d('2026-07-31'),
          createdBy: hrUser.id,
        },
      });
      requisitions[r.reqNo] = req.id;
    } else {
      requisitions[r.reqNo] = existing.id;
    }
  }

  const candidateData = [
    { reqNo: 'REQ-2026-001', fn: 'Pradeep', ln: 'Chauhan', phone: '9900001001', gender: Gender.MALE, status: CandidateStatus.INTERVIEW_SCHEDULED, exp: '3 years security', sal: 14000 },
    { reqNo: 'REQ-2026-001', fn: 'Ramu', ln: 'Yadav', phone: '9900002002', gender: Gender.MALE, status: CandidateStatus.SHORTLISTED, exp: '1 year', sal: 13000 },
    { reqNo: 'REQ-2026-001', fn: 'Santosh', ln: 'Meena', phone: '9900003003', gender: Gender.MALE, status: CandidateStatus.APPLIED, exp: 'Fresher', sal: 12500 },
    { reqNo: 'REQ-2026-001', fn: 'Vijay', ln: 'Singh', phone: '9900004004', gender: Gender.MALE, status: CandidateStatus.SELECTED, exp: '5 years security', sal: 16000 },
    { reqNo: 'REQ-2026-002', fn: 'Lalita', ln: 'Kumari', phone: '9900005005', gender: Gender.FEMALE, status: CandidateStatus.SHORTLISTED, exp: '2 years HK', sal: 13000 },
    { reqNo: 'REQ-2026-002', fn: 'Seema', ln: 'Rani', phone: '9900006006', gender: Gender.FEMALE, status: CandidateStatus.APPLIED, exp: 'Fresher', sal: 12000 },
    { reqNo: 'REQ-2026-003', fn: 'Harish', ln: 'Nair', phone: '9900007007', gender: Gender.MALE, status: CandidateStatus.INTERVIEWED, exp: '8 years security mgmt', sal: 22000 },
    { reqNo: 'REQ-2026-003', fn: 'Chandrika', ln: 'Patel', phone: '9900008008', gender: Gender.FEMALE, status: CandidateStatus.OFFER_SENT, exp: '6 years supervisor', sal: 21000 },
  ];
  const existingCandCount = await prisma.candidate.count({ where: { tenantId: T } });
  if (existingCandCount === 0) {
    for (const c of candidateData) {
      const reqId = requisitions[c.reqNo];
      if (!reqId) continue;
      await prisma.candidate.create({
        data: {
          tenantId: T, requisitionId: reqId,
          firstName: c.fn, lastName: c.ln, phone: c.phone, gender: c.gender,
          experience: c.exp, expectedSalary: c.sal,
          status: c.status, source: 'PORTAL', createdBy: hrUser.id,
        },
      });
    }
  }

  // ── 26. Workflow Definitions ─────────────────────────────────────────────────
  console.log('Creating workflow definitions...');
  const wfData = [
    {
      name: 'Leave Approval Workflow', module: 'attendance', description: 'Approval flow for employee leave requests',
      steps: [
        { stepOrder: 1, name: 'Supervisor Approval', approverRole: 'SITE_SUPERVISOR' },
        { stepOrder: 2, name: 'HR Manager Review', approverRole: 'HR_MANAGER' },
      ],
    },
    {
      name: 'Invoice Approval Workflow', module: 'billing', description: 'Two-level invoice approval before sending to client',
      steps: [
        { stepOrder: 1, name: 'Finance Manager Review', approverRole: 'FINANCE_MANAGER' },
        { stepOrder: 2, name: 'Company Owner Approval', approverRole: 'COMPANY_OWNER' },
      ],
    },
    {
      name: 'Payroll Approval Workflow', module: 'payroll', description: 'Payroll run approval before disbursal',
      steps: [
        { stepOrder: 1, name: 'Payroll Manager Review', approverRole: 'PAYROLL_MANAGER' },
        { stepOrder: 2, name: 'Finance Manager Approval', approverRole: 'FINANCE_MANAGER' },
      ],
    },
  ];
  for (const wf of wfData) {
    const existing = await prisma.workflowDefinition.findFirst({ where: { tenantId: T, name: wf.name } });
    if (!existing) {
      const def = await prisma.workflowDefinition.create({
        data: { tenantId: T, name: wf.name, module: wf.module, description: wf.description, isActive: true, createdBy: superAdmin.id },
      });
      for (const step of wf.steps) {
        await prisma.workflowStep.create({
          data: { workflowId: def.id, stepOrder: step.stepOrder, name: step.name, approverRole: step.approverRole },
        });
      }

      // Create a sample pending workflow instance
      const instance = await prisma.workflowInstance.create({
        data: {
          tenantId: T, workflowId: def.id,
          entityType: wf.module === 'attendance' ? 'LEAVE_REQUEST' : wf.module === 'billing' ? 'INVOICE' : 'PAYROLL_RUN',
          entityId: wf.module === 'billing' ? (invoiceIds['INV-2026-003'] ?? 'pending') : 'pending',
          status: WorkflowStatus.PENDING,
          currentStep: 1, initiatedBy: hrUser.id,
        },
      });

      // Create pending approval for step 1 (assigned to superAdmin as placeholder)
      await prisma.approval.create({
        data: {
          tenantId: T,
          workflowInstanceId: instance.id,
          stepOrder: 1,
          approverId: superAdmin.id,
        },
      });
    }
  }

  // ── 27. Audit Log Entries ────────────────────────────────────────────────────
  console.log('Creating audit log entries...');
  const existingAuditCount = await prisma.auditLog.count({ where: { tenantId: T } });
  if (existingAuditCount === 0) {
    await prisma.auditLog.createMany({
      data: [
        { tenantId: T, userId: superAdmin.id, action: 'CREATE', resource: 'tender', resourceId: tenders['TND-2024-001'], newValues: { description: 'Created NHAI NH-48 tender' }, ipAddress: '192.168.1.100' },
        { tenantId: T, userId: hrUser.id, action: 'CREATE', resource: 'employee', resourceId: employees['EMP-001'], newValues: { description: 'Onboarded employee Rajesh Kumar' }, ipAddress: '192.168.1.101' },
        { tenantId: T, userId: financeUser.id, action: 'CREATE', resource: 'invoice', resourceId: invoiceIds['INV-2026-001'] ?? '', newValues: { description: 'Generated invoice INV-2026-001' }, ipAddress: '192.168.1.102' },
        { tenantId: T, userId: payrollUser.id, action: 'UPDATE', resource: 'payroll_run', resourceId: payrollRun?.id ?? '', newValues: { description: 'Approved May 2026 payroll run' }, ipAddress: '192.168.1.103' },
        { tenantId: T, userId: superAdmin.id, action: 'CREATE', resource: 'compliance', newValues: { description: 'Filed PF challan for April 2026' }, ipAddress: '192.168.1.100' },
        { tenantId: T, userId: hrUser.id, action: 'UPDATE', resource: 'leave_request', newValues: { description: 'Approved leave for EMP-002' }, ipAddress: '192.168.1.101' },
        { tenantId: T, userId: superAdmin.id, action: 'CREATE', resource: 'deployment', newValues: { description: 'Deployed EMP-001 to NHAI site' }, ipAddress: '192.168.1.100' },
        { tenantId: T, userId: financeUser.id, action: 'UPDATE', resource: 'invoice', resourceId: invoiceIds['INV-2026-002'] ?? '', newValues: { description: 'Marked INV-2026-002 as paid' }, ipAddress: '192.168.1.102' },
      ],
    });
  }

  // ── 28. Report Definitions ────────────────────────────────────────────────────
  console.log('Creating report definitions...');
  const reportDefsData = [
    { name: 'Monthly Attendance Summary', module: 'attendance', description: 'Employee-wise attendance summary for a given month', parameters: { month: 'required', year: 'required', department: 'optional' } },
    { name: 'Payroll Summary Report', module: 'payroll', description: 'Month-wise payroll totals by department', parameters: { month: 'required', year: 'required' } },
    { name: 'Invoice Aging Report', module: 'billing', description: 'Outstanding invoices grouped by aging buckets (0-30, 31-60, 61-90, 90+ days)', parameters: { asOfDate: 'optional' } },
    { name: 'PF-ESI Liability Statement', module: 'compliance', description: 'Monthly PF and ESI liability with employee-wise breakdown', parameters: { month: 'required', year: 'required' } },
    { name: 'Manpower Deployment Report', module: 'deployment', description: 'Site-wise deployed headcount vs required headcount', parameters: { date: 'optional' } },
  ];
  for (const rd of reportDefsData) {
    const existing = await prisma.reportDefinition.findFirst({ where: { tenantId: T, name: rd.name } });
    if (!existing) {
      await prisma.reportDefinition.create({
        data: { tenantId: T, name: rd.name, module: rd.module, description: rd.description, filters: rd.parameters as any, isActive: true, createdBy: superAdmin.id },
      });
    }
  }

  // ── 29. Work Order Extended Data ────────────────────────────────────────────
  console.log('Creating Work Order positions, milestones, invoices, payments...');

  const woPositions: Record<string, string> = {};
  const woMilestones: Record<string, string> = {};
  const woInvoices: Record<string, string> = {};

  const woPositionData = [
    // WO-2024-001 (NHAI NH-48, value 6M)
    { woNo: 'WO-2024-001', designation: 'Security Guard', requiredCount: 30, deployedCount: 28, rate: 15000 },
    { woNo: 'WO-2024-001', designation: 'Head Guard', requiredCount: 10, deployedCount: 10, rate: 18000 },
    { woNo: 'WO-2024-001', designation: 'Shift Incharge', requiredCount: 5, deployedCount: 5, rate: 22000 },
    // WO-2024-002 (DMRC HK, value 8.75M)
    { woNo: 'WO-2024-002', designation: 'Housekeeping Staff', requiredCount: 25, deployedCount: 22, rate: 14000 },
    { woNo: 'WO-2024-002', designation: 'Housekeeping Supervisor', requiredCount: 5, deployedCount: 5, rate: 16000 },
    // WO-2024-003 (AAI T3, value 7.2M)
    { woNo: 'WO-2024-003', designation: 'Security Guard', requiredCount: 40, deployedCount: 35, rate: 15000 },
    { woNo: 'WO-2024-003', designation: 'Technical Operator', requiredCount: 15, deployedCount: 12, rate: 20000 },
    { woNo: 'WO-2024-003', designation: 'Site Incharge', requiredCount: 2, deployedCount: 2, rate: 28000 },
    // WO-2024-004 (NDMC, value 3.2M)
    { woNo: 'WO-2024-004', designation: 'Housekeeping Staff', requiredCount: 18, deployedCount: 16, rate: 14000 },
    { woNo: 'WO-2024-004', designation: 'Housekeeping Supervisor', requiredCount: 2, deployedCount: 2, rate: 16000 },
    // WO-2025-001 (GAIL, value 2.8M)
    { woNo: 'WO-2025-001', designation: 'Security Guard', requiredCount: 14, deployedCount: 14, rate: 15000 },
    { woNo: 'WO-2025-001', designation: 'Head Guard', requiredCount: 4, deployedCount: 4, rate: 18000 },
  ];

  for (const p of woPositionData) {
    const woId = workOrders[p.woNo];
    if (!woId) continue;
    const key = `${p.woNo}::${p.designation}`;
    const existing = await prisma.workOrderPosition.findFirst({ where: { tenantId: T, workOrderId: woId, designation: p.designation } });
    if (!existing) {
      const pos = await prisma.workOrderPosition.create({
        data: { tenantId: T, workOrderId: woId, designation: p.designation, requiredCount: p.requiredCount, deployedCount: p.deployedCount, rate: p.rate },
      });
      woPositions[key] = pos.id;
    } else {
      woPositions[key] = existing.id;
    }
  }

  // Fulfillments: link deployed employees to positions
  const fulfillmentMap = [
    { empCode: 'EMP-001', woNo: 'WO-2024-001', designation: 'Head Guard' },
    { empCode: 'EMP-003', woNo: 'WO-2024-001', designation: 'Security Guard' },
    { empCode: 'EMP-007', woNo: 'WO-2024-001', designation: 'Security Guard' },
    { empCode: 'EMP-009', woNo: 'WO-2024-001', designation: 'Shift Incharge' },
    { empCode: 'EMP-002', woNo: 'WO-2024-002', designation: 'Housekeeping Supervisor' },
    { empCode: 'EMP-004', woNo: 'WO-2024-002', designation: 'Housekeeping Staff' },
    { empCode: 'EMP-006', woNo: 'WO-2024-002', designation: 'Housekeeping Staff' },
    { empCode: 'EMP-013', woNo: 'WO-2024-003', designation: 'Security Guard' },
    { empCode: 'EMP-015', woNo: 'WO-2024-003', designation: 'Technical Operator' },
    { empCode: 'EMP-019', woNo: 'WO-2024-003', designation: 'Site Incharge' },
    { empCode: 'EMP-014', woNo: 'WO-2024-004', designation: 'Housekeeping Staff' },
    { empCode: 'EMP-016', woNo: 'WO-2024-004', designation: 'Housekeeping Staff' },
    { empCode: 'EMP-017', woNo: 'WO-2025-001', designation: 'Security Guard' },
    { empCode: 'EMP-020', woNo: 'WO-2025-001', designation: 'Head Guard' },
  ];

  for (const f of fulfillmentMap) {
    const woId = workOrders[f.woNo];
    const empId = employees[f.empCode];
    const posId = woPositions[`${f.woNo}::${f.designation}`];
    if (!woId || !empId || !posId) continue;
    const existing = await prisma.workOrderFulfillment.findFirst({ where: { tenantId: T, workOrderId: woId, employeeId: empId } });
    if (!existing) {
      await prisma.workOrderFulfillment.create({
        data: { tenantId: T, workOrderId: woId, positionId: posId, employeeId: empId, deployedDate: d('2024-07-01'), status: 'ACTIVE' },
      });
    }
  }

  // Milestones for each WO (25% / 50% / 75% / 100%)
  const milestoneTemplates = [
    { title: 'Mobilisation & Setup (25%)', pct: 25, offsetMonths: 2 },
    { title: 'Mid-term Review (50%)', pct: 50, offsetMonths: 6 },
    { title: 'Three-quarter Completion (75%)', pct: 75, offsetMonths: 9 },
    { title: 'Final Completion (100%)', pct: 100, offsetMonths: 12 },
  ];

  const woValues: Record<string, number> = {
    'WO-2024-001': 6000000,
    'WO-2024-002': 8750000,
    'WO-2024-003': 7200000,
    'WO-2024-004': 3200000,
    'WO-2025-001': 2800000,
  };

  const woStartDates: Record<string, Date> = {
    'WO-2024-001': d('2024-07-01'),
    'WO-2024-002': d('2024-08-01'),
    'WO-2024-003': d('2024-10-01'),
    'WO-2024-004': d('2024-04-01'),
    'WO-2025-001': d('2025-04-01'),
  };

  for (const [woNo, woId] of Object.entries(workOrders)) {
    const woValue = woValues[woNo] ?? 0;
    const woStart = woStartDates[woNo];
    if (!woStart) continue;

    for (const ms of milestoneTemplates) {
      const key = `${woNo}::${ms.pct}`;
      const dueDate = new Date(woStart);
      dueDate.setMonth(dueDate.getMonth() + ms.offsetMonths);
      const amount = Math.round(woValue * ms.pct / 100);
      const existing = await prisma.workOrderMilestone.findFirst({ where: { tenantId: T, workOrderId: woId, percentage: ms.pct } });
      if (!existing) {
        // Determine status based on date vs today (2026-06-10)
        const today = new Date('2026-06-10');
        let status = 'PENDING';
        if (dueDate < today) {
          if (ms.pct <= 50) status = 'INVOICED';
          else status = 'COMPLETED';
        }
        const milestone = await prisma.workOrderMilestone.create({
          data: {
            tenantId: T, workOrderId: woId, title: ms.title,
            percentage: ms.pct, amount,
            dueDate,
            status,
            completedDate: status !== 'PENDING' ? dueDate : null,
          },
        });
        woMilestones[key] = milestone.id;
      } else {
        woMilestones[key] = existing.id;
      }
    }
  }

  // WO Invoices for completed milestones
  const existingWoInvCount = await prisma.workOrderInvoice.count({ where: { tenantId: T } });
  if (existingWoInvCount === 0) {
    const woInvoiceData = [
      // WO-2024-001: 25% milestone invoiced and paid, 50% invoiced
      { woNo: 'WO-2024-001', msPct: 25, num: 'WOINV-2024-0001', date: '2024-09-30', period: 'Jul–Sep 2024', deployed: 28, pct: 25, status: 'PAID' },
      { woNo: 'WO-2024-001', msPct: 50, num: 'WOINV-2025-0001', date: '2025-01-05', period: 'Oct 2024–Jan 2025', deployed: 43, pct: 50, status: 'SUBMITTED' },
      // WO-2024-002: 25% paid
      { woNo: 'WO-2024-002', msPct: 25, num: 'WOINV-2024-0002', date: '2024-10-05', period: 'Aug–Oct 2024', deployed: 22, pct: 25, status: 'PAID' },
      // WO-2024-003: 25% paid
      { woNo: 'WO-2024-003', msPct: 25, num: 'WOINV-2025-0002', date: '2025-01-10', period: 'Oct 2024–Jan 2025', deployed: 49, pct: 25, status: 'PAID' },
      // WO-2024-004: 25% submitted
      { woNo: 'WO-2024-004', msPct: 25, num: 'WOINV-2024-0003', date: '2024-07-02', period: 'Apr–Jun 2024', deployed: 18, pct: 25, status: 'SUBMITTED' },
      // WO-2025-001: 25% submitted
      { woNo: 'WO-2025-001', msPct: 25, num: 'WOINV-2025-0003', date: '2025-07-02', period: 'Apr–Jul 2025', deployed: 14, pct: 25, status: 'SUBMITTED' },
    ];

    for (const inv of woInvoiceData) {
      const woId = workOrders[inv.woNo];
      const msId = woMilestones[`${inv.woNo}::${inv.msPct}`];
      if (!woId) continue;
      const woValue = woValues[inv.woNo] ?? 0;
      const amount = Math.round(woValue * inv.pct / 100);
      const gst = Math.round(amount * 0.18);
      const woi = await prisma.workOrderInvoice.create({
        data: {
          tenantId: T, workOrderId: woId, milestoneId: msId ?? null,
          invoiceNumber: inv.num,
          invoiceDate: d(inv.date),
          period: inv.period,
          deployedCount: inv.deployed,
          amount,
          gstAmount: gst,
          totalAmount: amount + gst,
          paidAmount: inv.status === 'PAID' ? amount + gst : 0,
          status: inv.status,
          createdBy: financeUser.id,
        },
      });
      woInvoices[inv.num] = woi.id;
    }

    // WO Payments for PAID invoices
    for (const [num, id] of Object.entries(woInvoices)) {
      const inv = woInvoiceData.find(i => i.num === num);
      if (!inv || inv.status !== 'PAID') continue;
      const woId = workOrders[inv.woNo];
      if (!woId) continue;
      const woValue = woValues[inv.woNo] ?? 0;
      const amount = Math.round(woValue * inv.pct / 100);
      const gst = Math.round(amount * 0.18);
      await prisma.workOrderPayment.create({
        data: {
          tenantId: T, workOrderId: woId, invoiceId: id,
          amount: amount + gst,
          paymentDate: d(inv.date),
          paymentMode: 'RTGS',
          referenceNumber: `RTGS${num.replace(/-/g, '')}`,
          recordedBy: financeUser.id,
        },
      });
    }
  }

  // WO Amendment for WO-2024-001 (value revised upward)
  const existingAmendCount = await prisma.workOrderAmendment.count({ where: { tenantId: T } });
  if (existingAmendCount === 0) {
    await prisma.workOrderAmendment.create({
      data: {
        tenantId: T,
        workOrderId: workOrders['WO-2024-001'],
        version: 2,
        amendmentRef: 'NHAI/NH48/AMD/001',
        changeDescription: 'Sanctioned strength increased from 45 to 50 guards due to additional toll plaza added at Km 62',
        previousValue: 6000000,
        newValue: 6500000,
        previousStrength: 45,
        newStrength: 50,
        effectiveDate: d('2025-01-01'),
        createdBy: superAdmin.id,
      },
    });

    // Update the WO accordingly
    await prisma.workOrder.update({
      where: { id: workOrders['WO-2024-001'] },
      data: { value: 6500000, requiredCount: 50, currentVersion: 2 },
    });
  }

  // ── 30. Logistics Data ──────────────────────────────────────────────────────
  console.log('Creating logistics data...');

  const courierVendorData = [
    { name: 'Blue Dart Express', code: 'BLUEDART', contactPhone: '1800-233-1234', trackingUrl: 'https://www.bluedart.com/tracking' },
    { name: 'DTDC Courier', code: 'DTDC', contactPhone: '1800-103-3832', trackingUrl: 'https://tracking.dtdc.com' },
    { name: 'India Post Speed Post', code: 'SPEEDPOST', contactPhone: '1800-266-6868', trackingUrl: 'https://www.indiapost.gov.in/VAS/Pages/trackconsignment.aspx' },
    { name: 'Delhivery', code: 'DELHIVERY', contactPhone: '011-4241-1819', trackingUrl: 'https://www.delhivery.com/track/package' },
  ];

  const couriers: Record<string, string> = {};
  for (const cv of courierVendorData) {
    const existing = await prisma.courierVendor.findFirst({ where: { tenantId: T, code: cv.code } });
    if (!existing) {
      const c = await prisma.courierVendor.create({ data: { tenantId: T, ...cv } });
      couriers[cv.code] = c.id;
    } else {
      couriers[cv.code] = existing.id;
    }
  }

  const existingDispatchCount = await prisma.logisticsDispatch.count({ where: { tenantId: T } });
  if (existingDispatchCount === 0) {
    await prisma.logisticsDispatch.createMany({
      data: [
        {
          tenantId: T, dispatchNo: 'DSP-2026-0001',
          courierVendorId: couriers['BLUEDART'],
          trackingNumber: '74899100890120', dispatchDate: d('2026-05-02'),
          toName: 'Office of Executive Engineer, NHAI Delhi',
          toAddress: 'G-5/6, Sector 10, Dwarka, New Delhi — 110075',
          toPhone: '011-25074100',
          contentType: 'TENDER_DOC', contentDescription: 'Signed agreement for WO-2024-001 (3 copies)',
          weight: 0.8, charges: 180, status: 'DELIVERED', expectedDelivery: d('2026-05-04'), deliveredDate: d('2026-05-04'),
          relatedModule: 'work_orders', dispatchedBy: superAdmin.id,
        },
        {
          tenantId: T, dispatchNo: 'DSP-2026-0002',
          courierVendorId: couriers['DTDC'],
          trackingNumber: 'D28881234560012', dispatchDate: d('2026-05-10'),
          toName: 'GM Operations, DMRC Corporate Office',
          toAddress: 'Metro Bhawan, Fire Brigade Lane, Barakhamba Road, New Delhi — 110001',
          toPhone: '011-23417910',
          contentType: 'INVOICE', contentDescription: 'INV-2026-003 with supporting documents',
          weight: 0.3, charges: 120, status: 'DELIVERED', expectedDelivery: d('2026-05-12'), deliveredDate: d('2026-05-12'),
          relatedModule: 'billing', dispatchedBy: financeUser.id,
        },
        {
          tenantId: T, dispatchNo: 'DSP-2026-0003',
          courierVendorId: couriers['SPEEDPOST'],
          trackingNumber: 'EP123456789IN', dispatchDate: d('2026-05-18'),
          toName: 'Director Finance, AAI Corporate HQ',
          toAddress: 'Rajiv Gandhi Bhavan, Safdarjung Airport, New Delhi — 110003',
          toPhone: '011-24632950',
          contentType: 'CHEQUE', contentDescription: 'Performance Security deposit cheque for WO extension',
          weight: 0.1, charges: 60, status: 'IN_TRANSIT', expectedDelivery: d('2026-05-22'),
          relatedModule: 'work_orders', dispatchedBy: financeUser.id,
        },
        {
          tenantId: T, dispatchNo: 'DSP-2026-0004',
          courierVendorId: couriers['BLUEDART'],
          trackingNumber: '74899200900011', dispatchDate: d('2026-06-02'),
          toName: 'Collector Office, NDMC',
          toAddress: 'Dr. S.P. Mukherjee Civic Centre, Jawaharlal Nehru Marg, New Delhi — 110002',
          toPhone: '011-23221188',
          contentType: 'COMPLIANCE', contentDescription: 'PF & ESI compliance certificate April 2026',
          weight: 0.2, charges: 140, status: 'DISPATCHED', expectedDelivery: d('2026-06-05'),
          dispatchedBy: superAdmin.id,
        },
        {
          tenantId: T, dispatchNo: 'DSP-2026-0005',
          courierVendorId: couriers['DELHIVERY'],
          trackingNumber: 'DEL9988776655', dispatchDate: d('2026-06-08'),
          toName: 'GAIL India, GM (Security)',
          toAddress: '16, Bhikaiji Cama Place, New Delhi — 110066',
          toPhone: '011-26182956',
          contentType: 'APPOINTMENT_LETTER', contentDescription: 'Appointment letters for 4 newly deployed guards',
          weight: 0.15, charges: 95, status: 'DISPATCHED', expectedDelivery: d('2026-06-11'),
          dispatchedBy: hrUser.id,
        },
      ],
    });

    await prisma.logisticsReceipt.createMany({
      data: [
        {
          tenantId: T, receiptNo: 'RCV-2026-0001',
          courierVendorId: couriers['SPEEDPOST'],
          trackingNumber: 'EP987654321IN', receivedDate: d('2026-04-28'),
          fromName: 'Office of the Tender Director, NHAI HQ',
          fromAddress: 'G-5/6, Sector 10, Dwarka, New Delhi',
          fromPhone: '011-25074100',
          contentType: 'WORK_ORDER', contentDescription: 'Original Work Order letter WO-2024-001 amendment + 2 copies',
          receivedBy: 'Poonam Verma', handedTo: 'Tender Manager',
        },
        {
          tenantId: T, receiptNo: 'RCV-2026-0002',
          courierVendorId: couriers['BLUEDART'],
          trackingNumber: '74899100770088', receivedDate: d('2026-05-06'),
          fromName: 'AAI Finance Department',
          fromAddress: 'Rajiv Gandhi Bhavan, Safdarjung Airport, New Delhi',
          contentType: 'CHEQUE', contentDescription: 'Advance payment cheque ₹10,81,666 for INV-2026-003',
          receivedBy: 'Kavita Nair', handedTo: 'Finance Manager',
        },
        {
          tenantId: T, receiptNo: 'RCV-2026-0003',
          courierVendorId: couriers['DTDC'],
          trackingNumber: 'D28881234560099', receivedDate: d('2026-05-15'),
          fromName: 'NDMC Office',
          fromAddress: 'Civic Centre, New Delhi',
          contentType: 'CONTRACT', contentDescription: 'Renewal contract for sanitation services FY 2026-27',
          receivedBy: 'Super Admin', handedTo: 'Operations Manager',
        },
        {
          tenantId: T, receiptNo: 'RCV-2026-0004',
          receivedDate: d('2026-06-01'),
          fromName: 'GAIL India Limited',
          fromAddress: '16, Bhikaiji Cama Place, New Delhi',
          contentType: 'ID_CARD', contentDescription: 'Access cards returned for 2 relieved security personnel',
          receivedBy: 'Poonam Verma', handedTo: 'HR Manager',
        },
        {
          tenantId: T, receiptNo: 'RCV-2026-0005',
          courierVendorId: couriers['BLUEDART'],
          trackingNumber: '74899300100055', receivedDate: d('2026-06-07'),
          fromName: 'NHAI Regional Office, Gurugram',
          fromAddress: 'NHAI Regional Office, Sector 14, Gurugram — 122001',
          contentType: 'COMPLIANCE', contentDescription: 'Site inspection report signed copy',
          receivedBy: 'Super Admin', handedTo: 'Compliance Officer',
        },
      ],
    });
  }

  // ── 31. Visitors Data ───────────────────────────────────────────────────────
  console.log('Creating visitors data...');

  const visitorData = [
    { name: 'Rajiv Mehta', phone: '9810100101', company: 'NHAI Regional Office', idType: 'AADHAAR', idNumber: '1234 5678 9012' },
    { name: 'Supriya Goyal', phone: '9810200202', company: 'DMRC Corporate Office', idType: 'PAN', idNumber: 'ABCPG1234Q' },
    { name: 'Dinesh Kumar', phone: '9810300303', company: 'GAIL India Ltd', idType: 'AADHAAR', idNumber: '9876 5432 1098' },
    { name: 'Anita Sharma', phone: '9810400404', company: 'AAI Finance Dept', idType: 'DRIVING_LICENSE', idNumber: 'DL-0420110012345' },
    { name: 'Ranjit Yadav', phone: '9810500505', company: '', idType: 'AADHAAR', idNumber: '5678 9012 3456' },
    { name: 'Meera Pillai', phone: '9810600606', company: 'Safe Skies Training', idType: 'PASSPORT', idNumber: 'Z1234567' },
    { name: 'Kamal Hassan', phone: '9810700707', company: '', idType: 'VOTER_ID', idNumber: 'TN/07/001/123456' },
  ];

  const visitors: Record<string, string> = {};
  for (const v of visitorData) {
    const existing = await prisma.visitor.findFirst({ where: { tenantId: T, phone: v.phone } });
    if (!existing) {
      const vis = await prisma.visitor.create({
        data: { tenantId: T, name: v.name, phone: v.phone, company: v.company || null, idType: v.idType, idNumber: v.idNumber },
      });
      visitors[v.phone] = vis.id;
    } else {
      visitors[v.phone] = existing.id;
    }
  }

  // Blacklist one visitor
  await prisma.visitor.update({
    where: { id: visitors['9810700707'] },
    data: { isBlacklisted: true, blacklistReason: 'Unauthorised photography of office premises on previous visit (2025-11-20)' },
  });

  const existingLogCount = await prisma.visitorLog.count({ where: { tenantId: T } });
  if (existingLogCount === 0) {
    const mkCheckIn = (dateStr: string, hour: number, min: number) => {
      const dt = new Date(dateStr);
      dt.setHours(hour, min, 0, 0);
      return dt;
    };
    const mkCheckOut = (dateStr: string, hour: number, min: number) => {
      const dt = new Date(dateStr);
      dt.setHours(hour, min, 0, 0);
      return dt;
    };

    // hostEmployeeId must be an Employee.id (not User.id)
    // EMP-019 = Kiran Bala (Site Incharge), EMP-012 = Poonam Verma (HR Executive), EMP-009 = Ramesh Gupta (Shift Incharge)
    await prisma.visitorLog.createMany({
      data: [
        // Past visits
        {
          tenantId: T, visitorId: visitors['9810100101'], hostEmployeeId: employees['EMP-019'],
          purpose: 'Work order amendment review meeting with MD', purposeCategory: 'OFFICIAL',
          checkIn: mkCheckIn('2026-05-20', 10, 15), checkOut: mkCheckOut('2026-05-20', 12, 45),
          badgeNumber: 'V-001', createdBy: superAdmin.id,
        },
        {
          tenantId: T, visitorId: visitors['9810200202'], hostEmployeeId: employees['EMP-012'],
          purpose: 'Compliance audit of manpower records', purposeCategory: 'INSPECTION',
          checkIn: mkCheckIn('2026-05-22', 9, 30), checkOut: mkCheckOut('2026-05-22', 16, 0),
          badgeNumber: 'V-002', createdBy: superAdmin.id,
        },
        {
          tenantId: T, visitorId: visitors['9810300303'], hostEmployeeId: employees['EMP-009'],
          purpose: 'Deliver signed cheque INV-2026-003', purposeCategory: 'OFFICIAL',
          checkIn: mkCheckIn('2026-05-28', 11, 0), checkOut: mkCheckOut('2026-05-28', 11, 45),
          badgeNumber: 'V-003', createdBy: superAdmin.id,
        },
        {
          tenantId: T, visitorId: visitors['9810400404'], hostEmployeeId: employees['EMP-009'],
          purpose: 'Discuss advance payment for INV-2026-006', purposeCategory: 'OFFICIAL',
          checkIn: mkCheckIn('2026-06-03', 14, 0), checkOut: mkCheckOut('2026-06-03', 15, 30),
          badgeNumber: 'V-001', createdBy: superAdmin.id,
        },
        {
          tenantId: T, visitorId: visitors['9810500505'], hostEmployeeId: employees['EMP-012'],
          purpose: 'Walk-in candidate for Security Guard position', purposeCategory: 'INTERVIEW',
          checkIn: mkCheckIn('2026-06-05', 10, 0), checkOut: mkCheckOut('2026-06-05', 10, 50),
          badgeNumber: 'V-002', createdBy: superAdmin.id,
        },
        {
          tenantId: T, visitorId: visitors['9810600606'], hostEmployeeId: employees['EMP-012'],
          purpose: 'Fire safety training proposal for FY 2026-27', purposeCategory: 'VENDOR',
          checkIn: mkCheckIn('2026-06-07', 15, 30), checkOut: mkCheckOut('2026-06-07', 16, 30),
          badgeNumber: 'V-003', createdBy: superAdmin.id,
        },
        // Today — still inside (no check-out)
        {
          tenantId: T, visitorId: visitors['9810100101'], hostEmployeeId: employees['EMP-019'],
          purpose: 'Follow-up on WO-2024-001 manpower review', purposeCategory: 'OFFICIAL',
          checkIn: mkCheckIn('2026-06-10', 9, 45),
          badgeNumber: 'V-001', createdBy: superAdmin.id,
        },
        {
          tenantId: T, visitorId: visitors['9810200202'], hostEmployeeId: employees['EMP-012'],
          purpose: 'PF compliance document collection', purposeCategory: 'OFFICIAL',
          checkIn: mkCheckIn('2026-06-10', 11, 0),
          badgeNumber: 'V-004', createdBy: superAdmin.id,
        },
      ],
    });
  }

  // ── 32. Holidays ────────────────────────────────────────────────────────────
  console.log('Creating holidays...');
  const holidayData = [
    // 2026 National Holidays
    { name: 'Republic Day', date: '2026-01-26', type: 'NATIONAL' },
    { name: 'Holi', date: '2026-03-03', type: 'NATIONAL' },
    { name: 'Ram Navami', date: '2026-03-29', type: 'NATIONAL' },
    { name: 'Good Friday', date: '2026-04-03', type: 'NATIONAL' },
    { name: 'Ambedkar Jayanti', date: '2026-04-14', type: 'NATIONAL' },
    { name: 'Labour Day', date: '2026-05-01', type: 'NATIONAL' },
    { name: 'Buddha Purnima', date: '2026-05-13', type: 'NATIONAL' },
    { name: 'Id-ul-Fitr (Eid)', date: '2026-03-31', type: 'NATIONAL' },
    { name: 'Id-ul-Adha (Bakr Eid)', date: '2026-06-07', type: 'NATIONAL' },
    { name: 'Independence Day', date: '2026-08-15', type: 'NATIONAL' },
    { name: 'Janmashtami', date: '2026-08-22', type: 'NATIONAL' },
    { name: 'Gandhi Jayanti', date: '2026-10-02', type: 'NATIONAL' },
    { name: 'Dussehra', date: '2026-10-10', type: 'NATIONAL' },
    { name: 'Diwali', date: '2026-10-29', type: 'NATIONAL' },
    { name: 'Govardhan Puja', date: '2026-10-30', type: 'NATIONAL' },
    { name: 'Guru Nanak Jayanti', date: '2026-11-11', type: 'NATIONAL' },
    { name: 'Christmas Day', date: '2026-12-25', type: 'NATIONAL' },
    // State Holidays (Delhi/Haryana — applicable to most sites)
    { name: 'Delhi Foundation Day', date: '2026-02-14', type: 'STATE', isOptional: true },
    { name: 'Haryana Day', date: '2026-11-01', type: 'STATE' },
    // Upcoming Holidays (already passed in 2026 but included for record)
    { name: 'New Year\'s Day', date: '2026-01-01', type: 'NATIONAL' },
    { name: 'Makar Sankranti', date: '2026-01-14', type: 'STATE', isOptional: true },
    { name: 'Maha Shivratri', date: '2026-02-20', type: 'NATIONAL' },
  ];
  for (const h of holidayData) {
    const existing = await prisma.holiday.findFirst({ where: { tenantId: T, name: h.name, date: new Date(h.date) } });
    if (!existing) {
      await prisma.holiday.create({
        data: { tenantId: T, name: h.name, date: new Date(h.date), type: h.type, isOptional: (h as any).isOptional ?? false, applicableTo: [] },
      });
    }
  }

  // ── 33. Organization — Zones, Regions, Branches, Announcements, Awards ──────
  console.log('Creating organization structure...');
  // Zones
  const zoneNorth = await prisma.zone.upsert({
    where: { tenantId_name: { tenantId: T, name: 'North Zone' } },
    update: {},
    create: { tenantId: T, name: 'North Zone', code: 'NZ', createdBy: superAdmin.id },
  });
  const zoneSouth = await prisma.zone.upsert({
    where: { tenantId_name: { tenantId: T, name: 'South Zone' } },
    update: {},
    create: { tenantId: T, name: 'South Zone', code: 'SZ', createdBy: superAdmin.id },
  });

  // Regions
  const regionDelhi = await prisma.region.upsert({
    where: { tenantId_name: { tenantId: T, name: 'Delhi NCR' } },
    update: {},
    create: { tenantId: T, zoneId: zoneNorth.id, name: 'Delhi NCR', code: 'DL', createdBy: superAdmin.id },
  });
  const regionHaryana = await prisma.region.upsert({
    where: { tenantId_name: { tenantId: T, name: 'Haryana' } },
    update: {},
    create: { tenantId: T, zoneId: zoneNorth.id, name: 'Haryana', code: 'HR', createdBy: superAdmin.id },
  });
  await prisma.region.upsert({
    where: { tenantId_name: { tenantId: T, name: 'UP East' } },
    update: {},
    create: { tenantId: T, zoneId: zoneSouth.id, name: 'UP East', code: 'UPE', createdBy: superAdmin.id },
  });

  // Branches
  const branchesData = [
    { code: 'HO-001', name: 'Head Office — New Delhi', regionId: regionDelhi.id, gstin: '07AABCW1234E1Z1', pan: 'AABCW1234E', phone: '011-41234567', email: 'ho@workzen.in', address: { line1: 'B-47, Okhla Industrial Area', city: 'New Delhi', state: 'Delhi', pincode: '110020' } },
    { code: 'BR-GGN', name: 'Gurugram Branch', regionId: regionHaryana.id, gstin: '06AABCW1234E1Z2', pan: 'AABCW1234E', phone: '0124-4123456', email: 'gurugram@workzen.in', address: { line1: 'SCO 12, Sector 14, Gurugram', city: 'Gurugram', state: 'Haryana', pincode: '122001' } },
    { code: 'BR-FBD', name: 'Faridabad Branch', regionId: regionHaryana.id, phone: '0129-4234567', email: 'faridabad@workzen.in', address: { line1: 'Plot 8, Sector 31, Faridabad', city: 'Faridabad', state: 'Haryana', pincode: '121003' } },
  ];
  for (const b of branchesData) {
    const existing = await prisma.branch.findFirst({ where: { tenantId: T, code: b.code } });
    if (!existing) {
      await prisma.branch.create({ data: { tenantId: T, ...b, createdBy: superAdmin.id } });
    }
  }

  // Announcements
  const announcementsData = [
    {
      title: 'Independence Day Celebration — 15 August 2026',
      body: 'All employees are invited to the Independence Day flag hoisting ceremony at Head Office on August 15, 2026 at 8:30 AM. Attendance is mandatory for office staff. Site staff should coordinate with their supervisors for on-site observance.',
      type: 'COMPANY_NEWS' as const,
      targetAudience: ['ALL'],
      isPublished: true,
      publishAt: new Date('2026-08-10T09:00:00'),
    },
    {
      title: 'Revised PF & ESI Compliance Deadline — July 2026',
      body: 'Please note that the EPFO has revised the PF challan submission deadline for July 2026 to August 20, 2026. All site supervisors must ensure attendance data is submitted to payroll by August 5. Contact payroll@workzen.in for queries.',
      type: 'HR_CIRCULAR' as const,
      targetAudience: ['HR', 'FINANCE', 'OPERATIONS'],
      isPublished: true,
      publishAt: new Date('2026-07-22T10:00:00'),
    },
    {
      title: 'New Leave Application Policy — Effective 1 July 2026',
      body: 'Effective July 1, 2026, all leave applications must be submitted at least 3 working days in advance via the WorkZen portal. Emergency leaves can still be applied on the day. The revised Leave Policy document has been uploaded to the Documents module.',
      type: 'POLICY_UPDATE' as const,
      targetAudience: ['ALL'],
      isPublished: true,
      publishAt: new Date('2026-06-20T09:00:00'),
    },
    {
      title: 'DMRC Contract Renewed for 2 Additional Years',
      body: 'We are pleased to announce that the DMRC Metro Station Housekeeping Contract (TND-2024-002) has been successfully renewed for 2 additional years effective August 1, 2026. This contract covers 10 metro stations on the Blue Line and employs 30 of our workforce. Congratulations to the Operations team!',
      type: 'COMPANY_NEWS' as const,
      targetAudience: ['ALL'],
      isPublished: true,
      publishAt: new Date('2026-06-15T11:00:00'),
    },
    {
      title: 'Mandatory Fire Safety Training — All Site Staff',
      body: 'As per NFPA compliance requirement for AAI T3 contract, all site staff at IGI Terminal 3 must complete the fire safety refresher training by August 31, 2026. Training sessions will be conducted on August 16, 22, and 28. Register via the Training module.',
      type: 'NOTICE_BOARD' as const,
      targetAudience: ['OPERATIONS', 'HR'],
      isPublished: true,
      publishAt: new Date('2026-08-01T09:00:00'),
    },
  ];
  for (const ann of announcementsData) {
    const existing = await prisma.announcement.findFirst({ where: { tenantId: T, title: ann.title } });
    if (!existing) {
      await prisma.announcement.create({
        data: { tenantId: T, ...ann, createdBy: superAdmin.id },
      });
    }
  }

  // Employee Awards
  const awardsData = [
    { empCode: 'EMP-001', awardType: 'EMPLOYEE_OF_MONTH' as const, title: 'Employee of the Month — May 2026', month: 5, year: 2026, description: 'Rajesh Kumar maintained 100% attendance and received exceptional feedback from NHAI site manager for vigilance and discipline.' },
    { empCode: 'EMP-009', awardType: 'BEST_PERFORMER' as const, title: 'Best Shift Incharge Q1 2026', month: 3, year: 2026, description: 'Ramesh Gupta achieved zero incident rate across all shifts at NHAI NH-48 during Q1 2026.' },
    { empCode: 'EMP-019', awardType: 'LONG_SERVICE' as const, title: '5 Year Long Service Award', month: 2, year: 2026, description: 'Kiran Bala completes 5 exceptional years with WorkZen, serving as Site Incharge at AAI T3.' },
    { empCode: 'EMP-005', awardType: 'BEST_ATTENDANCE' as const, title: 'Best Attendance 2025', month: 12, year: 2025, description: 'Deepak Sharma achieved perfect attendance throughout 2025 with zero late arrivals.' },
    { empCode: 'EMP-012', awardType: 'BEST_PERFORMER' as const, title: 'HR Excellence Award 2025', month: 12, year: 2025, description: 'Poonam Verma successfully onboarded 45 new site employees and reduced attrition by 20% in FY 2025-26.' },
  ];
  for (const aw of awardsData) {
    const empId = employees[aw.empCode];
    if (!empId) continue;
    const existing = await prisma.employeeAward.findFirst({ where: { tenantId: T, employeeId: empId, awardType: aw.awardType, year: aw.year, month: aw.month } });
    if (!existing) {
      await prisma.employeeAward.create({
        data: { tenantId: T, employeeId: empId, awardType: aw.awardType, title: aw.title, month: aw.month, year: aw.year, description: aw.description, givenBy: superAdmin.id },
      });
    }
  }

  // ── 34. Performance — Cycles, Reviews, Goals ─────────────────────────────────
  console.log('Creating performance data...');

  // Review Cycles
  const cycleAnnual2025 = await prisma.performanceReviewCycle.findFirst({ where: { tenantId: T, name: 'Annual Review FY 2025-26' } }) ??
    await prisma.performanceReviewCycle.create({ data: { tenantId: T, name: 'Annual Review FY 2025-26', cycleType: 'ANNUAL', startDate: d('2025-04-01'), endDate: d('2026-03-31'), status: 'COMPLETED', description: 'Annual performance appraisal for all permanent staff', createdBy: superAdmin.id } });

  const cycleQ1_2026 = await prisma.performanceReviewCycle.findFirst({ where: { tenantId: T, name: 'Q1 Review 2026-27' } }) ??
    await prisma.performanceReviewCycle.create({ data: { tenantId: T, name: 'Q1 Review 2026-27', cycleType: 'QUARTERLY', startDate: d('2026-04-01'), endDate: d('2026-06-30'), status: 'ACTIVE', description: 'Q1 FY 2026-27 quarterly performance review', createdBy: superAdmin.id } });

  // Performance Reviews (for PERMANENT employees only)
  const reviewData = [
    { empCode: 'EMP-005', selfRating: 4, managerRating: 4, hrRating: 4, finalRating: 4, selfComments: 'Managed all technical operations smoothly without any downtime incidents.', managerComments: 'Reliable and technically competent. Completes tasks ahead of schedule.', status: 'COMPLETED', cycleId: cycleAnnual2025.id },
    { empCode: 'EMP-009', selfRating: 5, managerRating: 5, hrRating: 4, finalRating: 5, selfComments: 'Maintained zero security incident rate. Trained 10 new guards.', managerComments: 'Outstanding leadership. Promoted to Shift Incharge based on performance.', status: 'COMPLETED', cycleId: cycleAnnual2025.id },
    { empCode: 'EMP-012', selfRating: 4, managerRating: 4, hrRating: 5, finalRating: 4, selfComments: 'Successfully completed recruitment for 3 new contracts. Processed all payroll on time.', managerComments: 'Excellent HR operations. Very responsive to employee needs.', status: 'COMPLETED', cycleId: cycleAnnual2025.id },
    { empCode: 'EMP-015', selfRating: 3, managerRating: 4, hrRating: 3, finalRating: 3, selfComments: 'Handled all technical maintenance tasks. Could improve documentation.', managerComments: 'Good technical skills. Needs to improve reporting and documentation.', status: 'COMPLETED', cycleId: cycleAnnual2025.id },
    { empCode: 'EMP-019', selfRating: 5, managerRating: 5, hrRating: 5, finalRating: 5, selfComments: 'Managed entire AAI T3 site operations. Zero complaints received from client.', managerComments: 'Exceptional site management. Client extremely satisfied with performance.', status: 'COMPLETED', cycleId: cycleAnnual2025.id },
    // Q1 2026 - in progress
    { empCode: 'EMP-005', selfRating: null, managerRating: null, hrRating: null, finalRating: null, selfComments: null, managerComments: null, status: 'PENDING_SELF', cycleId: cycleQ1_2026.id },
    { empCode: 'EMP-009', selfRating: 4, managerRating: null, hrRating: null, finalRating: null, selfComments: 'Q1 was productive. Completed fire safety training.', managerComments: null, status: 'PENDING_MANAGER', cycleId: cycleQ1_2026.id },
  ];
  for (const rv of reviewData) {
    const empId = employees[rv.empCode];
    if (!empId) continue;
    const existing = await prisma.performanceReview.findFirst({ where: { tenantId: T, employeeId: empId, cycleId: rv.cycleId } });
    if (!existing) {
      await prisma.performanceReview.create({
        data: {
          tenantId: T, employeeId: empId, cycleId: rv.cycleId,
          reviewPeriodStart: rv.cycleId === cycleAnnual2025.id ? d('2025-04-01') : d('2026-04-01'),
          reviewPeriodEnd: rv.cycleId === cycleAnnual2025.id ? d('2026-03-31') : d('2026-06-30'),
          selfRating: rv.selfRating, managerRating: rv.managerRating, hrRating: rv.hrRating, finalRating: rv.finalRating,
          selfComments: rv.selfComments, managerComments: rv.managerComments,
          attendanceScore: rv.finalRating ? rv.finalRating * 18 : null,
          productivityScore: rv.finalRating ? rv.finalRating * 20 : null,
          status: rv.status,
          completedAt: rv.status === 'COMPLETED' ? d('2026-04-15') : null,
          createdBy: superAdmin.id,
        },
      });
    }
  }

  // Employee Goals
  const goalData = [
    { empCode: 'EMP-001', title: 'Achieve 98% Attendance Rate', goalType: 'ATTENDANCE', description: 'Maintain attendance above 98% for FY 2026-27', targetValue: 98, actualValue: 100, unit: '%', dueDate: '2027-03-31', status: 'IN_PROGRESS', progress: 65 },
    { empCode: 'EMP-005', title: 'Complete Electrical Safety Certification', goalType: 'TRAINING', description: 'Obtain IS:5961 electrical safety certification by Q2 2026', targetValue: 1, actualValue: 0, unit: 'cert', dueDate: '2026-09-30', status: 'ACTIVE', progress: 40 },
    { empCode: 'EMP-009', title: 'Zero Security Incidents at NHAI Sites', goalType: 'SAFETY', description: 'Maintain zero reportable security incidents across all assigned NHAI toll plazas', targetValue: 0, actualValue: 0, unit: 'incidents', dueDate: '2027-03-31', status: 'IN_PROGRESS', progress: 75 },
    { empCode: 'EMP-012', title: 'Reduce Attrition to Below 15%', goalType: 'PERFORMANCE', description: 'Implement retention initiatives to bring site employee attrition below 15% for FY 2026-27', targetValue: 15, actualValue: 18, unit: '%', dueDate: '2027-03-31', status: 'ACTIVE', progress: 50 },
    { empCode: 'EMP-019', title: 'Client Satisfaction Score 4.5+', goalType: 'QUALITY', description: 'Achieve AAI quarterly satisfaction score of 4.5/5 or above for all four quarters', targetValue: 4.5, actualValue: 4.7, unit: '/5', dueDate: '2027-03-31', status: 'IN_PROGRESS', progress: 80 },
    { empCode: 'EMP-015', title: 'Document All Maintenance Procedures', goalType: 'COMPLIANCE', description: 'Create SOP documentation for all 12 routine maintenance tasks at AAI T3 by Aug 2026', targetValue: 12, actualValue: 8, unit: 'SOPs', dueDate: '2026-08-31', status: 'ACTIVE', progress: 67 },
  ];
  for (const g of goalData) {
    const empId = employees[g.empCode];
    if (!empId) continue;
    const existing = await prisma.employeeGoal.findFirst({ where: { tenantId: T, employeeId: empId, title: g.title } });
    if (!existing) {
      await prisma.employeeGoal.create({
        data: {
          tenantId: T, employeeId: empId, title: g.title, goalType: g.goalType, description: g.description,
          targetValue: g.targetValue, actualValue: g.actualValue, unit: g.unit,
          dueDate: d(g.dueDate), status: g.status, progress: g.progress, createdBy: superAdmin.id,
        },
      });
    }
  }

  // ── 35. Training — Programs, Sessions, Employee Enrollments ──────────────────
  console.log('Creating training data...');
  const trainingPrograms = [
    { name: 'Induction & Orientation', code: 'TRG-IND', programType: 'INDUCTION', description: 'Mandatory 2-day induction for all new joiners covering company policies, safety protocols, and job responsibilities', durationHours: 16, isMandatory: true, passScore: 70 },
    { name: 'Fire Safety & Emergency Response', code: 'TRG-FIRE', programType: 'SAFETY', description: 'Annual fire safety refresher training covering evacuation procedures, fire extinguisher use, and emergency contacts', durationHours: 8, isMandatory: true, passScore: 75 },
    { name: 'Security Guard Refresher', code: 'TRG-SEC', programType: 'SKILL', description: 'Quarterly refresher for security staff on access control, threat identification, and communication protocols', durationHours: 4, isMandatory: true, passScore: 65 },
    { name: 'First Aid & Basic Life Support', code: 'TRG-AID', programType: 'SAFETY', description: 'Certified first aid and BLS training for all site supervisors and incharges', durationHours: 8, isMandatory: false, passScore: 80 },
    { name: 'Housekeeping Quality Standards', code: 'TRG-HSK', programType: 'SKILL', description: 'DMRC-mandated training on ISO 9001 housekeeping quality standards for all housekeeping staff', durationHours: 6, isMandatory: false, passScore: 60 },
  ];
  const trgProgIds: Record<string, string> = {};
  for (const tp of trainingPrograms) {
    const existing = await prisma.trainingProgram.findFirst({ where: { tenantId: T, code: tp.code } });
    if (!existing) {
      const prog = await prisma.trainingProgram.create({ data: { tenantId: T, ...tp, isActive: true, createdBy: superAdmin.id } });
      trgProgIds[tp.code] = prog.id;
    } else {
      trgProgIds[tp.code] = existing.id;
    }
  }

  // Training Sessions
  const trainingSessionsData = [
    { programCode: 'TRG-IND', title: 'Induction Batch — June 2026', scheduledDate: '2026-06-02', trainerName: 'Poonam Verma', location: 'Head Office — New Delhi', maxParticipants: 20, status: 'COMPLETED' },
    { programCode: 'TRG-FIRE', title: 'Fire Safety Refresher — NHAI Site', scheduledDate: '2026-05-15', trainerName: 'Safe Skies Training (External)', location: 'NHAI NH-48 Toll Plaza Gurugram', maxParticipants: 15, status: 'COMPLETED' },
    { programCode: 'TRG-FIRE', title: 'Fire Safety Refresher — AAI T3', scheduledDate: '2026-08-16', trainerName: 'AAI In-house Safety Team', location: 'IGI Airport Terminal 3', maxParticipants: 30, status: 'SCHEDULED' },
    { programCode: 'TRG-SEC', title: 'Security Refresher Q2 2026', scheduledDate: '2026-06-20', trainerName: 'Ramesh Gupta (EMP-009)', location: 'Head Office — New Delhi', maxParticipants: 25, status: 'COMPLETED' },
    { programCode: 'TRG-AID', title: 'First Aid Certification — Site Incharges', scheduledDate: '2026-07-10', trainerName: 'Red Cross India', location: 'Head Office — New Delhi', maxParticipants: 10, status: 'SCHEDULED' },
    { programCode: 'TRG-HSK', title: 'DMRC Quality Standards Training', scheduledDate: '2026-04-10', trainerName: 'DMRC Quality Cell', location: 'DMRC Central Secretariat Station', maxParticipants: 30, status: 'COMPLETED' },
  ];
  const trgSessionIds: Record<string, string> = {};
  for (const ts of trainingSessionsData) {
    const progId = trgProgIds[ts.programCode];
    if (!progId) continue;
    const existing = await prisma.trainingSession.findFirst({ where: { tenantId: T, programId: progId, title: ts.title } });
    if (!existing) {
      const sess = await prisma.trainingSession.create({
        data: {
          tenantId: T, programId: progId, title: ts.title, sessionType: 'CLASSROOM',
          trainerName: ts.trainerName, scheduledDate: d(ts.scheduledDate),
          venue: ts.location, maxCapacity: ts.maxParticipants, status: ts.status,
          createdBy: superAdmin.id,
        },
      });
      trgSessionIds[ts.title] = sess.id;
    } else {
      trgSessionIds[ts.title] = existing.id;
    }
  }

  // Employee Training Enrollments
  const empTrainingData = [
    { empCode: 'EMP-001', sessionTitle: 'Fire Safety Refresher — NHAI Site', status: 'PASSED', score: 88, completedDate: '2026-05-15' },
    { empCode: 'EMP-003', sessionTitle: 'Fire Safety Refresher — NHAI Site', status: 'PASSED', score: 78, completedDate: '2026-05-15' },
    { empCode: 'EMP-007', sessionTitle: 'Fire Safety Refresher — NHAI Site', status: 'PASSED', score: 82, completedDate: '2026-05-15' },
    { empCode: 'EMP-009', sessionTitle: 'Security Refresher Q2 2026', status: 'PASSED', score: 95, completedDate: '2026-06-20' },
    { empCode: 'EMP-011', sessionTitle: 'Security Refresher Q2 2026', status: 'PASSED', score: 87, completedDate: '2026-06-20' },
    { empCode: 'EMP-002', sessionTitle: 'DMRC Quality Standards Training', status: 'PASSED', score: 74, completedDate: '2026-04-10' },
    { empCode: 'EMP-004', sessionTitle: 'DMRC Quality Standards Training', status: 'PASSED', score: 68, completedDate: '2026-04-10' },
    { empCode: 'EMP-006', sessionTitle: 'DMRC Quality Standards Training', status: 'PASSED', score: 71, completedDate: '2026-04-10' },
    { empCode: 'EMP-008', sessionTitle: 'DMRC Quality Standards Training', status: 'PASSED', score: 65, completedDate: '2026-04-10' },
    { empCode: 'EMP-012', sessionTitle: 'Induction Batch — June 2026', status: 'PASSED', score: 92, completedDate: '2026-06-03' },
  ];
  for (const et of empTrainingData) {
    const empId = employees[et.empCode];
    const sessId = trgSessionIds[et.sessionTitle];
    // Find the programId from the session
    const sess = await prisma.trainingSession.findUnique({ where: { id: sessId } });
    if (!empId || !sessId || !sess) continue;
    const existing = await prisma.employeeTraining.findFirst({ where: { tenantId: T, employeeId: empId, sessionId: sessId } });
    if (!existing) {
      await prisma.employeeTraining.create({
        data: {
          tenantId: T, employeeId: empId, sessionId: sessId, programId: sess.programId,
          status: et.status, score: et.score, completedAt: d(et.completedDate), passed: et.score >= 60,
        },
      });
    }
  }

  // ── 36. Notifications ────────────────────────────────────────────────────────
  console.log('Creating notifications...');
  const notifData = [
    { userId: superAdmin.id, type: 'IN_APP' as const, subject: 'Payroll Run Approved', body: 'June 2026 payroll run has been approved. Disbursement scheduled for July 5, 2026.', recipient: 'admin@workzen.in', status: 'READ' as const, readAt: new Date('2026-06-24T10:00:00') },
    { userId: hrUser.id, type: 'IN_APP' as const, subject: 'Leave Request Pending Approval', body: 'Rajesh Kumar (EMP-001) has applied for 2 days casual leave from July 14-15, 2026. Please review and approve.', recipient: 'hr@workzen.in', status: 'DELIVERED' as const },
    { userId: financeUser.id, type: 'IN_APP' as const, subject: 'Invoice Overdue — NDMC', body: 'Invoice INV-2026-004 for ₹3,04,000 is 15 days overdue from NDMC. Please follow up with the client.', recipient: 'finance@workzen.in', status: 'READ' as const, readAt: new Date('2026-06-20T09:00:00') },
    { userId: superAdmin.id, type: 'IN_APP' as const, subject: 'Compliance Deadline — PF Challan', body: 'PF challan for June 2026 is due on July 15, 2026. Please ensure payroll is processed before the deadline.', recipient: 'admin@workzen.in', status: 'DELIVERED' as const },
    { userId: hrUser.id, type: 'IN_APP' as const, subject: 'New Candidate Interview Scheduled', body: 'Interview scheduled for Suresh Nair (Security Guard position) on July 2, 2026 at 10:00 AM.', recipient: 'hr@workzen.in', status: 'DELIVERED' as const },
    { userId: financeUser.id, type: 'IN_APP' as const, subject: 'Payment Received — DMRC', body: 'Payment of ₹10,32,500 received from DMRC against Invoice INV-2026-002. Transaction ref: RTGS2026INV002.', recipient: 'finance@workzen.in', status: 'READ' as const, readAt: new Date('2026-06-18T14:00:00') },
    { userId: superAdmin.id, type: 'IN_APP' as const, subject: 'AAI Contract Renewal — Action Required', body: 'AAI T3 Integrated Facility Management contract (TND-2024-003) is up for renewal in October 2027. Please begin documentation process 6 months prior.', recipient: 'admin@workzen.in', status: 'DELIVERED' as const },
    { userId: payrollUser.id, type: 'IN_APP' as const, subject: 'Payroll Run Initiated', body: 'June 2026 payroll run has been initiated with 65 employees. Please review and approve by July 1, 2026.', recipient: 'payroll@workzen.in', status: 'READ' as const, readAt: new Date('2026-06-25T11:00:00') },
  ];
  const existingNotifCount = await prisma.notification.count({ where: { tenantId: T } });
  if (existingNotifCount === 0) {
    for (const n of notifData) {
      await prisma.notification.create({
        data: { tenantId: T, ...n, sentAt: new Date() },
      });
    }
  }

  // ── 37. Rate Masters ─────────────────────────────────────────────────────────
  console.log('Creating rate masters...');
  const rateMasterData = [
    { designationCode: 'SG', rateType: 'BASIC' as const, amount: 15000, effectiveFrom: '2024-04-01', notes: 'Standard rate for Security Guards per contract norms' },
    { designationCode: 'HG', rateType: 'BASIC' as const, amount: 18000, effectiveFrom: '2024-04-01', notes: 'Standard rate for Head Guards' },
    { designationCode: 'SI', rateType: 'BASIC' as const, amount: 22000, effectiveFrom: '2024-04-01', notes: 'Standard rate for Shift Incharge' },
    { designationCode: 'HKS', rateType: 'BASIC' as const, amount: 14000, effectiveFrom: '2024-04-01', notes: 'Standard rate for Housekeeping Staff' },
    { designationCode: 'HKP', rateType: 'BASIC' as const, amount: 16000, effectiveFrom: '2024-04-01', notes: 'Standard rate for Housekeeping Supervisor' },
    { designationCode: 'TO', rateType: 'BASIC' as const, amount: 20000, effectiveFrom: '2024-04-01', notes: 'Standard rate for Technical Operator' },
    { designationCode: 'SIC', rateType: 'BASIC' as const, amount: 28000, effectiveFrom: '2024-04-01', notes: 'Standard rate for Site Incharge' },
    // OT Rates (1.5x)
    { designationCode: 'SG', rateType: 'OT' as const, amount: 100, effectiveFrom: '2024-04-01', notes: 'Overtime rate per hour for Security Guards' },
    { designationCode: 'HG', rateType: 'OT' as const, amount: 120, effectiveFrom: '2024-04-01', notes: 'Overtime rate per hour for Head Guards' },
    // Holiday Rates (2x)
    { designationCode: 'SG', rateType: 'HOLIDAY' as const, amount: 1000, effectiveFrom: '2024-04-01', notes: 'Holiday duty allowance per day for Security Guards' },
    { designationCode: 'HKS', rateType: 'HOLIDAY' as const, amount: 933, effectiveFrom: '2024-04-01', notes: 'Holiday duty allowance per day for Housekeeping Staff' },
    // Night Shift Allowance
    { designationCode: 'SG', rateType: 'NIGHT_SHIFT' as const, amount: 500, effectiveFrom: '2024-04-01', notes: 'Night shift allowance per shift (10PM-6AM)' },
    { designationCode: 'HG', rateType: 'NIGHT_SHIFT' as const, amount: 600, effectiveFrom: '2024-04-01', notes: 'Night shift allowance per shift for Head Guard' },
  ];
  for (const rm of rateMasterData) {
    const dsgId = designations[rm.designationCode];
    if (!dsgId) continue;
    const existing = await prisma.rateMaster.findFirst({ where: { tenantId: T, designationId: dsgId, rateType: rm.rateType } });
    if (!existing) {
      await prisma.rateMaster.create({
        data: { tenantId: T, designationId: dsgId, rateType: rm.rateType, amount: rm.amount, effectiveFrom: d(rm.effectiveFrom), notes: rm.notes, isActive: true, createdBy: superAdmin.id },
      });
    }
  }

  console.log('\n✅ Seeding complete!');
  console.log('─────────────────────────────────────────────');
  console.log('Demo credentials:');
  console.log('  Super Admin:     admin@workzen.in        / Admin@123!');
  console.log('  HR Manager:      hr@workzen.in           / Admin@123!');
  console.log('  Payroll Manager: payroll@workzen.in      / Admin@123!');
  console.log('  Finance Manager: finance@workzen.in      / Admin@123!');
  console.log('  Supervisor GGN:  supervisor.ggn@workzen.in / Supervisor@123');
  console.log('  Supervisor DEL:  supervisor.del@workzen.in / Supervisor@123');
  console.log('  Supervisor FBD:  supervisor.fbd@workzen.in / Supervisor@123');
  console.log('─────────────────────────────────────────────');
  console.log('Data seeded:');
  console.log('  ✓ 4 departments, 8 designations');
  console.log('  ✓ 5 clients (NHAI, DMRC, AAI, NDMC, GAIL)');
  console.log('  ✓ 5 tenders + 5 work orders');
  console.log('  ✓ 8 sites (5 original + 3 named: GGN, DEL, FBD) + 3 shifts');
  console.log('  ✓ 20 employees (5 PERMANENT office, 15 CONTRACT site) with bank details & salary structures');
  console.log('  ✓ 45 site employees (15 per named site: GGN/DEL/FBD)');
  console.log('  ✓ 15 active deployments (original) + 45 deployments (site employees)');
  console.log('  ✓ Attendance records (May 2026 original + Apr–Jun 2026 for 45 site employees)');
  console.log('  ✓ Leave types + requests + balances');
  console.log('  ✓ 3 payroll runs: Apr 2026 (DISBURSED), May 2026 (APPROVED/PAID), Jun 2026 (PENDING_APPROVAL)');
  console.log('  ✓ 55 payslips total (20 per run × 3 - some missing for May)');
  console.log('  ✓ Employment types: PERMANENT=EMP-005,009,012,015,019 | CONTRACT=all others');
  console.log('  ✓ 9 compliance items (PF/ESI/PT/TDS)');
  console.log('  ✓ 6 invoices (2 paid, 2 sent, 1 overdue)');
  console.log('  ✓ Finance accounts, bank accounts & expenses');
  console.log('  ✓ 8 assets');
  console.log('  ✓ 7 documents');
  console.log('  ✓ 3 job requisitions + 8 candidates');
  console.log('  ✓ 3 workflow definitions + pending approvals');
  console.log('  ✓ Audit log entries');
  console.log('  ✓ 5 report definitions');
  console.log('  ✓ WO positions, fulfillments, milestones, invoices, payments, amendment');
  console.log('  ✓ 4 courier vendors + 5 dispatches + 5 receipts');
  console.log('  ✓ 7 visitors (1 blacklisted) + 8 visitor logs (2 still inside today)');
  console.log('  ✓ 3 site supervisors (Vikram/Anita/Suresh) with SITE_SUPERVISOR role');
  console.log('  ✓ 6 site complaints (2 per named site)');
  console.log('  ✓ 21 activity logs (7 days × 3 supervisors)');
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
