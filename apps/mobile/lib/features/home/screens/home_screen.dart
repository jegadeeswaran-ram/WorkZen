import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import '../../../core/theme/app_theme.dart';
import '../../../core/providers/auth_provider.dart';

class HomeScreen extends ConsumerWidget {
  static const supervisorItems = [
    BottomNavigationBarItem(icon: Icon(Icons.dashboard), label: 'Dashboard'),
    BottomNavigationBarItem(icon: Icon(Icons.groups), label: 'Team'),
    BottomNavigationBarItem(icon: Icon(Icons.approval), label: 'Approvals'),
    BottomNavigationBarItem(icon: Icon(Icons.fingerprint), label: 'Attendance'),
    BottomNavigationBarItem(icon: Icon(Icons.person_outline), label: 'Profile'),
  ];

  static const employeeItems = [
    BottomNavigationBarItem(icon: Icon(Icons.fingerprint), label: 'Attendance'),
    BottomNavigationBarItem(icon: Icon(Icons.beach_access_outlined), label: 'Leave'),
    BottomNavigationBarItem(icon: Icon(Icons.receipt_long_outlined), label: 'Payslips'),
    BottomNavigationBarItem(icon: Icon(Icons.person_outline), label: 'Profile'),
  ];

  final Widget child;
  const HomeScreen({super.key, required this.child});

  void _onTapSupervisor(BuildContext context, int i) {
    switch (i) {
      case 0: context.go('/supervisor/dashboard'); break;
      case 1: context.go('/supervisor/team'); break;
      case 2: context.go('/supervisor/approvals'); break;
      case 3: context.go('/attendance'); break;
      case 4: context.go('/profile'); break;
    }
  }

  void _onTapEmployee(BuildContext context, int i) {
    switch (i) {
      case 0: context.go('/attendance'); break;
      case 1: context.go('/leave'); break;
      case 2: context.go('/payslips'); break;
      case 3: context.go('/profile'); break;
    }
  }

  int _routeIndexForEmployee(BuildContext context) {
    final location = GoRouterState.of(context).uri.path;
    if (location.startsWith('/attendance') || location == '/home') return 0;
    if (location.startsWith('/leave')) return 1;
    if (location.startsWith('/payslips')) return 2;
    if (location.startsWith('/profile')) return 3;
    return 0;
  }

  int _routeIndexForSupervisor(BuildContext context) {
    final location = GoRouterState.of(context).uri.path;
    if (location.startsWith('/supervisor/dashboard')) return 0;
    if (location.startsWith('/supervisor/team')) return 1;
    if (location.startsWith('/supervisor/approvals')) return 2;
    if (location.startsWith('/attendance')) return 3;
    if (location.startsWith('/profile')) return 4;
    return 0;
  }

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final role = ref.watch(authStateProvider).value?.role ?? '';
    final isSupervisor = role == 'SITE_SUPERVISOR';

    final idx = isSupervisor
        ? _routeIndexForSupervisor(context)
        : _routeIndexForEmployee(context);

    return Scaffold(
      backgroundColor: AppTheme.background,
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
          onTap: (i) => isSupervisor ? _onTapSupervisor(context, i) : _onTapEmployee(context, i),
          items: isSupervisor ? supervisorItems : employeeItems,
        ),
      ),
    );
  }
}
