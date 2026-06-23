import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:intl/intl.dart';
import '../../../core/theme/app_theme.dart';
import '../providers/hr_provider.dart';

class HrDashboardScreen extends ConsumerWidget {
  const HrDashboardScreen({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final summaryAsync = ref.watch(hrSummaryProvider);
    final leavesAsync = ref.watch(hrPendingLeavesProvider);
    final todayStr = DateFormat('EEEE, d MMM yyyy').format(DateTime.now());

    return Scaffold(
      backgroundColor: AppTheme.background,
      appBar: AppBar(
        title: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            const Text('HR Dashboard'),
            Text(
              todayStr,
              style: const TextStyle(
                fontSize: 12,
                color: AppTheme.textMuted,
                fontWeight: FontWeight.normal,
              ),
            ),
          ],
        ),
        toolbarHeight: 64,
        actions: [
          IconButton(
            icon: const Icon(Icons.refresh_outlined),
            onPressed: () {
              ref.invalidate(hrSummaryProvider);
              ref.invalidate(hrPendingLeavesProvider);
            },
          ),
        ],
      ),
      body: RefreshIndicator(
        color: AppTheme.primary,
        onRefresh: () async {
          ref.invalidate(hrSummaryProvider);
          ref.invalidate(hrPendingLeavesProvider);
        },
        child: CustomScrollView(
          physics: const AlwaysScrollableScrollPhysics(),
          slivers: [
            // ── Alert Banner ──────────────────────────────────────────────────
            summaryAsync.when(
              loading: () => const SliverToBoxAdapter(child: SizedBox.shrink()),
              error: (_, __) =>
                  const SliverToBoxAdapter(child: SizedBox.shrink()),
              data: (summary) {
                if (summary.overdueCompliance <= 0) {
                  return const SliverToBoxAdapter(child: SizedBox.shrink());
                }
                return SliverToBoxAdapter(
                  child: Padding(
                    padding: const EdgeInsets.fromLTRB(16, 12, 16, 0),
                    child: Container(
                      width: double.infinity,
                      padding: const EdgeInsets.symmetric(
                          horizontal: 16, vertical: 12),
                      decoration: BoxDecoration(
                        color: AppTheme.danger.withValues(alpha: 0.12),
                        borderRadius: BorderRadius.circular(12),
                        border: Border.all(
                            color: AppTheme.danger.withValues(alpha: 0.4)),
                      ),
                      child: Row(
                        children: [
                          const Icon(Icons.warning_amber_rounded,
                              color: AppTheme.danger, size: 18),
                          const SizedBox(width: 8),
                          Expanded(
                            child: Text(
                              '⚠ ${summary.overdueCompliance} compliance item(s) overdue — action required',
                              style: const TextStyle(
                                color: AppTheme.danger,
                                fontSize: 13,
                                fontWeight: FontWeight.w600,
                              ),
                            ),
                          ),
                        ],
                      ),
                    ),
                  ),
                );
              },
            ),

            // ── KPI Grid ──────────────────────────────────────────────────────
            SliverToBoxAdapter(
              child: Padding(
                padding: const EdgeInsets.fromLTRB(16, 16, 16, 0),
                child: summaryAsync.when(
                  loading: () => const Center(
                    child: Padding(
                      padding: EdgeInsets.symmetric(vertical: 48),
                      child:
                          CircularProgressIndicator(color: AppTheme.primary),
                    ),
                  ),
                  error: (e, _) => _KpiError(
                    message: e.toString(),
                    onRetry: () => ref.invalidate(hrSummaryProvider),
                  ),
                  data: (summary) {
                    final payrollColor = summary.payrollStatus == 'COMPLETED'
                        ? AppTheme.success
                        : summary.payrollStatus == 'PROCESSING'
                            ? AppTheme.warning
                            : AppTheme.primary;

                    final complianceColor = summary.complianceScore >= 80
                        ? AppTheme.success
                        : summary.complianceScore >= 60
                            ? AppTheme.warning
                            : AppTheme.danger;

                    final leaveColor = summary.pendingLeaves > 0
                        ? AppTheme.warning
                        : AppTheme.success;

                    return GridView.count(
                      shrinkWrap: true,
                      physics: const NeverScrollableScrollPhysics(),
                      crossAxisCount: 2,
                      crossAxisSpacing: 12,
                      mainAxisSpacing: 12,
                      childAspectRatio: 1.6,
                      children: [
                        _HrKpiCard(
                          label: 'Total Employees',
                          value: '${summary.totalEmployees}',
                          icon: Icons.people_outlined,
                          color: AppTheme.primary,
                        ),
                        _HrKpiCard(
                          label: 'New This Month',
                          value: '+${summary.newThisMonth}',
                          icon: Icons.person_add_outlined,
                          color: AppTheme.success,
                        ),
                        _HrKpiCard(
                          label: 'Open Positions',
                          value: '${summary.openPositions}',
                          icon: Icons.work_outline,
                          color: AppTheme.warning,
                        ),
                        _HrKpiCard(
                          label: 'Payroll Status',
                          value: summary.payrollStatus,
                          icon: Icons.payments_outlined,
                          color: payrollColor,
                        ),
                        _HrKpiCard(
                          label: 'Compliance Score',
                          value:
                              '${summary.complianceScore.toStringAsFixed(0)}%',
                          icon: Icons.verified_outlined,
                          color: complianceColor,
                        ),
                        _HrKpiCard(
                          label: 'Leave Requests',
                          value: '${summary.pendingLeaves}',
                          icon: Icons.event_available_outlined,
                          color: leaveColor,
                        ),
                      ],
                    );
                  },
                ),
              ),
            ),

            // ── Quick Actions ─────────────────────────────────────────────────
            SliverToBoxAdapter(
              child: Padding(
                padding: const EdgeInsets.fromLTRB(16, 20, 16, 0),
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(
                      'Quick Actions',
                      style: Theme.of(context).textTheme.titleMedium,
                    ),
                    const SizedBox(height: 12),
                    SingleChildScrollView(
                      scrollDirection: Axis.horizontal,
                      child: Row(
                        children: [
                          _QuickActionChip(
                            label: 'Run Payroll',
                            icon: Icons.play_circle_outline,
                            color: AppTheme.primary,
                            onTap: () => _showComingSoon(context),
                          ),
                          const SizedBox(width: 10),
                          _QuickActionChip(
                            label: 'Add Employee',
                            icon: Icons.person_add,
                            color: AppTheme.success,
                            onTap: () => _showComingSoon(context),
                          ),
                          const SizedBox(width: 10),
                          _QuickActionChip(
                            label: 'Approve Leave',
                            icon: Icons.check_circle_outline,
                            color: AppTheme.warning,
                            onTap: () => _showComingSoon(context),
                          ),
                          const SizedBox(width: 10),
                          _QuickActionChip(
                            label: 'Add Attendance',
                            icon: Icons.how_to_reg,
                            color: AppTheme.primary,
                            onTap: () => _showComingSoon(context),
                          ),
                          const SizedBox(width: 10),
                          _QuickActionChip(
                            label: 'View Reports',
                            icon: Icons.bar_chart,
                            color: AppTheme.textMuted,
                            onTap: () => _showComingSoon(context),
                          ),
                        ],
                      ),
                    ),
                  ],
                ),
              ),
            ),

            // ── Pending Leaves ────────────────────────────────────────────────
            SliverToBoxAdapter(
              child: Padding(
                padding: const EdgeInsets.fromLTRB(16, 24, 16, 24),
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    leavesAsync.when(
                      loading: () => const _SectionHeader(title: 'Pending Leave Requests', count: null),
                      error: (_, __) => const _SectionHeader(title: 'Pending Leave Requests', count: null),
                      data: (leaves) => _SectionHeader(
                        title: 'Pending Leave Requests',
                        count: leaves.length,
                      ),
                    ),
                    const SizedBox(height: 12),
                    leavesAsync.when(
                      loading: () => const Center(
                        child: Padding(
                          padding: EdgeInsets.symmetric(vertical: 32),
                          child: CircularProgressIndicator(
                              color: AppTheme.primary),
                        ),
                      ),
                      error: (_, __) => Container(
                        width: double.infinity,
                        padding: const EdgeInsets.all(16),
                        decoration: BoxDecoration(
                          color: AppTheme.danger.withValues(alpha: 0.08),
                          borderRadius: BorderRadius.circular(12),
                          border: Border.all(
                              color: AppTheme.danger.withValues(alpha: 0.2)),
                        ),
                        child: Text(
                          'Unable to load leave requests',
                          textAlign: TextAlign.center,
                          style: Theme.of(context)
                              .textTheme
                              .bodyMedium
                              ?.copyWith(color: AppTheme.danger),
                        ),
                      ),
                      data: (leaves) {
                        if (leaves.isEmpty) {
                          return Column(
                            children: [
                              const Icon(Icons.check_circle_outline,
                                  color: AppTheme.success, size: 40),
                              const SizedBox(height: 10),
                              Text(
                                'No pending leave requests',
                                style: Theme.of(context)
                                    .textTheme
                                    .bodyMedium
                                    ?.copyWith(color: AppTheme.textSecondary),
                              ),
                            ],
                          );
                        }

                        final visible = leaves.take(5).toList();
                        final hasMore = leaves.length > 5;

                        return Column(
                          children: [
                            ...visible.map((leave) => Padding(
                                  padding: const EdgeInsets.only(bottom: 10),
                                  child: _LeaveCard(leave: leave, ref: ref),
                                )),
                            if (hasMore)
                              GestureDetector(
                                onTap: () => _showComingSoon(context),
                                child: Container(
                                  width: double.infinity,
                                  padding:
                                      const EdgeInsets.symmetric(vertical: 12),
                                  alignment: Alignment.center,
                                  child: Text(
                                    'Show ${leaves.length - 5} more →',
                                    style: const TextStyle(
                                      color: AppTheme.primary,
                                      fontWeight: FontWeight.w600,
                                      fontSize: 14,
                                    ),
                                  ),
                                ),
                              ),
                          ],
                        );
                      },
                    ),
                  ],
                ),
              ),
            ),
          ],
        ),
      ),
    );
  }

  void _showComingSoon(BuildContext context) {
    ScaffoldMessenger.of(context).showSnackBar(
      const SnackBar(
        content: Text('Feature coming soon'),
        behavior: SnackBarBehavior.floating,
      ),
    );
  }
}

