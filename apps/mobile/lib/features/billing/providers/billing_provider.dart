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

const _dummyBillingSummary = <String, dynamic>{
  'outstanding': 8500000, 'totalInvoiced': 45000000, 'totalPaid': 36500000,
};

final _dummyInvoices = <Map<String, dynamic>>[
  {'id': 'di1', 'invoiceNumber': 'INV-2026-0042', 'clientName': 'NHAI Headquarters', 'amount': 12500000, 'status': 'SENT',    'dueDate': '2026-06-30T00:00:00Z', 'issuedDate': '2026-06-01T00:00:00Z'},
  {'id': 'di2', 'invoiceNumber': 'INV-2026-0041', 'clientName': 'AAI Terminal 2',    'amount': 8750000,  'status': 'PAID',    'dueDate': '2026-06-15T00:00:00Z', 'issuedDate': '2026-05-20T00:00:00Z'},
  {'id': 'di3', 'invoiceNumber': 'INV-2026-0040', 'clientName': 'NMRC Phase-II',     'amount': 6200000,  'status': 'OVERDUE', 'dueDate': '2026-06-10T00:00:00Z', 'issuedDate': '2026-05-10T00:00:00Z'},
  {'id': 'di4', 'invoiceNumber': 'INV-2026-0039', 'clientName': 'IOCL Refinery',     'amount': 4100000,  'status': 'DRAFT',   'dueDate': '2026-07-05T00:00:00Z', 'issuedDate': '2026-06-18T00:00:00Z'},
  {'id': 'di5', 'invoiceNumber': 'INV-2026-0038', 'clientName': 'ONGC Mumbai',       'amount': 9800000,  'status': 'PAID',    'dueDate': '2026-05-31T00:00:00Z', 'issuedDate': '2026-05-01T00:00:00Z'},
];

final invoicesListProvider =
    FutureProvider.autoDispose<List<Map<String, dynamic>>>((ref) async {
  final api = ref.watch(apiClientProvider);
  try {
    final r = await api.get('/billing/invoices', queryParameters: {'page': '1', 'limit': '20'});
    final list = _parseList(r.data);
    if (list.isNotEmpty) return list;
  } catch (_) {}
  return _dummyInvoices;
});

final invoiceDetailProvider = FutureProvider.autoDispose
    .family<Map<String, dynamic>, String>((ref, id) async {
  final api = ref.watch(apiClientProvider);
  try {
    final r = await api.get('/billing/invoices/$id');
    final data = r.data['data'];
    if (data is Map<String, dynamic>) return data;
  } catch (_) {}
  return _dummyInvoices.firstWhere((i) => i['id'] == id, orElse: () => _dummyInvoices.first);
});

final billingSummaryProvider =
    FutureProvider.autoDispose<Map<String, dynamic>>((ref) async {
  final api = ref.watch(apiClientProvider);
  try {
    final r = await api.get('/billing/dashboard');
    final data = r.data['data'];
    if (data is Map<String, dynamic> && data.isNotEmpty) return data;
  } catch (_) {}
  return _dummyBillingSummary;
});
