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

final _dummyWorkOrders = <Map<String, dynamic>>[
  {'id': 'dw1', 'workOrderNumber': 'WO-2026-0018', 'title': 'Security Deployment — NHAI HQ',  'clientName': 'NHAI Headquarters', 'status': 'ACTIVE',    'startDate': '2026-05-01T00:00:00Z', 'endDate': '2026-10-31T00:00:00Z', 'value': 18500000, 'employeesDeployed': 42},
  {'id': 'dw2', 'workOrderNumber': 'WO-2026-0017', 'title': 'Housekeeping — AAI Terminal',    'clientName': 'AAI Terminal 2',    'status': 'ACTIVE',    'startDate': '2026-04-15T00:00:00Z', 'endDate': '2026-12-31T00:00:00Z', 'value': 12000000, 'employeesDeployed': 28},
  {'id': 'dw3', 'workOrderNumber': 'WO-2026-0016', 'title': 'Metro Station Guards',           'clientName': 'NMRC Phase-II',     'status': 'PENDING',   'startDate': '2026-07-01T00:00:00Z', 'endDate': '2027-06-30T00:00:00Z', 'value': 9600000,  'employeesDeployed': 0},
  {'id': 'dw4', 'workOrderNumber': 'WO-2026-0015', 'title': 'Fire Safety Team — IOCL',       'clientName': 'IOCL Refinery',     'status': 'COMPLETED', 'startDate': '2025-10-01T00:00:00Z', 'endDate': '2026-03-31T00:00:00Z', 'value': 7200000,  'employeesDeployed': 18},
  {'id': 'dw5', 'workOrderNumber': 'WO-2026-0014', 'title': 'Plant Security — ONGC Mumbai',  'clientName': 'ONGC Mumbai',       'status': 'ACTIVE',    'startDate': '2026-01-01T00:00:00Z', 'endDate': '2026-12-31T00:00:00Z', 'value': 22000000, 'employeesDeployed': 55},
];

final workOrdersListProvider =
    FutureProvider.autoDispose<List<Map<String, dynamic>>>((ref) async {
  final api = ref.watch(apiClientProvider);
  try {
    final r = await api.get('/work-orders', queryParameters: {'page': '1', 'limit': '20'});
    final list = _parseList(r.data);
    if (list.isNotEmpty) return list;
  } catch (_) {}
  return _dummyWorkOrders;
});

final workOrderDetailProvider = FutureProvider.autoDispose
    .family<Map<String, dynamic>, String>((ref, id) async {
  final api = ref.watch(apiClientProvider);
  try {
    final r = await api.get('/work-orders/$id');
    final data = r.data['data'];
    if (data is Map<String, dynamic>) return data;
  } catch (_) {}
  return _dummyWorkOrders.firstWhere((w) => w['id'] == id, orElse: () => _dummyWorkOrders.first);
});
