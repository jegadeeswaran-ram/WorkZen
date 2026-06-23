import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:intl/intl.dart';
import '../../../core/theme/app_theme.dart';
import '../providers/hr_provider.dart';

// ── Helpers ──────────────────────────────────────────────────────────────────

Color _statusColor(String status) {
  switch (status.toUpperCase()) {
    case 'COMPLETED':
      return AppTheme.success;
    case 'PROCESSING':
      return AppTheme.warning;
    default:
      return AppTheme.primary;
  }
}

String _statusLabel(String status) {
  switch (status.toUpperCase()) {
    case 'COMPLETED':
      return 'Completed';
    case 'PROCESSING':
      return 'Processing';
    default:
      return 'Pending';
  }
}

String _formatCurrency(double amount) =>
    NumberFormat.currency(symbol: '₹', decimalDigits: 0).format(amount);

String _formatProcessedAt(String? raw) {
  if (raw == null || raw.isEmpty) return '';
  try {
    final dt = DateTime.parse(raw);
    return DateFormat('dd MMM yyyy').format(dt);
  } catch (_) {
    return raw;
  }
}

// ── Screen ───────────────────────────────────────────────────────────────────

class HrPayrollScreen extends ConsumerWidget {
  const HrPayrollScreen({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final runsAsync = ref.watch(hrPayrollRunsProvider);

    return Scaffold(
      backgroundColor: AppTheme.background,
      appBar: AppBar(
        title: const Text('Payroll'),
      ),
      body: runsAsync.when(
        loading: () => const Center(
          child: CircularProgressIndicator(color: AppTheme.primary),
        ),
        error: (_, __) => const Center(
          child: Text(
            'Unable to load payroll data',
            style: TextStyle(color: AppTheme.textMuted),
          ),
        ),
        data: (runs) {
          if (runs.isEmpty) {
            return const Center(
              child: Text(
                'No payroll runs found',
                style: TextStyle(color: AppTheme.textMuted),
              ),
            );
          }
          return CustomScrollView(
            slivers: [
              // ── Current Run card ───────────────────────────────────────
              SliverToBoxAdapter(
                child: Padding(
                  padding: const EdgeInsets.fromLTRB(16, 16, 16, 8),
                  child: _CurrentRunCard(run: runs.first),
                ),
              ),

              // ── Summary stats row ──────────────────────────────────────
              SliverToBoxAdapter(
                child: Padding(
                  padding: const EdgeInsets.fromLTRB(16, 8, 16, 8),
                  child: _SummaryStatsRow(runs: runs),
                ),
              ),

              // ── Payroll History header ─────────────────────────────────
              if (runs.length > 1)
                const SliverToBoxAdapter(
                  child: Padding(
                    padding: EdgeInsets.fromLTRB(16, 16, 16, 8),
                    child: Text(
                      'Payroll History',
                      style: TextStyle(
                        color: AppTheme.textMuted,
                        fontSize: 12,
                        fontWeight: FontWeight.w600,
                        letterSpacing: 0.8,
                      ),
                    ),
                  ),
                ),

              // ── Previous run cards ─────────────────────────────────────
              if (runs.length > 1)
                SliverPadding(
                  padding: const EdgeInsets.fromLTRB(16, 0, 16, 24),
                  sliver: SliverList(
                    delegate: SliverChildBuilderDelegate(
                      (context, index) {
                        final run = runs[index + 1];
                        return _PayrollRunCard(run: run);
                      },
                      childCount: runs.length - 1,
                    ),
                  ),
                ),
            ],
          );
        },
      ),
    );
  }
}

// ── Current Run Card ─────────────────────────────────────────────────────────

class _CurrentRunCard extends StatelessWidget {
  const _CurrentRunCard({required this.run});
  final HrPayrollRun run;

