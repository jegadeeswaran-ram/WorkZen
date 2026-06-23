import 'package:flutter/material.dart';
import 'package:flutter_animate/flutter_animate.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import '../../../core/theme/app_theme.dart';
import '../providers/super_admin_provider.dart';
import '../widgets/sa_stat_chip.dart';
import '../widgets/sa_section_header.dart';
import '../widgets/sa_info_row.dart';

// ── SCREEN ────────────────────────────────────────────────────────────────────

class SaTenderDetailScreen extends ConsumerWidget {
  final String tenderId;

  const SaTenderDetailScreen({super.key, required this.tenderId});

  Color _statusColor(String status) {
    switch (status.toUpperCase()) {
      case 'ACTIVE':
        return AppTheme.success;
      case 'AWARDED':
        return const Color(0xFF8B5CF6);
      case 'COMPLETED':
        return AppTheme.textMuted;
      case 'DRAFT':
        return const Color(0xFF60A5FA);
      case 'EXPIRED':
        return AppTheme.danger;
      default:
        return AppTheme.textMuted;
    }
  }

  String _formatAmount(double amount) {
    if (amount >= 1e7) {
      return '${(amount / 1e7).toStringAsFixed(2)} Cr';
    } else if (amount >= 1e5) {
      return '${(amount / 1e5).toStringAsFixed(2)} L';
    } else if (amount >= 1e3) {
      return '${(amount / 1e3).toStringAsFixed(1)} K';
    }
    return amount.toStringAsFixed(0);
  }

  SaStatChip _woStatusChip(String status) {
    final Color color;
    switch (status.toUpperCase()) {
      case 'COMPLETED':
        color = AppTheme.success;
        break;
      case 'ACTIVE':
        color = AppTheme.primary;
        break;
      case 'PENDING':
        color = AppTheme.warning;
        break;
      default:
        color = AppTheme.textMuted;
    }
    return SaStatChip(label: status, color: color);
  }

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final detailAsync = ref.watch(saTenderDetailProvider(tenderId));

