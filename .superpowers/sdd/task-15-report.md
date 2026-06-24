# Task 15 Report — HR More Screens

## Status: DONE

## Commit
`d9055b8` — feat(mobile): implement HR more screens (recruitment, leave, attendance, reports)

## Flutter Analyze Result
- **0 errors or warnings in the 5 new files**
- 1 pre-existing error in `test/widget_test.dart` (MyApp not found — unrelated to this task)
- All other issues are `info`-level in pre-existing files across the project

## Files Written

### `lib/features/hr_admin/screens/hr_recruitment_screen.dart`
- `ConsumerStatefulWidget` with `DefaultTabController` (2 tabs)
- Tab 1: watches `hrRequisitionsProvider` → `_RequisitionCard` with left colour-bar (OPEN=success, DRAFT=primary, CLOSED=textMuted)
- Tab 2: watches `hrCandidatesProvider` → `_CandidateCard` with avatar initials and status chips
- Shared `_avatarColor`, `_initials`, `_StatusChip` helpers

### `lib/features/hr_admin/screens/hr_leave_approvals_screen.dart`
- `ConsumerStatefulWidget` with `_filter` state (PENDING/APPROVED/REJECTED/ALL)
- Horizontal scrollable filter chips (filled primary when selected)
- `_LeaveCard` is `ConsumerStatefulWidget` with `_loading` bool
- Approve/reject call `hrLeaveNotifierProvider.notifier` and show SnackBars
- Non-pending leaves show a right-aligned status chip

### `lib/features/hr_admin/screens/hr_attendance_screen.dart`
- `ConsumerWidget` watching `hrAttendanceTodayProvider`
- `CustomScrollView` with `SliverToBoxAdapter` stats row (Present/Absent/Late/On Leave)
- `SliverList` of `_AttendanceCard` with dot colour indicator and status chip
- Today's date via `DateFormat('d MMM yyyy').format(DateTime.now())`

### `lib/features/hr_admin/screens/hr_reports_screen.dart`
- Pure `ConsumerWidget` (no providers — static list)
- 2×3 `GridView.count` of `_ReportCard` widgets
- Tap shows SnackBar "Generating {title}... View in web portal"

### `lib/features/hr_admin/screens/hr_more_screen.dart`
- `ConsumerWidget` with `ListView` + `GridView.count` (shrinkWrap)
- `_MoreItemCard` calls `context.go(route)` for routed items, SnackBar for null routes
- Imports `go_router` only in this file (the only screen using `context.go`)

## Design Compliance
- All alpha overlays use `.withValues(alpha: x)` — never `.withOpacity()`
- No `fl_chart` imports anywhere
- All colours from `AppTheme` constants
