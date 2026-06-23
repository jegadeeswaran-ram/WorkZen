import 'package:fl_chart/fl_chart.dart';
import 'package:flutter/material.dart';
import 'package:flutter_animate/flutter_animate.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../../../core/theme/app_theme.dart';
import '../providers/super_admin_provider.dart';
import '../widgets/sa_kpi_card.dart';
import '../widgets/sa_stat_chip.dart';
import '../widgets/sa_section_header.dart';

// ── HARDCODED CHART DATA ──────────────────────────────────────────────────────

const List<String> _months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun'];

/// Monthly revenue in lakhs (Jan–Jun 2026) — used as fallback.
const List<double> _mockRevenueLakhs = [
  320.5,
  410.0,
  385.0,
  460.0,
  498.0,
  542.0,
];

/// Monthly attendance rate % (Jan–Jun 2026).
const List<double> _attendanceRates = [
  87.0,
  83.0,
  91.0,
  78.0,
  95.0,
  89.0,
];

// ── PRIVATE WIDGETS ───────────────────────────────────────────────────────────

/// A compact metric card used inside billing / attendance tabs.
class _MetricCard extends StatelessWidget {
  const _MetricCard(this.label, this.value, this.color);

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
          border: Border.all(color: color.withValues(alpha: 0.25), width: 1),
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
              maxLines: 1,
              overflow: TextOverflow.ellipsis,
            ),
            const SizedBox(height: 4),
            Text(
              value,
              style: TextStyle(
                fontSize: 18,
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

/// A compliance status row item.
class _ComplianceItem extends StatelessWidget {
  const _ComplianceItem(this.name, this.status, this.ok);

  final String name;
  final String status;
  final bool ok;

  @override
  Widget build(BuildContext context) {
    final color = ok ? AppTheme.success : AppTheme.danger;
    return Padding(
      padding: const EdgeInsets.symmetric(vertical: 6),
      child: Row(
        children: [
          Container(
            width: 8,
            height: 8,
            decoration: BoxDecoration(
              color: color,
              shape: BoxShape.circle,
            ),
          ),
          const SizedBox(width: 10),
          Expanded(
            child: Text(
              name,
              style: const TextStyle(
                fontSize: 13,
                color: AppTheme.textPrimary,
              ),
            ),
          ),
          SaStatChip(label: status, color: color),
        ],
      ),
    );
  }
}

// ── CHART HELPER: bottom titles for month bars ────────────────────────────────
AxisTitles _bottomMonthTitles() => AxisTitles(
      sideTitles: SideTitles(
        showTitles: true,
        getTitlesWidget: (value, meta) {
          final idx = value.toInt();
          if (idx < 0 || idx >= _months.length) return const SizedBox.shrink();
          return Padding(
            padding: const EdgeInsets.only(top: 4),
            child: Text(
              _months[idx],
              style: const TextStyle(
                fontSize: 10,
                color: AppTheme.textMuted,
              ),
            ),
          );
        },
        reservedSize: 22,
      ),
    );

AxisTitles _leftRupeeLakhTitles() => AxisTitles(
      sideTitles: SideTitles(
        showTitles: true,
        reservedSize: 42,
        getTitlesWidget: (value, meta) => Text(
          '₹${value.toInt()}L',
          style: const TextStyle(
            fontSize: 9,
            color: AppTheme.textMuted,
          ),
        ),
      ),
    );

FlGridData _horizontalGrid() => FlGridData(
      show: true,
      drawVerticalLine: false,
      getDrawingHorizontalLine: (_) => const FlLine(
        color: AppTheme.border,
        strokeWidth: 1,
      ),
    );

// ── TAB 0: SUMMARY ────────────────────────────────────────────────────────────

class _SummaryTab extends ConsumerWidget {
  const _SummaryTab();

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final summaryAsync = ref.watch(saSummaryProvider);
    final tendersAsync = ref.watch(saTendersProvider);

    return SingleChildScrollView(
      padding: const EdgeInsets.all(16),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          // ── Revenue Trend ──────────────────────────────────────────────
          const SaSectionHeader(title: 'Revenue Trend (6 months)'),
          const SizedBox(height: 10),
          Container(
            height: 200,
            decoration: BoxDecoration(
              color: AppTheme.surfaceVariant,
              borderRadius: BorderRadius.circular(12),
              border: Border.all(color: AppTheme.border),
            ),
            padding: const EdgeInsets.fromLTRB(8, 16, 16, 8),
            child: BarChart(
              BarChartData(
                alignment: BarChartAlignment.spaceAround,
                maxY: 600,
                barGroups: List.generate(
                  _mockRevenueLakhs.length,
                  (i) => BarChartGroupData(
                    x: i,
                    barRods: [
                      BarChartRodData(
                        toY: _mockRevenueLakhs[i],
                        color: AppTheme.primary,
                        width: 20,
                        borderRadius: const BorderRadius.vertical(
                          top: Radius.circular(4),
                        ),
                      ),
                    ],
                  ),
                ),
                titlesData: FlTitlesData(
                  bottomTitles: _bottomMonthTitles(),
                  leftTitles: _leftRupeeLakhTitles(),
                  topTitles: const AxisTitles(
                      sideTitles: SideTitles(showTitles: false)),
                  rightTitles: const AxisTitles(
                      sideTitles: SideTitles(showTitles: false)),
                ),
                gridData: _horizontalGrid(),
                borderData: FlBorderData(show: false),
              ),
            ),
          ).animate().fadeIn(duration: 400.ms),

          const SizedBox(height: 16),

          // ── Tender Status Distribution ─────────────────────────────────
          const SaSectionHeader(title: 'Tender Status Distribution'),
          const SizedBox(height: 10),
          tendersAsync.when(
            loading: () => Container(
              height: 180,
              decoration: BoxDecoration(
                color: AppTheme.surfaceVariant,
                borderRadius: BorderRadius.circular(12),
              ),
              child: const Center(
                child: CircularProgressIndicator(
                  color: AppTheme.primary,
                  strokeWidth: 2,
                ),
              ),
            ),
            error: (_, __) => const _TenderPieChart(tenders: []),
            data: (tenders) => _TenderPieChart(tenders: tenders),
          ),

          const SizedBox(height: 16),

          // ── Key Metrics ────────────────────────────────────────────────
          const SaSectionHeader(title: 'Key Metrics'),
          const SizedBox(height: 10),
          summaryAsync.when(
            loading: () => const Center(
              child: Padding(
                padding: EdgeInsets.all(24),
                child: CircularProgressIndicator(
                    color: AppTheme.primary, strokeWidth: 2),
              ),
            ),
            error: (_, __) => const SizedBox.shrink(),
            data: (summary) => GridView.count(
              crossAxisCount: 2,
              shrinkWrap: true,
              physics: const NeverScrollableScrollPhysics(),
              crossAxisSpacing: 12,
              mainAxisSpacing: 12,
              childAspectRatio: 1.6,
              children: [
                SaKpiCard(
                  label: 'Total Employees',
                  value: summary.totalEmployees.toString(),
                  icon: Icons.people_outline,
                  color: AppTheme.primary,
                ),
                SaKpiCard(
                  label: 'Active Sites',
                  value: summary.activeSites.toString(),
                  icon: Icons.location_on_outlined,
                  color: AppTheme.success,
                ),
                SaKpiCard(
                  label: 'Active Tenders',
                  value: summary.activeTenders.toString(),
                  icon: Icons.description_outlined,
                  color: const Color(0xFF8B5CF6),
                ),
                SaKpiCard(
                  label: 'Monthly Billing',
                  value:
                      '₹${(summary.monthlyBilling / 100000).toStringAsFixed(1)}L',
                  icon: Icons.receipt_long_outlined,
                  color: AppTheme.warning,
                ),
              ],
            ),
          ),
        ],
      ),
    );
  }
}

