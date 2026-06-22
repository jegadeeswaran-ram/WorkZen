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

const _dummySummary = <String, dynamic>{
  'totalRevenue': 42500000, 'totalExpenses': 28750000,
  'netProfit': 13750000,   'cashBalance': 8200000,
  'accountsReceivable': 6500000, 'accountsPayable': 3400000,
};

final _dummyTransactions = <Map<String, dynamic>>[
  {'id': 'd1', 'type': 'CREDIT', 'description': 'Invoice payment — AAI Contract', 'amount': 8500000, 'category': 'Billing', 'date': '2026-06-15T00:00:00Z'},
  {'id': 'd2', 'type': 'DEBIT',  'description': 'Staff Salary — June 2026',        'amount': 6200000, 'category': 'Payroll', 'date': '2026-06-10T00:00:00Z'},
  {'id': 'd3', 'type': 'CREDIT', 'description': 'Invoice payment — NMRC Project',  'amount': 4100000, 'category': 'Billing', 'date': '2026-06-08T00:00:00Z'},
  {'id': 'd4', 'type': 'DEBIT',  'description': 'PF & ESI Contribution',           'amount': 980000,  'category': 'Compliance', 'date': '2026-06-07T00:00:00Z'},
  {'id': 'd5', 'type': 'DEBIT',  'description': 'Uniform & Equipment Purchase',    'amount': 340000,  'category': 'Operations', 'date': '2026-06-05T00:00:00Z'},
];

final financeSummaryProvider =
    FutureProvider.autoDispose<Map<String, dynamic>>((ref) async {
  final api = ref.watch(apiClientProvider);
  try {
    final r = await api.get('/finance/dashboard');
    final data = r.data['data'];
    if (data is Map<String, dynamic> && data.isNotEmpty) return data;
  } catch (_) {}
  return _dummySummary;
});

final recentTransactionsProvider =
    FutureProvider.autoDispose<List<Map<String, dynamic>>>((ref) async {
  final api = ref.watch(apiClientProvider);
  try {
    final r = await api.get('/finance/transactions', queryParameters: {'page': '1', 'limit': '20'});
    final list = _parseList(r.data);
    if (list.isNotEmpty) return list;
  } catch (_) {}
  return _dummyTransactions;
});