// ────────────────────────────────────────────────────────────────────────────
// _HrKpiCard
// ────────────────────────────────────────────────────────────────────────────

class _HrKpiCard extends StatelessWidget {
  final String label;
  final String value;
  final IconData icon;
  final Color color;

  const _HrKpiCard({
    required this.label,
    required this.value,
    required this.icon,
    required this.color,
  });

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.all(16),
      decoration: BoxDecoration(
        color: AppTheme.surface,
        borderRadius: BorderRadius.circular(16),
        border: Border.all(color: AppTheme.border),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            children: [
              Container(
                padding: const EdgeInsets.all(7),
                decoration: BoxDecoration(
                  color: color.withValues(alpha: 0.15),
                  borderRadius: BorderRadius.circular(8),
                ),
                child: Icon(icon, color: color, size: 16),
              ),
              const Spacer(),
            ],
          ),
          const Spacer(),
          Text(
            value,
            style: Theme.of(context).textTheme.titleLarge?.copyWith(
                  fontSize: 18,
                  fontWeight: FontWeight.bold,
                  color: AppTheme.textPrimary,
                ),
            maxLines: 1,
            overflow: TextOverflow.ellipsis,
          ),
          const SizedBox(height: 2),
          Text(
            label,
            style: Theme.of(context).textTheme.bodyMedium?.copyWith(
                  fontSize: 11,
                  color: AppTheme.textMuted,
                ),
            maxLines: 1,
            overflow: TextOverflow.ellipsis,
          ),
        ],
      ),
    );
  }
}