    return Scaffold(
      backgroundColor: AppTheme.background,
      body: detailAsync.when(
        loading: () => const Center(
          child: CircularProgressIndicator(color: AppTheme.primary),
        ),
        error: (e, _) => _ErrorBody(
          message: e.toString(),
          onBack: () => context.pop(),
          onRetry: () => ref.invalidate(saTenderDetailProvider(tenderId)),
        ),
        data: (detail) {
          final tender = detail.tender;
          final chipColor = _statusColor(tender.status);
          final progress = tender.progressPercent / 100;

          return CustomScrollView(
            slivers: [
              // ── SLIVER APP BAR ────────────────────────────────────────────
              SliverAppBar(
                expandedHeight: 160,
                pinned: true,
                backgroundColor: AppTheme.surface,
                leading: IconButton(
                  icon: const Icon(
                    Icons.arrow_back,
                    color: AppTheme.textSecondary,
                  ),
                  onPressed: () => context.pop(),
                ),
                flexibleSpace: FlexibleSpaceBar(
                  background: Container(
                    color: AppTheme.surface,
                    padding: const EdgeInsets.fromLTRB(16, 80, 16, 12),
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Row(
                          children: [
                            Text(
                              tender.tenderNumber,
                              style: const TextStyle(
                                fontSize: 12,
                                color: AppTheme.textMuted,
                              ),
                            ),
                            const Spacer(),
                            SaStatChip(
                              label: tender.status,
                              color: chipColor,
                            ),
                          ],
                        ),
                        const SizedBox(height: 4),
                        Text(
                          tender.title,
                          style: const TextStyle(
                            fontSize: 18,
                            fontWeight: FontWeight.w700,
                            color: AppTheme.textPrimary,
                          ),
                          maxLines: 2,
                          overflow: TextOverflow.ellipsis,
                        ),
                        const SizedBox(height: 4),
                        Row(
                          children: [
                            const Icon(
                              Icons.business_outlined,
                              size: 13,
                              color: AppTheme.textSecondary,
                            ),
                            const SizedBox(width: 4),
                            Expanded(
                              child: Text(
                                tender.clientName,
                                style: const TextStyle(
                                  fontSize: 13,
                                  color: AppTheme.textSecondary,
                                ),
                                maxLines: 1,
                                overflow: TextOverflow.ellipsis,
                              ),
                            ),
                          ],
                        ),
                      ],
                    ),
                  ),
                ),
              ),

              // ── FINANCIAL SUMMARY CARD ────────────────────────────────────
              SliverToBoxAdapter(
                child: Container(
                  margin: const EdgeInsets.all(16),
                  padding: const EdgeInsets.all(16),
                  decoration: BoxDecoration(
                    color: AppTheme.surfaceVariant,
                    borderRadius: BorderRadius.circular(14),
                    border: Border.all(color: AppTheme.border, width: 1),
                  ),
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      const Text(
                        'Financial Summary',
                        style: TextStyle(
                          fontSize: 13,
                          fontWeight: FontWeight.w700,
                          color: AppTheme.textSecondary,
                        ),
                      ),
                      const SizedBox(height: 12),
                      Row(
                        children: [
                          _FinanceStat(
                            label: 'Contract Value',
                            value: '₹${_formatAmount(tender.contractValue)}',
                            color: AppTheme.primary,
                          ),
                          const SizedBox(width: 8),
                          _FinanceStat(
                            label: 'Invoiced',
                            value: '₹${_formatAmount(detail.invoiced)}',
                            color: const Color(0xFF8B5CF6),
                          ),
                        ],
                      ),
                      const SizedBox(height: 8),
                      Row(
                        children: [
                          _FinanceStat(
                            label: 'Collected',
                            value: '₹${_formatAmount(detail.collected)}',
                            color: AppTheme.success,
                          ),
                          const SizedBox(width: 8),
                          _FinanceStat(
                            label: 'Outstanding',
                            value: '₹${_formatAmount(detail.outstanding)}',
                            color: detail.outstanding > 0
                                ? AppTheme.warning
                                : AppTheme.success,
                          ),
                        ],
                      ),
                      const SizedBox(height: 12),
                      Row(
                        children: [
                          const Text(
                            'Contract Period',
                            style: TextStyle(
                              fontSize: 12,
                              color: AppTheme.textMuted,
                            ),
                          ),
                          const Spacer(),
                          Text(
                            '${tender.progressPercent.toStringAsFixed(0)}% complete',
                            style: const TextStyle(
                              fontSize: 12,
                              color: AppTheme.primary,
                              fontWeight: FontWeight.w600,
                            ),
                          ),
                        ],
                      ),
                      const SizedBox(height: 4),
                      ClipRRect(
                        borderRadius: BorderRadius.circular(4),
                        child: LinearProgressIndicator(
                          value: progress,
                          minHeight: 8,
                          backgroundColor: AppTheme.border,
                          valueColor: const AlwaysStoppedAnimation<Color>(
                            AppTheme.primary,
                          ),
                        ),
                      ),
                    ],
                  ),
                ).animate().fadeIn(duration: 350.ms).slideY(begin: 0.05),
              ),

              // ── DEPLOYMENT INFO ───────────────────────────────────────────
              SliverToBoxAdapter(
                child: Padding(
                  padding: const EdgeInsets.symmetric(horizontal: 16),
                  child: Container(
                    padding: const EdgeInsets.all(14),
                    decoration: BoxDecoration(
                      color: AppTheme.surfaceVariant,
                      borderRadius: BorderRadius.circular(12),
                      border: Border.all(color: AppTheme.border, width: 1),
                    ),
                    child: Row(
                      children: [
                        const Icon(
                          Icons.people_outline,
                          color: AppTheme.primary,
                          size: 20,
                        ),
                        const SizedBox(width: 10),
                        Expanded(
                          child: Text(
                            '${detail.deployedCount} employees deployed on this tender',
                            style: const TextStyle(
                              fontSize: 13,
                              color: AppTheme.textSecondary,
                            ),
                          ),
                        ),
                      ],
                    ),
                  ).animate().fadeIn(duration: 350.ms, delay: 80.ms),
                ),
              ),

              // ── WORK ORDERS HEADER ────────────────────────────────────────
              const SliverToBoxAdapter(
                child: Padding(
                  padding: EdgeInsets.fromLTRB(16, 16, 16, 8),
                  child: SaSectionHeader(title: 'Work Orders'),
                ),
              ),

              // ── WORK ORDERS LIST ──────────────────────────────────────────
              if (detail.workOrders.isEmpty)
                const SliverToBoxAdapter(
                  child: Padding(
                    padding: EdgeInsets.symmetric(horizontal: 16, vertical: 8),
                    child: Text(
                      'No work orders found',
                      style: TextStyle(
                        fontSize: 13,
                        color: AppTheme.textMuted,
                      ),
                    ),
                  ),
                )
              else
                SliverList(
                  delegate: SliverChildBuilderDelegate(
                    (ctx, i) {
                      final wo = detail.workOrders[i];
                      final woNumber =
                          wo['woNumber'] as String? ?? '—';
                      final woStatus = wo['status'] as String? ?? '';

                      return Container(
                        margin: const EdgeInsets.symmetric(
                          horizontal: 16,
                          vertical: 4,
                        ),
                        padding: const EdgeInsets.symmetric(
                          horizontal: 14,
                          vertical: 10,
                        ),
                        decoration: BoxDecoration(
                          color: AppTheme.surfaceVariant,
                          borderRadius: BorderRadius.circular(10),
                          border:
                              Border.all(color: AppTheme.border, width: 1),
                        ),
                        child: Row(
                          children: [
                            const Icon(
                              Icons.work_outline,
                              size: 16,
                              color: AppTheme.textMuted,
                            ),
                            const SizedBox(width: 10),
                            Expanded(
                              child: Text(
                                woNumber,
                                style: const TextStyle(
                                  fontSize: 13,
                                  color: AppTheme.textPrimary,
                                ),
                              ),
                            ),
                            _woStatusChip(woStatus),
                          ],
                        ),
                      )
                          .animate()
                          .fadeIn(
                            duration: 280.ms,
                            delay: (i * 40 + 160).ms,
                          )
                          .slideX(begin: 0.04);
                    },
                    childCount: detail.workOrders.length,
                  ),
                ),

              const SliverToBoxAdapter(child: SizedBox(height: 24)),
            ],
          );
        },
      ),
    );
  }
}