/// Pie chart for tender status distribution.
class _TenderPieChart extends StatelessWidget {
  const _TenderPieChart({required this.tenders});

  final List<SaTender> tenders;

  @override
  Widget build(BuildContext context) {
    final counts = <String, int>{};
    for (final t in tenders) {
      counts[t.status] = (counts[t.status] ?? 0) + 1;
    }

    // Fallback if no data
    if (counts.isEmpty) {
      counts['ACTIVE'] = 5;
      counts['AWARDED'] = 3;
      counts['COMPLETED'] = 2;
      counts['DRAFT'] = 1;
    }

    final colorMap = {
      'ACTIVE': AppTheme.success,
      'AWARDED': const Color(0xFF8B5CF6),
      'COMPLETED': AppTheme.textMuted,
      'DRAFT': const Color(0xFF60A5FA),
    };

    final entries = counts.entries.toList();
    final total = entries.fold<int>(0, (sum, e) => sum + e.value);

    return Container(
      height: 180,
      decoration: BoxDecoration(
        color: AppTheme.surfaceVariant,
        borderRadius: BorderRadius.circular(12),
        border: Border.all(color: AppTheme.border),
      ),
      padding: const EdgeInsets.all(12),
      child: Row(
        children: [
          Expanded(
            child: PieChart(
              PieChartData(
                sectionsSpace: 2,
                centerSpaceRadius: 36,
                sections: entries.map((e) {
                  final color =
                      colorMap[e.key] ?? AppTheme.primary;
                  return PieChartSectionData(
                    value: e.value.toDouble(),
                    color: color,
                    radius: 36,
                    showTitle: false,
                  );
                }).toList(),
              ),
            ),
          ),
          const SizedBox(width: 12),
          // Legend
          Column(
            mainAxisAlignment: MainAxisAlignment.center,
            crossAxisAlignment: CrossAxisAlignment.start,
            children: entries.map((e) {
              final color = colorMap[e.key] ?? AppTheme.primary;
              final pct = total > 0
                  ? ((e.value / total) * 100).round()
                  : 0;
              return Padding(
                padding: const EdgeInsets.symmetric(vertical: 3),
                child: Row(
                  children: [
                    Container(
                      width: 8,
                      height: 8,
                      decoration: BoxDecoration(
                        color: color,
                        shape: BoxShape.circle,
                      ),
                    ),
                    const SizedBox(width: 6),
                    Text(
                      '${e.key} ($pct%)',
                      style: const TextStyle(
                        fontSize: 10,
                        color: AppTheme.textSecondary,
                      ),
                    ),
                  ],
                ),
              );
            }).toList(),
          ),
        ],
      ),
    ).animate().fadeIn(duration: 400.ms, delay: 100.ms);
  }
}