  @override
  Widget build(BuildContext context) {
    final color = _statusColor(run.status);
    final isPending = run.status.toUpperCase() == 'PENDING';

    return Container(
      decoration: BoxDecoration(
        color: AppTheme.surface,
        borderRadius: BorderRadius.circular(16),
        border: Border.all(color: AppTheme.border),
      ),
      padding: const EdgeInsets.all(20),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          // Header row: label + status chip
          Row(
            mainAxisAlignment: MainAxisAlignment.spaceBetween,
            children: [
              const Text(
                'Current Run',
                style: TextStyle(
                  color: AppTheme.textMuted,
                  fontSize: 13,
                  fontWeight: FontWeight.w500,
                ),
              ),
              _StatusChip(status: run.status, color: color),
            ],
          ),
          const SizedBox(height: 10),

          // Month
          Text(
            run.month,
            style: const TextStyle(
              color: AppTheme.textPrimary,
              fontSize: 20,
              fontWeight: FontWeight.bold,
            ),
          ),
          const SizedBox(height: 6),

          // Employee count + total net
          Text(
            '${run.employeeCount} employees • ${_formatCurrency(run.totalNet)}',
            style: const TextStyle(
              color: AppTheme.textSecondary,
              fontSize: 14,
            ),
          ),
          const SizedBox(height: 20),

          // Run Payroll button
          SizedBox(
            width: double.infinity,
            child: ElevatedButton(
              onPressed: isPending
                  ? () {
                      ScaffoldMessenger.of(context).showSnackBar(
                        const SnackBar(
                          content: Text('Payroll processing started...'),
                          behavior: SnackBarBehavior.floating,
                        ),
                      );
                    }
                  : null,
              style: ElevatedButton.styleFrom(
                backgroundColor: AppTheme.primary,
                disabledBackgroundColor:
                    AppTheme.primary.withValues(alpha: 0.3),
                disabledForegroundColor:
                    Colors.white.withValues(alpha: 0.4),
                padding: const EdgeInsets.symmetric(vertical: 14),
                shape: RoundedRectangleBorder(
                  borderRadius: BorderRadius.circular(12),
                ),
              ),
              child: const Text(
                'Run Payroll',
                style: TextStyle(
                  fontWeight: FontWeight.w600,
                  fontSize: 15,
                ),
              ),
            ),
          ),
        ],
      ),
    );
  }
}

// ── Summary Stats Row ─────────────────────────────────────────────────────────

class _SummaryStatsRow extends StatelessWidget {
  const _SummaryStatsRow({required this.runs});
  final List<HrPayrollRun> runs;

  @override
  Widget build(BuildContext context) {
    final totalPayroll =
        runs.fold<double>(0, (sum, r) => sum + r.totalNet);
    final first = runs.first;
    final avgPerEmployee = first.employeeCount > 0
        ? first.totalNet / first.employeeCount
        : 0.0;
    final processedCount =
        runs.where((r) => r.status.toUpperCase() == 'COMPLETED').length;

    return Row(
      children: [
        Expanded(
          child: _StatBox(
            label: 'Total Payroll',
            value: _formatCurrency(totalPayroll),
          ),
        ),
        const SizedBox(width: 8),
        Expanded(
          child: _StatBox(
            label: 'Avg Per Employee',
            value: _formatCurrency(avgPerEmployee),
          ),
        ),
        const SizedBox(width: 8),
        Expanded(
          child: _StatBox(
            label: 'Processed Runs',
            value: processedCount.toString(),
          ),
        ),
      ],
    );
  }
}

class _StatBox extends StatelessWidget {
  const _StatBox({required this.label, required this.value});
  final String label;
  final String value;

  @override
  Widget build(BuildContext context) {
    return Container(
      decoration: BoxDecoration(
        color: AppTheme.surfaceVariant,
        borderRadius: BorderRadius.circular(12),
        border: Border.all(color: AppTheme.border),
      ),
      padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 14),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Text(
            label,
            style: const TextStyle(
              color: AppTheme.textMuted,
              fontSize: 11,
              fontWeight: FontWeight.w500,
            ),
            maxLines: 1,
            overflow: TextOverflow.ellipsis,
          ),
          const SizedBox(height: 4),
          Text(
            value,
            style: const TextStyle(
              color: AppTheme.textPrimary,
              fontSize: 14,
              fontWeight: FontWeight.bold,
            ),
            maxLines: 1,
            overflow: TextOverflow.ellipsis,
          ),
        ],
      ),
    );
  }
}

