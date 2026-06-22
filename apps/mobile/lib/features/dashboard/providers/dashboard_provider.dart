import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../../../core/network/api_client.dart';

// ---------------------------------------------------------------------------
// Dashboard Summary
// GET /reports/summary
// Returns: { employees, activeTenders, invoicesThisMonth,
//            payrollThisMonth: { totalNet }, complianceOverdue,
//            deploymentsActive, totalClients }
// ---------------------------------------------------------------------------

final dashboardSummaryProvider =
    FutureProvider.autoDispose<Map<String, dynamic>>((ref) async {
  final api = ref.watch(apiClientProvider);
  final r = await api.get('/reports/summary');
  final data = r.data['data'];
  if (data is Map<String, dynamic>) return data;
  return <String, dynamic>{};
});

// ---------------------------------------------------------------------------
// My Pending Approvals
// GET /workflows/my-approvals
// Returns list of pending workflow approval items
// ---------------------------------------------------------------------------

final myPendingApprovalsProvider =
    FutureProvider.autoDispose<List<Map<String, dynamic>>>((ref) async {
  final api = ref.watch(apiClientProvider);
  final r = await api.get('/workflows/my-approvals');
  final data = r.data['data'];
  if (data is List) return data.cast<Map<String, dynamic>>();
  if (data is Map && data['items'] is List) {
    return (data['items'] as List).cast<Map<String, dynamic>>();
  }
  return <Map<String, dynamic>>[];
});