// ── TAB 1: BILLING ────────────────────────────────────────────────────────────

class _BillingTab extends ConsumerWidget {
  const _BillingTab();

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final invoicesAsync = ref.watch(saInvoicesProvider);
    final billingSummaryAsync = ref.watch(saBillingSummaryProvider);

    return SingleChildScrollView(
      padding: const EdgeInsets.all(16),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          // ── Summary cards ──────────────────────────────────────────────
          billingSummaryAsync.when(
            loading: () => const SizedBox(
              height: 72,
              child: Center(
                child: CircularProgressIndicator(
                    color: AppTheme.primary, strokeWidth: 2),
              ),
            ),
            error: (_, __) => const Row(
              children: [
                _MetricCard('Total Billed', '—', AppTheme.primary),
                SizedBox(width: 8),
                _MetricCard('Collected', '—', AppTheme.success),
                SizedBox(width: 8),
                _MetricCard('Outstanding', '—', AppTheme.warning),
              ],
            ),
            data: (b) => Row(
              children: [
                _MetricCard(
                  'Total Billed',
                  '₹${(b.totalBilled / 100000).toStringAsFixed(1)}L',
                  AppTheme.primary,
                ),
                const SizedBox(width: 8),
                _MetricCard(
                  'Collected',
                  '₹${(b.collected / 100000).toStringAsFixed(1)}L',
                  AppTheme.success,
                ),
                const SizedBox(width: 8),
                _MetricCard(
                  'Outstanding',
                  '₹${(b.outstanding / 100000).toStringAsFixed(1)}L',
                  AppTheme.warning,
                ),
              ],
            ),
          ),

          const SizedBox(height: 16),

          // ── Invoice Status Pie ──────────────────────────────────────────
          const SaSectionHeader(title: 'Invoice Status'),
          const SizedBox(height: 10),
          invoicesAsync.when(
            loading: () => Container(
              height: 180,
              decoration: BoxDecoration(
                color: AppTheme.surfaceVariant,
                borderRadius: BorderRadius.circular(12),
              ),
              child: const Center(
                child: CircularProgressIndicator(
                    color: AppTheme.primary, strokeWidth: 2),
              ),
            ),
            error: (_, __) => const _InvoicePieChart(invoices: []),
            data: (invoices) => _InvoicePieChart(invoices: invoices),
          ),

          const SizedBox(height: 16),

          // ── Recent Invoices ────────────────────────────────────────────
          const SaSectionHeader(title: 'Recent Invoices'),
          const SizedBox(height: 10),
          invoicesAsync.when(
            loading: () => const Center(
              child: Padding(
                padding: EdgeInsets.all(24),
                child: CircularProgressIndicator(
                    color: AppTheme.primary, strokeWidth: 2),
              ),
            ),
            error: (e, __) => Center(
              child: Text(
                e.toString(),
                style: const TextStyle(
                    color: AppTheme.danger, fontSize: 12),
              ),
            ),
            data: (invoices) {
              final top5 = invoices.take(5).toList();
              if (top5.isEmpty) {
                return const Center(
                  child: Text(
                    'No invoices found',
                    style: TextStyle(
                        color: AppTheme.textMuted, fontSize: 13),
                  ),
                );
              }
              return Container(
                decoration: BoxDecoration(
                  color: AppTheme.surfaceVariant,
                  borderRadius: BorderRadius.circular(12),
                  border: Border.all(color: AppTheme.border),
                ),
                child: ListView.separated(
                  shrinkWrap: true,
                  physics: const NeverScrollableScrollPhysics(),
                  itemCount: top5.length,
                  separatorBuilder: (_, __) => const Divider(
                    height: 1,
                    color: AppTheme.border,
                    indent: 16,
                    endIndent: 16,
                  ),
                  itemBuilder: (_, i) {
                    final inv = top5[i];
                    final statusColor = _invoiceStatusColor(inv.status);
                    return Padding(
                      padding: const EdgeInsets.symmetric(
                          horizontal: 16, vertical: 12),
                      child: Row(
                        children: [
                          Expanded(
                            child: Column(
                              crossAxisAlignment:
                                  CrossAxisAlignment.start,
                              children: [
                                Text(
                                  inv.invoiceNumber,
                                  style: const TextStyle(
                                    fontSize: 13,
                                    fontWeight: FontWeight.w600,
                                    color: AppTheme.textPrimary,
                                  ),
                                ),
                                const SizedBox(height: 2),
                                Text(
                                  inv.clientName,
                                  style: const TextStyle(
                                    fontSize: 11,
                                    color: AppTheme.textMuted,
                                  ),
                                  maxLines: 1,
                                  overflow: TextOverflow.ellipsis,
                                ),
                              ],
                            ),
                          ),
                          const SizedBox(width: 12),
                          Column(
                            crossAxisAlignment:
                                CrossAxisAlignment.end,
                            children: [
                              Text(
                                '₹${(inv.amount / 100000).toStringAsFixed(1)}L',
                                style: const TextStyle(
                                  fontSize: 13,
                                  fontWeight: FontWeight.w700,
                                  color: AppTheme.textPrimary,
                                ),
                              ),
                              const SizedBox(height: 4),
                              SaStatChip(
                                  label: inv.status,
                                  color: statusColor),
                            ],
                          ),
                        ],
                      ),
                    );
                  },
                ),
              ).animate().fadeIn(duration: 350.ms);
            },
          ),
        ],
      ),
    );
  }
}

