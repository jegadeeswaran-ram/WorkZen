import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:flutter_svg/flutter_svg.dart';
import 'package:go_router/go_router.dart';
import '../../../core/theme/app_theme.dart';
import '../../../core/providers/auth_provider.dart';

class HrShell extends ConsumerWidget {
  final Widget child;
  const HrShell({super.key, required this.child});

  static const List<String> _routes = [
    '/hr/dashboard',
    '/hr/employees',
    '/hr/payroll',
    '/hr/compliance',
    '/hr/more',
  ];

  int _currentIndex(String location) {
    if (location.startsWith('/hr/dashboard')) return 0;
    if (location.startsWith('/hr/employees')) return 1;
    if (location.startsWith('/hr/payroll')) return 2;
    if (location.startsWith('/hr/compliance')) return 3;
    if (location.startsWith('/hr/more') ||
        location.startsWith('/hr/recruitment') ||
        location.startsWith('/hr/leaves') ||
        location.startsWith('/hr/attendance') ||
        location.startsWith('/hr/reports')) {
      return 4;
    }
    return 0;
  }

  Widget _buildBottomNav(BuildContext context) {
    final location = GoRouterState.of(context).matchedLocation;
    final currentIndex = _currentIndex(location);

    return Container(
      decoration: const BoxDecoration(
        color: AppTheme.surface,
        border: Border(
          top: BorderSide(color: AppTheme.border, width: 1),
        ),
      ),
      child: BottomNavigationBar(
        currentIndex: currentIndex,
        onTap: (i) => context.go(_routes[i]),
        backgroundColor: AppTheme.surface,
        selectedItemColor: AppTheme.primary,
        unselectedItemColor: AppTheme.textMuted,
        type: BottomNavigationBarType.fixed,
        elevation: 0,
        items: const [
          BottomNavigationBarItem(
            icon: Icon(Icons.dashboard_outlined),
            activeIcon: Icon(Icons.dashboard),
            label: 'Dashboard',
          ),
          BottomNavigationBarItem(
            icon: Icon(Icons.people_outlined),
            activeIcon: Icon(Icons.people),
            label: 'Employees',
          ),
          BottomNavigationBarItem(
            icon: Icon(Icons.payments_outlined),
            activeIcon: Icon(Icons.payments),
            label: 'Payroll',
          ),
          BottomNavigationBarItem(
            icon: Icon(Icons.verified_outlined),
            activeIcon: Icon(Icons.verified),
            label: 'Compliance',
          ),
          BottomNavigationBarItem(
            icon: Icon(Icons.more_horiz),
            label: 'More',
          ),
        ],
      ),
    );
  }

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    return Scaffold(
      backgroundColor: AppTheme.background,
      body: child,
      drawer: const _HrDrawer(),
      bottomNavigationBar: _buildBottomNav(context),
    );
  }
}

// ---------------------------------------------------------------------------
// Drawer
// ---------------------------------------------------------------------------

class _HrDrawer extends ConsumerWidget {
  const _HrDrawer();

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final authAsync = ref.watch(authStateProvider);
    final user = authAsync.valueOrNull;

    final String displayName = user?.name ?? 'HR Manager';
    final String email = user?.email ?? '';
    final List<String> nameParts = displayName.trim().split(' ');
    final String initials = nameParts.length >= 2
        ? '${nameParts.first[0]}${nameParts.last[0]}'.toUpperCase()
        : displayName.isNotEmpty
            ? displayName[0].toUpperCase()
            : 'HR';

    final location = GoRouterState.of(context).matchedLocation;

    return Drawer(
      backgroundColor: AppTheme.surface,
      child: SafeArea(
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            // Logo banner
            Container(
              width: double.infinity,
              padding: const EdgeInsets.symmetric(horizontal: 20, vertical: 14),
              decoration: const BoxDecoration(
                border: Border(
                  bottom: BorderSide(color: AppTheme.border, width: 1),
                ),
              ),
              child: SvgPicture.asset(
                'assets/images/we-sidebar-dark.svg',
                height: 26,
                fit: BoxFit.contain,
                alignment: Alignment.centerLeft,
              ),
            ),

            // User info section
            Container(
              width: double.infinity,
              padding: const EdgeInsets.symmetric(horizontal: 20, vertical: 16),
              decoration: const BoxDecoration(
                border: Border(
                  bottom: BorderSide(color: AppTheme.border, width: 1),
                ),
              ),
              child: Row(
                children: [
                  CircleAvatar(
                    radius: 22,
                    backgroundColor:
                        AppTheme.primary.withValues(alpha: 0.2),
                    child: Text(
                      initials,
                      style: const TextStyle(
                        color: AppTheme.primary,
                        fontSize: 14,
                        fontWeight: FontWeight.bold,
                      ),
                    ),
                  ),
                  const SizedBox(width: 12),
                  Expanded(
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Text(
                          displayName,
                          style: const TextStyle(
                            color: Colors.white,
                            fontSize: 15,
                            fontWeight: FontWeight.bold,
                          ),
                          overflow: TextOverflow.ellipsis,
                        ),
                        Text(
                          email,
                          style: const TextStyle(
                            color: AppTheme.textMuted,
                            fontSize: 12,
                          ),
                          overflow: TextOverflow.ellipsis,
                        ),
                        const Text(
                          'HR Manager',
                          style: TextStyle(
                            color: AppTheme.primary,
                            fontSize: 11,
                          ),
                        ),
                      ],
                    ),
                  ),
                ],
              ),
            ),

