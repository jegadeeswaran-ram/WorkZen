import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:flutter_svg/flutter_svg.dart';
import 'package:go_router/go_router.dart';
import '../../../core/theme/app_theme.dart';
import '../../../core/providers/auth_provider.dart';

class SuperAdminShell extends ConsumerWidget {
  final Widget child;
  const SuperAdminShell({super.key, required this.child});

  static const _navItems = [
    BottomNavigationBarItem(
      icon: Icon(Icons.dashboard_outlined),
      activeIcon: Icon(Icons.dashboard),
      label: 'Dashboard',
    ),
    BottomNavigationBarItem(
      icon: Icon(Icons.location_city_outlined),
      activeIcon: Icon(Icons.location_city),
      label: 'Sites',
    ),
    BottomNavigationBarItem(
      icon: Icon(Icons.description_outlined),
      activeIcon: Icon(Icons.description),
      label: 'Tenders',
    ),
    BottomNavigationBarItem(
      icon: Icon(Icons.bar_chart_outlined),
      activeIcon: Icon(Icons.bar_chart),
      label: 'Reports',
    ),
    BottomNavigationBarItem(
      icon: Icon(Icons.more_horiz),
      label: 'More',
    ),
  ];

  int _currentIndex(String path) {
    if (path.startsWith('/sa/dashboard')) { return 0; }
    if (path.startsWith('/sa/sites'))     { return 1; }
    if (path.startsWith('/sa/tenders'))   { return 2; }
    if (path.startsWith('/sa/reports'))   { return 3; }
    if (path.startsWith('/sa/more'))      { return 4; }
    if (path.startsWith('/sa/billing') ||
        path.startsWith('/sa/clients') ||
        path.startsWith('/sa/employees') ||
        path.startsWith('/sa/issues') ||
        path.startsWith('/sa/complaints') ||
        path.startsWith('/sa/work-orders')) { return 4; }
    return 0;
  }

  void _onTap(BuildContext context, int i) {
    switch (i) {
      case 0: { context.go('/sa/dashboard'); }
      case 1: { context.go('/sa/sites'); }
      case 2: { context.go('/sa/tenders'); }
      case 3: { context.go('/sa/reports'); }
      case 4: { context.go('/sa/more'); }
    }
  }

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final user = ref.watch(authStateProvider).value;
    final path = GoRouterState.of(context).uri.path;
    final idx  = _currentIndex(path);

    return Scaffold(
      backgroundColor: AppTheme.background,
      drawer: _SaDrawer(user: user),
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
          type: BottomNavigationBarType.fixed,
          selectedLabelStyle: const TextStyle(
            fontSize: 11,
            fontWeight: FontWeight.w600,
          ),
          unselectedLabelStyle: const TextStyle(fontSize: 11),
          onTap: (i) => _onTap(context, i),
          items: _navItems,
        ),
      ),
    );
  }
}

// ── Branded Drawer ─────────────────────────────────────────────────────────────

class _SaDrawer extends ConsumerWidget {
  final AuthUser? user;
  const _SaDrawer({required this.user});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    return Drawer(
      backgroundColor: AppTheme.surface,
      child: SafeArea(
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            // ── Logo Banner ──────────────────────────────────────────────
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

            // ── User Info ────────────────────────────────────────────────
            Container(
              padding: const EdgeInsets.all(16),
              decoration: const BoxDecoration(
                border: Border(bottom: BorderSide(color: AppTheme.border)),
              ),
              child: Row(
                children: [
                  // Initials avatar — indigo→purple gradient
                  Container(
                    width: 44,
                    height: 44,
                    decoration: BoxDecoration(
                      gradient: const LinearGradient(
                        colors: [Color(0xFF6366F1), Color(0xFFA855F7)],
                        begin: Alignment.topLeft,
                        end: Alignment.bottomRight,
                      ),
                      borderRadius: BorderRadius.circular(13),
                    ),
                    alignment: Alignment.center,
                    child: Text(
                      _initials(user?.name),
                      style: const TextStyle(
                        color: Colors.white,
                        fontSize: 16,
                        fontWeight: FontWeight.w700,
                      ),
                    ),
                  ),
                  const SizedBox(width: 12),
                  Expanded(
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Text(
                          user?.name ?? 'Admin',
                          style: const TextStyle(
                            color: Colors.white,
                            fontSize: 14,
                            fontWeight: FontWeight.w700,
                          ),
                        ),
                        Text(
                          user?.email ?? '',
                          style: const TextStyle(
                            color: AppTheme.textMuted,
                            fontSize: 12,
                          ),
                          overflow: TextOverflow.ellipsis,
                        ),
                        const SizedBox(height: 2),
                        // Role badge
                        Container(
                          padding: const EdgeInsets.symmetric(
                            horizontal: 6,
                            vertical: 2,
                          ),
                          decoration: BoxDecoration(
                            color: AppTheme.primary.withValues(alpha: 0.15),
                            borderRadius: BorderRadius.circular(8),
                          ),
                          child: const Text(
                            'SUPER ADMINISTRATOR',
                            style: TextStyle(
                              color: AppTheme.primary,
                              fontSize: 10,
                              fontWeight: FontWeight.w600,
                            ),
                          ),
                        ),
                      ],
                    ),
                  ),
                ],
              ),
            ),