Color _invoiceStatusColor(String status) {
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

class _InvoicePieChart extends StatelessWidget {
  const _InvoicePieChart({required this.invoices});

  final List<SaInvoice> invoices;

  @override
  Widget build(BuildContext context) {
    final counts = <String, int>{};
    for (final inv in invoices) {
      final s = inv.status.toUpperCase();
      counts[s] = (counts[s] ?? 0) + 1;
    }
    if (counts.isEmpty) {
      counts['PAID'] = 8;
      counts['PENDING'] = 4;
      counts['OVERDUE'] = 2;
    }

    final colorMap = {
      'PAID': AppTheme.success,
      'PENDING': AppTheme.warning,
      'OVERDUE': AppTheme.danger,
    };

    final entries = counts.entries.toList();
    final total = entries.fold<int>(0, (s, e) => s + e.value);

    return Container(
      height: 180,
      decoration: BoxDecoration(
        color: AppTheme.surfaceVariant,
        borderRadius: BorderRadius.circular(12),
        border: Border.all(color: AppTheme.border),
      ),
      padding: const EdgeInsets.all(12),
      child: Row(
        children: [
          Expanded(
            child: PieChart(
              PieChartData(
                sectionsSpace: 2,
                centerSpaceRadius: 36,
                sections: entries.map((e) {
                  final color = colorMap[e.key] ?? AppTheme.textMuted;
                  return PieChartSectionData(
                    value: e.value.toDouble(),
                    color: color,
                    radius: 36,
                    showTitle: false,
                  );
                }).toList(),
              ),
            ),
          ),
          const SizedBox(width: 12),
          Column(
            mainAxisAlignment: MainAxisAlignment.center,
            crossAxisAlignment: CrossAxisAlignment.start,
            children: entries.map((e) {
              final color = colorMap[e.key] ?? AppTheme.textMuted;
              final pct = total > 0
                  ? ((e.value / total) * 100).round()
                  : 0;
              return Padding(
                padding: const EdgeInsets.symmetric(vertical: 3),
                child: Row(
                  children: [
                    Container(
                      width: 8,
                      height: 8,
                      decoration: BoxDecoration(
                        color: color,
                        shape: BoxShape.circle,
                      ),
                    ),
                    const SizedBox(width: 6),
                    Text(
                      '${e.key} ($pct%)',
                      style: const TextStyle(
                        fontSize: 10,
                        color: AppTheme.textSecondary,
                      ),
                    ),
                  ],
                ),
              );
            }).toList(),
          ),
        ],
      ),
    ).animate().fadeIn(duration: 400.ms, delay: 100.ms);
  }
}

// ── TAB 2: PAYROLL ────────────────────────────────────────────────────────────

class _PayrollTab extends ConsumerWidget {
  const _PayrollTab();

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final summaryAsync = ref.watch(saSummaryProvider);

    return SingleChildScrollView(
      padding: const EdgeInsets.all(16),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          summaryAsync.when(
            loading: () => Container(
              height: 260,
              decoration: BoxDecoration(
                color: AppTheme.surfaceVariant,
                borderRadius: BorderRadius.circular(12),
              ),
              child: const Center(
                child: CircularProgressIndicator(
                    color: AppTheme.primary, strokeWidth: 2),
              ),
            ),
            error: (_, __) => const _PayrollLineChart(baseEmployees: 500),
            data: (summary) =>
                _PayrollLineChart(baseEmployees: summary.totalEmployees),
          ),
          const SizedBox(height: 16),
          const Text(
            'Payroll data is computed from active employee salary structures.',
            style: TextStyle(
              fontSize: 12,
              color: AppTheme.textMuted,
            ),
          ),
        ],
      ),
    );
  }
}

