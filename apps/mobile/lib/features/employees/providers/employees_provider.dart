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

final employeeSearchQueryProvider = StateProvider<String>((ref) => '');

final employeesListProvider =
    FutureProvider.autoDispose<List<Map<String, dynamic>>>((ref) async {
  final query = ref.watch(employeeSearchQueryProvider);
  final api = ref.watch(apiClientProvider);
  final r = await api.get('/employees', queryParameters: {
    'page': '1',
    'limit': '50',
    if (query.isNotEmpty) 'search': query,
  });
  return _parseList(r.data);
});

final employeeDetailProvider = FutureProvider.autoDispose
    .family<Map<String, dynamic>, String>((ref, id) async {
  final api = ref.watch(apiClientProvider);
  final r = await api.get('/employees/$id');
  final data = r.data['data'];
  if (data is Map<String, dynamic>) return data;
  return <String, dynamic>{};
});
