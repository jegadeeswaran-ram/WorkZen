import 'package:dio/dio.dart';
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
  final r = await api.get('/deployment/my-team');
  return _parseList(r.data);
});

// Extracts siteId from the my-team response meta — used for complaints & activity log
final supervisorSiteIdProvider = FutureProvider.autoDispose<String>((ref) async {
  final api = ref.watch(apiClientProvider);
  final r = await api.get('/deployment/my-team');
  final meta = r.data['meta'] as Map<String, dynamic>?;
  return meta?['siteId'] as String? ?? '';
});

// ---------------------------------------------------------------------------
// Today's attendance for the supervisor's team
// Fields per item: employeeId, status, checkInTime, checkOutTime,
//   employee{firstName,lastName}
// ---------------------------------------------------------------------------

final teamTodayAttendanceProvider =
    FutureProvider.autoDispose<List<Map<String, dynamic>>>((ref) async {
  final api = ref.watch(apiClientProvider);
  final r = await api.get('/attendance/my-team-today');
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
    '/attendance/my-team-leave-requests',
    queryParameters: {'status': 'PENDING'},
  );
  return _parseList(r.data);
});

// ---------------------------------------------------------------------------
// Leave requests history (all statuses, for history tab)
// ---------------------------------------------------------------------------

final supervisorLeaveRequestsHistoryProvider =
    FutureProvider.autoDispose<List<Map<String, dynamic>>>((ref) async {
  final api = ref.watch(apiClientProvider);
  final r = await api.get('/attendance/my-team-leave-requests');
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

// ---------------------------------------------------------------------------
// Complaint Model
// ---------------------------------------------------------------------------

class SiteComplaint {
  final String id;
  final String siteId;
  final String category;
  final String severity;
  final String status;
  final String title;
  final String description;
  final String createdAt;

  const SiteComplaint({
    required this.id,
    required this.siteId,
    required this.category,
    required this.severity,
    required this.status,
    required this.title,
    required this.description,
    required this.createdAt,
  });

  factory SiteComplaint.fromJson(Map<String, dynamic> j) => SiteComplaint(
        id: j['id'] as String,
        siteId: j['siteId'] as String,
        category: j['category'] as String,
        severity: j['severity'] as String,
        status: j['status'] as String,
        title: j['title'] as String,
        description: j['description'] as String,
        createdAt: j['createdAt'] as String,
      );
}

// ---------------------------------------------------------------------------
// Complaints Notifier
// ---------------------------------------------------------------------------

class ComplaintsNotifier
    extends StateNotifier<AsyncValue<List<SiteComplaint>>> {
  ComplaintsNotifier(this._dio) : super(const AsyncValue.loading());
  final Dio _dio;

  Future<void> load(String siteId) async {
    state = const AsyncValue.loading();
    try {
      final res = await _dio.get(
        '/complaints',
        queryParameters: {'siteId': siteId},
      );
      final list = (res.data['data'] as List)
          .map((e) => SiteComplaint.fromJson(e as Map<String, dynamic>))
          .toList();
      state = AsyncValue.data(list);
    } catch (e, s) {
      state = AsyncValue.error(e, s);
    }
  }

  Future<void> create({
    required String siteId,
    required String category,
    required String severity,
    required String title,
    required String description,
  }) async {
    await _dio.post('/complaints', data: {
      'siteId': siteId,
      'category': category,
      'severity': severity,
      'title': title,
      'description': description,
    });
  }
}

final complaintsProvider = StateNotifierProvider<ComplaintsNotifier,
    AsyncValue<List<SiteComplaint>>>((ref) {
  final dio = ref.watch(apiClientProvider);
  return ComplaintsNotifier(dio);
});

// ---------------------------------------------------------------------------
// ActivityLog Model
// ---------------------------------------------------------------------------

class SiteActivityLog {
  final String id;
  final String siteId;
  final String logDate;
  final String workDone;
  final int headcount;
  final bool hasIncident;
  final String? incidentType;
  final String? incidentDesc;
  final List<String> photoUrls;

  const SiteActivityLog({
    required this.id,
    required this.siteId,
    required this.logDate,
    required this.workDone,
    required this.headcount,
    required this.hasIncident,
    this.incidentType,
    this.incidentDesc,
    required this.photoUrls,
  });

  factory SiteActivityLog.fromJson(Map<String, dynamic> j) => SiteActivityLog(
        id: j['id'] as String,
        siteId: j['siteId'] as String,
        logDate: j['logDate'] as String,
        workDone: j['workDone'] as String,
        headcount: j['headcount'] as int,
        hasIncident: j['hasIncident'] as bool? ?? false,
        incidentType: j['incidentType'] as String?,
        incidentDesc: j['incidentDesc'] as String?,
        photoUrls: (j['photoUrls'] as List?)?.cast<String>() ?? [],
      );
}

// ---------------------------------------------------------------------------
// ActivityLog Notifier
// ---------------------------------------------------------------------------

class ActivityLogNotifier
    extends StateNotifier<AsyncValue<List<SiteActivityLog>>> {
  ActivityLogNotifier(this._dio) : super(const AsyncValue.loading());
  final Dio _dio;
  SiteActivityLog? todayLog;

  Future<void> load(String siteId) async {
    state = const AsyncValue.loading();
    try {
      final res = await _dio.get(
        '/activity-log',
        queryParameters: {'siteId': siteId},
      );
      final list = (res.data['data'] as List)
          .map((e) => SiteActivityLog.fromJson(e as Map<String, dynamic>))
          .toList();
      state = AsyncValue.data(list);
      // also load today
      try {
        final todayRes = await _dio.get(
          '/activity-log/today',
          queryParameters: {'siteId': siteId},
        );
        todayLog = todayRes.data['data'] != null
            ? SiteActivityLog.fromJson(
                todayRes.data['data'] as Map<String, dynamic>)
            : null;
      } catch (_) {}
    } catch (e, s) {
      state = AsyncValue.error(e, s);
    }
  }

  Future<String> uploadPhoto(String filePath, String tenantId) async {
    final formData = FormData.fromMap({
      'photo': await MultipartFile.fromFile(
        filePath,
        filename: filePath.split('/').last,
      ),
    });
    final res =
        await _dio.post('/activity-log/upload-photo', data: formData);
    return res.data['data']['url'] as String;
  }

  Future<void> save({
    required String siteId,
    required String workDone,
    required int headcount,
    required bool hasIncident,
    String? incidentType,
    String? incidentDesc,
    List<String> photoUrls = const [],
  }) async {
    await _dio.post('/activity-log', data: {
      'siteId': siteId,
      'workDone': workDone,
      'headcount': headcount,
      'hasIncident': hasIncident,
      if (incidentType != null) 'incidentType': incidentType,
      if (incidentDesc != null) 'incidentDesc': incidentDesc,
      'photoUrls': photoUrls,
    });
  }
}

final activityLogProvider = StateNotifierProvider<ActivityLogNotifier,
    AsyncValue<List<SiteActivityLog>>>((ref) {
  final dio = ref.watch(apiClientProvider);
  return ActivityLogNotifier(dio);
});
