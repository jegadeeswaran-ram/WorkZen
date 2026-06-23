import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:flutter_svg/flutter_svg.dart';
import 'package:go_router/go_router.dart';
import '../../../core/theme/app_theme.dart';
import '../../../core/providers/auth_provider.dart';

class HomeScreen extends ConsumerWidget {
  static const _supervisorNav = [
    BottomNavigationBarItem(icon: Icon(Icons.dashboard), label: 'Dashboard'),
    BottomNavigationBarItem(icon: Icon(Icons.groups), label: 'Team'),
    BottomNavigationBarItem(icon: Icon(Icons.approval), label: 'Approvals'),
    BottomNavigationBarItem(icon: Icon(Icons.fingerprint), label: 'Attendance'),
    BottomNavigationBarItem(icon: Icon(Icons.person_outline), label: 'Profile'),
  ];

  static const _employeeNav = [
    BottomNavigationBarItem(icon: Icon(Icons.dashboard_outlined), label: 'Home'),
    BottomNavigationBarItem(icon: Icon(Icons.fingerprint), label: 'Attendance'),
    BottomNavigationBarItem(icon: Icon(Icons.beach_access_outlined), label: 'Leave'),
    BottomNavigationBarItem(icon: Icon(Icons.receipt_long_outlined), label: 'Payslips'),
    BottomNavigationBarItem(icon: Icon(Icons.person_outline), label: 'Profile'),
  ];

  static const _saNav = [
    BottomNavigationBarItem(icon: Icon(Icons.dashboard_outlined), label: 'Dashboard'),
    BottomNavigationBarItem(icon: Icon(Icons.location_city_outlined), label: 'Sites'),
    BottomNavigationBarItem(icon: Icon(Icons.description_outlined), label: 'Tenders'),
    BottomNavigationBarItem(icon: Icon(Icons.bar_chart_outlined), label: 'Reports'),
    BottomNavigationBarItem(icon: Icon(Icons.more_horiz), label: 'More'),
  ];

  static const _hrNav = [
    BottomNavigationBarItem(icon: Icon(Icons.dashboard_outlined), label: 'Dashboard'),
    BottomNavigationBarItem(icon: Icon(Icons.people_outlined), label: 'Employees'),
    BottomNavigationBarItem(icon: Icon(Icons.payments_outlined), label: 'Payroll'),
    BottomNavigationBarItem(icon: Icon(Icons.check_circle_outline), label: 'Compliance'),
    BottomNavigationBarItem(icon: Icon(Icons.more_horiz), label: 'More'),
  ];

  final Widget child;
  const HomeScreen({super.key, required this.child});

  void _onTapSupervisor(BuildContext context, int i) {
    switch (i) {
      case 0: context.go('/supervisor/dashboard');
      case 1: context.go('/supervisor/team');
      case 2: context.go('/supervisor/approvals');
      case 3: context.go('/attendance');
      case 4: context.go('/profile');
    }
  }

  void _onTapEmployee(BuildContext context, int i) {
    switch (i) {
      case 0: context.go('/dashboard');
      case 1: context.go('/attendance');
      case 2: context.go('/leave');
      case 3: context.go('/payslips');
      case 4: context.go('/profile');
    }
  }

  void _onTapSa(BuildContext context, int i) {
    switch (i) {
      case 0: context.go('/sa/dashboard');
      case 1: context.go('/sa/sites');
      case 2: context.go('/sa/tenders');
      case 3: context.go('/sa/reports');
      case 4: context.go('/sa/more');
    }
  }

  void _onTapHr(BuildContext context, int i) {
    switch (i) {
      case 0: context.go('/hr/dashboard');
      case 1: context.go('/hr/employees');
      case 2: context.go('/hr/payroll');
      case 3: context.go('/hr/compliance');
      case 4: context.go('/hr/more');
    }
  }

  int _indexSupervisor(BuildContext context) {
    final p = GoRouterState.of(context).uri.path;
    if (p.startsWith('/supervisor/dashboard')) return 0;
    if (p.startsWith('/supervisor/team')) return 1;
    if (p.startsWith('/supervisor/approvals')) return 2;
    if (p.startsWith('/attendance') || p == '/home') return 3;
    if (p.startsWith('/profile')) return 4;
    return 0;
  }

