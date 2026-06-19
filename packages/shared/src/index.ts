// ── Shared TypeScript types across API and Web ──

export type PaginatedResponse<T> = {
  data: T[];
  meta: {
    total: number;
    page: number;
    limit: number;
    totalPages: number;
  };
};

export type ApiResponse<T> = {
  statusCode: number;
  message: string;
  data: T;
};

export type ApiError = {
  statusCode: number;
  message: string;
  errors?: Record<string, string[]>;
};

// ── Auth ──
export type LoginRequest = { email: string; password: string; totpCode?: string };
export type LoginResponse = { accessToken: string; refreshToken: string; user: UserProfile };
export type UserProfile = { id: string; firstName: string; lastName: string; email: string; roles: string[]; tenantId: string };

// ── Enums ──
export enum AttendanceStatus { PRESENT = 'PRESENT', ABSENT = 'ABSENT', LEAVE = 'LEAVE', HALF_DAY = 'HALF_DAY', LATE = 'LATE', HOLIDAY = 'HOLIDAY' }
export enum EmploymentType { PERMANENT = 'PERMANENT', CONTRACT = 'CONTRACT', PROBATION = 'PROBATION' }
export enum TenderStatus { DRAFT = 'DRAFT', SUBMITTED = 'SUBMITTED', AWARDED = 'AWARDED', ACTIVE = 'ACTIVE', EXPIRED = 'EXPIRED', CANCELLED = 'CANCELLED' }
export enum InvoiceStatus { DRAFT = 'DRAFT', SENT = 'SENT', PARTIALLY_PAID = 'PARTIALLY_PAID', PAID = 'PAID', OVERDUE = 'OVERDUE', CANCELLED = 'CANCELLED' }
export enum LeaveStatus { PENDING = 'PENDING', APPROVED = 'APPROVED', REJECTED = 'REJECTED', CANCELLED = 'CANCELLED' }
export enum ComplianceStatus { PENDING = 'PENDING', FILED = 'FILED', OVERDUE = 'OVERDUE', WAIVED = 'WAIVED' }
export enum PayrollStatus { DRAFT = 'DRAFT', PROCESSING = 'PROCESSING', PENDING_APPROVAL = 'PENDING_APPROVAL', APPROVED = 'APPROVED', PAID = 'PAID' }
export enum AssetStatus { AVAILABLE = 'AVAILABLE', ASSIGNED = 'ASSIGNED', MAINTENANCE = 'MAINTENANCE', RETIRED = 'RETIRED', LOST = 'LOST' }

// ── Common filter params ──
export type PaginationParams = { page?: number; limit?: number; search?: string; sortBy?: string; sortOrder?: 'asc' | 'desc' };
