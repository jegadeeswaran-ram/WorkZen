import 'package:flutter/material.dart';
import 'package:flutter_animate/flutter_animate.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../../../core/theme/app_theme.dart';
import '../providers/super_admin_provider.dart';
import '../widgets/sa_stat_chip.dart';
import '../widgets/sa_section_header.dart';

String _fmt(double v) {
  if (v >= 10000000) return '₹${(v / 10000000).toStringAsFixed(1)}Cr';
  if (v >= 100000) return '₹${(v / 100000).toStringAsFixed(1)}L';
  if (v >= 1000) return '₹${(v / 1000).toStringAsFixed(0)}K';
  return '₹${v.toStringAsFixed(0)}';
}

Color _statusColor(String status) {
  switch (status.toUpperCase()) {
    case 'PAID':
      return AppTheme.success;
    case 'PENDING':
      return AppTheme.warning;
    case 'OVERDUE':
      return AppTheme.danger;
    default:
      return AppTheme.textMuted;
  }
}

class SaBillingScreen extends ConsumerWidget {
  const SaBillingScreen({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final summaryAsync = ref.watch(saBillingSummaryProvider);
    final invoicesAsync = ref.watch(saInvoicesProvider);

    return Scaffold(
      backgroundColor: AppTheme.background,
      appBar: AppBar(
        title: const Text('Billing & Invoices'),
        backgroundColor: AppTheme.surface,
      ),
      body: RefreshIndicator(
        color: AppTheme.primary,
        onRefresh: () async {
          ref.invalidate(saBillingSummaryProvider);
          ref.invalidate(saInvoicesProvider);
          await Future.wait([
            ref
                .read(saBillingSummaryProvider.future)
                .catchError((_) => const SaBillingSummary(
                      totalBilled: 0,
                      collected: 0,
                      outstanding: 0,
                      collectionRatePercent: '0%',
                    )),
            ref
                .read(saInvoicesProvider.future)
                .catchError((_) => <SaInvoice>[]),
          ]);
        },
        child: SingleChildScrollView(
          physics: const AlwaysScrollableScrollPhysics(),
          padding: const EdgeInsets.all(16),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              // Summary boxes
              summaryAsync.when(
                data: (summary) => Column(
                  children: [
                    Row(
                      children: [
                        _SummaryBox(
                          label: 'Total Billed',
                          value: _fmt(summary.totalBilled),
                          color: AppTheme.primary,
                        ),
                        const SizedBox(width: 10),
                        _SummaryBox(
                          label: 'Collected',
                          value: _fmt(summary.collected),
                          color: AppTheme.success,
                        ),
                        const SizedBox(width: 10),
                        _SummaryBox(
                          label: 'Outstanding',
                          value: _fmt(summary.outstanding),
                          color: summary.outstanding > 0
                              ? AppTheme.warning
                              : AppTheme.success,
                        ),
                      ],
                    ).animate().fadeIn(duration: 300.ms),
                    const SizedBox(height: 12),
                    _CollectionRateBar(summary: summary)
                        .animate()
                        .fadeIn(delay: 100.ms, duration: 300.ms),
                  ],
                ),
                loading: () => const _SummaryShimmer(),
                error: (e, _) => _ErrorBox(message: e.toString()),
              ),
              const SizedBox(height: 20),
              // Invoice list
              const SaSectionHeader(title: 'Invoices'),
              const SizedBox(height: 10),
              invoicesAsync.when(
                data: (invoices) => invoices.isEmpty
                    ? const _EmptyState(message: 'No invoices found')
                    : Column(
                        children: invoices
                            .asMap()
                            .entries
                            .map(
                              (e) => _InvoiceCard(invoice: e.value)
                                  .animate()
                                  .fadeIn(
                                    delay: (e.key * 40).ms,
                                    duration: 250.ms,
                                  ),
                            )
                            .toList(),
                      ),
                loading: () => const Center(
                  child: Padding(
                    padding: EdgeInsets.all(32),
                    child: CircularProgressIndicator(color: AppTheme.primary),
                  ),
                ),
                error: (e, _) => _ErrorBox(message: e.toString()),
              ),
            ],
          ),
        ),
      ),
    );
  }
}

// ── Summary box ──────────────────────────────────────────────────────────────

class _SummaryBox extends StatelessWidget {
  const _SummaryBox({
    required this.label,
    required this.value,
    required this.color,
  });

  final String label;
  final String value;
  final Color color;

  @override
  Widget build(BuildContext context) {
    return Expanded(
      child: Container(
        padding: const EdgeInsets.all(14),
        decoration: BoxDecoration(
          color: AppTheme.surfaceVariant,
          borderRadius: BorderRadius.circular(12),
          border: Border.all(color: AppTheme.border),
        ),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Text(
              label,
              style: const TextStyle(
                fontSize: 10,
                color: AppTheme.textMuted,
                fontWeight: FontWeight.w500,
              ),
            ),
            const SizedBox(height: 6),
            Text(
              value,
              style: TextStyle(
                fontSize: 15,
                fontWeight: FontWeight.w700,
                color: color,
              ),
              maxLines: 1,
              overflow: TextOverflow.ellipsis,
            ),
          ],
        ),
      ),
    );
  }
}

// ── Collection rate bar ───────────────────────────────────────────────────────