  int _indexEmployee(BuildContext context) {
    final p = GoRouterState.of(context).uri.path;
    if (p == '/dashboard' || p == '/home') return 0;
    if (p.startsWith('/attendance')) return 1;
    if (p.startsWith('/leave')) return 2;
    if (p.startsWith('/payslips')) return 3;
    if (p.startsWith('/profile')) return 4;
    return 0;
  }

  int _indexSa(BuildContext context) {
    final p = GoRouterState.of(context).uri.path;
    if (p.startsWith('/sa/dashboard')) return 0;
    if (p.startsWith('/sa/sites')) return 1;
    if (p.startsWith('/sa/tenders')) return 2;
    if (p.startsWith('/sa/reports')) return 3;
    if (p.startsWith('/sa/more')) return 4;
    return 0;
  }

  int _indexHr(BuildContext context) {
    final p = GoRouterState.of(context).uri.path;
    if (p.startsWith('/hr/dashboard')) return 0;
    if (p.startsWith('/hr/employees')) return 1;
    if (p.startsWith('/hr/payroll')) return 2;
    if (p.startsWith('/hr/compliance')) return 3;
    if (p.startsWith('/hr/more')) return 4;
    return 0;
  }

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final user = ref.watch(authStateProvider).value;
    final role = user?.role ?? '';
    final isSupervisor = role == 'SITE_SUPERVISOR';
    final isSa = role == 'SUPER_ADMIN' || role == 'COMPANY_OWNER';
    final isHr = role == 'HR_MANAGER';

    final int idx;
    final List<BottomNavigationBarItem> navItems;
    final void Function(BuildContext, int) onTap;

    if (isSa) {
      idx = _indexSa(context);
      navItems = _saNav;
      onTap = _onTapSa;
    } else if (isHr) {
      idx = _indexHr(context);
      navItems = _hrNav;
      onTap = _onTapHr;
    } else if (isSupervisor) {
      idx = _indexSupervisor(context);
      navItems = _supervisorNav;
      onTap = _onTapSupervisor;
    } else {
      idx = _indexEmployee(context);
      navItems = _employeeNav;
      onTap = _onTapEmployee;
    }

    return Scaffold(
      backgroundColor: AppTheme.background,
      drawer: _AppDrawer(user: user, role: role),
      body: child,
      bottomNavigationBar: Container(
        decoration: const BoxDecoration(
          color: AppTheme.surface,
          border: Border(top: BorderSide(color: AppTheme.border)),
        ),
        child: BottomNavigationBar(
          currentIndex: idx,
          backgroundColor: Colors.transparent,
          elevation: 0,
          selectedItemColor: AppTheme.primary,
          unselectedItemColor: AppTheme.textMuted,
          onTap: (i) => onTap(context, i),
          items: navItems,
        ),
      ),
    );
  }
}

class _AppDrawer extends StatelessWidget {
  final AuthUser? user;
  final String role;
  const _AppDrawer({required this.user, required this.role});

