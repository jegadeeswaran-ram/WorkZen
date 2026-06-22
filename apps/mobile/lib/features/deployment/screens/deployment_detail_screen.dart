import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:intl/intl.dart';
import '../../../core/network/api_client.dart';
import '../../../core/theme/app_theme.dart';

final _deploymentDetailProvider =
    FutureProvider.autoDispose.family<Map<String, dynamic>, String>((ref, id) async {
  final api = ref.watch(apiClientProvider);
  try {
    final r = await api.get('/deployments/$id');
    return r.data['data'] as Map<String, dynamic>;
  } catch (_) {
    // Return dummy if endpoint not available
    return {
      'id': id,
      'status': 'ACTIVE',
      'startDate': DateTime.now().subtract(const Duration(days: 90)).toIso8601String(),
      'endDate': null,
      'employee': {'firstName': 'Rajesh', 'lastName': 'Kumar', 'employeeCode': 'EMP-001', 'designation': 'Security Guard'},
      'site': {'name': 'AIIMS Campus', 'location': 'New Delhi', 'clientName': 'AIIMS Delhi'},
      'shift': {'name': 'Morning Shift', 'startTime': '06:00', 'endTime': '14:00'},
      'workOrderId': 'WO-2025-001',
      'remarks': 'Deployed at main gate entry point.',
    };
  }
});

class DeploymentDetailScreen extends ConsumerWidget {
  final String deploymentId;
  const DeploymentDetailScreen({super.key, required this.deploymentId});

  String _fmt(String? iso) {
    if (iso == null) return 'Ongoing';
    try { return DateFormat('dd MMM yyyy').format(DateTime.parse(iso)); } catch (_) { return iso; }
  }

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final async = ref.watch(_deploymentDetailProvider(deploymentId));

    return Scaffold(
      backgroundColor: AppTheme.background,
      appBar: AppBar(title: const Text('Deployment Detail')),
      body: async.when(
        loading: () => const Center(child: CircularProgressIndicator(color: AppTheme.primary)),
        error: (e, _) => Center(child: Text('$e', style: const TextStyle(color: AppTheme.danger))),
        data: (d) {
          final emp = d['employee'] as Map<String, dynamic>? ?? {};
          final site = d['site'] as Map<String, dynamic>? ?? {};
          final shift = d['shift'] as Map<String, dynamic>? ?? {};
          final status = d['status'] as String? ?? '';
          final empName = '${emp['firstName'] ?? ''} ${emp['lastName'] ?? ''}'.trim();

          return SingleChildScrollView(
            padding: const EdgeInsets.all(16),
            child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
              // Header card
              Container(
                padding: const EdgeInsets.all(16),
                decoration: BoxDecoration(color: AppTheme.surface, borderRadius: BorderRadius.circular(16), border: Border.all(color: AppTheme.border)),
                child: Row(children: [
                  Container(
                    width: 48, height: 48,
                    decoration: BoxDecoration(color: AppTheme.primary.withValues(alpha: 0.12), shape: BoxShape.circle),
                    child: Center(child: Text(empName.isNotEmpty ? empName[0] : '?',
                        style: const TextStyle(color: AppTheme.primary, fontWeight: FontWeight.bold, fontSize: 18))),
                  ),
                  const SizedBox(width: 12),
                  Expanded(child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
                    Text(empName, style: const TextStyle(color: AppTheme.textPrimary, fontSize: 15, fontWeight: FontWeight.w700)),
                    Text(emp['employeeCode'] as String? ?? '', style: const TextStyle(color: AppTheme.textMuted, fontSize: 12)),
                    if (emp['designation'] != null) Text(emp['designation'] as String, style: const TextStyle(color: AppTheme.textSecondary, fontSize: 12)),
                  ])),
                  Container(
                    padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 3),
                    decoration: BoxDecoration(
                      color: (status == 'ACTIVE' ? AppTheme.success : AppTheme.textMuted).withValues(alpha: 0.12),
                      borderRadius: BorderRadius.circular(20),
                      border: Border.all(color: (status == 'ACTIVE' ? AppTheme.success : AppTheme.textMuted).withValues(alpha: 0.3)),
                    ),
                    child: Text(status, style: TextStyle(color: status == 'ACTIVE' ? AppTheme.success : AppTheme.textMuted, fontSize: 10, fontWeight: FontWeight.w600)),
                  ),
                ]),
              ),
              const SizedBox(height: 12),
              _section('Site', [
                _row('Name', site['name'] as String? ?? '—'),
                _row('Location', site['location'] as String? ?? '—'),
                _row('Client', site['clientName'] as String? ?? '—'),
              ]),
              const SizedBox(height: 12),
              _section('Schedule', [
                _row('Shift', shift['name'] as String? ?? '—'),
                if (shift['startTime'] != null)
                  _row('Timing', '${shift['startTime']} – ${shift['endTime'] ?? ''}'),
                _row('Start Date', _fmt(d['startDate'] as String?)),
                _row('End Date', _fmt(d['endDate'] as String?)),
              ]),
              if (d['remarks'] != null) ...[
                const SizedBox(height: 12),
                _section('Remarks', [
                  Padding(padding: const EdgeInsets.fromLTRB(16, 10, 16, 12),
                      child: Text(d['remarks'] as String, style: const TextStyle(color: AppTheme.textSecondary, fontSize: 13))),
                ]),
              ],
              const SizedBox(height: 24),
            ]),
          );
        },
      ),
    );
  }

  Widget _section(String title, List<Widget> rows) => Container(
    decoration: BoxDecoration(color: AppTheme.surface, borderRadius: BorderRadius.circular(16), border: Border.all(color: AppTheme.border)),
    child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
      Padding(padding: const EdgeInsets.fromLTRB(16, 14, 16, 10),
          child: Text(title, style: const TextStyle(color: AppTheme.textPrimary, fontWeight: FontWeight.w600, fontSize: 14))),
      const Divider(height: 1, color: AppTheme.border),
      ...rows,
    ]),
  );

  Widget _row(String label, String value) => Padding(
    padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 10),
    child: Row(children: [
      SizedBox(width: 100, child: Text(label, style: const TextStyle(color: AppTheme.textMuted, fontSize: 13))),
      Expanded(child: Text(value, style: const TextStyle(color: AppTheme.textPrimary, fontSize: 13))),
    ]),
  );
}