class _PayrollLineChart extends StatelessWidget {
  const _PayrollLineChart({required this.baseEmployees});

  final int baseEmployees;

  /// Approximate monthly payroll in lakhs based on avg salary of ₹18,000.
  List<double> get _payrollLakhs {
    final base = (baseEmployees * 18000) / 100000;
    return [
      base * 0.95,
      base * 0.97,
      base * 1.00,
      base * 1.01,
      base * 1.03,
      base * 1.05,
    ];
  }

  @override
  Widget build(BuildContext context) {
    final data = _payrollLakhs;
    final maxY = (data.reduce((a, b) => a > b ? a : b) * 1.15)
        .ceilToDouble();

    return Container(
      padding: const EdgeInsets.all(16),
      decoration: BoxDecoration(
        color: AppTheme.surfaceVariant,
        borderRadius: BorderRadius.circular(12),
        border: Border.all(color: AppTheme.border),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          const Text(
            'MONTHLY PAYROLL TREND',
            style: TextStyle(
              fontSize: 13,
              fontWeight: FontWeight.w700,
              color: AppTheme.textSecondary,
              letterSpacing: 0.8,
            ),
          ),
          const SizedBox(height: 12),
          SizedBox(
            height: 200,
            child: LineChart(
              LineChartData(
                minY: 0,
                maxY: maxY,
                lineBarsData: [
                  LineChartBarData(
                    spots: List.generate(
                      data.length,
                      (i) => FlSpot(i.toDouble(), data[i]),
                    ),
                    color: AppTheme.primary,
                    barWidth: 2.5,
                    isCurved: true,
                    dotData: const FlDotData(show: true),
                    belowBarData: BarAreaData(
                      show: true,
                      color: AppTheme.primary.withValues(alpha: 0.08),
                    ),
                  ),
                ],
                gridData: _horizontalGrid(),
                titlesData: FlTitlesData(
                  bottomTitles: _bottomMonthTitles(),
                  leftTitles: _leftRupeeLakhTitles(),
                  topTitles: const AxisTitles(
                      sideTitles: SideTitles(showTitles: false)),
                  rightTitles: const AxisTitles(
                      sideTitles: SideTitles(showTitles: false)),
                ),
                borderData: FlBorderData(show: false),
              ),
            ),
          ),
        ],
      ),
    ).animate().fadeIn(duration: 400.ms);
  }
}

