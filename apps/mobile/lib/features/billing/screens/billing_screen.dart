import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import 'package:intl/intl.dart';
import '../../../core/theme/app_theme.dart';
import '../providers/billing_provider.dart';

class BillingScreen extends ConsumerStatefulWidget {
  const BillingScreen({super.key});

  @override
  ConsumerState<BillingScreen> createState() => _BillingScreenState();
}

class _BillingScreenState extends ConsumerState<BillingScreen> {
  String _filter = 'All';
  final _filters = ['All', 'Draft', 'Sent', 'Paid', 'Overdue'];

  Color _statusColor(String? s) => switch ((s ?? '').toUpperCase()) {
    'PAID' => AppTheme.success,
    'SENT' => AppTheme.primary,
    'DRAFT' => AppTheme.warning,
    'OVERDUE' => AppTheme.danger,
    'CANCELLED' => AppTheme.textMuted,
    _ => AppTheme.textMuted,
  };

  String _fmt(String? iso) {
    if (iso == null) return '—';
    try { return DateFormat('dd MMM yyyy').format(DateTime.parse(iso)); } catch (_) { return iso; }
  }

  String _currency(dynamic val) {
    if (val == null) return '—';
    final n = (val is num) ? val.toDouble() : double.tryParse('$val') ?? 0;
    return NumberFormat.currency(locale: 'en_IN', symbol: '₹', decimalDigits: 0).format(n);
  }

