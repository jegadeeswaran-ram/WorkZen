import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:intl/intl.dart';
import '../../../core/theme/app_theme.dart';
import '../providers/hr_provider.dart';

// ── Type label map ────────────────────────────────────────────────────────────

const _typeLabels = {
  'PF': 'Provident Fund (PF)',
  'ESI': 'Employee State Insurance (ESI)',
  'TDS': 'Tax Deducted at Source (TDS)',
  'PT': 'Professional Tax (PT)',
  'LWF': 'Labour Welfare Fund (LWF)',
};

// ── Helpers ───────────────────────────────────────────────────────────────────

IconData _iconForType(String type) {
  switch (type) {
    case 'PF':
      return Icons.account_balance;
    case 'ESI':
      return Icons.local_hospital;
    case 'TDS':
      return Icons.account_balance_wallet;
    case 'PT':
      return Icons.business_center;
    case 'LWF':
      return Icons.volunteer_activism;
    default:
      return Icons.description;
  }
}

Color _colorForStatus(String status) {
  switch (status) {
    case 'FILED':
      return AppTheme.success;
    case 'OVERDUE':
      return AppTheme.danger;
    default:
      return AppTheme.warning;
  }
}

Color _scoreColor(double score) {
  if (score >= 80) return AppTheme.success;
  if (score >= 60) return AppTheme.warning;
  return AppTheme.danger;
}

String _formatAmount(double amount) {
  final formatter = NumberFormat('#,##,##0', 'en_IN');
  return '₹${formatter.format(amount.toInt())}';
}

// ── Main screen ───────────────────────────────────────────────────────────────

class HrComplianceScreen extends ConsumerWidget {
  const HrComplianceScreen({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final summaryAsync = ref.watch(hrSummaryProvider);
    final complianceAsync = ref.watch(hrComplianceProvider);

    return Scaffold(
      backgroundColor: AppTheme.background,
      appBar: AppBar(
        title: const Text('Compliance'),
      ),
      body: CustomScrollView(
        slivers: [
          // ── Score Card ──────────────────────────────────────────────────────
          SliverToBoxAdapter(
            child: Padding(
              padding: const EdgeInsets.fromLTRB(16, 16, 16, 0),
              child: summaryAsync.when(
                loading: () => Container(
                  height: 130,
                  decoration: BoxDecoration(
                    color: AppTheme.surfaceVariant,
                    borderRadius: BorderRadius.circular(16),
                  ),
                ),
                error: (_, __) => const SizedBox.shrink(),
                data: (summary) => _ScoreCard(
                  score: summary.complianceScore,
                  overdueCount: summary.overdueCompliance,
                  complianceAsync: complianceAsync,
                ),
              ),
            ),
          ),

          // ── Compliance Checklist ────────────────────────────────────────────
          SliverToBoxAdapter(
            child: Padding(
              padding: const EdgeInsets.fromLTRB(16, 24, 16, 0),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  const Text(
                    'Monthly Returns',
                    style: TextStyle(
                      color: AppTheme.textPrimary,
                      fontSize: 16,
                      fontWeight: FontWeight.w600,
                    ),
                  ),
                  const SizedBox(height: 12),
                  complianceAsync.when(
                    loading: () => const Center(
                      child: Padding(
                        padding: EdgeInsets.symmetric(vertical: 32),
                        child: CircularProgressIndicator(
                          color: AppTheme.primary,
                        ),
                      ),
                    ),
                    error: (_, __) => Container(
                      padding: const EdgeInsets.all(20),
                      decoration: BoxDecoration(
                        color: AppTheme.surface,
                        borderRadius: BorderRadius.circular(12),
                        border: Border.all(color: AppTheme.border),
                      ),
                      child: const Center(
                        child: Text(
                          'Unable to load compliance data',
                          style: TextStyle(color: AppTheme.textMuted),
                        ),
                      ),
                    ),
                    data: (items) => Column(
                      children: items
                          .map((item) => _ComplianceItem(item: item))
                          .toList(),
                    ),
                  ),
                ],
              ),
            ),
          ),

          // ── Reminders section ───────────────────────────────────────────────
          const SliverToBoxAdapter(
            child: Padding(
              padding: EdgeInsets.fromLTRB(16, 24, 16, 32),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(
                    'Upcoming Deadlines',
                    style: TextStyle(
                      color: AppTheme.textPrimary,
                      fontSize: 16,
                      fontWeight: FontWeight.w600,
                    ),
                  ),
                  SizedBox(height: 12),
                  _ReminderItem(
                    label: 'TDS Q1 Return',
                    date: '15 Jul 2026',
                  ),
                  _ReminderItem(
                    label: 'PF Monthly',
                    date: '15 Jul 2026',
                  ),
                  _ReminderItem(
                    label: 'ESI Monthly',
                    date: '21 Jul 2026',
                  ),
                ],
              ),
            ),
          ),
        ],
      ),
    );
  }
}