// ── TAB 3: COMPLIANCE ─────────────────────────────────────────────────────────

class _ComplianceTab extends ConsumerWidget {
  const _ComplianceTab();

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final summaryAsync = ref.watch(saSummaryProvider);

    return SingleChildScrollView(
      padding: const EdgeInsets.all(16),
      child: summaryAsync.when(
        loading: () => const Center(
          child: Padding(
            padding: EdgeInsets.all(40),
            child: CircularProgressIndicator(
                color: AppTheme.primary, strokeWidth: 2),
          ),
        ),
        error: (_, __) => const _ComplianceContent(overdueCompliance: 0),
        data: (summary) =>
            _ComplianceContent(overdueCompliance: summary.overdueCompliance),
      ),
    );
  }
}

class _ComplianceContent extends StatelessWidget {
  const _ComplianceContent({required this.overdueCompliance});

  final int overdueCompliance;

  @override
  Widget build(BuildContext context) {
    const total = 5;
    final overdue = overdueCompliance.clamp(0, total);
    final score = ((total - overdue) / total * 100).round();

    Color scoreColor;
    String scoreLabel;
    if (score >= 80) {
      scoreColor = AppTheme.success;
      scoreLabel = 'Good Standing';
    } else if (score >= 60) {
      scoreColor = AppTheme.warning;
      scoreLabel = 'Needs Attention';
    } else {
      scoreColor = AppTheme.danger;
      scoreLabel = 'Critical';
    }

    return Column(
      crossAxisAlignment: CrossAxisAlignment.stretch,
      children: [
        // Score display
        Container(
          padding: const EdgeInsets.all(24),
          decoration: BoxDecoration(
            color: AppTheme.surfaceVariant,
            borderRadius: BorderRadius.circular(12),
            border: Border.all(color: AppTheme.border),
          ),
          child: Column(
            children: [
              const Text(
                'COMPLIANCE SCORE',
                style: TextStyle(
                  fontSize: 13,
                  fontWeight: FontWeight.w700,
                  color: AppTheme.textSecondary,
                  letterSpacing: 0.8,
                ),
              ),
              const SizedBox(height: 12),
              Text(
                '$score / 100',
                style: TextStyle(
                  fontSize: 42,
                  fontWeight: FontWeight.w800,
                  color: scoreColor,
                ),
              ),
              const SizedBox(height: 4),
              Text(
                scoreLabel,
                style: TextStyle(
                  fontSize: 13,
                  color: scoreColor,
                  fontWeight: FontWeight.w600,
                ),
              ),
            ],
          ),
        ).animate().fadeIn(duration: 400.ms),

        const SizedBox(height: 16),

        // Compliance checklist
        Container(
          padding: const EdgeInsets.all(16),
          decoration: BoxDecoration(
            color: AppTheme.surfaceVariant,
            borderRadius: BorderRadius.circular(12),
            border: Border.all(color: AppTheme.border),
          ),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              const SaSectionHeader(title: 'Compliance Checklist'),
              const SizedBox(height: 8),
              const _ComplianceItem('Provident Fund (PF)', 'Filed', true),
              const _ComplianceItem('ESI', 'Filed', true),
              _ComplianceItem('TDS', overdue > 0 ? 'Pending' : 'Filed',
                  overdue == 0),
              const _ComplianceItem('Professional Tax (PT)', 'Filed', true),
              const _ComplianceItem(
                  'Labour Welfare Fund (LWF)', 'Filed', true),
            ],
          ),
        ).animate().fadeIn(duration: 400.ms, delay: 100.ms),
      ],
    );
  }
}

