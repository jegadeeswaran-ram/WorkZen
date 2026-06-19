import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../../../core/network/api_client.dart';

// ---------------------------------------------------------------------------
// Domain model
// ---------------------------------------------------------------------------

class SupervisorStats {
  final int totalTeam;
  final int presentToday;
  final int absentToday;
  final int onLeaveToday;
  final int pendingApprovals;

  const SupervisorStats({
    required this.totalTeam,
    required this.presentToday,
    required this.absentToday,
    required this.onLeaveToday,
    required this.pendingApprovals,
  });
}

// ---------------------------------------------------------------------------
// Helper
// ---------------------------------------------------------------------------

List<Map<String, dynamic>> _parseList(dynamic responseData) {
  final data = responseData['data'];
  if (data is List) return data.cast<Map<String, dynamic>>();
  if (data is Map && data['items'] is List) {
    return (data['items'] as List).cast<Map<String, dynamic>>();
  }
  return <Map<String, dynamic>>[];
}

// ---------------------------------------------------------------------------
// Team deployments
// Fields per item: id, employeeId, employee{id,firstName,lastName,
//   employeeCode,photo,personalPhone}, siteId, shiftId, status
// ---------------------------------------------------------------------------

final supervisorTeamProvider =
    FutureProvider.autoDispose<List<Map<String, dynamic>>>((ref) async {
  final api = ref.watch(apiClientProvider);
  final r = await api.get(
    '/deployment',
    queryParameters: {'status': 'ACTIVE', 'limit': 100},
  );
  return _parseList(r.data);
});

// ---------------------------------------------------------------------------
// Today's attendance for the supervisor's team
// Fields per item: employeeId, status, checkInTime, checkOutTime,
//   employee{firstName,lastName}
// ---------------------------------------------------------------------------

final teamTodayAttendanceProvider =
    FutureProvider.autoDispose<List<Map<String, dynamic>>>((ref) async {
  final api = ref.watch(apiClientProvider);
  final r = await api.get('/attendance/today');
  return _parseList(r.data);
});

// ---------------------------------------------------------------------------
// Pending leave requests (for approval workflow)
// Fields per item: id, employeeId, leaveTypeId, startDate, endDate, days,
//   reason, status, employee{...}, leaveType{name,category}
// ---------------------------------------------------------------------------

final pendingLeaveRequestsProvider =
    FutureProvider.autoDispose<List<Map<String, dynamic>>>((ref) async {
  final api = ref.watch(apiClientProvider);
  final r = await api.get(
    '/attendance/leave-requests',
    queryParameters: {'status': 'PENDING', 'limit': 50},
  );
  return _parseList(r.data);
});

// ---------------------------------------------------------------------------
// Leave requests history (all statuses, for history tab)
// ---------------------------------------------------------------------------

final supervisorLeaveRequestsHistoryProvider =
    FutureProvider.autoDispose<List<Map<String, dynamic>>>((ref) async {
  final api = ref.watch(apiClientProvider);
  final r = await api.get(
    '/attendance/leave-requests',
    queryParameters: {'limit': 20},
  );
  return _parseList(r.data);
});

// ---------------------------------------------------------------------------
// Aggregated dashboard stats
// Depends on: supervisorTeamProvider, teamTodayAttendanceProvider,
//             pendingLeaveRequestsProvider
// ---------------------------------------------------------------------------

final supervisorDashboardStatsProvider =
    FutureProvider.autoDispose<SupervisorStats>((ref) async {
  // Await the three dependency futures; ref.watch keeps this provider
  // reactive — it rebuilds whenever any dependency invalidates.
  final team = await ref.watch(supervisorTeamProvider.future);
  final attendance = await ref.watch(teamTodayAttendanceProvider.future);
  final pending = await ref.watch(pendingLeaveRequestsProvider.future);

  int presentToday = 0;
  int absentToday = 0;
  int onLeaveToday = 0;

  for (final record in attendance) {
    final status = (record['status'] as String?)?.toUpperCase() ?? '';
    if (status == 'PRESENT' || status == 'LATE') {
      presentToday++;
    } else if (status == 'ABSENT') {
      absentToday++;
    } else if (status == 'LEAVE') {
      onLeaveToday++;
    }
  }

  return SupervisorStats(
    totalTeam: team.length,
    presentToday: presentToday,
    absentToday: absentToday,
    onLeaveToday: onLeaveToday,
    pendingApprovals: pending.length,
  );
});
