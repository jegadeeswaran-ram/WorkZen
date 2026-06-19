import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../../../core/network/api_client.dart';

final leaveBalanceProvider = FutureProvider.autoDispose<List<dynamic>>((ref) async {
  final api = ref.read(apiClientProvider);
  final r = await api.get('/attendance/my-leave-balance');
  return r.data['data'] as List;
});

final leaveRequestsProvider = FutureProvider.autoDispose<List<dynamic>>((ref) async {
  final api = ref.read(apiClientProvider);
  final r = await api.get('/attendance/my-leave-requests?limit=10');
  return (r.data['data'] as List);
});

final leaveTypesProvider = FutureProvider.autoDispose<List<dynamic>>((ref) async {
  final api = ref.read(apiClientProvider);
  final r = await api.get('/attendance/leave-types');
  final data = r.data['data'] ?? r.data;
  return data as List;
});
