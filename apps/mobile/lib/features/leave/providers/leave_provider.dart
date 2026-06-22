import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../../../core/network/api_client.dart';

const _dummyLeaveBalances = [
  {'leaveType': {'id': 'lt1', 'name': 'Casual Leave'},   'balance': 8,  'used': 4,  'total': 12},
  {'leaveType': {'id': 'lt2', 'name': 'Sick Leave'},     'balance': 5,  'used': 2,  'total': 7},
  {'leaveType': {'id': 'lt3', 'name': 'Earned Leave'},   'balance': 15, 'used': 3,  'total': 18},
  {'leaveType': {'id': 'lt4', 'name': 'Optional Leave'}, 'balance': 2,  'used': 0,  'total': 2},
];

const _dummyLeaveRequests = [
  {'id': 'lr1', 'leaveType': {'name': 'Casual Leave'}, 'startDate': '2026-06-23T00:00:00Z', 'endDate': '2026-06-24T00:00:00Z', 'days': 2, 'reason': 'Personal work', 'status': 'PENDING'},
  {'id': 'lr2', 'leaveType': {'name': 'Sick Leave'},   'startDate': '2026-06-10T00:00:00Z', 'endDate': '2026-06-10T00:00:00Z', 'days': 1, 'reason': 'Medical appointment', 'status': 'APPROVED'},
  {'id': 'lr3', 'leaveType': {'name': 'Earned Leave'}, 'startDate': '2026-05-26T00:00:00Z', 'endDate': '2026-05-28T00:00:00Z', 'days': 3, 'reason': 'Family function', 'status': 'APPROVED'},
];

const _dummyLeaveTypes = [
  {'id': 'lt1', 'name': 'Casual Leave',   'maxDays': 12},
  {'id': 'lt2', 'name': 'Sick Leave',     'maxDays': 7},
  {'id': 'lt3', 'name': 'Earned Leave',   'maxDays': 18},
  {'id': 'lt4', 'name': 'Optional Leave', 'maxDays': 2},
];

final leaveBalanceProvider = FutureProvider.autoDispose<List<dynamic>>((ref) async {
  final api = ref.read(apiClientProvider);
  try {
    final r = await api.get('/attendance/my-leave-balance');
    final data = r.data['data'];
    if (data is List && data.isNotEmpty) return data;
  } catch (_) {}
  return _dummyLeaveBalances;
});

final leaveRequestsProvider = FutureProvider.autoDispose<List<dynamic>>((ref) async {
  final api = ref.read(apiClientProvider);
  try {
    final r = await api.get('/attendance/my-leave-requests?limit=10');
    final data = r.data['data'];
    if (data is List && data.isNotEmpty) return data;
  } catch (_) {}
  return _dummyLeaveRequests;
});

final leaveTypesProvider = FutureProvider.autoDispose<List<dynamic>>((ref) async {
  final api = ref.read(apiClientProvider);
  try {
    final r = await api.get('/attendance/leave-types');
    final data = r.data['data'] ?? r.data;
    if (data is List && data.isNotEmpty) return data;
  } catch (_) {}
  return _dummyLeaveTypes;
});