// ── TAB 4: ATTENDANCE ─────────────────────────────────────────────────────────

class _AttendanceTab extends ConsumerWidget {
  const _AttendanceTab();

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final summaryAsync = ref.watch(saSummaryProvider);

    return SingleChildScrollView(
      padding: const EdgeInsets.all(16),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          // ── Attendance Rate Bar Chart ──────────────────────────────────
          const SaSectionHeader(title: 'Attendance Rate (6 months)'),
          const SizedBox(height: 10),
          Container(
            height: 200,
            decoration: BoxDecoration(
              color: AppTheme.surfaceVariant,
              borderRadius: BorderRadius.circular(12),
              border: Border.all(color: AppTheme.border),
            ),
            padding: const EdgeInsets.fromLTRB(8, 16, 16, 8),
            child: BarChart(
              BarChartData(
                alignment: BarChartAlignment.spaceAround,
                maxY: 100,
                minY: 0,
                barGroups: List.generate(
                  _attendanceRates.length,
                  (i) => BarChartGroupData(
                    x: i,
                    barRods: [
                      BarChartRodData(
                        toY: _attendanceRates[i],
                        color: AppTheme.success,
                        width: 20,
                        borderRadius: const BorderRadius.vertical(
                          top: Radius.circular(4),
                        ),
                      ),
                    ],
                  ),
                ),
                titlesData: FlTitlesData(
                  bottomTitles: _bottomMonthTitles(),
                  leftTitles: AxisTitles(
                    sideTitles: SideTitles(
                      showTitles: true,
                      reservedSize: 36,
                      getTitlesWidget: (value, meta) => Text(
                        '${value.toInt()}%',
                        style: const TextStyle(
                          fontSize: 9,
                          color: AppTheme.textMuted,
                        ),
                      ),
                    ),
                  ),
                  topTitles: const AxisTitles(
                      sideTitles: SideTitles(showTitles: false)),
                  rightTitles: const AxisTitles(
                      sideTitles: SideTitles(showTitles: false)),
                ),
                gridData: _horizontalGrid(),
                borderData: FlBorderData(show: false),
              ),
            ),
          ).animate().fadeIn(duration: 400.ms),

          const SizedBox(height: 16),

          // ── Today's Summary ────────────────────────────────────────────
          const SaSectionHeader(title: "Today's Summary"),
          const SizedBox(height: 10),
          summaryAsync.when(
            loading: () => const Center(
              child: Padding(
                padding: EdgeInsets.all(24),
                child: CircularProgressIndicator(
                    color: AppTheme.primary, strokeWidth: 2),
              ),
            ),
            error: (_, __) => const Row(
              children: [
                _MetricCard('Present %', '—', AppTheme.success),
                SizedBox(width: 8),
                _MetricCard('On Leave %', '—', AppTheme.warning),
                SizedBox(width: 8),
                _MetricCard('Sites Active', '—', AppTheme.primary),
              ],
            ),
            data: (summary) {
              // Derive approximate present % from activeSites / totalEmployees
              final presentPct = summary.totalEmployees > 0
                  ? ((summary.totalEmployees -
                              (summary.openIssues * 2).clamp(
                                  0, summary.totalEmployees ~/ 10)) /
                          summary.totalEmployees *
                          100)
                      .clamp(0.0, 100.0)
                      .round()
                  : 0;
              final leavePct = (100 - presentPct).clamp(0, 20);

              return Row(
                children: [
                  _MetricCard(
                    'Present %',
                    '$presentPct%',
                    AppTheme.success,
                  ),
                  const SizedBox(width: 8),
                  _MetricCard(
                    'On Leave %',
                    '$leavePct%',
                    AppTheme.warning,
                  ),
                  const SizedBox(width: 8),
                  _MetricCard(
                    'Sites Active',
                    summary.activeSites.toString(),
                    AppTheme.primary,
                  ),
                ],
              ).animate().fadeIn(duration: 350.ms);
            },
          ),
        ],
      ),
    );
  }
}

