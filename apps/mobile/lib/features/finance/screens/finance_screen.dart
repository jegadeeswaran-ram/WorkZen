import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import 'package:intl/intl.dart';
import '../../../core/theme/app_theme.dart';
import '../providers/finance_provider.dart';

class FinanceScreen extends ConsumerWidget {
  const FinanceScreen({super.key});

  String _currency(dynamic val) {
    if (val == null) return '—';
    final n = (val is num) ? val.toDouble() : double.tryParse('$val') ?? 0;
    return NumberFormat.currency(locale: 'en_IN', symbol: '₹', decimalDigits: 0).format(n);
  }

  String _fmt(String? iso) {
    if (iso == null) return '—';
    try { return DateFormat('dd MMM yyyy').format(DateTime.parse(iso)); } catch (_) { return iso; }
  }

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final summaryAsync = ref.watch(financeSummaryProvider);
    final txAsync = ref.watch(recentTransactionsProvider);

    void refresh() {
      ref.invalidate(financeSummaryProvider);
      ref.invalidate(recentTransactionsProvider);
    }

    return Scaffold(
      backgroundColor: AppTheme.background,
      appBar: AppBar(
        title: const Text('Finance'),
        actions: [IconButton(icon: const Icon(Icons.refresh_outlined), onPressed: refresh)],
      ),
      floatingActionButton: FloatingActionButton(
        backgroundColor: AppTheme.primary,
        onPressed: () async {
          final result = await context.push('/finance/new');
          if (result == true) refresh();
        },
        child: const Icon(Icons.add, color: Colors.white),
      ),
      body: RefreshIndicator(
        color: AppTheme.primary,
        onRefresh: () async => refresh(),
        child: SingleChildScrollView(
          physics: const AlwaysScrollableScrollPhysics(),
          padding: const EdgeInsets.all(16),
          child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
            summaryAsync.when(
              loading: () => const Center(child: Padding(padding: EdgeInsets.all(32), child: CircularProgressIndicator(color: AppTheme.primary))),
              error: (e, _) => Center(child: TextButton(onPressed: () => ref.invalidate(financeSummaryProvider), child: const Text('Retry'))),
              data: (s) => Column(children: [
                GridView.count(
                  crossAxisCount: 2, shrinkWrap: true, physics: const NeverScrollableScrollPhysics(),
                  crossAxisSpacing: 12, mainAxisSpacing: 12, childAspectRatio: 1.6,
                  children: [
                    _SummaryCard('Revenue', _currency(s['totalRevenue']), AppTheme.success, Icons.trending_up),
                    _SummaryCard('Expenses', _currency(s['totalExpenses']), AppTheme.danger, Icons.trending_down),
                    _SummaryCard('Net Profit', _currency(s['netProfit']), AppTheme.primary, Icons.account_balance_wallet_outlined),
                    _SummaryCard('Cash Balance', _currency(s['cashBalance']), AppTheme.warning, Icons.savings_outlined),
                  ],
                ),
                const SizedBox(height: 12),
                Row(children: [
                  Expanded(child: _ArCard('Receivables', _currency(s['accountsReceivable']), AppTheme.success)),
                  const SizedBox(width: 12),
                  Expanded(child: _ArCard('Payables', _currency(s['accountsPayable']), AppTheme.danger)),
                ]),
              ]),
            ),
            const SizedBox(height: 16),
            const Text('Recent Transactions', style: TextStyle(color: AppTheme.textPrimary, fontWeight: FontWeight.w600, fontSize: 14)),
            const SizedBox(height: 10),
            txAsync.when(
              loading: () => const Center(child: CircularProgressIndicator(color: AppTheme.primary)),
              error: (_, __) => const SizedBox.shrink(),
              data: (txs) => txs.isEmpty
                ? const Center(child: Text('No transactions', style: TextStyle(color: AppTheme.textMuted)))
                : Column(
                    children: txs.take(10).map((tx) {
                      final isCredit = (tx['type'] as String? ?? '').toUpperCase() == 'CREDIT';
                      final color = isCredit ? AppTheme.success : AppTheme.danger;
                      final amount = _currency(tx['amount']);
                      return Container(
                        margin: const EdgeInsets.only(bottom: 8),
                        padding: const EdgeInsets.all(14),
                        decoration: BoxDecoration(color: AppTheme.surface, borderRadius: BorderRadius.circular(14), border: Border.all(color: AppTheme.border)),
                        child: Row(children: [
                          Container(
                            width: 36, height: 36,
                            decoration: BoxDecoration(color: color.withValues(alpha: 0.12), borderRadius: BorderRadius.circular(10)),
                            child: Icon(isCredit ? Icons.arrow_downward : Icons.arrow_upward, color: color, size: 18),
                          ),
                          const SizedBox(width: 12),
                          Expanded(child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
                            Text(tx['description'] as String? ?? '', style: const TextStyle(color: AppTheme.textPrimary, fontSize: 13, fontWeight: FontWeight.w500)),
                            Row(children: [
                              if (tx['category'] != null)
                                _chip(tx['category'] as String),
                              const SizedBox(width: 6),
                              Text(_fmt(tx['date'] as String?), style: const TextStyle(color: AppTheme.textMuted, fontSize: 11)),
                            ]),
                          ])),
                          Text('${isCredit ? '+' : '-'}$amount', style: TextStyle(color: color, fontSize: 14, fontWeight: FontWeight.w700)),
                        ]),
                      );
                    }).toList(),
                  ),
            ),
            const SizedBox(height: 24),
          ]),
        ),
      ),
    );
  }

  Widget _chip(String text) => Container(
    padding: const EdgeInsets.symmetric(horizontal: 6, vertical: 2),
    decoration: BoxDecoration(color: AppTheme.primary.withValues(alpha: 0.1), borderRadius: BorderRadius.circular(8)),
    child: Text(text, style: const TextStyle(color: AppTheme.primary, fontSize: 10)),
  );
}

class _SummaryCard extends StatelessWidget {
  final String label;
  final String value;
  final Color color;
  final IconData icon;
  const _SummaryCard(this.label, this.value, this.color, this.icon);

  @override
  Widget build(BuildContext context) => Container(
    padding: const EdgeInsets.all(14),
    decoration: BoxDecoration(color: AppTheme.surface, borderRadius: BorderRadius.circular(16), border: Border.all(color: AppTheme.border)),
    child: Column(crossAxisAlignment: CrossAxisAlignment.start, mainAxisAlignment: MainAxisAlignment.spaceBetween, children: [
      Row(children: [
        Icon(icon, size: 16, color: color),
        const SizedBox(width: 6),
        Text(label, style: const TextStyle(color: AppTheme.textSecondary, fontSize: 12)),
      ]),
      Text(value, style: TextStyle(color: color, fontSize: 16, fontWeight: FontWeight.w700)),
    ]),
  );
}

class _ArCard extends StatelessWidget {
  final String label;
  final String value;
  final Color color;
  const _ArCard(this.label, this.value, this.color);

  @override
  Widget build(BuildContext context) => Container(
    padding: const EdgeInsets.all(14),
    decoration: BoxDecoration(color: color.withValues(alpha: 0.06), borderRadius: BorderRadius.circular(14), border: Border.all(color: color.withValues(alpha: 0.25))),
    child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
      Text(label, style: TextStyle(color: color, fontSize: 12, fontWeight: FontWeight.w600)),
      const SizedBox(height: 4),
      Text(value, style: const TextStyle(color: AppTheme.textPrimary, fontSize: 15, fontWeight: FontWeight.w700)),
    ]),
  );
}
