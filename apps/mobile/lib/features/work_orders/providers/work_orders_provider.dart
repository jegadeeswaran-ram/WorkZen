import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../../../core/network/api_client.dart';

// Normalise the various response shapes the API can return
List<Map<String, dynamic>> _parseList(dynamic responseData) {
  // { success, data: [...] }          ← no pagination params
  // { success, data: { data: [...] }} ← with pagination params
  final outer = responseData['data'];
  if (outer is List) return outer.cast<Map<String, dynamic>>();
  if (outer is Map) {
    final inner = outer['data'];
    if (inner is List) return inner.cast<Map<String, dynamic>>();
    final items = outer['items'];
    if (items is List) return items.cast<Map<String, dynamic>>();
  }
  return <Map<String, dynamic>>[];
}

final workOrdersListProvider =
    FutureProvider.autoDispose<List<Map<String, dynamic>>>((ref) async {
  final api = ref.watch(apiClientProvider);
  final r = await api.get('/work-orders');
  return _parseList(r.data);
});

final workOrderDetailProvider = FutureProvider.autoDispose
    .family<Map<String, dynamic>, String>((ref, id) async {
  final api = ref.watch(apiClientProvider);
  final r = await api.get('/work-orders/$id');
  final data = r.data['data'];
  if (data is Map<String, dynamic>) return data;
  return <String, dynamic>{};
});
