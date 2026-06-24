# Task 9 — SuperAdminShell: Bottom Nav + Branded Drawer

## Status
COMPLETE

## Commit
`57a635a` — feat(mobile): implement SuperAdminShell with bottom nav and branded drawer

## What was done
Replaced the 2-line placeholder `StatelessWidget` in
`apps/mobile/lib/features/super_admin/screens/super_admin_shell.dart`
with a full `ConsumerWidget` shell (367 insertions):

- **`SuperAdminShell`** — wraps all `/sa/*` ShellRoute children with:
  - 5-tab `BottomNavigationBar` (Dashboard / Sites / Tenders / Reports / More)
  - Active-tab detection via `GoRouterState.of(context).uri.path`
  - Sub-screen → parent-tab mapping for `/sa/billing`, `/sa/clients`,
    `/sa/employees`, `/sa/issues`, `/sa/complaints` → More tab
  - `context.go(...)` navigation on tap

- **`_SaDrawer`** — branded `ConsumerWidget` drawer with:
  - Logo banner (`assets/images/we-sidebar-dark.svg`, height 26)
  - User info card: indigo→purple gradient initials avatar (44×44, radius 13),
    name, email (ellipsis overflow), "SUPER ADMINISTRATOR" role badge
  - Section-grouped nav links (Overview / Operations / Finance / Alerts / Other)
    with active highlight (`primary.withValues(alpha:0.08)`) and active text/icon colour
  - Sign Out tile calling `authStateProvider.notifier.logout()`

- **`_SaNavHeader`** / **`_SaNavItem`** — private helper widgets, both `const`-constructible

## Analyzer result
`flutter analyze lib/features/super_admin/screens/super_admin_shell.dart`
→ **No issues found.**

All `withOpacity` calls replaced with `withValues(alpha:)`, all eligible
constructors annotated `const`, switch case bodies wrapped in braces.