  @override
  Widget build(BuildContext context) {
    final initials = user?.name.isNotEmpty == true
        ? user!.name.trim().split(' ').map((w) => w.isNotEmpty ? w[0] : '').take(2).join().toUpperCase()
        : '?';

    final isSupervisor = role == 'SITE_SUPERVISOR';
    final isSa = role == 'SUPER_ADMIN' || role == 'COMPANY_OWNER';
    final isHr = role == 'HR_MANAGER';

    return Drawer(
      backgroundColor: AppTheme.surface,
      child: SafeArea(
        child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
          // Logo banner
          Container(
            padding: const EdgeInsets.symmetric(horizontal: 20, vertical: 14),
            decoration: const BoxDecoration(
              border: Border(bottom: BorderSide(color: AppTheme.border)),
            ),
            child: SvgPicture.asset(
              'assets/images/we-sidebar-dark.svg',
              height: 26,
              fit: BoxFit.contain,
              alignment: Alignment.centerLeft,
            ),
          ),
          // User info header
          Container(
            padding: const EdgeInsets.all(16),
            decoration: const BoxDecoration(
              border: Border(bottom: BorderSide(color: AppTheme.border)),
            ),
            child: Row(children: [
              Container(
                width: 44, height: 44,
                decoration: BoxDecoration(
                  gradient: const LinearGradient(colors: [Color(0xFF4F46E5), Color(0xFF8B5CF6)]),
                  borderRadius: BorderRadius.circular(13),
                ),
                child: Center(child: Text(initials, style: const TextStyle(color: Colors.white, fontWeight: FontWeight.bold, fontSize: 15))),
              ),
              const SizedBox(width: 12),
              Expanded(child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
                Text(user?.name ?? 'User', style: const TextStyle(color: AppTheme.textPrimary, fontWeight: FontWeight.w700, fontSize: 14)),
                Text(user?.email ?? '', style: const TextStyle(color: AppTheme.textMuted, fontSize: 12), overflow: TextOverflow.ellipsis),
                const SizedBox(height: 2),
                Container(
                  padding: const EdgeInsets.symmetric(horizontal: 6, vertical: 2),
                  decoration: BoxDecoration(color: AppTheme.primary.withValues(alpha: 0.15), borderRadius: BorderRadius.circular(8)),
                  child: Text(
                    (user?.role ?? '').replaceAll('_', ' '),
                    style: const TextStyle(color: AppTheme.primary, fontSize: 10, fontWeight: FontWeight.w600),
                  ),
                ),
              ])),
            ]),
          ),

          Expanded(
            child: SingleChildScrollView(
              padding: const EdgeInsets.symmetric(vertical: 8),
              child: Column(children: [
                if (isSa) ...[
                  const _NavHeader('Super Admin'),
                  _NavItem(icon: Icons.dashboard_outlined, label: 'Dashboard', route: '/sa/dashboard', context: context),
                  _NavItem(icon: Icons.location_city_outlined, label: 'Sites', route: '/sa/sites', context: context),
                  _NavItem(icon: Icons.description_outlined, label: 'Tenders', route: '/sa/tenders', context: context),
                  _NavItem(icon: Icons.bar_chart_outlined, label: 'Reports', route: '/sa/reports', context: context),
                  _NavItem(icon: Icons.request_quote_outlined, label: 'Billing', route: '/sa/billing', context: context),
                  _NavItem(icon: Icons.business_outlined, label: 'Clients', route: '/sa/clients', context: context),
                  _NavItem(icon: Icons.people_outlined, label: 'Employees', route: '/sa/employees', context: context),
                  _NavItem(icon: Icons.warning_amber_outlined, label: 'Issues', route: '/sa/issues', context: context),
                  _NavItem(icon: Icons.report_problem_outlined, label: 'Complaints', route: '/sa/complaints', context: context),
                  _NavItem(icon: Icons.more_horiz, label: 'More', route: '/sa/more', context: context),
                ] else if (isHr) ...[
                  const _NavHeader('HR Manager'),
                  _NavItem(icon: Icons.dashboard_outlined, label: 'Dashboard', route: '/hr/dashboard', context: context),
                  _NavItem(icon: Icons.people_outlined, label: 'Employees', route: '/hr/employees', context: context),
                  _NavItem(icon: Icons.payments_outlined, label: 'Payroll', route: '/hr/payroll', context: context),
                  _NavItem(icon: Icons.check_circle_outline, label: 'Compliance', route: '/hr/compliance', context: context),
                  _NavItem(icon: Icons.person_search_outlined, label: 'Recruitment', route: '/hr/recruitment', context: context),
                  _NavItem(icon: Icons.beach_access_outlined, label: 'Leave Approvals', route: '/hr/leaves', context: context),
                  _NavItem(icon: Icons.fingerprint, label: 'Attendance', route: '/hr/attendance', context: context),
                  _NavItem(icon: Icons.bar_chart_outlined, label: 'Reports', route: '/hr/reports', context: context),
                  _NavItem(icon: Icons.more_horiz, label: 'More', route: '/hr/more', context: context),
                ] else if (isSupervisor) ...[
                  const _NavHeader('Supervisor'),
                  _NavItem(icon: Icons.dashboard_outlined, label: 'Dashboard', route: '/supervisor/dashboard', context: context),
                  _NavItem(icon: Icons.groups_outlined, label: 'My Team', route: '/supervisor/team', context: context),
                  _NavItem(icon: Icons.approval_outlined, label: 'Leave Approvals', route: '/supervisor/approvals', context: context),
                  _NavItem(icon: Icons.location_city_outlined, label: 'My Sites', route: '/supervisor/sites', context: context),
                  _NavItem(icon: Icons.fingerprint, label: 'Team Attendance', route: '/supervisor/team-attendance', context: context),
                  _NavItem(icon: Icons.report_problem_outlined, label: 'Complaints', route: '/supervisor/complaints', extra: '', context: context),
                  _NavItem(icon: Icons.assignment_outlined, label: 'Activity Log', route: '/supervisor/activity', extra: '', context: context),
                ] else ...[
                  const _NavHeader('My Work'),
                  _NavItem(icon: Icons.dashboard_outlined, label: 'Dashboard', route: '/dashboard', context: context),
                  _NavItem(icon: Icons.fingerprint, label: 'Attendance', route: '/attendance', context: context),
                  _NavItem(icon: Icons.beach_access_outlined, label: 'Leave', route: '/leave', context: context),
                  _NavItem(icon: Icons.receipt_long_outlined, label: 'Payslips', route: '/payslips', context: context),
                ],

                if (!isSa && !isHr) ...[
                  const _NavHeader('Operations'),
                  _NavItem(icon: Icons.people_outlined, label: 'Employees', route: '/employees', context: context),
                  _NavItem(icon: Icons.description_outlined, label: 'Tenders', route: '/tenders', context: context),
                  _NavItem(icon: Icons.work_outline, label: 'Work Orders', route: '/work-orders', context: context),
                  _NavItem(icon: Icons.business_outlined, label: 'Clients', route: '/clients', context: context),
                  _NavItem(icon: Icons.person_search_outlined, label: 'Recruitment', route: '/recruitment', context: context),
                  _NavItem(icon: Icons.map_outlined, label: 'Deployments', route: '/deployment', context: context),

                  const _NavHeader('Finance'),
                  _NavItem(icon: Icons.account_balance_outlined, label: 'Finance', route: '/finance', context: context),
                  _NavItem(icon: Icons.request_quote_outlined, label: 'Billing & Invoices', route: '/billing', context: context),

                  const _NavHeader('Tools'),
                  _NavItem(icon: Icons.check_circle_outline, label: 'Compliance', route: '/compliance', context: context),
                  _NavItem(icon: Icons.bar_chart_outlined, label: 'Reports', route: '/reports', context: context),
                  _NavItem(icon: Icons.assignment_turned_in_outlined, label: 'Workflows', route: '/workflows', context: context),
                  _NavItem(icon: Icons.calendar_month_outlined, label: 'Calendar', route: '/calendar', context: context),
                  _NavItem(icon: Icons.folder_outlined, label: 'Documents', route: '/documents', context: context),
                  _NavItem(icon: Icons.badge_outlined, label: 'Visitors', route: '/visitors', context: context),
                  _NavItem(icon: Icons.notifications_outlined, label: 'Notifications', route: '/notifications', context: context),
                ],

                const SizedBox(height: 8),
              ]),
            ),
          ),

          // Profile link at bottom
          Container(
            decoration: const BoxDecoration(border: Border(top: BorderSide(color: AppTheme.border))),
            child: _NavItem(icon: Icons.person_outline, label: 'My Profile', route: '/profile', context: context),
          ),
        ]),
      ),
    );
  }
}