// ── Score Card ────────────────────────────────────────────────────────────────

class _ScoreCard extends StatelessWidget {
  final double score;
  final int overdueCount;
  final AsyncValue<List<HrCompliance>> complianceAsync;

  const _ScoreCard({
    required this.score,
    required this.overdueCount,
    required this.complianceAsync,
  });

  @override
  Widget build(BuildContext context) {
    final color = _scoreColor(score);
    final filedCount = complianceAsync.whenOrNull(
          data: (items) =>
              items.where((i) => i.status == 'FILED').length,
        ) ??
        0;

    return Container(
      padding: const EdgeInsets.all(20),
      decoration: BoxDecoration(
        color: AppTheme.surface,
        borderRadius: BorderRadius.circular(16),
        border: Border.all(color: AppTheme.border),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.center,
        children: [
          // Label
          const Text(
            'Compliance Score',
            style: TextStyle(
              color: AppTheme.textMuted,
              fontSize: 13,
            ),
          ),
          const SizedBox(height: 8),

          // Score number
          Text(
            '${score.toStringAsFixed(0)}%',
            style: TextStyle(
              color: color,
              fontSize: 32,
              fontWeight: FontWeight.bold,
            ),
          ),
          const SizedBox(height: 12),

          // Gauge bar
          ClipRRect(
            borderRadius: BorderRadius.circular(6),
            child: LinearProgressIndicator(
              value: score / 100,
              minHeight: 12,
              backgroundColor: AppTheme.surfaceVariant,
              valueColor: AlwaysStoppedAnimation<Color>(color),
            ),
          ),
          const SizedBox(height: 16),

          // Mini stats row
          Row(
            mainAxisAlignment: MainAxisAlignment.spaceEvenly,
            children: [
              const _MiniStat(label: 'Total', value: '5'),
              _MiniStatDivider(),
              _MiniStat(label: 'Filed', value: '$filedCount'),
              _MiniStatDivider(),
              _MiniStat(label: 'Overdue', value: '$overdueCount'),
            ],
          ),
        ],
      ),
    );
  }
}

class _MiniStat extends StatelessWidget {
  final String label;
  final String value;

  const _MiniStat({required this.label, required this.value});

  @override
  Widget build(BuildContext context) {
    return Column(
      children: [
        Text(
          value,
          style: const TextStyle(
            color: AppTheme.textPrimary,
            fontSize: 18,
            fontWeight: FontWeight.w700,
          ),
        ),
        const SizedBox(height: 2),
        Text(
          label,
          style: const TextStyle(
            color: AppTheme.textMuted,
            fontSize: 12,
          ),
        ),
      ],
    );
  }
}

class _MiniStatDivider extends StatelessWidget {
  @override
  Widget build(BuildContext context) {
    return Container(
      width: 1,
      height: 32,
      color: AppTheme.border,
    );
  }
}

// ── Compliance Item ───────────────────────────────────────────────────────────

class _ComplianceItem extends StatelessWidget {
  final HrCompliance item;

