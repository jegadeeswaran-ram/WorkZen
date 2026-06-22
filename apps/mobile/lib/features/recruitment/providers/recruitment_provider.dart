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

final _dummyRequisitions = <Map<String, dynamic>>[
  {'id': 'dr1', 'requisitionNumber': 'JR-2026-0009', 'jobTitle': 'Senior Security Guard',  'department': 'Operations', 'location': 'NHAI HQ, Delhi',    'vacancies': 12, 'status': 'OPEN',     'postedDate': '2026-06-01T00:00:00Z', 'closingDate': '2026-07-01T00:00:00Z', 'candidateCount': 34},
  {'id': 'dr2', 'requisitionNumber': 'JR-2026-0008', 'jobTitle': 'Housekeeping Supervisor', 'department': 'Facilities', 'location': 'AAI Terminal 2',    'vacancies': 3,  'status': 'OPEN',     'postedDate': '2026-06-05T00:00:00Z', 'closingDate': '2026-06-30T00:00:00Z', 'candidateCount': 11},
  {'id': 'dr3', 'requisitionNumber': 'JR-2026-0007', 'jobTitle': 'Fire Safety Officer',     'department': 'Safety',     'location': 'IOCL Refinery',     'vacancies': 5,  'status': 'IN_REVIEW','postedDate': '2026-05-20T00:00:00Z', 'closingDate': '2026-06-20T00:00:00Z', 'candidateCount': 22},
  {'id': 'dr4', 'requisitionNumber': 'JR-2026-0006', 'jobTitle': 'Field Officer',           'department': 'Operations', 'location': 'NMRC Metro Stations','vacancies': 20, 'status': 'OPEN',     'postedDate': '2026-06-10T00:00:00Z', 'closingDate': '2026-07-10T00:00:00Z', 'candidateCount': 58},
];

final _dummyCandidates = <Map<String, dynamic>>[
  {'id': 'dc1', 'name': 'Ravi Kumar Singh',   'phone': '9876543210', 'status': 'SHORTLISTED', 'appliedDate': '2026-06-05T00:00:00Z', 'experience': '4 years'},
  {'id': 'dc2', 'name': 'Sunita Devi',        'phone': '9876543211', 'status': 'INTERVIEWED', 'appliedDate': '2026-06-07T00:00:00Z', 'experience': '2 years'},
  {'id': 'dc3', 'name': 'Manoj Yadav',        'phone': '9876543212', 'status': 'APPLIED',     'appliedDate': '2026-06-10T00:00:00Z', 'experience': '6 years'},
];

final jobRequisitionsProvider =
    FutureProvider.autoDispose<List<Map<String, dynamic>>>((ref) async {
  final api = ref.watch(apiClientProvider);
  try {
    final r = await api.get('/recruitment/requisitions', queryParameters: {'page': '1', 'limit': '20'});
    final list = _parseList(r.data);
    if (list.isNotEmpty) return list;
  } catch (_) {}
  return _dummyRequisitions;
});

final jobCandidatesProvider = FutureProvider.autoDispose
    .family<List<Map<String, dynamic>>, String>((ref, requisitionId) async {
  final api = ref.watch(apiClientProvider);
  try {
    final r = await api.get('/recruitment/requisitions/$requisitionId/candidates');
    final list = _parseList(r.data);
    if (list.isNotEmpty) return list;
  } catch (_) {}
  return _dummyCandidates;
});
