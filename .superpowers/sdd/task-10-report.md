# Task 10 Report — HR Manager Riverpod Data Providers

## Status
COMPLETE

## Commit
f4091db — feat(mobile): add HR Manager Riverpod data providers (Task 10)

## File Created
`apps/mobile/lib/features/hr_admin/providers/hr_provider.dart`
707 lines, single file.

## Test Summary
`flutter analyze lib/features/hr_admin/providers/hr_provider.dart` — **No issues found** (0 warnings, 0 errors).

## What was implemented

### Models (10)
| Model | Key notes |
|---|---|
| `HrSummary` | Maps `newJoinersThisMonth`, `openRequisitions`, `pendingLeaveRequests`, `complianceOverdue` from `/reports/summary` |
| `HrEmployee` | `name = firstName + ' ' + lastName`; exposes `photoUrl` |
| `HrEmployeeDetail` | Full profile + documents (from `employeeDocuments` or 3-item PENDING stub) + bank (from nested `bankDetails`) + salary (from `salaryDetails`) + leaveBalances (from `leaveBalance` map or default `{'CL':8,'SL':6,'EL':15}`) |
| `HrAttendanceRecord` | Reads from nested `employee` object; preserves `checkOutTime` |
| `HrLeaveRequest` | `days` from `numberOfDays ?? days`; `employeeName` from nested `employee` |
| `HrPayrollRun` | `month` formatted as "June 2026" from `month` field or `createdAt` ISO string |
| `HrCompliance` | `defaultList()` static factory for graceful fallback |
| `HrJobRequisition` | `vacancies` from `vacancies ?? numberOfVacancies`; `applicationsCount` from `applicationsCount ?? candidateCount` |
| `HrCandidate` | `position` from `jobRequisition?.title ?? 'Unknown Position'`; `appliedDate` falls back to `createdAt` |

### Providers (10 + 1 notifier)
| Provider | Endpoint |
|---|---|
| `hrSummaryProvider` | GET `/reports/summary` |
| `hrEmployeesProvider` | GET `/employees?limit=200&status=ALL` |
| `hrEmployeeDetailProvider` (family) | GET `/employees/:id?include=documents,bankDetails,leaveBalance` |
| `hrAttendanceTodayProvider` | GET `/attendance/today?limit=200` |
| `hrPendingLeavesProvider` | GET `/attendance/leave-requests?status=PENDING&limit=50` |
| `hrAllLeavesProvider` | GET `/attendance/leave-requests?limit=100` |
| `hrPayrollRunsProvider` | GET `/payroll-runs?limit=12&sortBy=createdAt&sortOrder=desc` |
| `hrComplianceProvider` | GET `/compliance/summary` → fallback `/compliance-items?limit=20` → static defaults |
| `hrRequisitionsProvider` | GET `/job-requisitions?limit=50` |
| `hrCandidatesProvider` | GET `/candidates?limit=100` |
| `hrLeaveNotifierProvider` | PATCH `/attendance/leave-requests/:id` with approve/reject + cache invalidation |

### Error handling
- All providers catch `DioException` and re-throw `response.data['message']` or a human-readable fallback string.
- `hrComplianceProvider` silently catches both primary and fallback endpoint errors and returns `HrCompliance.defaultList()`.
