import 'package:flutter/foundation.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

import '../../features/auth/screens/login_screen.dart';
import '../../features/auth/screens/splash_screen.dart';
import '../../features/home/screens/home_screen.dart';
import '../../features/attendance/screens/attendance_screen.dart';
import '../../features/leave/screens/leave_screen.dart';
import '../../features/payslip/screens/payslips_screen.dart';
import '../../features/profile/screens/profile_screen.dart';
import '../../features/notifications/screens/notifications_screen.dart';
import '../../features/dashboard/screens/employee_dashboard_screen.dart';
import '../../features/employees/screens/employees_screen.dart';
import '../../features/employees/screens/employee_detail_screen.dart';
import '../../features/tenders/screens/tenders_screen.dart';
import '../../features/tenders/screens/tender_detail_screen.dart';
import '../../features/work_orders/screens/work_orders_screen.dart';
import '../../features/work_orders/screens/work_order_detail_screen.dart';
import '../../features/clients/screens/clients_screen.dart';
import '../../features/clients/screens/client_detail_screen.dart';
import '../../features/compliance/screens/compliance_screen.dart';
import '../../features/reports/screens/reports_screen.dart';
import '../../features/workflows/screens/workflows_screen.dart';
import '../../features/finance/screens/finance_screen.dart';
import '../../features/billing/screens/billing_screen.dart';
import '../../features/billing/screens/invoice_detail_screen.dart';
import '../../features/calendar/screens/calendar_screen.dart';
import '../../features/recruitment/screens/recruitment_screen.dart';
import '../../features/recruitment/screens/job_detail_screen.dart';
import '../../features/deployment/screens/deployment_screen.dart';
import '../../features/documents/screens/documents_screen.dart';
import '../../features/visitors/screens/visitors_screen.dart';
import '../../features/visitors/screens/create_visitor_screen.dart';
import '../../features/compliance/screens/compliance_detail_screen.dart';
import '../../features/compliance/screens/compliance_form_screen.dart';
import '../../features/deployment/screens/deployment_detail_screen.dart';
import '../../features/employees/screens/employee_form_screen.dart';
import '../../features/tenders/screens/tender_form_screen.dart';
import '../../features/clients/screens/client_form_screen.dart';
import '../../features/finance/screens/add_transaction_screen.dart';
import '../../features/supervisor/screens/supervisor_dashboard_screen.dart';
import '../../features/supervisor/screens/team_members_screen.dart';
import '../../features/supervisor/screens/leave_approvals_screen.dart';
import '../../features/supervisor/screens/team_attendance_screen.dart';
import '../../features/supervisor/screens/complaints_screen.dart';
import '../../features/supervisor/screens/new_complaint_screen.dart';
import '../../features/supervisor/screens/activity_log_screen.dart';
import '../../features/supervisor/screens/sites_screen.dart';
import '../../features/super_admin/screens/super_admin_shell.dart';
import '../../features/super_admin/screens/sa_dashboard_screen.dart';
import '../../features/super_admin/screens/sa_sites_screen.dart';
import '../../features/super_admin/screens/sa_site_detail_screen.dart';
import '../../features/super_admin/screens/sa_tenders_screen.dart';
import '../../features/super_admin/screens/sa_tender_detail_screen.dart';
import '../../features/super_admin/screens/sa_reports_screen.dart';
import '../../features/super_admin/screens/sa_billing_screen.dart';
import '../../features/super_admin/screens/sa_clients_screen.dart';
import '../../features/super_admin/screens/sa_employees_screen.dart';
import '../../features/super_admin/screens/sa_issues_screen.dart';
import '../../features/super_admin/screens/sa_complaints_screen.dart';
import '../../features/super_admin/screens/sa_more_screen.dart';
import '../../features/hr_admin/screens/hr_shell.dart';
import '../../features/hr_admin/screens/hr_dashboard_screen.dart';
import '../../features/hr_admin/screens/hr_employees_screen.dart';
import '../../features/hr_admin/screens/hr_employee_detail_screen.dart';
import '../../features/hr_admin/screens/hr_payroll_screen.dart';
import '../../features/hr_admin/screens/hr_compliance_screen.dart';
import '../../features/hr_admin/screens/hr_recruitment_screen.dart';
import '../../features/hr_admin/screens/hr_leave_approvals_screen.dart';
import '../../features/hr_admin/screens/hr_attendance_screen.dart';
import '../../features/hr_admin/screens/hr_reports_screen.dart';
import '../../features/hr_admin/screens/hr_more_screen.dart';
import '../providers/auth_provider.dart';

