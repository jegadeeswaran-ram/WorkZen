export const ESI_RATE_EMPLOYEE = 0.0075;   // 0.75% employee share
export const ESI_RATE_EMPLOYER = 0.0325;   // 3.25% employer share
export const ESI_WAGE_CEILING = 21000;     // Gross salary ceiling for ESI applicability

export const PF_RATE_EMPLOYEE = 0.12;      // 12% of basic
export const PF_RATE_EMPLOYER = 0.12;      // 12% employer contribution
export const PF_WAGE_CEILING = 15000;      // Basic salary ceiling for mandatory PF
export const PF_MAX_DEDUCTION = 1800;      // Max PF deduction per month (12% of 15000)

export const PT_SLABS: Record<string, Record<number, number>> = {
  MH: { 7500: 175, 10000: 175, Infinity: 200 },
  KA: { 15000: 0, 25000: 150, Infinity: 200 },
};

export const LWF_STATES = ['MH', 'KA', 'TN', 'AP', 'TS'];

export const ATTENDANCE_METHODS = ['GPS', 'QR', 'BIOMETRIC', 'MANUAL', 'MOBILE'] as const;

export const MAX_UPLOAD_SIZE_MB = 50;
export const ALLOWED_MIME_TYPES = ['application/pdf', 'image/jpeg', 'image/png', 'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'application/vnd.ms-excel', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'];

export const INDIAN_HOLIDAYS_2025 = [
  { date: '2025-01-26', name: 'Republic Day' },
  { date: '2025-08-15', name: 'Independence Day' },
  { date: '2025-10-02', name: 'Gandhi Jayanti' },
  { date: '2025-12-25', name: 'Christmas Day' },
];

export const PAYROLL_COMPONENTS = {
  BASIC: 'BASIC',
  DA: 'DA',
  HRA: 'HRA',
  SPECIAL_ALLOWANCE: 'SPECIAL_ALLOWANCE',
  CONVEYANCE: 'CONVEYANCE',
  MEDICAL: 'MEDICAL',
  PF_DEDUCTION: 'PF_DEDUCTION',
  ESI_DEDUCTION: 'ESI_DEDUCTION',
  PROFESSIONAL_TAX: 'PROFESSIONAL_TAX',
  LOAN_DEDUCTION: 'LOAN_DEDUCTION',
  TDS: 'TDS',
} as const;
