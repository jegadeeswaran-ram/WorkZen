import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../../../core/network/api_client.dart';

List<Map<String, dynamic>> _parseList(dynamic responseData) {
  final data = responseData['data'];
  if (data is List) return data.cast<Map<String, dynamic>>();
  if (data is Map && data['items'] is List) {
    return (data['items'] as List).cast<Map<String, dynamic>>();
  }
  return <Map<String, dynamic>>[];
}

final selectedMonthProvider = StateProvider<DateTime>((ref) => DateTime.now());

final holidaysProvider =
    FutureProvider.autoDispose<List<Map<String, dynamic>>>((ref) async {
  final api = ref.watch(apiClientProvider);
  try {
    final r = await api.get('/attendance/holidays');
    return _parseList(r.data);
  } catch (_) {
    return [];
  }
});

final calendarEventsProvider =
    FutureProvider.autoDispose<List<Map<String, dynamic>>>((ref) async {
  final month = ref.watch(selectedMonthProvider);
  final monthStr =
      '${month.year}-${month.month.toString().padLeft(2, '0')}';
  final api = ref.watch(apiClientProvider);
  try {
    final r = await api.get('/attendance/events', queryParameters: {'month': monthStr});
    return _parseList(r.data);
  } catch (_) {
    return [];
  }
});