class _AuthListenable extends ChangeNotifier {
  _AuthListenable(Ref ref) {
    ref.listen<AsyncValue<AuthUser?>>(authStateProvider, (_, __) {
      notifyListeners();
    });
  }
}

final appRouterProvider = Provider<GoRouter>((ref) {
  final listenable = _AuthListenable(ref);

  return GoRouter(
    initialLocation: '/splash',
    refreshListenable: listenable,
    redirect: (context, state) {
      final authState = ref.read(authStateProvider);
      final isLoading = authState is AsyncLoading;
      final isLoggedIn = authState.value != null;
      final location = state.uri.path;
      final isAuthRoute = location == '/login' || location == '/splash';

      if (isLoading && location == '/splash') return null;
      if (!isLoggedIn && !isAuthRoute) return '/login';
      if (isLoggedIn && isAuthRoute) {
        final role = authState.value?.role ?? '';
        if (role == 'SUPER_ADMIN' || role == 'COMPANY_OWNER') {
          return '/sa/dashboard';
        } else if (role == 'HR_MANAGER') {
          return '/hr/dashboard';
        } else if (role == 'SITE_SUPERVISOR') {
          return '/supervisor/dashboard';
        } else {
          return '/dashboard';
        }
      }
      if (isLoggedIn && !isAuthRoute) {
        final role = authState.value?.role ?? '';
        if (role == 'SUPER_ADMIN' || role == 'COMPANY_OWNER') {
          if (!location.startsWith('/sa/')) return '/sa/dashboard';
        } else if (role == 'HR_MANAGER') {
          if (!location.startsWith('/hr/')) return '/hr/dashboard';
        } else if (role == 'SITE_SUPERVISOR') {
          if (!location.startsWith('/supervisor/')) return '/supervisor/dashboard';
        } else {
          if (!location.startsWith('/dashboard') && location == '/') return '/dashboard';
        }
      }
      return null;
    },
    routes: [
      GoRoute(path: '/splash', builder: (_, __) => const SplashScreen()),
      GoRoute(path: '/login', builder: (_, __) => const LoginScreen()),

      // ── Super Admin Shell ──────────────────────────────────────────────────
      ShellRoute(
        builder: (context, state, child) => SuperAdminShell(child: child),
        routes: [
          GoRoute(path: '/sa/dashboard', builder: (_, __) => const SaDashboardScreen()),
          GoRoute(path: '/sa/sites', builder: (_, __) => const SaSitesScreen()),
          GoRoute(
            path: '/sa/sites/:siteId',
            builder: (_, state) => SaSiteDetailScreen(siteId: state.pathParameters['siteId']!),
          ),
          GoRoute(path: '/sa/tenders', builder: (_, __) => const SaTendersScreen()),
          GoRoute(
            path: '/sa/tenders/:tenderId',
            builder: (_, state) => SaTenderDetailScreen(tenderId: state.pathParameters['tenderId']!),
          ),
          GoRoute(path: '/sa/reports', builder: (_, __) => const SaReportsScreen()),
          GoRoute(path: '/sa/billing', builder: (_, __) => const SaBillingScreen()),
          GoRoute(path: '/sa/clients', builder: (_, __) => const SaClientsScreen()),
          GoRoute(path: '/sa/employees', builder: (_, __) => const SaEmployeesScreen()),
          GoRoute(path: '/sa/issues', builder: (_, __) => const SaIssuesScreen()),
          GoRoute(path: '/sa/complaints', builder: (_, __) => const SaComplaintsScreen()),
          GoRoute(path: '/sa/more', builder: (_, __) => const SaMoreScreen()),
        ],
      ),

      // ── HR Admin Shell ─────────────────────────────────────────────────────
      ShellRoute(
        builder: (context, state, child) => HrShell(child: child),
        routes: [
          GoRoute(path: '/hr/dashboard', builder: (_, __) => const HrDashboardScreen()),
          GoRoute(path: '/hr/employees', builder: (_, __) => const HrEmployeesScreen()),
          GoRoute(
            path: '/hr/employees/:employeeId',
            builder: (_, state) => HrEmployeeDetailScreen(employeeId: state.pathParameters['employeeId']!),
          ),
          GoRoute(path: '/hr/payroll', builder: (_, __) => const HrPayrollScreen()),
          GoRoute(path: '/hr/compliance', builder: (_, __) => const HrComplianceScreen()),
          GoRoute(path: '/hr/recruitment', builder: (_, __) => const HrRecruitmentScreen()),
          GoRoute(path: '/hr/leaves', builder: (_, __) => const HrLeaveApprovalsScreen()),
          GoRoute(path: '/hr/attendance', builder: (_, __) => const HrAttendanceScreen()),
          GoRoute(path: '/hr/reports', builder: (_, __) => const HrReportsScreen()),
          GoRoute(path: '/hr/more', builder: (_, __) => const HrMoreScreen()),
        ],
      ),

      // ── Employee / Supervisor Shell ────────────────────────────────────────
      ShellRoute(
        builder: (context, state, child) => HomeScreen(child: child),
        routes: [
          // ── Employee core ──────────────────────────────────────────────────
          GoRoute(path: '/home', builder: (_, __) => const AttendanceScreen()),
          GoRoute(path: '/dashboard', builder: (_, __) => const EmployeeDashboardScreen()),
          GoRoute(path: '/attendance', builder: (_, __) => const AttendanceScreen()),
          GoRoute(path: '/leave', builder: (_, __) => const LeaveScreen()),
          GoRoute(path: '/payslips', builder: (_, __) => const PayslipsScreen()),
          GoRoute(path: '/profile', builder: (_, __) => const ProfileScreen()),

          // ── Employees ──────────────────────────────────────────────────────
          GoRoute(path: '/employees', builder: (_, __) => const EmployeesScreen()),
          GoRoute(path: '/employees/new', builder: (_, __) => const EmployeeFormScreen()),
          GoRoute(
            path: '/employees/:id',
            builder: (_, state) => EmployeeDetailScreen(employeeId: state.pathParameters['id']!),
          ),
          GoRoute(
            path: '/employees/:id/edit',
            builder: (_, state) => EmployeeFormScreen(employee: state.extra as Map<String,dynamic>?),
          ),

          // ── Tenders ───────────────────────────────────────────────────────
          GoRoute(path: '/tenders', builder: (_, __) => const TendersScreen()),
          GoRoute(path: '/tenders/new', builder: (_, __) => const TenderFormScreen()),
          GoRoute(
            path: '/tenders/:id',
            builder: (_, state) => TenderDetailScreen(tenderId: state.pathParameters['id']!),
          ),
          GoRoute(
            path: '/tenders/:id/edit',
            builder: (_, state) => TenderFormScreen(tender: state.extra as Map<String,dynamic>?),
          ),

          // ── Work Orders ───────────────────────────────────────────────────
          GoRoute(path: '/work-orders', builder: (_, __) => const WorkOrdersScreen()),
          GoRoute(
            path: '/work-orders/:id',
            builder: (_, state) => WorkOrderDetailScreen(workOrderId: state.pathParameters['id']!),
          ),

          // ── Clients ───────────────────────────────────────────────────────
          GoRoute(path: '/clients', builder: (_, __) => const ClientsScreen()),
          GoRoute(path: '/clients/new', builder: (_, __) => const ClientFormScreen()),
          GoRoute(
            path: '/clients/:id',
            builder: (_, state) => ClientDetailScreen(clientId: state.pathParameters['id']!),
          ),
          GoRoute(
            path: '/clients/:id/edit',
            builder: (_, state) => ClientFormScreen(client: state.extra as Map<String,dynamic>?),
          ),

          // ── Recruitment ───────────────────────────────────────────────────
          GoRoute(path: '/recruitment', builder: (_, __) => const RecruitmentScreen()),
          GoRoute(
            path: '/recruitment/:id',
            builder: (_, state) => JobDetailScreen(requisitionId: state.pathParameters['id']!),
          ),

          // ── Compliance ────────────────────────────────────────────────────
          GoRoute(path: '/compliance', builder: (_, __) => const ComplianceScreen()),
          GoRoute(path: '/compliance/new', builder: (_, __) => const ComplianceFormScreen()),
          GoRoute(path: '/compliance/:id', builder: (_, state) => ComplianceDetailScreen(itemId: state.pathParameters['id']!)),
          GoRoute(path: '/compliance/:id/edit', builder: (_, state) => ComplianceFormScreen(item: state.extra as Map<String,dynamic>?)),

          // ── Reports ───────────────────────────────────────────────────────
          GoRoute(path: '/reports', builder: (_, __) => const ReportsScreen()),

          // ── Workflows ─────────────────────────────────────────────────────
          GoRoute(path: '/workflows', builder: (_, __) => const WorkflowsScreen()),

          // ── Finance ───────────────────────────────────────────────────────
          GoRoute(path: '/finance', builder: (_, __) => const FinanceScreen()),
          GoRoute(path: '/finance/new', builder: (_, __) => const AddTransactionScreen()),

          // ── Billing ───────────────────────────────────────────────────────
          GoRoute(path: '/billing', builder: (_, __) => const BillingScreen()),
          GoRoute(
            path: '/billing/:id',
            builder: (_, state) => InvoiceDetailScreen(invoiceId: state.pathParameters['id']!),
          ),

          // ── Calendar ──────────────────────────────────────────────────────
          GoRoute(path: '/calendar', builder: (_, __) => const CalendarScreen()),

          // ── Deployment ────────────────────────────────────────────────────
          GoRoute(path: '/deployment', builder: (_, __) => const DeploymentScreen()),
          GoRoute(path: '/deployment/:id', builder: (_, state) => DeploymentDetailScreen(deploymentId: state.pathParameters['id']!)),

          // ── Documents ────────────────────────────────────────────────────
          GoRoute(path: '/documents', builder: (_, __) => const DocumentsScreen()),

          // ── Visitors ─────────────────────────────────────────────────────
          GoRoute(path: '/visitors', builder: (_, __) => const VisitorsScreen()),
          GoRoute(path: '/visitors/new', builder: (_, __) => const CreateVisitorScreen()),

          // ── Supervisor ───────────────────────────────────────────────────
          GoRoute(path: '/supervisor/dashboard', builder: (_, __) => const SupervisorDashboardScreen()),
          GoRoute(path: '/supervisor/team', builder: (_, __) => const TeamMembersScreen()),
          GoRoute(path: '/supervisor/approvals', builder: (_, __) => const LeaveApprovalsScreen()),
          GoRoute(path: '/supervisor/team-attendance', builder: (_, __) => const TeamAttendanceScreen()),
          GoRoute(path: '/supervisor/sites', builder: (_, __) => const SitesScreen()),
          GoRoute(
            path: '/supervisor/complaints',
            builder: (ctx, state) => ComplaintsScreen(siteId: state.extra as String? ?? ''),
          ),
          GoRoute(
            path: '/supervisor/complaints/new',
            builder: (ctx, state) => NewComplaintScreen(siteId: state.extra as String? ?? ''),
          ),
          GoRoute(
            path: '/supervisor/activity',
            builder: (ctx, state) => ActivityLogScreen(siteId: state.extra as String? ?? ''),
          ),
        ],
      ),
      GoRoute(path: '/notifications', builder: (_, __) => const NotificationsScreen()),
    ],
  );
});