// ────────────────────────────────────────────────────────────────────────────
// _QuickActionChip
// ────────────────────────────────────────────────────────────────────────────

class _QuickActionChip extends StatelessWidget {
  final String label;
  final IconData icon;
  final Color color;
  final VoidCallback onTap;

  const _QuickActionChip({
    required this.label,
    required this.icon,
    required this.color,
    required this.onTap,
  });

  @override
  Widget build(BuildContext context) {
    return GestureDetector(
      onTap: onTap,
      child: Container(
        padding:
            const EdgeInsets.symmetric(horizontal: 14, vertical: 10),
        decoration: BoxDecoration(
          color: color.withValues(alpha: 0.08),
          borderRadius: BorderRadius.circular(12),
          border: Border.all(color: color.withValues(alpha: 0.25)),
        ),
        child: Row(
          mainAxisSize: MainAxisSize.min,
          children: [
            Icon(icon, color: color, size: 16),
            const SizedBox(width: 6),
            Text(
              label,
              style: TextStyle(
                color: color == AppTheme.textMuted
                    ? AppTheme.textSecondary
                    : color,
                fontSize: 13,
                fontWeight: FontWeight.w600,
              ),
            ),
          ],
        ),
      ),
    );
  }
}

// ────────────────────────────────────────────────────────────────────────────
// _SectionHeader
// ────────────────────────────────────────────────────────────────────────────