class _NavHeader extends StatelessWidget {
  final String title;
  const _NavHeader(this.title);

  @override
  Widget build(BuildContext context) => Padding(
    padding: const EdgeInsets.fromLTRB(16, 12, 16, 4),
    child: Text(title.toUpperCase(),
        style: const TextStyle(color: AppTheme.textMuted, fontSize: 10, fontWeight: FontWeight.w700, letterSpacing: 1.2)),
  );
}

class _NavItem extends StatelessWidget {
  final IconData icon;
  final String label;
  final String route;
  final Object? extra;
  final BuildContext context;

  const _NavItem({
    required this.icon,
    required this.label,
    required this.route,
    required this.context,
    this.extra,
  });

  @override
  Widget build(BuildContext outerContext) {
    final current = GoRouterState.of(context).uri.path;
    final isActive = current == route || current.startsWith('$route/');

    return ListTile(
      dense: true,
      leading: Icon(icon, size: 20, color: isActive ? AppTheme.primary : AppTheme.textSecondary),
      title: Text(label,
          style: TextStyle(
              color: isActive ? AppTheme.primary : AppTheme.textPrimary,
              fontSize: 13,
              fontWeight: isActive ? FontWeight.w600 : FontWeight.normal)),
      tileColor: isActive ? AppTheme.primary.withValues(alpha: 0.08) : null,
      shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(10)),
      contentPadding: const EdgeInsets.symmetric(horizontal: 16, vertical: 0),
      onTap: () {
        Navigator.of(outerContext).pop(); // close drawer
        if (extra != null) {
          context.push(route, extra: extra);
        } else {
          context.go(route);
        }
      },
    );
  }
}
