# Task 16 Report — HR Shell

## Status
COMPLETE

## Commit
be1b8b7 — feat(mobile): implement HR shell with bottom nav and drawer

## Flutter Analyze
No issues found. (ran in 7.5s)

## What was implemented
- `lib/features/hr_admin/screens/hr_shell.dart` fully rewritten (351 lines)
- `HrShell` — ConsumerWidget accepting `Widget child` from GoRouter ShellRoute
  - Scaffold with `body: child`, `drawer: _HrDrawer`, `bottomNavigationBar`
  - No AppBar (each screen provides its own)
- `_buildBottomNav` — 5-tab BottomNavigationBar wrapped in Container with top border
  - Active tab detection via `GoRouterState.of(context).matchedLocation`
  - More tab catches /hr/more, /hr/recruitment, /hr/leaves, /hr/attendance, /hr/reports
- `_HrDrawer` — ConsumerWidget using `authStateProvider` (AsyncNotifierProvider<AuthNotifier, AuthUser?>)
  - Logo banner with SvgPicture.asset
  - User info row: CircleAvatar with 2-char initials, name, email, role label
  - Expanded ListView with "Main" and "HR Tools" section labels
  - 8 _DrawerNavItem entries with active-state highlighting
  - Logout button with top border, calls `ref.read(authStateProvider.notifier).logout()`
- `_DrawerNavItem` — StatelessWidget with active/inactive colour states

## Key decisions
- Auth provider is at `lib/core/providers/auth_provider.dart` (not `lib/features/auth/...`)
- Provider name is `authStateProvider`, not `authProvider`
- `AuthUser.name` is the full combined name; initials derived by splitting on space
- Used `.withValues(alpha: X)` throughout (not `.withOpacity`)
- All `if` bodies wrapped in braces to satisfy lint rule