// ── FINANCE STAT WIDGET ───────────────────────────────────────────────────────

class _FinanceStat extends StatelessWidget {
  const _FinanceStat({
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
        padding: const EdgeInsets.all(12),
        decoration: BoxDecoration(
          color: color.withValues(alpha: 0.08),
          borderRadius: BorderRadius.circular(10),
          border: Border.all(
            color: color.withValues(alpha: 0.2),
            width: 1,
          ),
        ),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Text(
              label,
              style: const TextStyle(
                fontSize: 10,
                color: AppTheme.textMuted,
              ),
            ),
            const SizedBox(height: 4),
            Text(
              value,
              style: TextStyle(
                fontSize: 16,
                fontWeight: FontWeight.w700,
                color: color,
              ),
            ),
          ],
        ),
      ),
    );
  }
}

// ── ERROR BODY ────────────────────────────────────────────────────────────────

class _ErrorBody extends StatelessWidget {
  const _ErrorBody({
    required this.message,
    required this.onBack,
    required this.onRetry,
  });

  final String message;
  final VoidCallback onBack;
  final VoidCallback onRetry;

  @override
  Widget build(BuildContext context) {
    return CustomScrollView(
      slivers: [
        SliverAppBar(
          backgroundColor: AppTheme.surface,
          pinned: true,
          leading: IconButton(
            icon: const Icon(Icons.arrow_back, color: AppTheme.textSecondary),
            onPressed: onBack,
          ),
          title: const Text('Tender Detail'),
        ),
        SliverFillRemaining(
          child: Center(
            child: Padding(
              padding: const EdgeInsets.all(24),
              child: Column(
                mainAxisSize: MainAxisSize.min,
                children: [
                  const Icon(
                    Icons.error_outline,
                    color: AppTheme.danger,
                    size: 44,
                  ),
                  const SizedBox(height: 12),
                  Text(
                    message,
                    textAlign: TextAlign.center,
                    style: const TextStyle(
                      color: AppTheme.textMuted,
                      fontSize: 13,
                    ),
                  ),
                  const SizedBox(height: 16),
                  ElevatedButton.icon(
                    onPressed: onRetry,
                    icon: const Icon(Icons.refresh, size: 16),
                    label: const Text('Retry'),
                  ),
                ],
              ),
            ),
          ),
        ),
      ],
    );
  }
}

// ignore_for_file: unused_import
// SaInfoRow imported for shared widget availability
