import axios from 'axios';
import { useAuthStore } from '@/stores/auth.store';

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3001';

export const api = axios.create({
  baseURL: `${API_URL}/api/v1`,
  headers: { 'Content-Type': 'application/json' },
});

// Request interceptor — attach JWT
api.interceptors.request.use((config) => {
  if (typeof window !== 'undefined') {
    const token = localStorage.getItem('accessToken');
    if (token) config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// Response interceptor — auto-refresh
api.interceptors.response.use(
  (res) => res,
  async (err) => {
    if (err.response?.status === 401 && !err.config._retry) {
      err.config._retry = true;
      const refreshToken = localStorage.getItem('refreshToken');
      if (refreshToken) {
        try {
          const { data } = await axios.post(`${API_URL}/api/v1/auth/refresh`, { refreshToken });
          localStorage.setItem('accessToken', data.data.accessToken);
          err.config.headers.Authorization = `Bearer ${data.data.accessToken}`;
          return api(err.config);
        } catch {
          useAuthStore.getState().clearAuth();
          window.location.href = '/login';
        }
      }
    }
    return Promise.reject(err);
  },
);

export const authApi = {
  login: (data: { email: string; password: string; totpCode?: string }) =>
    api.post('/auth/login', data).then((r) => r.data.data),
  register: (data: Record<string, string>) =>
    api.post('/auth/register', data).then((r) => r.data.data),
  logout: () => api.post('/auth/logout').then((r) => r.data),
};

export const tendersApi = {
  list: (params?: Record<string, unknown>) => api.get('/tenders', { params }).then((r) => r.data),
  selectAll: () => api.get('/tenders', { params: { limit: 1000 } }).then((r): any[] => r.data?.data ?? r.data ?? []),
  get: (id: string) => api.get(`/tenders/${id}`).then((r) => r.data.data),
  create: (data: Record<string, unknown>) => api.post('/tenders', data).then((r) => r.data.data),
  update: (id: string, data: Record<string, unknown>) => api.patch(`/tenders/${id}`, data).then((r) => r.data.data),
  remove: (id: string) => api.delete(`/tenders/${id}`).then((r) => r.data),
  dashboard: () => api.get('/tenders/dashboard').then((r) => r.data.data),
};

export const employeesApi = {
  list: (params?: Record<string, unknown>) => api.get('/employees', { params }).then((r) => r.data),
  selectAll: (status = 'ACTIVE') => api.get('/employees', { params: { limit: 1000, status } }).then((r): any[] => r.data?.data ?? r.data ?? []),
  get: (id: string) => api.get(`/employees/${id}`).then((r) => r.data.data),
  create: (data: Record<string, unknown>) => api.post('/employees', data).then((r) => r.data.data),
  update: (id: string, data: Record<string, unknown>) => api.patch(`/employees/${id}`, data).then((r) => r.data.data),
  remove: (id: string) => api.delete(`/employees/${id}`).then((r) => r.data),
  stats: () => api.get('/employees/stats').then((r) => r.data.data),
  designations: () => api.get('/employees/designations').then((r) => r.data.data),
  departments: () => api.get('/employees/departments').then((r) => r.data.data),
  createDesignation: (name: string) => api.post('/employees/designations', { name }).then((r) => r.data.data),
  createDepartment: (name: string) => api.post('/employees/departments', { name }).then((r) => r.data.data),
  // Lifecycle
  updateLifecycleStatus: (id: string, lifecycleStatus: string) => api.patch(`/employees/${id}/lifecycle-status`, { lifecycleStatus }).then(r => r.data.data),
  // Transfers
  transfers: (params?: Record<string, unknown>) => api.get('/employees/transfers', { params }).then(r => r.data),
  createTransfer: (data: Record<string, unknown>) => api.post('/employees/transfers', data).then(r => r.data.data),
  approveTransfer: (id: string, action: 'APPROVED' | 'REJECTED') => api.patch(`/employees/transfers/${id}/approve`, { action }).then(r => r.data.data),
  // Promotions
  promotions: (employeeId?: string) => api.get('/employees/promotions', employeeId ? { params: { employeeId } } : undefined).then(r => r.data.data ?? r.data),
  createPromotion: (data: Record<string, unknown>) => api.post('/employees/promotions', data).then(r => r.data.data),
  // Separations
  separations: (params?: Record<string, unknown>) => api.get('/employees/separations', { params }).then(r => r.data),
  initiateSeparation: (data: Record<string, unknown>) => api.post('/employees/separations', data).then(r => r.data.data),
  getSeparation: (employeeId: string) => api.get(`/employees/${employeeId}/separation`).then(r => r.data.data ?? r.data),
  updateClearance: (employeeId: string, department: string, cleared: boolean) => api.patch(`/employees/${employeeId}/clearance`, { department, cleared }).then(r => r.data.data),
  // Warnings
  warnings: (params?: Record<string, unknown>) => api.get('/employees/warnings', { params }).then(r => r.data),
  createWarning: (data: Record<string, unknown>) => api.post('/employees/warnings', data).then(r => r.data.data),
  updateWarning: (id: string, data: Record<string, unknown>) => api.patch(`/employees/warnings/${id}`, data).then(r => r.data.data),
  // Trips
  trips: (params?: Record<string, unknown>) => api.get('/employees/trips', { params }).then(r => r.data),
  createTrip: (data: Record<string, unknown>) => api.post('/employees/trips', data).then(r => r.data.data),
  updateTrip: (id: string, data: Record<string, unknown>) => api.patch(`/employees/trips/${id}`, data).then(r => r.data.data),
};

export const payrollApi = {
  // Dashboard
  dashboard: () => api.get('/payroll/dashboard').then(r => r.data.data),
  // Runs
  runs: (params?: Record<string, unknown>) => api.get('/payroll/runs', { params }).then(r => r.data),
  run: (id: string) => api.get(`/payroll/runs/${id}`).then(r => r.data.data),
  createRun: (data: { month: number; year: number; employmentType?: string }) => api.post('/payroll/runs', data).then(r => r.data.data),
  approve: (id: string) => api.patch(`/payroll/runs/${id}/approve`).then(r => r.data.data),
  disburse: (id: string) => api.patch(`/payroll/runs/${id}/disburse`).then(r => r.data.data),
  runPayslips: (id: string, employmentType?: string) =>
    api.get(`/payroll/runs/${id}/payslips`, employmentType ? { params: { employmentType } } : undefined).then(r => r.data.data ?? r.data),
  // Payslips
  payslips: (employeeId: string, params?: Record<string, unknown>) =>
    api.get(`/payroll/employees/${employeeId}/payslips`, { params }).then(r => r.data),
  payslip: (id: string) => api.get(`/payroll/payslips/${id}`).then(r => r.data.data),
  // Salary components
  salaryComponents: () => api.get('/payroll/salary-components').then(r => r.data.data),
  createSalaryComponent: (data: Record<string, unknown>) => api.post('/payroll/salary-components', data).then(r => r.data.data),
  // Salary structures
  salaryStructures: (params?: Record<string, unknown>) => api.get('/payroll/salary-structures', { params }).then(r => r.data),
  assignSalary: (data: Record<string, unknown>) => api.post('/payroll/salary-structures', data).then(r => r.data.data),
  updateSalary: (id: string, data: Record<string, unknown>) => api.patch(`/payroll/salary-structures/${id}`, data).then(r => r.data.data),
};

export const billingApi = {
  dashboard: () => api.get('/billing/dashboard').then((r) => r.data.data),
  invoices: (params?: Record<string, unknown>) => api.get('/billing/invoices', { params }).then((r) => r.data),
  invoice: (id: string) => api.get(`/billing/invoices/${id}`).then((r) => r.data.data),
  create: (data: Record<string, unknown>) => api.post('/billing/invoices', data).then((r) => r.data.data),
  update: (id: string, data: Record<string, unknown>) => api.patch(`/billing/invoices/${id}`, data).then((r) => r.data.data),
  payment: (id: string, data: Record<string, unknown>) =>
    api.post(`/billing/invoices/${id}/payments`, data).then((r) => r.data.data),
  getAgingAnalysis: () => api.get('/billing/invoices/aging').then((r) => r.data.data),
  getDso: () => api.get('/billing/invoices/dso').then((r) => r.data.data),
  bulkStatusUpdate: (ids: string[], status: string) =>
    api.patch('/billing/invoices/bulk-status', { ids, status }).then((r) => r.data.data),
  sendWhatsApp: (id: string, phone: string, message?: string) =>
    api.post(`/billing/invoices/${id}/send-whatsapp`, { phone, message }).then((r) => r.data.data),
  createCreditNote: (id: string, data: { description: string; amount: number; notes?: string }) =>
    api.post(`/billing/invoices/${id}/credit-note`, data).then((r) => r.data.data),
};

export const reportsApi = {
  summary: () => api.get('/reports/summary').then((r) => r.data.data),
  definitions: () => api.get('/reports/definitions').then((r) => r.data.data ?? r.data),
  generate: (id: string, params?: Record<string, unknown>) =>
    api.post(`/reports/${id}/generate`, params ?? {}).then((r) => r.data.data),
};

export const settingsApi = {
  get: () => api.get('/tenants/settings').then(r => r.data.data),
  update: (data: Record<string, unknown>) => api.patch('/tenants/settings', data).then(r => r.data.data),
};

export const usersApi = {
  list: () => api.get('/users').then(r => r.data.data),
  invite: (data: { email: string; firstName: string; lastName: string; roleId: string }) =>
    api.post('/users/invite', data).then(r => r.data.data),
  update: (id: string, data: Record<string, unknown>) => api.patch(`/users/${id}`, data).then(r => r.data.data),
  roles: () => api.get('/users/roles').then(r => r.data.data ?? r.data),
  assignRole: (id: string, roleId: string) => api.post(`/users/${id}/roles`, { roleId }).then(r => r.data.data),
  // Roles & Permissions management
  listRoles: () => api.get('/users/roles').then(r => r.data.data ?? r.data),
  getRole: (id: string) => api.get(`/users/roles/${id}`).then(r => r.data.data ?? r.data),
  createRole: (data: Record<string, unknown>) => api.post('/users/roles', data).then(r => r.data.data),
  updateRole: (id: string, data: Record<string, unknown>) => api.patch(`/users/roles/${id}`, data).then(r => r.data.data),
  setRolePermissions: (id: string, permissionIds: string[]) => api.put(`/users/roles/${id}/permissions`, { permissionIds }).then(r => r.data.data ?? r.data),
  listAllPermissions: () => api.get('/users/permissions').then(r => r.data.data ?? r.data),
  listUsersWithRoles: (params?: Record<string, unknown>) => api.get('/users/list', { params }).then(r => r.data),
  getUserById: (id: string) => api.get(`/users/${id}/detail`).then(r => r.data.data ?? r.data),
  setUserRoles: (id: string, roleIds: string[]) => api.put(`/users/${id}/roles`, { roleIds }).then(r => r.data.data ?? r.data),
};

export const clientsApi = {
  list: (params?: Record<string, unknown>) => api.get('/clients', { params }).then((r) => r.data),
  selectAll: () => api.get('/clients', { params: { limit: 1000 } }).then((r): any[] => r.data?.data ?? r.data ?? []),
  get: (id: string) => api.get(`/clients/${id}`).then((r) => r.data.data),
  create: (data: Record<string, unknown>) => api.post('/clients', data).then((r) => r.data.data),
  update: (id: string, data: Record<string, unknown>) => api.patch(`/clients/${id}`, data).then((r) => r.data.data),
  remove: (id: string) => api.delete(`/clients/${id}`).then((r) => r.data),
  dashboard: () => api.get('/clients/dashboard').then((r) => r.data.data),
  listAllContacts: () => api.get('/clients/contacts/all').then((r) => r.data.data ?? r.data),
  listContacts: (clientId: string) => api.get(`/clients/${clientId}/contacts`).then((r) => r.data.data ?? r.data),
  createContact: (clientId: string, data: Record<string, unknown>) => api.post(`/clients/${clientId}/contacts`, data).then((r) => r.data.data),
  updateContact: (clientId: string, contactId: string, data: Record<string, unknown>) => api.patch(`/clients/${clientId}/contacts/${contactId}`, data).then((r) => r.data.data),
  deleteContact: (clientId: string, contactId: string) => api.delete(`/clients/${clientId}/contacts/${contactId}`).then((r) => r.data),
};

export const deploymentApi = {
  // Deployments
  list: (params?: Record<string, unknown>) => api.get('/deployment', { params }).then(r => r.data),
  create: (data: Record<string, unknown>) => api.post('/deployment', data).then(r => r.data.data),
  end: (id: string, endDate: string) => api.patch(`/deployment/${id}/end`, { endDate }).then(r => r.data.data),
  strength: (tenderId: string) => api.get(`/deployment/strength/${tenderId}`).then(r => r.data.data),
  // Sites
  sites: () => api.get('/deployment/sites').then(r => r.data.data),
  createSite: (data: Record<string, unknown>) => api.post('/deployment/sites', data).then(r => r.data.data),
  // Shifts
  shifts: () => api.get('/deployment/shifts').then(r => r.data.data),
  createShift: (data: Record<string, unknown>) => api.post('/deployment/shifts', data).then(r => r.data.data),
};

export const organizationApi = {
  tree: () => api.get('/organization/tree').then(r => r.data.data ?? r.data),
  // Zones
  zones: () => api.get('/organization/zones').then(r => r.data.data ?? r.data),
  createZone: (data: Record<string, unknown>) => api.post('/organization/zones', data).then(r => r.data.data),
  updateZone: (id: string, data: Record<string, unknown>) => api.patch(`/organization/zones/${id}`, data).then(r => r.data.data),
  deleteZone: (id: string) => api.delete(`/organization/zones/${id}`).then(r => r.data),
  // Regions
  regions: () => api.get('/organization/regions').then(r => r.data.data ?? r.data),
  createRegion: (data: Record<string, unknown>) => api.post('/organization/regions', data).then(r => r.data.data),
  updateRegion: (id: string, data: Record<string, unknown>) => api.patch(`/organization/regions/${id}`, data).then(r => r.data.data),
  deleteRegion: (id: string) => api.delete(`/organization/regions/${id}`).then(r => r.data),
  // Branches
  branches: () => api.get('/organization/branches').then(r => r.data.data ?? r.data),
  createBranch: (data: Record<string, unknown>) => api.post('/organization/branches', data).then(r => r.data.data),
  updateBranch: (id: string, data: Record<string, unknown>) => api.patch(`/organization/branches/${id}`, data).then(r => r.data.data),
  deleteBranch: (id: string) => api.delete(`/organization/branches/${id}`).then(r => r.data),
  // Announcements
  announcements: (params?: Record<string, unknown>) => api.get('/organization/announcements', { params }).then(r => r.data.data ?? r.data),
  createAnnouncement: (data: Record<string, unknown>) => api.post('/organization/announcements', data).then(r => r.data.data),
  updateAnnouncement: (id: string, data: Record<string, unknown>) => api.patch(`/organization/announcements/${id}`, data).then(r => r.data.data),
  publishAnnouncement: (id: string) => api.patch(`/organization/announcements/${id}/publish`, {}).then(r => r.data.data),
  deleteAnnouncement: (id: string) => api.delete(`/organization/announcements/${id}`).then(r => r.data),
  // Awards
  awards: (params?: Record<string, unknown>) => api.get('/organization/awards', { params }).then(r => r.data.data ?? r.data),
  createAward: (data: Record<string, unknown>) => api.post('/organization/awards', data).then(r => r.data.data),
  deleteAward: (id: string) => api.delete(`/organization/awards/${id}`).then(r => r.data),
};

export const attendanceApi = {
  today: () => api.get('/attendance/today').then(r => r.data.data),
  mark: (data: Record<string, unknown>) => api.post('/attendance/mark', data).then(r => r.data.data),
  monthlyReport: (params: Record<string, unknown>) => api.get('/attendance/monthly-report', { params }).then(r => r.data),
  leaveRequests: (params?: Record<string, unknown>) => api.get('/attendance/leave-requests', { params }).then(r => r.data),
  createLeave: (data: Record<string, unknown>) => api.post('/attendance/leave-requests', data).then(r => r.data.data),
  approveLeave: (id: string, action: 'APPROVED' | 'REJECTED', remarks?: string) =>
    api.patch(`/attendance/leave-requests/${id}/approve`, { action, remarks }).then(r => r.data.data),
  leaveTypes: () => api.get('/attendance/leave-types').then(r => r.data.data),
  leaveBalances: (params?: Record<string, unknown>) => api.get('/attendance/leave-balances', { params }).then(r => r.data.data ?? r.data),
  // Biometric
  importBiometric: (logs: unknown[]) => api.post('/attendance/biometric/import', { logs }).then(r => r.data.data),
  biometricLogs: (params?: Record<string, unknown>) => api.get('/attendance/biometric', { params }).then(r => r.data),
  processBiometric: (date: string) => api.post('/attendance/biometric/process', { date }).then(r => r.data.data),
  // Regularization
  regularizations: (params?: Record<string, unknown>) => api.get('/attendance/regularizations', { params }).then(r => r.data),
  createRegularization: (data: Record<string, unknown>) => api.post('/attendance/regularizations', data).then(r => r.data.data),
  reviewRegularization: (id: string, action: string, remarks: string) => api.patch(`/attendance/regularizations/${id}/review`, { action, remarks }).then(r => r.data.data),
  // Policies
  policies: () => api.get('/attendance/policies').then(r => r.data.data ?? r.data),
  createPolicy: (data: Record<string, unknown>) => api.post('/attendance/policies', data).then(r => r.data.data),
  updatePolicy: (id: string, data: Record<string, unknown>) => api.patch(`/attendance/policies/${id}`, data).then(r => r.data.data),
  // Timesheets
  timesheets: (params?: Record<string, unknown>) => api.get('/attendance/timesheets', { params }).then(r => r.data),
  getTimesheet: (id: string) => api.get(`/attendance/timesheets/${id}`).then(r => r.data.data ?? r.data),
  createTimesheet: (data: Record<string, unknown>) => api.post('/attendance/timesheets', data).then(r => r.data.data),
  addTimesheetEntry: (id: string, data: Record<string, unknown>) => api.post(`/attendance/timesheets/${id}/entries`, data).then(r => r.data.data),
  submitTimesheet: (id: string) => api.patch(`/attendance/timesheets/${id}/submit`, {}).then(r => r.data.data),
  approveTimesheet: (id: string) => api.patch(`/attendance/timesheets/${id}/approve`, {}).then(r => r.data.data),
  // Leave Policies
  leavePolicies: () => api.get('/attendance/leave-policies').then(r => r.data.data ?? r.data),
  createLeavePolicy: (data: Record<string, unknown>) => api.post('/attendance/leave-policies', data).then(r => r.data.data),
  updateLeavePolicy: (id: string, data: Record<string, unknown>) => api.patch(`/attendance/leave-policies/${id}`, data).then(r => r.data.data),
};

export const complianceApi = {
  dashboard: () => api.get('/compliance/dashboard').then(r => r.data.data),
  items: (params?: Record<string, unknown>) => api.get('/compliance/items', { params }).then(r => r.data),
  calendar: (month: number, year: number) => api.get('/compliance/calendar', { params: { month, year } }).then(r => r.data.data),
  licenses: () => api.get('/compliance/licenses').then(r => r.data.data),
  createItem: (data: Record<string, unknown>) => api.post('/compliance/items', data).then(r => r.data.data),
  createLicense: (data: Record<string, unknown>) => api.post('/compliance/licenses', data).then(r => r.data.data),
  markFiled: (id: string, data: { challanNo?: string; filedDate: string; amount?: number }) =>
    api.patch(`/compliance/items/${id}/file`, data).then(r => r.data.data),
};

export const financeApi = {
  dashboard: () => api.get('/finance/dashboard').then((r) => r.data.data),
  accounts: () => api.get('/finance/accounts').then((r) => r.data.data),
  journalEntries: (params?: Record<string, unknown>) => api.get('/finance/journal-entries', { params }).then((r) => r.data),
  bankAccounts: (params?: Record<string, unknown>) => api.get('/finance/bank-accounts', { params }).then((r) => r.data),
  expenses: (params?: Record<string, unknown>) => api.get('/finance/expenses', { params }).then((r) => r.data),
  createExpense: (data: Record<string, unknown>) => api.post('/finance/expenses', data).then((r) => r.data.data),
};

export const recruitmentApi = {
  dashboard: () => api.get('/recruitment/dashboard').then((r) => r.data.data ?? r.data),
  requisitions: (params?: Record<string, unknown>) => api.get('/recruitment/requisitions', { params }).then((r) => r.data),
  allOpenRequisitions: () => api.get('/recruitment/requisitions', { params: { limit: 1000 } }).then((r): any[] => r.data?.data ?? r.data ?? []),
  createRequisition: (data: Record<string, unknown>) => api.post('/recruitment/requisitions', data).then((r) => r.data.data),
  updateRequisition: (id: string, data: Record<string, unknown>) => api.patch(`/recruitment/requisitions/${id}`, data).then((r) => r.data.data),
  candidates: (params?: Record<string, unknown>) => api.get('/recruitment/candidates', { params }).then((r) => r.data),
  getCandidate: (id: string) => api.get(`/recruitment/candidates/${id}`).then((r) => r.data.data ?? r.data),
  addCandidate: (requisitionId: string, data: Record<string, unknown>) => api.post(`/recruitment/requisitions/${requisitionId}/candidates`, data).then((r) => r.data.data),
  updateCandidateStatus: (id: string, status: string) => api.patch(`/recruitment/candidates/${id}/status`, { status }).then((r) => r.data.data),
  scheduleInterview: (candidateId: string, data: Record<string, unknown>) => api.post(`/recruitment/candidates/${candidateId}/interviews`, data).then((r) => r.data.data),
  updateInterview: (id: string, data: Record<string, unknown>) => api.patch(`/recruitment/interviews/${id}`, data).then((r) => r.data.data),
  submitFeedback: (interviewId: string, data: Record<string, unknown>) => api.post(`/recruitment/interviews/${interviewId}/feedback`, data).then((r) => r.data.data),
  getAssessments: (candidateId: string) => api.get(`/recruitment/candidates/${candidateId}/assessments`).then((r) => r.data.data ?? r.data),
  createAssessment: (candidateId: string, data: Record<string, unknown>) => api.post(`/recruitment/candidates/${candidateId}/assessments`, data).then((r) => r.data.data),
  updateAssessment: (id: string, data: Record<string, unknown>) => api.patch(`/recruitment/assessments/${id}`, data).then((r) => r.data.data),
  offers: (params?: Record<string, unknown>) => api.get('/recruitment/offers', { params }).then((r) => r.data),
  createOffer: (data: Record<string, unknown>) => api.post('/recruitment/offers', data).then((r) => r.data.data),
  updateOfferStatus: (id: string, status: string) => api.patch(`/recruitment/offers/${id}/status`, { status }).then((r) => r.data.data),
  onboardings: (params?: Record<string, unknown>) => api.get('/recruitment/onboarding', { params }).then((r) => r.data),
  createOnboarding: (data: Record<string, unknown>) => api.post('/recruitment/onboarding', data).then((r) => r.data.data),
  updateOnboarding: (id: string, data: Record<string, unknown>) => api.patch(`/recruitment/onboarding/${id}`, data).then((r) => r.data.data),
};

export const performanceApi = {
  dashboard: () => api.get('/performance/dashboard').then((r) => r.data.data ?? r.data),
  cycles: () => api.get('/performance/cycles').then((r) => r.data.data ?? r.data),
  createCycle: (data: Record<string, unknown>) => api.post('/performance/cycles', data).then((r) => r.data.data),
  updateCycle: (id: string, data: Record<string, unknown>) => api.patch(`/performance/cycles/${id}`, data).then((r) => r.data.data),
  goals: (params?: Record<string, unknown>) => api.get('/performance/goals', { params }).then((r) => r.data),
  createGoal: (data: Record<string, unknown>) => api.post('/performance/goals', data).then((r) => r.data.data),
  updateGoal: (id: string, data: Record<string, unknown>) => api.patch(`/performance/goals/${id}`, data).then((r) => r.data.data),
  reviews: (params?: Record<string, unknown>) => api.get('/performance/reviews', { params }).then((r) => r.data),
  createReview: (data: Record<string, unknown>) => api.post('/performance/reviews', data).then((r) => r.data.data),
  updateReview: (id: string, data: Record<string, unknown>) => api.patch(`/performance/reviews/${id}`, data).then((r) => r.data.data),
};

export const trainingApi = {
  dashboard: () => api.get('/training/dashboard').then((r) => r.data.data ?? r.data),
  programs: (params?: Record<string, unknown>) => api.get('/training/programs', { params }).then((r) => r.data),
  createProgram: (data: Record<string, unknown>) => api.post('/training/programs', data).then((r) => r.data.data),
  updateProgram: (id: string, data: Record<string, unknown>) => api.patch(`/training/programs/${id}`, data).then((r) => r.data.data),
  sessions: (params?: Record<string, unknown>) => api.get('/training/sessions', { params }).then((r) => r.data),
  createSession: (data: Record<string, unknown>) => api.post('/training/sessions', data).then((r) => r.data.data),
  updateSession: (id: string, data: Record<string, unknown>) => api.patch(`/training/sessions/${id}`, data).then((r) => r.data.data),
  enrollments: (params?: Record<string, unknown>) => api.get('/training/enrollments', { params }).then((r) => r.data),
  assign: (data: Record<string, unknown>) => api.post('/training/enrollments', data).then((r) => r.data.data),
  updateEnrollment: (id: string, data: Record<string, unknown>) => api.patch(`/training/enrollments/${id}`, data).then((r) => r.data.data),
  certificates: (params?: Record<string, unknown>) => api.get('/training/certificates', { params }).then((r) => r.data),
  issueCertificate: (data: Record<string, unknown>) => api.post('/training/certificates', data).then((r) => r.data.data),
};

export const assetsApi = {
  dashboard: () => api.get('/assets/dashboard').then((r) => r.data.data),
  list: (params?: Record<string, unknown>) => api.get('/assets', { params }).then((r) => r.data),
  create: (data: Record<string, unknown>) => api.post('/assets', data).then((r) => r.data.data),
  assign: (assetId: string, employeeId: string) => api.post(`/assets/${assetId}/assign`, { employeeId }).then((r) => r.data.data),
  returnAsset: (assignmentId: string, notes?: string) => api.post(`/assets/assignments/${assignmentId}/return`, { notes }).then((r) => r.data),
};

export const documentsApi = {
  list: (params?: Record<string, unknown>) => api.get('/documents', { params }).then((r) => r.data),
  getUploadUrl: (fileName: string, contentType: string) =>
    api.post('/documents/upload-url', { fileName, contentType }).then((r) => r.data.data ?? r.data),
  create: (data: Record<string, unknown>) => api.post('/documents', data).then((r) => r.data.data),
  getDownloadUrl: (id: string) => api.get(`/documents/${id}/download-url`).then((r) => r.data.data ?? r.data),
  remove: (id: string) => api.delete(`/documents/${id}`).then((r) => r.data),
};

export const workflowsApi = {
  definitions: () => api.get('/workflows/definitions').then((r) => r.data.data ?? r.data),
  myApprovals: () => api.get('/workflows/my-approvals').then((r) => r.data.data ?? r.data),
  action: (approvalId: string, action: 'APPROVED' | 'REJECTED', comments?: string) =>
    api.post(`/workflows/approvals/${approvalId}/action`, { action, comments }).then((r) => r.data),
};

export const notificationsApi = {
  unread: () => api.get('/notifications/unread').then((r) => r.data.data ?? r.data),
  markRead: (ids: string[]) => api.patch('/notifications/mark-read', { ids }).then((r) => r.data),
};

export const securityApi = {
  auditLogs: (params?: Record<string, unknown>) => api.get('/tenants/audit-logs', { params }).then((r) => r.data),
  users: () => api.get('/users').then((r) => r.data.data ?? r.data),
  roles: () => api.get('/users/roles').then((r) => r.data.data ?? r.data),
};

// ── Rate Management ──────────────────────────────────────
export const rateApi = {
  list: (params?: Record<string, string>) => api.get('/finance/rates', { params }).then((r) => r.data),
  get: (id: string) => api.get(`/finance/rates/${id}`).then((r) => r.data.data),
  create: (data: Record<string, unknown>) => api.post('/finance/rates', data).then((r) => r.data.data),
  update: (id: string, data: Record<string, unknown>) => api.patch(`/finance/rates/${id}`, data).then((r) => r.data.data),
  deactivate: (id: string) => api.delete(`/finance/rates/${id}`).then((r) => r.data),
  listEscalations: (id: string) => api.get(`/finance/rates/${id}/escalations`).then((r) => r.data.data ?? r.data),
  createEscalation: (id: string, data: Record<string, unknown>) => api.post(`/finance/rates/${id}/escalations`, data).then((r) => r.data.data),
};

export const quotationApi = {
  list: (params?: Record<string, unknown>) =>
    api.get('/billing/quotations', { params }).then((r) => r.data),
  get: (id: string) =>
    api.get(`/billing/quotations/${id}`).then((r) => r.data.data),
  create: (data: Record<string, unknown>) =>
    api.post('/billing/quotations', data).then((r) => r.data.data),
  update: (id: string, data: Record<string, unknown>) =>
    api.patch(`/billing/quotations/${id}`, data).then((r) => r.data.data),
  convert: (id: string) =>
    api.post(`/billing/quotations/${id}/convert`, {}).then((r) => r.data.data),
  sendWhatsApp: (id: string, phone: string, message?: string) =>
    api.post(`/billing/quotations/${id}/send-whatsapp`, { phone, message }).then((r) => r.data.data),
};

// ── Billing Sheets ───────────────────────────────────────
export const billingSheetApi = {
  list: (params?: Record<string, string>) => api.get('/billing/billing-sheets', { params }).then((r) => r.data),
  get: (id: string) => api.get(`/billing/billing-sheets/${id}`).then((r) => r.data.data),
  create: (data: Record<string, unknown>) => api.post('/billing/billing-sheets', data).then((r) => r.data.data),
  submit: (id: string) => api.patch(`/billing/billing-sheets/${id}/submit`, {}).then((r) => r.data.data),
  approve: (id: string) => api.patch(`/billing/billing-sheets/${id}/approve`, {}).then((r) => r.data.data),
  post: (id: string) => api.patch(`/billing/billing-sheets/${id}/post`, {}).then((r) => r.data.data),
  updateLine: (id: string, lineId: string, data: Record<string, unknown>) => api.patch(`/billing/billing-sheets/${id}/lines/${lineId}`, data).then((r) => r.data.data),
};

// ── GST Management ───────────────────────────────────────
export const gstApi = {
  getLedger: (params?: Record<string, string>) => api.get('/finance/gst/ledger', { params }).then((r) => r.data.data ?? r.data),
  getGSTR1: (params?: Record<string, string>) => api.get('/finance/gst/gstr1', { params }).then((r) => r.data.data ?? r.data),
  getGSTR3B: (params?: Record<string, string>) => api.get('/finance/gst/gstr3b', { params }).then((r) => r.data.data ?? r.data),
  getHSN: () => api.get('/finance/gst/hsn').then((r) => r.data.data ?? r.data),
  createHSN: (data: Record<string, unknown>) => api.post('/finance/gst/hsn', data).then((r) => r.data.data),
  getReconciliation: (params?: Record<string, string>) => api.get('/finance/gst/reconciliation', { params }).then((r) => r.data.data ?? r.data),
  syncFromInvoice: (invoiceId: string) => api.post(`/finance/gst/sync/${invoiceId}`, {}).then((r) => r.data.data),
};

// ── Accounts Receivable ──────────────────────────────────
export const arApi = {
  getOutstanding: () => api.get('/finance/ar/outstanding').then((r) => r.data.data ?? r.data),
  getAging: () => api.get('/finance/ar/aging').then((r) => r.data.data ?? r.data),
  getClientLedger: (clientId: string, params?: Record<string, string>) => api.get(`/finance/ar/clients/${clientId}/ledger`, { params }).then((r) => r.data.data ?? r.data),
  getCreditStatus: (clientId: string) => api.get(`/finance/ar/clients/${clientId}/credit-status`).then((r) => r.data.data ?? r.data),
  sendReminder: (clientId: string) => api.post(`/finance/ar/clients/${clientId}/send-reminder`, {}).then((r) => r.data),
};

// ── Collection Management ────────────────────────────────
export const collectionApi = {
  listReceipts: (params?: Record<string, string>) => api.get('/billing/collections/receipts', { params }).then((r) => r.data),
  recordAdvance: (data: Record<string, unknown>) => api.post('/billing/collections/advance', data).then((r) => r.data.data),
  allocatePayment: (id: string, allocations: unknown[]) => api.patch(`/billing/collections/${id}/allocate`, { allocations }).then((r) => r.data.data),
  getUnallocated: () => api.get('/billing/collections/unallocated').then((r) => r.data.data ?? r.data),
  getCheques: (params?: Record<string, string>) => api.get('/billing/collections/cheques', { params }).then((r) => r.data),
};

// ── Voucher / Accounting ─────────────────────────────────
export const voucherApi = {
  create: (data: Record<string, unknown>) => api.post('/finance/vouchers', data).then((r) => r.data.data),
  list: (params?: Record<string, string>) => api.get('/finance/vouchers', { params }).then((r) => r.data),
  get: (id: string) => api.get(`/finance/vouchers/${id}`).then((r) => r.data.data),
  post: (id: string) => api.patch(`/finance/vouchers/${id}/post`, {}).then((r) => r.data.data),
  cancel: (id: string) => api.patch(`/finance/vouchers/${id}/cancel`, {}).then((r) => r.data.data),
  getDayBook: (date: string) => api.get('/finance/day-book', { params: { date } }).then((r) => r.data.data ?? r.data),
  getAccountLedger: (accountId: string, params?: Record<string, string>) => api.get(`/finance/accounts/${accountId}/ledger`, { params }).then((r) => r.data.data ?? r.data),
};

// ── Financial Statements ─────────────────────────────────
export const statementsApi = {
  getTrialBalance: (params?: Record<string, string>) => api.get('/finance/statements/trial-balance', { params }).then((r) => r.data.data ?? r.data),
  getProfitLoss: (params?: Record<string, string>) => api.get('/finance/statements/profit-loss', { params }).then((r) => r.data.data ?? r.data),
  getBalanceSheet: (params?: Record<string, string>) => api.get('/finance/statements/balance-sheet', { params }).then((r) => r.data.data ?? r.data),
  getCashFlow: (params?: Record<string, string>) => api.get('/finance/statements/cash-flow', { params }).then((r) => r.data.data ?? r.data),
  getChartOfAccounts: () => api.get('/finance/accounts').then((r) => r.data.data ?? r.data),
};

// ── Banking ──────────────────────────────────────────────
export const bankingApi = {
  getBankAccounts: () => api.get('/finance/banking/accounts').then((r) => r.data.data ?? r.data),
  importStatement: (accountId: string, lines: unknown[]) => api.post(`/finance/banking/accounts/${accountId}/import-statement`, { lines }).then((r) => r.data.data),
  getUnreconciled: (accountId: string, params?: Record<string, string>) => api.get(`/finance/banking/accounts/${accountId}/unreconciled`, { params }).then((r) => r.data.data ?? r.data),
  reconcileLine: (lineId: string, voucherId: string, note?: string) => api.patch(`/finance/banking/lines/${lineId}/reconcile`, { voucherId, note }).then((r) => r.data.data),
  getReconciliationSummary: (accountId: string) => api.get(`/finance/banking/accounts/${accountId}/reconciliation-summary`).then((r) => r.data.data ?? r.data),
};

// ── Tender Profitability ─────────────────────────────────
export const tenderProfitabilityApi = {
  getDashboard: () => api.get('/finance/profitability/dashboard').then((r) => r.data.data ?? r.data),
  getHistory: (tenderId: string) => api.get(`/finance/profitability/tenders/${tenderId}/history`).then((r) => r.data.data ?? r.data),
  compute: (tenderId: string, month: string) => api.post(`/finance/profitability/tenders/${tenderId}/compute`, { month }).then((r) => r.data.data),
  getCosts: (tenderId: string, params?: Record<string, string>) => api.get(`/finance/profitability/tenders/${tenderId}/costs`, { params }).then((r) => r.data.data ?? r.data),
  addCost: (tenderId: string, data: Record<string, unknown>) => api.post(`/finance/profitability/tenders/${tenderId}/costs`, data).then((r) => r.data.data),
  compare: (tenderIds: string[], month: string) => api.post('/finance/profitability/compare', { tenderIds, month }).then((r) => r.data.data ?? r.data),
};

// ── Revenue Management ───────────────────────────────────
export const revenueApi = {
  getSummary: (params?: Record<string, string>) => api.get('/finance/revenue/summary', { params }).then((r) => r.data.data ?? r.data),
  getSchedules: (params?: Record<string, string>) => api.get('/finance/revenue/schedules', { params }).then((r) => r.data),
  createSchedule: (data: Record<string, unknown>) => api.post('/finance/revenue/schedules', data).then((r) => r.data.data),
  recognize: (id: string) => api.patch(`/finance/revenue/schedules/${id}/recognize`, {}).then((r) => r.data.data),
  defer: (id: string, reason: string) => api.patch(`/finance/revenue/schedules/${id}/defer`, { reason }).then((r) => r.data.data),
  getMonthlyChart: (months?: number) => api.get('/finance/revenue/monthly-chart', months ? { params: { months: String(months) } } : undefined).then((r) => r.data.data ?? r.data),
};

// ── Masters (Reference Data) ─────────────────────────────
export const mastersApi = {
  // Designations
  designations: () => api.get('/masters/designations').then(r => r.data.data ?? r.data),
  createDesignation: (data: Record<string, unknown>) => api.post('/masters/designations', data).then(r => r.data.data),
  updateDesignation: (id: string, data: Record<string, unknown>) => api.patch(`/masters/designations/${id}`, data).then(r => r.data.data),
  deleteDesignation: (id: string) => api.delete(`/masters/designations/${id}`).then(r => r.data),
  // Departments
  departments: () => api.get('/masters/departments').then(r => r.data.data ?? r.data),
  createDepartment: (data: Record<string, unknown>) => api.post('/masters/departments', data).then(r => r.data.data),
  updateDepartment: (id: string, data: Record<string, unknown>) => api.patch(`/masters/departments/${id}`, data).then(r => r.data.data),
  deleteDepartment: (id: string) => api.delete(`/masters/departments/${id}`).then(r => r.data),
  // Shifts
  shifts: () => api.get('/masters/shifts').then(r => r.data.data ?? r.data),
  createShift: (data: Record<string, unknown>) => api.post('/masters/shifts', data).then(r => r.data.data),
  updateShift: (id: string, data: Record<string, unknown>) => api.patch(`/masters/shifts/${id}`, data).then(r => r.data.data),
  deleteShift: (id: string) => api.delete(`/masters/shifts/${id}`).then(r => r.data),
  // Leave Types
  leaveTypes: () => api.get('/masters/leave-types').then(r => r.data.data ?? r.data),
  createLeaveType: (data: Record<string, unknown>) => api.post('/masters/leave-types', data).then(r => r.data.data),
  updateLeaveType: (id: string, data: Record<string, unknown>) => api.patch(`/masters/leave-types/${id}`, data).then(r => r.data.data),
  deleteLeaveType: (id: string) => api.delete(`/masters/leave-types/${id}`).then(r => r.data),
  // Holidays
  holidays: (year?: number) => api.get('/masters/holidays', year ? { params: { year } } : undefined).then(r => r.data.data ?? r.data),
  createHoliday: (data: Record<string, unknown>) => api.post('/masters/holidays', data).then(r => r.data.data),
  updateHoliday: (id: string, data: Record<string, unknown>) => api.patch(`/masters/holidays/${id}`, data).then(r => r.data.data),
  deleteHoliday: (id: string) => api.delete(`/masters/holidays/${id}`).then(r => r.data),
  // Sites
  sites: () => api.get('/masters/sites').then(r => r.data.data ?? r.data),
  createSite: (data: Record<string, unknown>) => api.post('/masters/sites', data).then(r => r.data.data),
  updateSite: (id: string, data: Record<string, unknown>) => api.patch(`/masters/sites/${id}`, data).then(r => r.data.data),
  deleteSite: (id: string) => api.delete(`/masters/sites/${id}`).then(r => r.data),
  // Salary Components
  salaryComponents: () => api.get('/masters/salary-components').then(r => r.data.data ?? r.data),
  createSalaryComponent: (data: Record<string, unknown>) => api.post('/masters/salary-components', data).then(r => r.data.data),
  updateSalaryComponent: (id: string, data: Record<string, unknown>) => api.patch(`/masters/salary-components/${id}`, data).then(r => r.data.data),
  deleteSalaryComponent: (id: string) => api.delete(`/masters/salary-components/${id}`).then(r => r.data),
  // Financial Years
  financialYears: () => api.get('/masters/financial-years').then(r => r.data.data ?? r.data),
  createFinancialYear: (data: Record<string, unknown>) => api.post('/masters/financial-years', data).then(r => r.data.data),
  updateFinancialYear: (id: string, data: Record<string, unknown>) => api.patch(`/masters/financial-years/${id}`, data).then(r => r.data.data),
  // Chart of Accounts
  accounts: () => api.get('/masters/accounts').then(r => r.data.data ?? r.data),
  createAccount: (data: Record<string, unknown>) => api.post('/masters/accounts', data).then(r => r.data.data),
  updateAccount: (id: string, data: Record<string, unknown>) => api.patch(`/masters/accounts/${id}`, data).then(r => r.data.data),
  deleteAccount: (id: string) => api.delete(`/masters/accounts/${id}`).then(r => r.data),
  // Bank Accounts
  bankAccounts: () => api.get('/masters/bank-accounts').then(r => r.data.data ?? r.data),
  createBankAccount: (data: Record<string, unknown>) => api.post('/masters/bank-accounts', data).then(r => r.data.data),
  updateBankAccount: (id: string, data: Record<string, unknown>) => api.patch(`/masters/bank-accounts/${id}`, data).then(r => r.data.data),
  deleteBankAccount: (id: string) => api.delete(`/masters/bank-accounts/${id}`).then(r => r.data),
  // HSN / GST Master
  hsnList: () => api.get('/masters/hsn').then(r => r.data.data ?? r.data),
  hsnCreate: (data: Record<string, unknown>) => api.post('/masters/hsn', data).then(r => r.data.data),
  hsnUpdate: (id: string, data: Record<string, unknown>) => api.patch(`/masters/hsn/${id}`, data).then(r => r.data.data),
  hsnDelete: (id: string) => api.delete(`/masters/hsn/${id}`).then(r => r.data),
  // Rate Master
  rateMasters: () => api.get('/masters/rate-masters').then(r => r.data.data ?? r.data),
  createRateMaster: (data: Record<string, unknown>) => api.post('/masters/rate-masters', data).then(r => r.data.data),
  updateRateMaster: (id: string, data: Record<string, unknown>) => api.patch(`/masters/rate-masters/${id}`, data).then(r => r.data.data),
  deleteRateMaster: (id: string) => api.delete(`/masters/rate-masters/${id}`).then(r => r.data),
};

// ── Cost Centers ─────────────────────────────────────────
export const costCenterApi = {
  list: () => api.get('/finance/cost-centers').then((r) => r.data.data ?? r.data),
  create: (data: Record<string, unknown>) => api.post('/finance/cost-centers', data).then((r) => r.data.data),
  update: (id: string, data: Record<string, unknown>) => api.patch(`/finance/cost-centers/${id}`, data).then((r) => r.data.data),
  remove: (id: string) => api.delete(`/finance/cost-centers/${id}`).then((r) => r.data),
  getPnL: (id: string, params?: Record<string, string>) => api.get(`/finance/cost-centers/${id}/pnl`, { params }).then((r) => r.data.data ?? r.data),
};

// ── Work Orders ──────────────────────────────────────────────────────────────
export const workOrdersApi = {
  dashboard: () => api.get('/work-orders/dashboard').then((r) => r.data.data ?? r.data),
  list: (params?: Record<string, unknown>) => api.get('/work-orders', { params }).then((r) => r.data),
  selectAll: () => api.get('/work-orders', { params: { limit: 1000 } }).then((r): any[] => r.data?.data ?? r.data ?? []),
  get: (id: string) => api.get(`/work-orders/${id}`).then((r) => r.data.data),
  create: (data: Record<string, unknown>) => api.post('/work-orders', data).then((r) => r.data.data),
  update: (id: string, data: Record<string, unknown>) => api.patch(`/work-orders/${id}`, data).then((r) => r.data.data),
  // Positions
  positions: (woId: string) => api.get(`/work-orders/${woId}/positions`).then((r) => r.data.data ?? r.data),
  createPosition: (woId: string, data: Record<string, unknown>) => api.post(`/work-orders/${woId}/positions`, data).then((r) => r.data.data),
  // Milestones
  milestones: (woId: string) => api.get(`/work-orders/${woId}/milestones`).then((r) => r.data.data ?? r.data),
  createMilestone: (woId: string, data: Record<string, unknown>) => api.post(`/work-orders/${woId}/milestones`, data).then((r) => r.data.data),
  updateMilestone: (mid: string, data: Record<string, unknown>) => api.patch(`/work-orders/milestones/${mid}`, data).then((r) => r.data.data),
  // Amendments
  amendments: (woId: string) => api.get(`/work-orders/${woId}/amendments`).then((r) => r.data.data ?? r.data),
  createAmendment: (woId: string, data: Record<string, unknown>) => api.post(`/work-orders/${woId}/amendments`, data).then((r) => r.data.data),
  // Fulfillments
  fulfillments: (woId: string) => api.get(`/work-orders/${woId}/fulfillments`).then((r) => r.data.data ?? r.data),
  addFulfillment: (woId: string, data: Record<string, unknown>) => api.post(`/work-orders/${woId}/fulfillments`, data).then((r) => r.data.data),
  releaseFulfillment: (fid: string, releasedDate: string) => api.patch(`/work-orders/fulfillments/${fid}/release`, { releasedDate }).then((r) => r.data.data),
  // Invoices
  invoices: (woId: string) => api.get(`/work-orders/${woId}/invoices`).then((r) => r.data.data ?? r.data),
  createInvoice: (woId: string, data: Record<string, unknown>) => api.post(`/work-orders/${woId}/invoices`, data).then((r) => r.data.data),
  updateInvoiceStatus: (invId: string, status: string) => api.patch(`/work-orders/invoices/${invId}/status`, { status }).then((r) => r.data.data),
  // Payments
  payments: (woId: string) => api.get(`/work-orders/${woId}/payments`).then((r) => r.data.data ?? r.data),
  recordPayment: (woId: string, data: Record<string, unknown>) => api.post(`/work-orders/${woId}/payments`, data).then((r) => r.data.data),
};

// ── Logistics ────────────────────────────────────────────────────────────────
export const logisticsApi = {
  dashboard: () => api.get('/logistics/dashboard').then((r) => r.data.data ?? r.data),
  vendors: () => api.get('/logistics/vendors').then((r) => {
    const d = r.data?.data ?? r.data;
    return Array.isArray(d) ? d : [];
  }),
  createVendor: (data: Record<string, unknown>) => api.post('/logistics/vendors', data).then((r) => r.data.data),
  updateVendor: (id: string, data: Record<string, unknown>) => api.patch(`/logistics/vendors/${id}`, data).then((r) => r.data.data),
  dispatches: (params?: Record<string, unknown>) => api.get('/logistics/dispatches', { params }).then((r) => r.data),
  createDispatch: (data: Record<string, unknown>) => api.post('/logistics/dispatches', data).then((r) => r.data.data),
  updateDispatch: (id: string, data: Record<string, unknown>) => api.patch(`/logistics/dispatches/${id}`, data).then((r) => r.data.data),
  receipts: (params?: Record<string, unknown>) => api.get('/logistics/receipts', { params }).then((r) => r.data),
  createReceipt: (data: Record<string, unknown>) => api.post('/logistics/receipts', data).then((r) => r.data.data),
  updateReceipt: (id: string, data: Record<string, unknown>) => api.patch(`/logistics/receipts/${id}`, data).then((r) => r.data.data),
};

// ── Visitor Management ───────────────────────────────────────────────────────
export const visitorsApi = {
  dashboard: () => api.get('/visitors/dashboard').then((r) => r.data.data ?? r.data),
  list: (params?: Record<string, unknown>) => api.get('/visitors', { params }).then((r) => r.data),
  updateVisitor: (id: string, data: Record<string, unknown>) => api.patch(`/visitors/${id}`, data).then((r) => r.data.data),
  toggleBlacklist: (id: string, blacklist: boolean, reason?: string) => api.patch(`/visitors/${id}/blacklist`, { blacklist, reason }).then((r) => r.data.data),
  logs: (params?: Record<string, unknown>) => api.get('/visitors/logs', { params }).then((r) => r.data),
  checkIn: (data: Record<string, unknown>) => api.post('/visitors/check-in', data).then((r) => r.data.data),
  checkOut: (logId: string) => api.patch(`/visitors/logs/${logId}/check-out`, {}).then((r) => r.data.data),
};

// ── Supervisor — Shared Types ────────────────────────────────────────
export interface ResponseDto<T> { success: boolean; data: T; message?: string }
export interface SiteComplaint {
  id: string; tenantId: string; siteId: string; category: string; severity: string;
  status: string; title: string; description: string; attachments: string[];
  reportedById: string; resolvedAt: string | null; resolutionNote: string | null;
  createdAt: string; site?: { id: string; name: string; code: string };
  reportedBy?: { id: string; firstName: string; lastName: string };
}
export interface SiteActivityLog {
  id: string; siteId: string; supervisorId: string; logDate: string;
  workDone: string; headcount: number; hasIncident: boolean;
  incidentType: string | null; incidentDesc: string | null; photoUrls: string[];
  createdAt: string;
}
export type CreateComplaintPayload = { siteId: string; category: string; severity?: string; title: string; description: string; assignedToId?: string; attachments?: string[] };
export type ActivityLogPayload = { siteId: string; logDate?: string; workDone: string; headcount: number; hasIncident?: boolean; incidentType?: string; incidentDesc?: string; photoUrls?: string[] };

// ── Supervisor — Complaints ──────────────────────────────────────────
export const complaintsApi = {
  list: (siteId?: string) => api.get<ResponseDto<SiteComplaint[]>>(`/complaints${siteId ? `?siteId=${siteId}` : ''}`),
  get: (id: string) => api.get<ResponseDto<SiteComplaint>>(`/complaints/${id}`),
  create: (data: CreateComplaintPayload) => api.post<ResponseDto<SiteComplaint>>('/complaints', data),
  update: (id: string, data: Partial<CreateComplaintPayload> & { status?: string }) => api.patch<ResponseDto<SiteComplaint>>(`/complaints/${id}`, data),
  delete: (id: string) => api.delete(`/complaints/${id}`),
};

// ── Supervisor — Activity Log ────────────────────────────────────────
export const activityLogApi = {
  list: (siteId: string, startDate?: string, endDate?: string) => api.get<ResponseDto<SiteActivityLog[]>>(`/activity-log?siteId=${siteId}${startDate ? `&startDate=${startDate}` : ''}${endDate ? `&endDate=${endDate}` : ''}`),
  today: (siteId: string) => api.get<ResponseDto<SiteActivityLog | null>>(`/activity-log/today?siteId=${siteId}`),
  save: (data: ActivityLogPayload) => api.post<ResponseDto<SiteActivityLog>>('/activity-log', data),
  uploadPhoto: (file: File, siteId: string) => {
    const fd = new FormData(); fd.append('photo', file);
    return api.post<ResponseDto<{ url: string }>>('/activity-log/upload-photo', fd, { headers: { 'Content-Type': 'multipart/form-data' } });
  },
};