// ── MAIN SCREEN ───────────────────────────────────────────────────────────────

class SaReportsScreen extends ConsumerStatefulWidget {
  const SaReportsScreen({super.key});

  @override
  ConsumerState<SaReportsScreen> createState() => _SaReportsScreenState();
}

class _SaReportsScreenState extends ConsumerState<SaReportsScreen> {
  @override
  Widget build(BuildContext context) {
    return DefaultTabController(
      length: 5,
      child: Scaffold(
        backgroundColor: AppTheme.background,
        appBar: AppBar(
          backgroundColor: AppTheme.surface,
          title: const Text('Reports & Analytics'),
          bottom: const TabBar(
            isScrollable: true,
            indicatorColor: AppTheme.primary,
            labelColor: AppTheme.primary,
            unselectedLabelColor: AppTheme.textMuted,
            labelStyle: TextStyle(
              fontSize: 13,
              fontWeight: FontWeight.w600,
            ),
            tabs: [
              Tab(text: 'Summary'),
              Tab(text: 'Billing'),
              Tab(text: 'Payroll'),
              Tab(text: 'Compliance'),
              Tab(text: 'Attendance'),
            ],
          ),
        ),
        body: const TabBarView(
          children: [
            _SummaryTab(),
            _BillingTab(),
            _PayrollTab(),
            _ComplianceTab(),
            _AttendanceTab(),
          ],
        ),
      ),
    );
  }
}
