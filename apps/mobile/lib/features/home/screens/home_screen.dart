import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';
import '../../../core/theme/app_theme.dart';

class HomeScreen extends StatelessWidget {
  final Widget child;
  const HomeScreen({super.key, required this.child});

  int _routeIndex(BuildContext context) {
    final location = GoRouterState.of(context).uri.path;
    if (location.startsWith('/attendance') || location == '/home') return 0;
    if (location.startsWith('/leave')) return 1;
    if (location.startsWith('/payslips')) return 2;
    if (location.startsWith('/profile')) return 3;
    return 0;
  }

  @override
  Widget build(BuildContext context) {
    final idx = _routeIndex(context);
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
          onTap: (i) {
            switch (i) {
              case 0: context.go('/attendance'); break;
              case 1: context.go('/leave'); break;
              case 2: context.go('/payslips'); break;
              case 3: context.go('/profile'); break;
            }
          },
          items: const [
            BottomNavigationBarItem(icon: Icon(Icons.fingerprint), label: 'Attendance'),
            BottomNavigationBarItem(icon: Icon(Icons.beach_access_outlined), label: 'Leave'),
            BottomNavigationBarItem(icon: Icon(Icons.receipt_long_outlined), label: 'Payslips'),
            BottomNavigationBarItem(icon: Icon(Icons.person_outline), label: 'Profile'),
          ],
        ),
      ),
    );
  }
}