  const _ComplianceItem({required this.item});

  @override
  Widget build(BuildContext context) {
    final statusColor = _colorForStatus(item.status);
    final icon = _iconForType(item.type);
    final label = _typeLabels[item.type] ?? item.type;

    return Container(
      margin: const EdgeInsets.only(bottom: 8),
      padding: const EdgeInsets.all(16),
      decoration: BoxDecoration(
        color: AppTheme.surface,
        borderRadius: BorderRadius.circular(12),
        border: Border.all(color: AppTheme.border),
      ),
      child: Row(
        children: [
          // Left icon circle
          Container(
            width: 40,
            height: 40,
            decoration: BoxDecoration(
              color: statusColor.withValues(alpha: 0.15),
              shape: BoxShape.circle,
            ),
            child: Icon(icon, color: statusColor, size: 20),
          ),
          const SizedBox(width: 12),

          // Middle: type name + dates
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(
                  label,
                  style: const TextStyle(
                    color: AppTheme.textPrimary,
                    fontSize: 14,
                    fontWeight: FontWeight.w600,
                  ),
                ),
                if (item.filedDate != null) ...[
                  const SizedBox(height: 2),
                  Text(
                    'Filed: ${item.filedDate}',
                    style: const TextStyle(
                      color: AppTheme.textMuted,
                      fontSize: 12,
                    ),
                  ),
                ],
                if (item.dueDate != null) ...[
                  const SizedBox(height: 2),
                  Text(
                    'Due: ${item.dueDate}',
                    style: const TextStyle(
                      color: AppTheme.textMuted,
                      fontSize: 12,
                    ),
                  ),
                ],
              ],
            ),
          ),
          const SizedBox(width: 12),

          // Right: status chip + amount
          Column(
            crossAxisAlignment: CrossAxisAlignment.end,
            children: [
              Container(
                padding:
                    const EdgeInsets.symmetric(horizontal: 10, vertical: 4),
                decoration: BoxDecoration(
                  color: statusColor.withValues(alpha: 0.15),
                  borderRadius: BorderRadius.circular(20),
                ),
                child: Text(
                  item.status,
                  style: TextStyle(
                    color: statusColor,
                    fontSize: 11,
                    fontWeight: FontWeight.w600,
                  ),
                ),
              ),
              if (item.amount != null) ...[
                const SizedBox(height: 4),
                Text(
                  _formatAmount(item.amount!),
                  style: const TextStyle(
                    color: AppTheme.textSecondary,
                    fontSize: 12,
                  ),
                ),
              ],
            ],
          ),
        ],
      ),
    );
  }
}

// ── Reminder Item ─────────────────────────────────────────────────────────────

class _ReminderItem extends StatelessWidget {
  final String label;
  final String date;

  const _ReminderItem({required this.label, required this.date});

  @override
  Widget build(BuildContext context) {
    return Container(
      margin: const EdgeInsets.only(bottom: 8),
      padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 12),
      decoration: BoxDecoration(
        color: AppTheme.surface,
        borderRadius: BorderRadius.circular(12),
        border: Border.all(color: AppTheme.border),
      ),
      child: Row(
        children: [
          const Icon(Icons.event, color: AppTheme.primary, size: 20),
          const SizedBox(width: 12),
          Expanded(
            child: Text(
              label,
              style: const TextStyle(
                color: AppTheme.textPrimary,
                fontSize: 14,
              ),
            ),
          ),
          Container(
            padding:
                const EdgeInsets.symmetric(horizontal: 10, vertical: 4),
            decoration: BoxDecoration(
              color: AppTheme.primary.withValues(alpha: 0.15),
              borderRadius: BorderRadius.circular(20),
            ),
            child: Text(
              date,
              style: const TextStyle(
                color: AppTheme.primary,
                fontSize: 12,
                fontWeight: FontWeight.w600,
              ),
            ),
          ),
        ],
      ),
    );
  }
}