class _SectionHeader extends StatelessWidget {
  final String title;
  final int? count;

  const _SectionHeader({required this.title, required this.count});

  @override
  Widget build(BuildContext context) {
    return Row(
      children: [
        Text(title, style: Theme.of(context).textTheme.titleMedium),
        if (count != null && count! > 0) ...[
          const SizedBox(width: 8),
          Container(
            padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 2),
            decoration: BoxDecoration(
              color: AppTheme.warning.withValues(alpha: 0.15),
              borderRadius: BorderRadius.circular(20),
              border:
                  Border.all(color: AppTheme.warning.withValues(alpha: 0.4)),
            ),
            child: Text(
              '$count',
              style: const TextStyle(
                color: AppTheme.warning,
                fontSize: 12,
                fontWeight: FontWeight.bold,
              ),
            ),
          ),
        ],
      ],
    );
  }
}

// ────────────────────────────────────────────────────────────────────────────
// _KpiError
// ────────────────────────────────────────────────────────────────────────────

class _KpiError extends StatelessWidget {
  final String message;
  final VoidCallback onRetry;

  const _KpiError({required this.message, required this.onRetry});

  @override
  Widget build(BuildContext context) {
    return Container(
      width: double.infinity,
      padding: const EdgeInsets.all(16),
      decoration: BoxDecoration(
        color: AppTheme.danger.withValues(alpha: 0.08),
        borderRadius: BorderRadius.circular(12),
        border: Border.all(color: AppTheme.danger.withValues(alpha: 0.2)),
      ),
      child: Column(
        children: [
          Text(
            'Failed to load HR summary',
            style: Theme.of(context)
                .textTheme
                .bodyMedium
                ?.copyWith(color: AppTheme.danger),
          ),
          const SizedBox(height: 8),
          TextButton(onPressed: onRetry, child: const Text('Retry')),
        ],
      ),
    );
  }
}

// ────────────────────────────────────────────────────────────────────────────
// _LeaveCard
// ────────────────────────────────────────────────────────────────────────────

class _LeaveCard extends ConsumerStatefulWidget {
  final HrLeaveRequest leave;
  final WidgetRef ref;

  const _LeaveCard({required this.leave, required this.ref});

  @override
  ConsumerState<_LeaveCard> createState() => _LeaveCardState();
}

class _LeaveCardState extends ConsumerState<_LeaveCard> {
  bool _loading = false;

  String _initials(String name) {
    final parts = name.trim().split(' ');
    if (parts.isEmpty) return '?';
    if (parts.length == 1) {
      return parts[0].isNotEmpty ? parts[0][0].toUpperCase() : '?';
    }
    final a = parts[0].isNotEmpty ? parts[0][0].toUpperCase() : '';
    final b = parts.last.isNotEmpty ? parts.last[0].toUpperCase() : '';
    return '$a$b';
  }

  String _shortDate(String raw) {
    if (raw.isEmpty) return '—';
    try {
      return DateFormat('d MMM').format(DateTime.parse(raw));
    } catch (_) {
      return raw;
    }
  }