// ── Payroll Run Card ──────────────────────────────────────────────────────────

class _PayrollRunCard extends StatelessWidget {
  const _PayrollRunCard({required this.run});
  final HrPayrollRun run;

  @override
  Widget build(BuildContext context) {
    final color = _statusColor(run.status);
    final processedDate = _formatProcessedAt(run.processedAt);

    return Container(
      margin: const EdgeInsets.only(bottom: 8),
      decoration: BoxDecoration(
        color: AppTheme.surface,
        borderRadius: BorderRadius.circular(12),
        border: Border.all(color: AppTheme.border),
      ),
      child: ListTile(
        contentPadding:
            const EdgeInsets.symmetric(horizontal: 16, vertical: 8),
        leading: Container(
          width: 40,
          height: 40,
          decoration: BoxDecoration(
            color: color.withValues(alpha: 0.12),
            borderRadius: BorderRadius.circular(10),
          ),
          child: Icon(
            Icons.calendar_month_rounded,
            color: color,
            size: 20,
          ),
        ),
        title: Text(
          run.month,
          style: const TextStyle(
            color: AppTheme.textPrimary,
            fontWeight: FontWeight.bold,
            fontSize: 14,
          ),
        ),
        subtitle: Padding(
          padding: const EdgeInsets.only(top: 4),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Text(
                '${run.employeeCount} employees',
                style: const TextStyle(
                  color: AppTheme.textSecondary,
                  fontSize: 12,
                ),
              ),
              if (processedDate.isNotEmpty)
                Text(
                  processedDate,
                  style: const TextStyle(
                    color: AppTheme.textMuted,
                    fontSize: 11,
                  ),
                ),
            ],
          ),
        ),
        trailing: Row(
          mainAxisSize: MainAxisSize.min,
          children: [
            Column(
              mainAxisAlignment: MainAxisAlignment.center,
              crossAxisAlignment: CrossAxisAlignment.end,
              children: [
                Text(
                  _formatCurrency(run.totalNet),
                  style: const TextStyle(
                    color: AppTheme.textPrimary,
                    fontWeight: FontWeight.bold,
                    fontSize: 13,
                  ),
                ),
                const SizedBox(height: 4),
                _StatusChip(status: run.status, color: color, small: true),
              ],
            ),
            const SizedBox(width: 8),
            const Icon(
              Icons.chevron_right_rounded,
              color: AppTheme.textMuted,
              size: 20,
            ),
          ],
        ),
        onTap: () {
          ScaffoldMessenger.of(context).showSnackBar(
            const SnackBar(
              content:
                  Text('View detailed breakdown in web portal'),
              behavior: SnackBarBehavior.floating,
            ),
          );
        },
      ),
    );
  }
}

// ── Status Chip ───────────────────────────────────────────────────────────────

class _StatusChip extends StatelessWidget {
  const _StatusChip({
    required this.status,
    required this.color,
    this.small = false,
  });
  final String status;
  final Color color;
  final bool small;

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: EdgeInsets.symmetric(
        horizontal: small ? 8 : 10,
        vertical: small ? 3 : 5,
      ),
      decoration: BoxDecoration(
        color: color.withValues(alpha: 0.15),
        borderRadius: BorderRadius.circular(20),
        border: Border.all(color: color.withValues(alpha: 0.35)),
      ),
      child: Text(
        _statusLabel(status),
        style: TextStyle(
          color: color,
          fontSize: small ? 10 : 11,
          fontWeight: FontWeight.w600,
          letterSpacing: 0.3,
        ),
      ),
    );
  }
}