            // Navigation sections
            Expanded(
              child: ListView(
                padding: EdgeInsets.zero,
                children: [
                  // Main section
                  const Padding(
                    padding:
                        EdgeInsets.symmetric(horizontal: 20, vertical: 8),
                    child: Text(
                      'Main',
                      style: TextStyle(
                        color: AppTheme.textMuted,
                        fontSize: 11,
                        fontWeight: FontWeight.bold,
                      ),
                    ),
                  ),
                  _DrawerNavItem(
                    icon: Icons.dashboard_outlined,
                    label: 'Dashboard',
                    route: '/hr/dashboard',
                    isActive: location.startsWith('/hr/dashboard'),
                  ),
                  _DrawerNavItem(
                    icon: Icons.people_outlined,
                    label: 'Employees',
                    route: '/hr/employees',
                    isActive: location.startsWith('/hr/employees'),
                  ),
                  _DrawerNavItem(
                    icon: Icons.payments_outlined,
                    label: 'Payroll',
                    route: '/hr/payroll',
                    isActive: location.startsWith('/hr/payroll'),
                  ),
                  _DrawerNavItem(
                    icon: Icons.verified_outlined,
                    label: 'Compliance',
                    route: '/hr/compliance',
                    isActive: location.startsWith('/hr/compliance'),
                  ),

                  // HR Tools section
                  const Padding(
                    padding:
                        EdgeInsets.symmetric(horizontal: 20, vertical: 8),
                    child: Text(
                      'HR Tools',
                      style: TextStyle(
                        color: AppTheme.textMuted,
                        fontSize: 11,
                        fontWeight: FontWeight.bold,
                      ),
                    ),
                  ),
                  _DrawerNavItem(
                    icon: Icons.work_outline,
                    label: 'Recruitment',
                    route: '/hr/recruitment',
                    isActive: location.startsWith('/hr/recruitment'),
                  ),
                  _DrawerNavItem(
                    icon: Icons.event_available_outlined,
                    label: 'Leave Approvals',
                    route: '/hr/leaves',
                    isActive: location.startsWith('/hr/leaves'),
                  ),
                  _DrawerNavItem(
                    icon: Icons.how_to_reg,
                    label: 'Attendance',
                    route: '/hr/attendance',
                    isActive: location.startsWith('/hr/attendance'),
                  ),
                  _DrawerNavItem(
                    icon: Icons.bar_chart_outlined,
                    label: 'Reports',
                    route: '/hr/reports',
                    isActive: location.startsWith('/hr/reports'),
                  ),
                ],
              ),
            ),

            // Logout button
            Container(
              decoration: const BoxDecoration(
                border: Border(
                  top: BorderSide(color: AppTheme.border, width: 1),
                ),
              ),
              padding:
                  const EdgeInsets.symmetric(horizontal: 16, vertical: 12),
              child: ListTile(
                leading: const Icon(Icons.logout, color: AppTheme.danger),
                title: const Text(
                  'Logout',
                  style: TextStyle(color: AppTheme.danger),
                ),
                onTap: () async {
                  Navigator.pop(context);
                  await ref.read(authStateProvider.notifier).logout();
                },
              ),
            ),
          ],
        ),
      ),
    );
  }
}

// ---------------------------------------------------------------------------
// Drawer nav item
// ---------------------------------------------------------------------------

class _DrawerNavItem extends StatelessWidget {
  final IconData icon;
  final String label;
  final String route;
  final bool isActive;

  const _DrawerNavItem({
    required this.icon,
    required this.label,
    required this.route,
    required this.isActive,
  });

  @override
  Widget build(BuildContext context) {
    return ListTile(
      leading: Icon(
        icon,
        color: isActive ? AppTheme.primary : AppTheme.textMuted,
        size: 20,
      ),
      title: Text(
        label,
        style: TextStyle(
          color: isActive ? Colors.white : AppTheme.textMuted,
          fontSize: 13,
          fontWeight: isActive ? FontWeight.bold : FontWeight.normal,
        ),
      ),
      tileColor: isActive
          ? AppTheme.primary.withValues(alpha: 0.1)
          : null,
      shape: RoundedRectangleBorder(
        borderRadius: BorderRadius.circular(8),
      ),
      contentPadding:
          const EdgeInsets.symmetric(horizontal: 16, vertical: 0),
      onTap: () {
        Navigator.pop(context);
        context.go(route);
      },
    );
  }
}
