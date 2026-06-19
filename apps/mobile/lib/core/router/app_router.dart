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
import '../../features/supervisor/screens/supervisor_dashboard_screen.dart';
import '../../features/supervisor/screens/team_members_screen.dart';
import '../../features/supervisor/screens/leave_approvals_screen.dart';
import '../../features/supervisor/screens/team_attendance_screen.dart';
import '../providers/auth_provider.dart';

// Listens to auth state changes and notifies GoRouter to re-run redirect.
// GoRouter is created once — never recreated on auth changes.
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
      final path = state.uri.path;
      final isAuthRoute = path == '/login' || path == '/splash';

      // Stay on splash while auth is resolving
      if (isLoading && path == '/splash') return null;

      if (!isLoggedIn && !isAuthRoute) return '/login';
      if (isLoggedIn && isAuthRoute) {
        final role = authState.value?.role ?? '';
        return role == 'SITE_SUPERVISOR' ? '/supervisor/dashboard' : '/home';
      }
      return null;
    },
    routes: [
      GoRoute(path: '/splash', builder: (_, __) => const SplashScreen()),
      GoRoute(path: '/login', builder: (_, __) => const LoginScreen()),
      ShellRoute(
        builder: (context, state, child) => HomeScreen(child: child),
        routes: [
          GoRoute(path: '/home', builder: (_, __) => const AttendanceScreen()),
          GoRoute(path: '/attendance', builder: (_, __) => const AttendanceScreen()),
          GoRoute(path: '/leave', builder: (_, __) => const LeaveScreen()),
          GoRoute(path: '/payslips', builder: (_, __) => const PayslipsScreen()),
          GoRoute(path: '/profile', builder: (_, __) => const ProfileScreen()),
          GoRoute(path: '/supervisor/dashboard', builder: (_, __) => const SupervisorDashboardScreen()),
          GoRoute(path: '/supervisor/team', builder: (_, __) => const TeamMembersScreen()),
          GoRoute(path: '/supervisor/approvals', builder: (_, __) => const LeaveApprovalsScreen()),
          GoRoute(path: '/supervisor/team-attendance', builder: (_, __) => const TeamAttendanceScreen()),
        ],
      ),
      GoRoute(path: '/notifications', builder: (_, __) => const NotificationsScreen()),
    ],
  );
});
