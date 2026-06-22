import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import 'package:intl/intl.dart';
import '../../../core/theme/app_theme.dart';
import '../providers/tenders_provider.dart';

class TenderDetailScreen extends ConsumerWidget {
  final String tenderId;
  const TenderDetailScreen({super.key, required this.tenderId});

  String _fmt(String? iso) {
    if (iso == null) return '—';
    try {
      return DateFormat('dd MMM yyyy').format(DateTime.parse(iso));
    } catch (_) {
      return iso;
    }
  }

  String _currency(dynamic val) {
    if (val == null) return '—';
    final n = (val is num) ? val.toDouble() : double.tryParse('$val') ?? 0;
    return NumberFormat.currency(locale: 'en_IN', symbol: '₹', decimalDigits: 0).format(n);
  }

  Color _statusColor(String s) => switch (s.toUpperCase()) {
        'AWARDED' => AppTheme.success,
        'SUBMITTED' || 'ACTIVE' => AppTheme.primary,
        'DRAFT' => AppTheme.warning,
        _ => AppTheme.danger,
      };

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final detailAsync = ref.watch(tenderDetailProvider(tenderId));

    return Scaffold(
      backgroundColor: AppTheme.background,
      appBar: AppBar(
        title: const Text('Tender Detail'),
        actions: [
          IconButton(
            icon: const Icon(Icons.edit_outlined),
            onPressed: () async {
              final detail = ref.read(tenderDetailProvider(tenderId)).value;
              final result = await context.push('/tenders/$tenderId/edit', extra: detail);
              if (result == true) ref.invalidate(tenderDetailProvider(tenderId));
            },
          ),
        ],
      ),
      body: detailAsync.when(
        loading: () =>
            const Center(child: CircularProgressIndicator(color: AppTheme.primary)),
        error: (e, _) => Center(
          child: TextButton(
              onPressed: () => ref.invalidate(tenderDetailProvider(tenderId)),
              child: const Text('Retry')),
        ),
        data: (t) {
          final status = t['status'] as String? ?? '';
          final workOrders = (t['workOrders'] as List? ?? []).cast<Map<String, dynamic>>();
          final docs = (t['tenderDocuments'] as List? ?? []);

          return SingleChildScrollView(
            padding: const EdgeInsets.all(16),
            child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
              Container(
                width: double.infinity,
                padding: const EdgeInsets.all(16),
                decoration: BoxDecoration(
                  color: AppTheme.surface,
                  borderRadius: BorderRadius.circular(16),
                  border: Border.all(color: AppTheme.border),
                ),
                child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
                  Row(children: [
                    Expanded(
                      child: Text(t['tenderNumber'] as String? ?? '',
                          style: const TextStyle(
                              color: AppTheme.primary,
                              fontSize: 13,
                              fontWeight: FontWeight.w600)),
                    ),
                    _badge(status, _statusColor(status)),
                  ]),
                  const SizedBox(height: 8),
                  Text(t['title'] as String? ?? '',
                      style: const TextStyle(
                          color: AppTheme.textPrimary,
                          fontSize: 16,
                          fontWeight: FontWeight.w700)),
                ]),
              ),

              const SizedBox(height: 12),
              _section('Details', [
                _row('Client', t['clientName'] as String? ?? (t['client'] as Map?)?['name'] as String? ?? '—'),
                _row('Estimated Value', _currency(t['estimatedValue'])),
                _row('Bid Deadline', _fmt(t['bidDeadline'] as String?)),
                _row('Start Date', _fmt(t['startDate'] as String?)),
                _row('End Date', _fmt(t['endDate'] as String?)),
              ]),

              if (workOrders.isNotEmpty) ...[
                const SizedBox(height: 12),
                Container(
                  decoration: BoxDecoration(
                    color: AppTheme.surface,
                    borderRadius: BorderRadius.circular(16),
                    border: Border.all(color: AppTheme.border),
                  ),
                  child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
                    Padding(
                      padding: const EdgeInsets.fromLTRB(16, 14, 16, 10),
                      child: Text('Work Orders (${workOrders.length})',
                          style: const TextStyle(
                              color: AppTheme.textPrimary,
                              fontWeight: FontWeight.w600,
                              fontSize: 14)),
                    ),
                    const Divider(height: 1, color: AppTheme.border),
                    ...workOrders.map((wo) => Padding(
                          padding: const EdgeInsets.symmetric(
                              horizontal: 16, vertical: 10),
                          child: Row(children: [
                            Expanded(
                              child: Column(
                                  crossAxisAlignment: CrossAxisAlignment.start,
                                  children: [
                                    Text(wo['orderNumber'] as String? ?? '',
                                        style: const TextStyle(
                                            color: AppTheme.primary,
                                            fontSize: 12)),
                                    Text(wo['title'] as String? ?? '',
                                        style: const TextStyle(
                                            color: AppTheme.textPrimary,
                                            fontSize: 13)),
                                  ]),
                            ),
                            _badge(wo['status'] as String? ?? '',
                                _statusColor(wo['status'] as String? ?? '')),
                          ]),
                        )),
                  ]),
                ),
              ],

              const SizedBox(height: 12),
              Container(
                padding: const EdgeInsets.all(16),
                decoration: BoxDecoration(
                  color: AppTheme.surface,
                  borderRadius: BorderRadius.circular(16),
                  border: Border.all(color: AppTheme.border),
                ),
                child: Row(children: [
                  const Icon(Icons.attach_file, color: AppTheme.textMuted, size: 18),
                  const SizedBox(width: 8),
                  Text('${docs.length} Document${docs.length == 1 ? '' : 's'} attached',
                      style: const TextStyle(color: AppTheme.textSecondary, fontSize: 13)),
                ]),
              ),

              const SizedBox(height: 24),
            ]),
          );
        },
      ),
    );
  }

  Widget _badge(String text, Color color) => Container(
        padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 3),
        decoration: BoxDecoration(
          color: color.withValues(alpha: 0.12),
          borderRadius: BorderRadius.circular(20),
          border: Border.all(color: color.withValues(alpha: 0.3)),
        ),
        child: Text(text,
            style: TextStyle(
                color: color, fontSize: 10, fontWeight: FontWeight.w600)),
      );

  Widget _section(String title, List<Widget> rows) => Container(
        decoration: BoxDecoration(
          color: AppTheme.surface,
          borderRadius: BorderRadius.circular(16),
          border: Border.all(color: AppTheme.border),
        ),
        child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
          Padding(
            padding: const EdgeInsets.fromLTRB(16, 14, 16, 10),
            child: Text(title,
                style: const TextStyle(
                    color: AppTheme.textPrimary,
                    fontWeight: FontWeight.w600,
                    fontSize: 14)),
          ),
          const Divider(height: 1, color: AppTheme.border),
          ...rows,
        ]),
      );

  Widget _row(String label, String value) => Padding(
        padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 10),
        child: Row(crossAxisAlignment: CrossAxisAlignment.start, children: [
          SizedBox(
              width: 120,
              child: Text(label,
                  style:
                      const TextStyle(color: AppTheme.textMuted, fontSize: 13))),
          Expanded(
              child: Text(value,
                  style: const TextStyle(
                      color: AppTheme.textPrimary, fontSize: 13))),
        ]),
      );
}
