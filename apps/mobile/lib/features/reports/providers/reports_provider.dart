import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../../../core/network/api_client.dart';

final reportsSummaryProvider =
    FutureProvider.autoDispose<Map<String, dynamic>>((ref) async {
  final api = ref.watch(apiClientProvider);
  final r = await api.get('/reports/summary');
  final data = r.data['data'];
  if (data is Map<String, dynamic>) return data;
  return <String, dynamic>{};
});

final billingDashboardProvider =
    FutureProvider.autoDispose<Map<String, dynamic>>((ref) async {
  final api = ref.watch(apiClientProvider);
  try {
    final r = await api.get('/billing/dashboard');
    final data = r.data['data'];
    if (data is Map<String, dynamic>) return data;
  } catch (_) {}
  return <String, dynamic>{};
});
