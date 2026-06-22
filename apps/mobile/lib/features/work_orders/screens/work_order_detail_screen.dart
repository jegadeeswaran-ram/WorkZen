import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:intl/intl.dart';
import '../../../core/theme/app_theme.dart';
import '../providers/work_orders_provider.dart';

class WorkOrderDetailScreen extends ConsumerWidget {
  final String workOrderId;
  const WorkOrderDetailScreen({super.key, required this.workOrderId});

  String _fmt(String? iso) {
    if (iso == null) return '—';
    try { return DateFormat('dd MMM yyyy').format(DateTime.parse(iso)); } catch (_) { return iso; }
  }

  String _currency(dynamic val) {
    if (val == null) return '—';
    final n = (val is num) ? val.toDouble() : double.tryParse('$val') ?? 0;
    return NumberFormat.currency(locale: 'en_IN', symbol: '₹', decimalDigits: 0).format(n);
  }

  Color _statusColor(String? s) => switch ((s ?? '').toUpperCase()) {
    'ACTIVE' => AppTheme.success, 'PENDING' => AppTheme.warning,
    'COMPLETED' => AppTheme.primary, _ => AppTheme.danger,
  };

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final detailAsync = ref.watch(workOrderDetailProvider(workOrderId));

    return Scaffold(
      backgroundColor: AppTheme.background,
      appBar: AppBar(title: const Text('Work Order')),
      body: detailAsync.when(
        loading: () => const Center(child: CircularProgressIndicator(color: AppTheme.primary)),
        error: (e, _) => Center(child: TextButton(onPressed: () => ref.invalidate(workOrderDetailProvider(workOrderId)), child: const Text('Retry'))),
        data: (wo) {
          final status = wo['status'] as String? ?? '';
          final deployments = wo['deployments'] as List? ?? [];
          return SingleChildScrollView(
            padding: const EdgeInsets.all(16),
            child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
              Container(
                width: double.infinity, padding: const EdgeInsets.all(16),
                decoration: BoxDecoration(color: AppTheme.surface, borderRadius: BorderRadius.circular(16), border: Border.all(color: AppTheme.border)),
                child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
                  Row(children: [
                    Expanded(child: Text(wo['orderNumber'] as String? ?? '', style: const TextStyle(color: AppTheme.primary, fontSize: 13, fontWeight: FontWeight.w600))),
                    _badge(status, _statusColor(status)),
                  ]),
                  const SizedBox(height: 8),
                  Text(wo['title'] as String? ?? '', style: const TextStyle(color: AppTheme.textPrimary, fontSize: 16, fontWeight: FontWeight.w700)),
                ]),
              ),
              const SizedBox(height: 12),
              _section('Details', [
                _row('Client', wo['clientName'] as String? ?? (wo['client'] as Map?)?['name'] as String? ?? '—'),
                _row('Value', _currency(wo['value'])),
                _row('Start Date', _fmt(wo['startDate'] as String?)),
                _row('End Date', _fmt(wo['endDate'] as String?)),
                if (wo['description'] != null) _row('Description', wo['description'] as String),
              ]),
              if (deployments.isNotEmpty) ...[
                const SizedBox(height: 12),
                Container(
                  padding: const EdgeInsets.all(16),
                  decoration: BoxDecoration(color: AppTheme.surface, borderRadius: BorderRadius.circular(16), border: Border.all(color: AppTheme.border)),
                  child: Row(children: [
                    const Icon(Icons.groups_outlined, color: AppTheme.textMuted, size: 18),
                    const SizedBox(width: 8),
                    Text('${deployments.length} Staff Deployed', style: const TextStyle(color: AppTheme.textSecondary, fontSize: 13)),
                  ]),
                ),
              ],
              const SizedBox(height: 24),
            ]),
          );
        },
      ),
    );
  }

  Widget _badge(String text, Color color) => Container(
    padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 3),
    decoration: BoxDecoration(color: color.withValues(alpha: 0.12), borderRadius: BorderRadius.circular(20), border: Border.all(color: color.withValues(alpha: 0.3))),
    child: Text(text, style: TextStyle(color: color, fontSize: 10, fontWeight: FontWeight.w600)),
  );

  Widget _section(String title, List<Widget> rows) => Container(
    decoration: BoxDecoration(color: AppTheme.surface, borderRadius: BorderRadius.circular(16), border: Border.all(color: AppTheme.border)),
    child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
      Padding(padding: const EdgeInsets.fromLTRB(16, 14, 16, 10), child: Text(title, style: const TextStyle(color: AppTheme.textPrimary, fontWeight: FontWeight.w600, fontSize: 14))),
      const Divider(height: 1, color: AppTheme.border),
      ...rows,
    ]),
  );

  Widget _row(String label, String value) => Padding(
    padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 10),
    child: Row(crossAxisAlignment: CrossAxisAlignment.start, children: [
      SizedBox(width: 110, child: Text(label, style: const TextStyle(color: AppTheme.textMuted, fontSize: 13))),
      Expanded(child: Text(value, style: const TextStyle(color: AppTheme.textPrimary, fontSize: 13))),
    ]),
  );
}