            // ── Nav Items ────────────────────────────────────────────────
            const Expanded(
              child: SingleChildScrollView(
                padding: EdgeInsets.symmetric(vertical: 8),
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    _SaNavHeader('Overview'),
                    _SaNavItem(
                      icon: Icons.dashboard_outlined,
                      label: 'Dashboard',
                      route: '/sa/dashboard',
                    ),
                    _SaNavItem(
                      icon: Icons.bar_chart_outlined,
                      label: 'Reports',
                      route: '/sa/reports',
                    ),
                    _SaNavHeader('Operations'),
                    _SaNavItem(
                      icon: Icons.location_city_outlined,
                      label: 'Site Management',
                      route: '/sa/sites',
                    ),
                    _SaNavItem(
                      icon: Icons.description_outlined,
                      label: 'Tenders',
                      route: '/sa/tenders',
                    ),
                    _SaNavItem(
                      icon: Icons.people_outlined,
                      label: 'Employees',
                      route: '/sa/employees',
                    ),
                    _SaNavItem(
                      icon: Icons.business_outlined,
                      label: 'Clients',
                      route: '/sa/clients',
                    ),
                    _SaNavItem(
                      icon: Icons.assignment_outlined,
                      label: 'Work Orders',
                      route: '/sa/work-orders',
                    ),
                    _SaNavHeader('Finance'),
                    _SaNavItem(
                      icon: Icons.receipt_long_outlined,
                      label: 'Billing',
                      route: '/sa/billing',
                    ),
                    _SaNavHeader('Alerts'),
                    _SaNavItem(
                      icon: Icons.warning_amber_outlined,
                      label: 'Issues',
                      route: '/sa/issues',
                    ),
                    _SaNavItem(
                      icon: Icons.report_problem_outlined,
                      label: 'Complaints',
                      route: '/sa/complaints',
                    ),
                    _SaNavHeader('Other'),
                    _SaNavItem(
                      icon: Icons.notifications_outlined,
                      label: 'Notifications',
                      route: '/notifications',
                    ),
                  ],
                ),
              ),
            ),

            // ── Logout ───────────────────────────────────────────────────
            Container(
              decoration: const BoxDecoration(
                border: Border(top: BorderSide(color: AppTheme.border)),
              ),
              child: ListTile(
                dense: true,
                leading: const Icon(
                  Icons.logout,
                  color: AppTheme.danger,
                  size: 20,
                ),
                title: const Text(
                  'Sign Out',
                  style: TextStyle(color: AppTheme.danger, fontSize: 13),
                ),
                onTap: () {
                  Navigator.of(context).pop();
                  ref.read(authStateProvider.notifier).logout();
                },
              ),
            ),
          ],
        ),
      ),
    );
  }

  String _initials(String? name) {
    if (name == null || name.trim().isEmpty) return 'A';
    final parts = name.trim().split(RegExp(r'\s+'));
    if (parts.length >= 2) {
      return '${parts[0][0]}${parts[1][0]}'.toUpperCase();
    }
    return parts[0][0].toUpperCase();
  }
}

// ── Section Header ─────────────────────────────────────────────────────────────

class _SaNavHeader extends StatelessWidget {
  final String title;
  const _SaNavHeader(this.title);

  @override
  Widget build(BuildContext context) {
    return Padding(
      padding: const EdgeInsets.fromLTRB(16, 12, 16, 4),
      child: Text(
        title.toUpperCase(),
        style: const TextStyle(
          color: AppTheme.textMuted,
          fontSize: 10,
          fontWeight: FontWeight.w700,
          letterSpacing: 1.2,
        ),
      ),
    );
  }
}

// ── Nav Item ───────────────────────────────────────────────────────────────────

class _SaNavItem extends StatelessWidget {
  final IconData icon;
  final String label;
  final String route;

  const _SaNavItem({
    required this.icon,
    required this.label,
    required this.route,
  });

  @override
  Widget build(BuildContext context) {
    final currentPath = GoRouterState.of(context).uri.path;
    final isActive = currentPath.startsWith(route);

    return ListTile(
      dense: true,
      leading: Icon(
        icon,
        size: 20,
        color: isActive ? AppTheme.primary : AppTheme.textSecondary,
      ),
      title: Text(
        label,
        style: TextStyle(
          color: isActive ? AppTheme.primary : Colors.white,
          fontSize: 13,
          fontWeight: isActive ? FontWeight.w600 : FontWeight.normal,
        ),
      ),
      tileColor: isActive
          ? AppTheme.primary.withValues(alpha: 0.08)
          : null,
      shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(10)),
      contentPadding: const EdgeInsets.symmetric(horizontal: 16),
      onTap: () {
        Navigator.of(context).pop();
        context.go(route);
      },
    );
  }
}