class _CollectionRateBar extends StatelessWidget {
  const _CollectionRateBar({required this.summary});

  final SaBillingSummary summary;

  @override
  Widget build(BuildContext context) {
    final rate = double.tryParse(
          summary.collectionRatePercent.replaceAll('%', ''),
        ) ??
        0.0;

    return Container(
      padding: const EdgeInsets.all(12),
      decoration: BoxDecoration(
        color: AppTheme.surfaceVariant,
        borderRadius: BorderRadius.circular(12),
        border: Border.all(color: AppTheme.border),
      ),
      child: Column(
        children: [
          Row(
            children: [
              const Text(
                'Collection Rate',
                style: TextStyle(
                  fontSize: 13,
                  fontWeight: FontWeight.w600,
                  color: AppTheme.textPrimary,
                ),
              ),
              const Spacer(),
              Text(
                summary.collectionRatePercent,
                style: const TextStyle(
                  fontSize: 16,
                  fontWeight: FontWeight.w700,
                  color: AppTheme.success,
                ),
              ),
            ],
          ),
          const SizedBox(height: 8),
          ClipRRect(
            borderRadius: BorderRadius.circular(4),
            child: LinearProgressIndicator(
              value: (rate / 100).clamp(0.0, 1.0),
              backgroundColor: AppTheme.border,
              valueColor:
                  const AlwaysStoppedAnimation<Color>(AppTheme.success),
              minHeight: 6,
            ),
          ),
        ],
      ),
    );
  }
}

// ── Invoice card ──────────────────────────────────────────────────────────────

class _InvoiceCard extends StatelessWidget {
  const _InvoiceCard({required this.invoice});

  final SaInvoice invoice;

  @override
  Widget build(BuildContext context) {
    final statusColor = _statusColor(invoice.status);

    return Container(
      margin: const EdgeInsets.only(bottom: 10),
      padding: const EdgeInsets.all(14),
      decoration: BoxDecoration(
        color: AppTheme.surfaceVariant,
        borderRadius: BorderRadius.circular(12),
        border: Border.all(color: AppTheme.border),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            children: [
              Text(
                invoice.invoiceNumber,
                style: const TextStyle(
                  fontSize: 13,
                  fontWeight: FontWeight.w600,
                  color: AppTheme.textPrimary,
                ),
              ),
              const Spacer(),
              SaStatChip(label: invoice.status, color: statusColor),
            ],
          ),
          const SizedBox(height: 6),
          Row(
            children: [
              const Icon(Icons.person_outline,
                  size: 13, color: AppTheme.textSecondary),
              const SizedBox(width: 4),
              Expanded(
                child: Text(
                  invoice.clientName,
                  style: const TextStyle(
                    fontSize: 12,
                    color: AppTheme.textSecondary,
                  ),
                  overflow: TextOverflow.ellipsis,
                ),
              ),
              const SizedBox(width: 8),
              Text(
                _fmt(invoice.amount),
                style: const TextStyle(
                  fontSize: 14,
                  fontWeight: FontWeight.w600,
                  color: AppTheme.primary,
                ),
              ),
            ],
          ),
          const SizedBox(height: 4),
          Row(
            children: [
              const Icon(Icons.calendar_today_outlined,
                  size: 11, color: AppTheme.textMuted),
              const SizedBox(width: 4),
              Text(
                invoice.invoiceDate,
                style: const TextStyle(
                  fontSize: 11,
                  color: AppTheme.textMuted,
                ),
              ),
            ],
          ),
        ],
      ),
    );
  }
}

// ── Shimmer placeholder ───────────────────────────────────────────────────────

class _SummaryShimmer extends StatelessWidget {
  const _SummaryShimmer();

  @override
  Widget build(BuildContext context) {
    return Row(
      children: List.generate(
        3,
        (i) => Expanded(
          child: Container(
            height: 72,
            margin: EdgeInsets.only(left: i == 0 ? 0 : 10),
            decoration: BoxDecoration(
              color: AppTheme.surfaceVariant,
              borderRadius: BorderRadius.circular(12),
            ),
          ),
        ),
      ),
    );
  }
}

// ── Shared helpers ────────────────────────────────────────────────────────────

class _ErrorBox extends StatelessWidget {
  const _ErrorBox({required this.message});
  final String message;

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.all(16),
      decoration: BoxDecoration(
        color: AppTheme.danger.withValues(alpha: 0.08),
        borderRadius: BorderRadius.circular(12),
        border: Border.all(color: AppTheme.danger.withValues(alpha: 0.3)),
      ),
      child: Row(
        children: [
          const Icon(Icons.error_outline, color: AppTheme.danger, size: 18),
          const SizedBox(width: 8),
          Expanded(
            child: Text(
              message,
              style: const TextStyle(
                  fontSize: 12, color: AppTheme.textSecondary),
            ),
          ),
        ],
      ),
    );
  }
}

class _EmptyState extends StatelessWidget {
  const _EmptyState({required this.message});
  final String message;

  @override
  Widget build(BuildContext context) {
    return Center(
      child: Padding(
        padding: const EdgeInsets.all(32),
        child: Text(
          message,
          style: const TextStyle(
              fontSize: 14, color: AppTheme.textMuted),
        ),
      ),
    );
  }
}