  @override
  Widget build(BuildContext context) {
    final invoicesAsync = ref.watch(invoicesListProvider);
    final summaryAsync = ref.watch(billingSummaryProvider);

    return Scaffold(
      backgroundColor: AppTheme.background,
      appBar: AppBar(
        title: const Text('Billing & Invoices'),
        actions: [IconButton(icon: const Icon(Icons.refresh_outlined), onPressed: () { ref.invalidate(invoicesListProvider); ref.invalidate(billingSummaryProvider); })],
      ),
      body: Column(children: [
        summaryAsync.when(
          loading: () => const SizedBox.shrink(),
          error: (_, __) => const SizedBox.shrink(),
          data: (s) => Padding(
            padding: const EdgeInsets.fromLTRB(16, 12, 16, 0),
            child: Row(children: [
              _SummaryChip('Outstanding', _currency(s['outstanding']), AppTheme.danger),
              const SizedBox(width: 8),
              _SummaryChip('Invoiced', _currency(s['totalInvoiced']), AppTheme.primary),
              const SizedBox(width: 8),
              _SummaryChip('Paid', _currency(s['totalPaid']), AppTheme.success),
            ]),
          ),
        ),
        SizedBox(
          height: 44,
          child: ListView.separated(
            scrollDirection: Axis.horizontal,
            padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 6),
            itemCount: _filters.length,
            separatorBuilder: (_, __) => const SizedBox(width: 8),
            itemBuilder: (_, i) {
              final f = _filters[i];
              final sel = _filter == f;
              return GestureDetector(
                onTap: () => setState(() => _filter = f),
                child: Container(
                  padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 4),
                  decoration: BoxDecoration(
                    color: sel ? AppTheme.primary : AppTheme.primary.withValues(alpha: 0.08),
                    borderRadius: BorderRadius.circular(20),
                    border: Border.all(color: sel ? AppTheme.primary : AppTheme.primary.withValues(alpha: 0.25)),
                  ),
                  child: Text(f, style: TextStyle(color: sel ? Colors.white : AppTheme.textSecondary, fontSize: 12, fontWeight: FontWeight.w600)),
                ),
              );
            },
          ),
        ),
        Expanded(
          child: RefreshIndicator(
            color: AppTheme.primary,
            onRefresh: () async => ref.invalidate(invoicesListProvider),
            child: invoicesAsync.when(
              loading: () => const Center(child: CircularProgressIndicator(color: AppTheme.primary)),
              error: (e, _) => Center(child: TextButton(onPressed: () => ref.invalidate(invoicesListProvider), child: const Text('Retry'))),
              data: (invoices) {
                final filtered = _filter == 'All' ? invoices : invoices.where((inv) =>
                  (inv['status'] as String? ?? '').toUpperCase() == _filter.toUpperCase()
                ).toList();

                if (filtered.isEmpty) return const Center(child: Text('No invoices', style: TextStyle(color: AppTheme.textMuted)));

                return ListView.builder(
                  padding: const EdgeInsets.all(16),
                  itemCount: filtered.length,
                  itemBuilder: (_, i) {
                    final inv = filtered[i];
                    final status = inv['status'] as String? ?? '';
                    final isOverdue = status.toUpperCase() == 'OVERDUE';
                    final color = _statusColor(status);

                    return GestureDetector(
                      onTap: () => context.push('/billing/${inv['id']}'),
                      child: Container(
                        margin: const EdgeInsets.only(bottom: 12),
                        decoration: BoxDecoration(
                          color: AppTheme.surface,
                          borderRadius: BorderRadius.circular(16),
                          border: Border.all(color: isOverdue ? AppTheme.danger.withValues(alpha: 0.4) : AppTheme.border),
                        ),
                        child: Row(children: [
                          if (isOverdue)
                            Container(width: 4, decoration: BoxDecoration(color: AppTheme.danger, borderRadius: const BorderRadius.only(topLeft: Radius.circular(16), bottomLeft: Radius.circular(16)))),
                          Expanded(
                            child: Padding(
                              padding: const EdgeInsets.all(16),
                              child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
                                Row(children: [
                                  Text(inv['invoiceNumber'] as String? ?? '', style: const TextStyle(color: AppTheme.textPrimary, fontWeight: FontWeight.w700, fontSize: 13, letterSpacing: 0.5)),
                                  const Spacer(),
                                  Text(_currency(inv['amount']), style: const TextStyle(color: AppTheme.textPrimary, fontWeight: FontWeight.w700, fontSize: 15)),
                                ]),
                                const SizedBox(height: 4),
                                Text(inv['clientName'] as String? ?? '', style: const TextStyle(color: AppTheme.textSecondary, fontSize: 13)),
                                const SizedBox(height: 8),
                                Row(children: [
                                  _badge(status, color),
                                  const SizedBox(width: 8),
                                  const Icon(Icons.calendar_today, size: 11, color: AppTheme.textMuted),
                                  const SizedBox(width: 4),
                                  Text('Due: ${_fmt(inv['dueDate'] as String?)}', style: const TextStyle(color: AppTheme.textMuted, fontSize: 11)),
                                ]),
                              ]),
                            ),
                          ),
                        ]),
                      ),
                    );
                  },
                );
              },
            ),
          ),
        ),
      ]),
    );
  }

  Widget _badge(String text, Color color) => Container(
    padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 3),
    decoration: BoxDecoration(color: color.withValues(alpha: 0.12), borderRadius: BorderRadius.circular(20), border: Border.all(color: color.withValues(alpha: 0.3))),
    child: Text(text, style: TextStyle(color: color, fontSize: 10, fontWeight: FontWeight.w600)),
  );
}

class _SummaryChip extends StatelessWidget {
  final String label;
  final String value;
  final Color color;
  const _SummaryChip(this.label, this.value, this.color);

  @override
  Widget build(BuildContext context) => Expanded(
    child: Container(
      padding: const EdgeInsets.symmetric(vertical: 8, horizontal: 10),
      decoration: BoxDecoration(color: color.withValues(alpha: 0.08), borderRadius: BorderRadius.circular(12), border: Border.all(color: color.withValues(alpha: 0.25))),
      child: Column(children: [
        Text(value, style: TextStyle(color: color, fontSize: 13, fontWeight: FontWeight.w700)),
        Text(label, style: const TextStyle(color: AppTheme.textMuted, fontSize: 10)),
      ]),
    ),
  );
}
