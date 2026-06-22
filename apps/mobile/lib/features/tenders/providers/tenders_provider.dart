import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../../../core/network/api_client.dart';

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
// Tenders list
// Fields per item: id, tenderNumber, title, clientName, bidDeadline,
//   estimatedValue, status (DRAFT/SUBMITTED/AWARDED/REJECTED/EXPIRED)
// ---------------------------------------------------------------------------

final tendersListProvider =
    FutureProvider.autoDispose<List<Map<String, dynamic>>>((ref) async {
  final api = ref.watch(apiClientProvider);
  final r = await api.get('/tenders', queryParameters: {
    'page': '1',
    'limit': '20',
  });
  return _parseList(r.data);
});

// ---------------------------------------------------------------------------
// Tender detail (with workOrders list)
// ---------------------------------------------------------------------------

final tenderDetailProvider = FutureProvider.autoDispose
    .family<Map<String, dynamic>, String>((ref, id) async {
  final api = ref.watch(apiClientProvider);
  final r = await api.get('/tenders/$id');
  final data = r.data['data'];
  if (data is Map<String, dynamic>) return data;
  return <String, dynamic>{};
});
