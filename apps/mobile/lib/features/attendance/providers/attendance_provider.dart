import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../../../core/network/api_client.dart';

final todayAttendanceProvider = FutureProvider.autoDispose<Map<String, dynamic>>((ref) async {
  final api = ref.read(apiClientProvider);
  final r = await api.get('/attendance/my-today');
  return r.data['data'] as Map<String, dynamic>;
});

final weekAttendanceProvider = FutureProvider.autoDispose<List<dynamic>>((ref) async {
  final api = ref.read(apiClientProvider);
  final r = await api.get('/attendance/my-week');
  return r.data['data'] as List;
});

final monthStatsProvider = FutureProvider.autoDispose<Map<String, dynamic>>((ref) async {
  final api = ref.read(apiClientProvider);
  final r = await api.get('/attendance/my-month-stats');
  return r.data['data'] as Map<String, dynamic>;
});