  Future<void> _onApprove() async {
    setState(() => _loading = true);
    try {
      await ref
          .read(hrLeaveNotifierProvider.notifier)
          .approve(widget.leave.id);
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(
            content: Text('Leave approved for ${widget.leave.employeeName}'),
            backgroundColor: AppTheme.success,
            behavior: SnackBarBehavior.floating,
          ),
        );
      }
    } catch (e) {
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(
            content: Text(e.toString()),
            backgroundColor: AppTheme.danger,
            behavior: SnackBarBehavior.floating,
          ),
        );
      }
    } finally {
      if (mounted) setState(() => _loading = false);
    }
  }

  Future<void> _onReject() async {
    setState(() => _loading = true);
    try {
      await ref
          .read(hrLeaveNotifierProvider.notifier)
          .reject(widget.leave.id);
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(
            content: Text('Leave rejected for ${widget.leave.employeeName}'),
            backgroundColor: AppTheme.danger,
            behavior: SnackBarBehavior.floating,
          ),
        );
      }
    } catch (e) {
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(
            content: Text(e.toString()),
            backgroundColor: AppTheme.danger,
            behavior: SnackBarBehavior.floating,
          ),
        );
      }
    } finally {
      if (mounted) setState(() => _loading = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    final leave = widget.leave;
    final initials = _initials(leave.employeeName);
    final dateRange =
        '${_shortDate(leave.startDate)} – ${_shortDate(leave.endDate)}';

    return Container(
      decoration: BoxDecoration(
        color: AppTheme.surface,
        borderRadius: BorderRadius.circular(12),
        border: Border.all(color: AppTheme.border),
      ),
      child: Padding(
        padding: const EdgeInsets.all(14),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Row(
              children: [
                // Initials avatar
                Container(
                  width: 40,
                  height: 40,
                  decoration: BoxDecoration(
                    color: AppTheme.primary.withValues(alpha: 0.12),
                    shape: BoxShape.circle,
                    border: Border.all(
                        color: AppTheme.primary.withValues(alpha: 0.3)),
                  ),
                  child: Center(
                    child: Text(
                      initials,
                      style: const TextStyle(
                        color: AppTheme.primary,
                        fontWeight: FontWeight.bold,
                        fontSize: 14,
                      ),
                    ),
                  ),
                ),
                const SizedBox(width: 10),

                // Employee name + leave type
                Expanded(
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Text(
                        leave.employeeName.isEmpty
                            ? 'Unknown Employee'
                            : leave.employeeName,
                        style: Theme.of(context)
                            .textTheme
                            .bodyLarge
                            ?.copyWith(
                                fontWeight: FontWeight.w600, fontSize: 14),
                        maxLines: 1,
                        overflow: TextOverflow.ellipsis,
                      ),
                      const SizedBox(height: 2),
                      Text(
                        leave.leaveType,
                        style: Theme.of(context).textTheme.bodyMedium?.copyWith(
                              color: AppTheme.warning,
                              fontSize: 12,
                            ),
                      ),
                    ],
                  ),
                ),

                // Days count + date range
                Column(
                  crossAxisAlignment: CrossAxisAlignment.end,
                  children: [
                    Container(
                      padding: const EdgeInsets.symmetric(
                          horizontal: 8, vertical: 3),
                      decoration: BoxDecoration(
                        color: AppTheme.warning.withValues(alpha: 0.12),
                        borderRadius: BorderRadius.circular(20),
                        border: Border.all(
                            color: AppTheme.warning.withValues(alpha: 0.3)),
                      ),
                      child: Text(
                        '${leave.days}d',
                        style: const TextStyle(
                          color: AppTheme.warning,
                          fontSize: 11,
                          fontWeight: FontWeight.bold,
                        ),
                      ),
                    ),
                    const SizedBox(height: 4),
                    Text(
                      dateRange,
                      style: Theme.of(context).textTheme.bodyMedium?.copyWith(
                            fontSize: 10,
                            color: AppTheme.textMuted,
                          ),
                    ),
                  ],
                ),
              ],
            ),

            // Action buttons
            const SizedBox(height: 10),
            Row(
              mainAxisAlignment: MainAxisAlignment.end,
              children: [
                if (_loading)
                  const SizedBox(
                    width: 20,
                    height: 20,
                    child: CircularProgressIndicator(
                      strokeWidth: 2,
                      color: AppTheme.primary,
                    ),
                  )
                else ...[
                  _ActionButton(
                    label: 'Approve',
                    color: AppTheme.success,
                    onTap: _onApprove,
                  ),
                  const SizedBox(width: 8),
                  _ActionButton(
                    label: 'Reject',
                    color: AppTheme.danger,
                    onTap: _onReject,
                  ),
                ],
              ],
            ),
          ],
        ),
      ),
    );
  }
}

class _ActionButton extends StatelessWidget {
  final String label;
  final Color color;
  final VoidCallback onTap;

  const _ActionButton({
    required this.label,
    required this.color,
    required this.onTap,
  });

  @override
  Widget build(BuildContext context) {
    return GestureDetector(
      onTap: onTap,
      child: Container(
        padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 6),
        decoration: BoxDecoration(
          color: color.withValues(alpha: 0.12),
          borderRadius: BorderRadius.circular(8),
          border: Border.all(color: color.withValues(alpha: 0.3)),
        ),
        child: Text(
          label,
          style: TextStyle(
            color: color,
            fontSize: 12,
            fontWeight: FontWeight.w600,
          ),
        ),
      ),
    );
  }
}
