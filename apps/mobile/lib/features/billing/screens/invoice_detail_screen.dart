import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:intl/intl.dart';
import '../../../core/theme/app_theme.dart';
import '../providers/billing_provider.dart';

class InvoiceDetailScreen extends ConsumerWidget {
  final String invoiceId;
  const InvoiceDetailScreen({super.key, required this.invoiceId});

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
    'PAID' => AppTheme.success, 'SENT' => AppTheme.primary,
    'DRAFT' => AppTheme.warning, _ => AppTheme.danger,
  };

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final detailAsync = ref.watch(invoiceDetailProvider(invoiceId));

    return Scaffold(
      backgroundColor: AppTheme.background,
      appBar: AppBar(
        title: const Text('Invoice'),
        actions: [
          IconButton(
            icon: const Icon(Icons.download_outlined),
            onPressed: () => ScaffoldMessenger.of(context).showSnackBar(const SnackBar(content: Text('Download coming soon'))),
          ),
        ],
      ),
      body: detailAsync.when(
        loading: () => const Center(child: CircularProgressIndicator(color: AppTheme.primary)),
        error: (e, _) => Center(child: TextButton(onPressed: () => ref.invalidate(invoiceDetailProvider(invoiceId)), child: const Text('Retry'))),
        data: (inv) {
          final status = inv['status'] as String? ?? '';
          final color = _statusColor(status);
          final lineItems = (inv['lineItems'] as List? ?? []).cast<Map<String, dynamic>>();

          return SingleChildScrollView(
            padding: const EdgeInsets.all(16),
            child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
              Container(
                width: double.infinity, padding: const EdgeInsets.all(16),
                decoration: BoxDecoration(color: AppTheme.surface, borderRadius: BorderRadius.circular(16), border: Border.all(color: AppTheme.border)),
                child: Row(children: [
                  Expanded(child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
                    Text(inv['invoiceNumber'] as String? ?? '', style: const TextStyle(color: AppTheme.textPrimary, fontSize: 18, fontWeight: FontWeight.w700, letterSpacing: 0.5)),
                    const SizedBox(height: 4),
                    Text(inv['clientName'] as String? ?? '', style: const TextStyle(color: AppTheme.textSecondary, fontSize: 13)),
                  ])),
                  Container(
                    padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 5),
                    decoration: BoxDecoration(color: color.withValues(alpha: 0.12), borderRadius: BorderRadius.circular(20), border: Border.all(color: color.withValues(alpha: 0.3))),
                    child: Text(status, style: TextStyle(color: color, fontSize: 12, fontWeight: FontWeight.w600)),
                  ),
                ]),
              ),
              const SizedBox(height: 12),
              _section('Info', [
                _row('Issue Date', _fmt(inv['issueDate'] as String?)),
                _row('Due Date', _fmt(inv['dueDate'] as String?)),
                _row('Total Amount', _currency(inv['amount'])),
              ]),
              if (lineItems.isNotEmpty) ...[
                const SizedBox(height: 12),
                Container(
                  decoration: BoxDecoration(color: AppTheme.surface, borderRadius: BorderRadius.circular(16), border: Border.all(color: AppTheme.border)),
                  child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
                    const Padding(
                      padding: EdgeInsets.fromLTRB(16, 14, 16, 10),
                      child: Text('Line Items', style: TextStyle(color: AppTheme.textPrimary, fontWeight: FontWeight.w600, fontSize: 14)),
                    ),
                    const Divider(height: 1, color: AppTheme.border),
                    Padding(
                      padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 8),
                      child: Row(children: const [
                        Expanded(flex: 3, child: Text('Description', style: TextStyle(color: AppTheme.textMuted, fontSize: 11, fontWeight: FontWeight.w600))),
                        SizedBox(width: 8),
                        Text('Qty', style: TextStyle(color: AppTheme.textMuted, fontSize: 11, fontWeight: FontWeight.w600)),
                        SizedBox(width: 16),
                        Text('Rate', style: TextStyle(color: AppTheme.textMuted, fontSize: 11, fontWeight: FontWeight.w600)),
                        SizedBox(width: 16),
                        Text('Amount', style: TextStyle(color: AppTheme.textMuted, fontSize: 11, fontWeight: FontWeight.w600)),
                      ]),
                    ),
                    const Divider(height: 1, color: AppTheme.border),
                    ...lineItems.map((item) => Padding(
                      padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 10),
                      child: Row(children: [
                        Expanded(flex: 3, child: Text(item['description'] as String? ?? '', style: const TextStyle(color: AppTheme.textPrimary, fontSize: 12))),
                        const SizedBox(width: 8),
                        Text('${item['quantity'] ?? 1}', style: const TextStyle(color: AppTheme.textSecondary, fontSize: 12)),
                        const SizedBox(width: 16),
                        Text(_currency(item['rate']), style: const TextStyle(color: AppTheme.textSecondary, fontSize: 12)),
                        const SizedBox(width: 16),
                        Text(_currency(item['amount']), style: const TextStyle(color: AppTheme.textPrimary, fontSize: 12, fontWeight: FontWeight.w600)),
                      ]),
                    )),
                    const Divider(height: 1, color: AppTheme.border),
                    Padding(
                      padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 12),
                      child: Row(children: [
                        const Spacer(),
                        const Text('Total', style: TextStyle(color: AppTheme.textPrimary, fontWeight: FontWeight.w700, fontSize: 14)),
                        const SizedBox(width: 16),
                        Text(_currency(inv['amount']), style: const TextStyle(color: AppTheme.primary, fontWeight: FontWeight.w700, fontSize: 14)),
                      ]),
                    ),
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
