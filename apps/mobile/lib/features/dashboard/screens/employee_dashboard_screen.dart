import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import 'package:intl/intl.dart';
import '../../../core/theme/app_theme.dart';
import '../../../core/providers/auth_provider.dart';
import '../providers/dashboard_provider.dart';

class EmployeeDashboardScreen extends ConsumerWidget {
  const EmployeeDashboardScreen({super.key});

  String _greeting() {
    final h = DateTime.now().hour;
    if (h < 12) return 'Good Morning';
    if (h < 17) return 'Good Afternoon';
    return 'Good Evening';
  }

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final user = ref.watch(authStateProvider).value;
    final summaryAsync = ref.watch(dashboardSummaryProvider);
    final approvalsAsync = ref.watch(myPendingApprovalsProvider);

    return Scaffold(
      backgroundColor: AppTheme.background,
      appBar: AppBar(
        title: const Text('Dashboard'),
        actions: [
          IconButton(
            icon: const Icon(Icons.refresh_outlined),
            onPressed: () {
              ref.invalidate(dashboardSummaryProvider);
              ref.invalidate(myPendingApprovalsProvider);
            },
          ),
        ],
      ),
      body: RefreshIndicator(
        color: AppTheme.primary,
        onRefresh: () async {
          ref.invalidate(dashboardSummaryProvider);
          ref.invalidate(myPendingApprovalsProvider);
        },
        child: SingleChildScrollView(
          physics: const AlwaysScrollableScrollPhysics(),
          padding: const EdgeInsets.all(20),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              // ── Header Card ───────────────────────────────────────────────
              _DashboardHeader(
                greeting: _greeting(),
                userName: user?.name ?? 'User',
                role: user?.role ?? '',
                onNotificationTap: () => context.push('/notifications'),
              ),

              const SizedBox(height: 20),

              // ── Stats Row ─────────────────────────────────────────────────
              summaryAsync.when(
                loading: () => const Center(
                  child: Padding(
                    padding: EdgeInsets.symmetric(vertical: 24),
                    child: CircularProgressIndicator(color: AppTheme.primary),
                  ),
                ),
                error: (_, __) => _SummaryError(
                  onRetry: () => ref.invalidate(dashboardSummaryProvider),
                ),
                data: (summary) => _StatsGrid(summary: summary),
              ),

              const SizedBox(height: 24),

              // ── Quick Actions ─────────────────────────────────────────────
              Text(
                'Quick Actions',
                style: Theme.of(context).textTheme.titleMedium,
              ),
              const SizedBox(height: 12),
              _QuickActionsGrid(
                onMarkAttendance: () => context.go('/attendance'),
                onLeaveRequest: () => context.go('/leave'),
                onPayslips: () => context.go('/payslips'),
                onEmployees: () => context.push('/employees'),
                onTenders: () => context.push('/tenders'),
                onReports: () => context.push('/reports'),
              ),

              const SizedBox(height: 24),

              // ── Pending Approvals ─────────────────────────────────────────
              approvalsAsync.when(
                loading: () => Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    _SectionTitle(title: 'Pending Approvals', count: null),
                    const SizedBox(height: 12),
                    const Center(
                      child: Padding(
                        padding: EdgeInsets.symmetric(vertical: 24),
                        child: CircularProgressIndicator(color: AppTheme.primary),
                      ),
                    ),
                  ],
                ),
                error: (_, __) => Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    _SectionTitle(title: 'Pending Approvals', count: null),
                    const SizedBox(height: 12),
                    _ApprovalsError(
                      onRetry: () => ref.invalidate(myPendingApprovalsProvider),
                    ),
                  ],
                ),
                data: (approvals) => Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    _SectionTitle(
                      title: 'Pending Approvals',
                      count: approvals.length,
                    ),
                    const SizedBox(height: 12),
                    if (approvals.isEmpty)
                      const _EmptyApprovals()
                    else ...[
                      ...approvals
                          .take(3)
                          .map((item) => _ApprovalCard(item: item)),
                      const SizedBox(height: 8),
                      GestureDetector(
                        onTap: () => context.push('/workflows'),
                        child: Container(
                          width: double.infinity,
                          padding: const EdgeInsets.symmetric(vertical: 12),
                          alignment: Alignment.center,
                          child: const Text(
                            'See All →',
                            style: TextStyle(
                              color: AppTheme.primary,
                              fontWeight: FontWeight.w600,
                              fontSize: 14,
                            ),
                          ),
                        ),
                      ),
                    ],
                  ],
                ),
              ),

              const SizedBox(height: 24),
            ],
          ),
        ),
      ),
    );
  }
}

// ────────────────────────────────────────────────────────────────────────────
// Header Card
// ────────────────────────────────────────────────────────────────────────────

class _DashboardHeader extends StatelessWidget {
  final String greeting;
  final String userName;
  final String role;
  final VoidCallback onNotificationTap;

  const _DashboardHeader({
    required this.greeting,
    required this.userName,
    required this.role,
    required this.onNotificationTap,
  });

  String _formatRole(String r) {
    if (r.isEmpty) return '';
    return r
        .split('_')
        .map((w) => w.isEmpty
            ? ''
            : '${w[0].toUpperCase()}${w.substring(1).toLowerCase()}')
        .join(' ');
  }

  @override
  Widget build(BuildContext context) {
    final dateStr = DateFormat('dd MMM yyyy').format(DateTime.now());

    return Container(
      width: double.infinity,
      padding: const EdgeInsets.all(20),
      decoration: BoxDecoration(
        color: AppTheme.surface,
        borderRadius: BorderRadius.circular(20),
        border: Border.all(color: AppTheme.border),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(
                      greeting,
                      style: Theme.of(context).textTheme.bodyMedium?.copyWith(
                            color: AppTheme.textSecondary,
                            fontSize: 13,
                          ),
                    ),
                    const SizedBox(height: 4),
                    Text(
                      userName,
                      style: Theme.of(context)
                          .textTheme
                          .headlineMedium
                          ?.copyWith(fontSize: 22),
                    ),
                  ],
                ),
              ),
              IconButton(
                onPressed: onNotificationTap,
                icon: const Icon(Icons.notifications_outlined),
                color: AppTheme.textSecondary,
                style: IconButton.styleFrom(
                  backgroundColor: AppTheme.surfaceVariant,
                  shape: RoundedRectangleBorder(
                    borderRadius: BorderRadius.circular(12),
                  ),
                ),
              ),
            ],
          ),
          const SizedBox(height: 12),
          Row(
            children: [
              const Icon(Icons.badge_outlined,
                  size: 13, color: AppTheme.textMuted),
              const SizedBox(width: 5),
              Text(
                '${_formatRole(role)}  •  $dateStr',
                style: Theme.of(context).textTheme.bodyMedium?.copyWith(
                      color: AppTheme.textMuted,
                      fontSize: 12,
                    ),
              ),
            ],
          ),
        ],
      ),
    );
  }
}

// ────────────────────────────────────────────────────────────────────────────
// Stats Grid — 4 cards in a 2x2 layout
// ────────────────────────────────────────────────────────────────────────────

class _StatsGrid extends StatelessWidget {
  final Map<String, dynamic> summary;

  const _StatsGrid({required this.summary});

  @override
  Widget build(BuildContext context) {
    final currFmt =
        NumberFormat.compactCurrency(locale: 'en_IN', symbol: '₹', decimalDigits: 1);

    final employees = summary['employees'] as num? ?? 0;
    final activeTenders = summary['activeTenders'] as num? ?? 0;
    final payrollRaw = summary['payrollThisMonth'];
    final payrollNet = payrollRaw is Map
        ? (payrollRaw['totalNet'] as num? ?? 0)
        : 0;
    final deploymentsActive = summary['deploymentsActive'] as num? ?? 0;

    return Column(
      children: [
        Row(
          children: [
            Expanded(
              child: _StatCard(
                label: 'Total Employees',
                value: '${employees.toInt()}',
                icon: Icons.people_outline,
                color: AppTheme.primary,
              ),
            ),
            const SizedBox(width: 12),
            Expanded(
              child: _StatCard(
                label: 'Active Tenders',
                value: '${activeTenders.toInt()}',
                icon: Icons.description_outlined,
                color: const Color(0xFF3B82F6),
              ),
            ),
          ],
        ),
        const SizedBox(height: 12),
        Row(
          children: [
            Expanded(
              child: _StatCard(
                label: 'Monthly Billing',
                value: currFmt.format(payrollNet),
                icon: Icons.account_balance_wallet_outlined,
                color: AppTheme.success,
              ),
            ),
            const SizedBox(width: 12),
            Expanded(
              child: _StatCard(
                label: 'Deployed Staff',
                value: '${deploymentsActive.toInt()}',
                icon: Icons.location_on_outlined,
                color: AppTheme.warning,
              ),
            ),
          ],
        ),
      ],
    );
  }
}

class _StatCard extends StatelessWidget {
  final String label;
  final String value;
  final IconData icon;
  final Color color;

  const _StatCard({
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
        color: color.withValues(alpha: 0.08),
        borderRadius: BorderRadius.circular(16),
        border: Border.all(color: color.withValues(alpha: 0.25)),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Container(
            padding: const EdgeInsets.all(8),
            decoration: BoxDecoration(
              color: color.withValues(alpha: 0.15),
              borderRadius: BorderRadius.circular(10),
            ),
            child: Icon(icon, color: color, size: 18),
          ),
          const SizedBox(height: 12),
          Text(
            value,
            style: Theme.of(context).textTheme.titleLarge?.copyWith(
                  color: AppTheme.textPrimary,
                  fontSize: 20,
                  fontWeight: FontWeight.bold,
                ),
          ),
          const SizedBox(height: 2),
          Text(
            label,
            style: Theme.of(context).textTheme.bodyMedium?.copyWith(
                  fontSize: 11,
                  color: AppTheme.textSecondary,
                ),
          ),
        ],
      ),
    );
  }
}

class _SummaryError extends StatelessWidget {
  final VoidCallback onRetry;

  const _SummaryError({required this.onRetry});

  @override
  Widget build(BuildContext context) {
    return Container(
      width: double.infinity,
      padding: const EdgeInsets.all(16),
      decoration: BoxDecoration(
        color: AppTheme.danger.withValues(alpha: 0.08),
        borderRadius: BorderRadius.circular(14),
        border: Border.all(color: AppTheme.danger.withValues(alpha: 0.2)),
      ),
      child: Column(
        children: [
          Text(
            'Failed to load summary',
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
// Quick Actions Grid — 3 columns × 2 rows
// ────────────────────────────────────────────────────────────────────────────

class _QuickActionsGrid extends StatelessWidget {
  final VoidCallback onMarkAttendance;
  final VoidCallback onLeaveRequest;
  final VoidCallback onPayslips;
  final VoidCallback onEmployees;
  final VoidCallback onTenders;
  final VoidCallback onReports;

  const _QuickActionsGrid({
    required this.onMarkAttendance,
    required this.onLeaveRequest,
    required this.onPayslips,
    required this.onEmployees,
    required this.onTenders,
    required this.onReports,
  });

  @override
  Widget build(BuildContext context) {
    final actions = [
      _ActionItem(
        label: 'Mark\nAttendance',
        icon: Icons.how_to_reg_outlined,
        color: AppTheme.primary,
        onTap: onMarkAttendance,
      ),
      _ActionItem(
        label: 'Leave\nRequest',
        icon: Icons.beach_access_outlined,
        color: AppTheme.warning,
        onTap: onLeaveRequest,
      ),
      _ActionItem(
        label: 'Payslips',
        icon: Icons.receipt_long_outlined,
        color: AppTheme.success,
        onTap: onPayslips,
      ),
      _ActionItem(
        label: 'Employees',
        icon: Icons.people_outline,
        color: const Color(0xFF3B82F6),
        onTap: onEmployees,
      ),
      _ActionItem(
        label: 'Tenders',
        icon: Icons.description_outlined,
        color: const Color(0xFF8B5CF6),
        onTap: onTenders,
      ),
      _ActionItem(
        label: 'Reports',
        icon: Icons.bar_chart_outlined,
        color: const Color(0xFFEC4899),
        onTap: onReports,
      ),
    ];

    return GridView.builder(
      shrinkWrap: true,
      physics: const NeverScrollableScrollPhysics(),
      gridDelegate: const SliverGridDelegateWithFixedCrossAxisCount(
        crossAxisCount: 3,
        crossAxisSpacing: 10,
        mainAxisSpacing: 10,
        childAspectRatio: 1.0,
      ),
      itemCount: actions.length,
      itemBuilder: (_, i) => _ActionTile(item: actions[i]),
    );
  }
}

class _ActionItem {
  final String label;
  final IconData icon;
  final Color color;
  final VoidCallback onTap;

  const _ActionItem({
    required this.label,
    required this.icon,
    required this.color,
    required this.onTap,
  });
}

class _ActionTile extends StatelessWidget {
  final _ActionItem item;

  const _ActionTile({required this.item});

  @override
  Widget build(BuildContext context) {
    return GestureDetector(
      onTap: item.onTap,
      child: Container(
        padding: const EdgeInsets.symmetric(vertical: 14, horizontal: 8),
        decoration: BoxDecoration(
          color: item.color.withValues(alpha: 0.08),
          borderRadius: BorderRadius.circular(16),
          border: Border.all(color: item.color.withValues(alpha: 0.25)),
        ),
        child: Column(
          mainAxisAlignment: MainAxisAlignment.center,
          children: [
            Container(
              padding: const EdgeInsets.all(10),
              decoration: BoxDecoration(
                color: item.color.withValues(alpha: 0.15),
                shape: BoxShape.circle,
              ),
              child: Icon(item.icon, color: item.color, size: 20),
            ),
            const SizedBox(height: 8),
            Text(
              item.label,
              textAlign: TextAlign.center,
              style: Theme.of(context).textTheme.bodyMedium?.copyWith(
                    fontSize: 11,
                    fontWeight: FontWeight.w600,
                    color: AppTheme.textPrimary,
                    height: 1.3,
                  ),
            ),
          ],
        ),
      ),
    );
  }
}

// ────────────────────────────────────────────────────────────────────────────
// Section Title with optional count badge
// ────────────────────────────────────────────────────────────────────────────

class _SectionTitle extends StatelessWidget {
  final String title;
  final int? count;

  const _SectionTitle({required this.title, required this.count});

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
              border: Border.all(
                  color: AppTheme.warning.withValues(alpha: 0.4)),
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
// Approval Card
// ────────────────────────────────────────────────────────────────────────────

class _ApprovalCard extends StatelessWidget {
  final Map<String, dynamic> item;

  const _ApprovalCard({required this.item});

  String _shortDate(String? iso) {
    if (iso == null) return '—';
    try {
      return DateFormat('dd MMM').format(DateTime.parse(iso));
    } catch (_) {
      return iso;
    }
  }

  @override
  Widget build(BuildContext context) {
    final title = item['title'] as String? ??
        item['workflowStep']?['name'] as String? ??
        'Approval Required';
    final type = item['type'] as String? ??
        item['workflow']?['name'] as String? ??
        'Workflow';
    final createdAt = item['createdAt'] as String?;
    final requesterRaw = item['requester'] ?? item['employee'];
    final requester = requesterRaw is Map ? requesterRaw : null;
    final firstName = requester?['firstName'] as String? ?? '';
    final lastName = requester?['lastName'] as String? ?? '';
    final fullName = '$firstName $lastName'.trim();
    final initials = firstName.isNotEmpty ? firstName[0].toUpperCase() : '?';

    return Container(
      margin: const EdgeInsets.only(bottom: 10),
      padding: const EdgeInsets.all(14),
      decoration: BoxDecoration(
        color: AppTheme.surface,
        borderRadius: BorderRadius.circular(14),
        border: Border.all(color: AppTheme.border),
      ),
      child: Row(
        children: [
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
                  fontSize: 16,
                ),
              ),
            ),
          ),
          const SizedBox(width: 12),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(
                  title,
                  style: Theme.of(context).textTheme.bodyLarge?.copyWith(
                        fontWeight: FontWeight.w600,
                        fontSize: 14,
                      ),
                  maxLines: 1,
                  overflow: TextOverflow.ellipsis,
                ),
                const SizedBox(height: 2),
                if (fullName.isNotEmpty)
                  Text(
                    fullName,
                    style: Theme.of(context).textTheme.bodyMedium?.copyWith(
                          color: AppTheme.textSecondary,
                          fontSize: 12,
                        ),
                  ),
                const SizedBox(height: 2),
                Text(
                  type,
                  style: Theme.of(context).textTheme.bodyMedium?.copyWith(
                        color: AppTheme.warning,
                        fontSize: 11,
                      ),
                ),
              ],
            ),
          ),
          const SizedBox(width: 8),
          Column(
            crossAxisAlignment: CrossAxisAlignment.end,
            children: [
              Container(
                padding:
                    const EdgeInsets.symmetric(horizontal: 8, vertical: 3),
                decoration: BoxDecoration(
                  color: AppTheme.warning.withValues(alpha: 0.12),
                  borderRadius: BorderRadius.circular(20),
                  border: Border.all(
                      color: AppTheme.warning.withValues(alpha: 0.3)),
                ),
                child: const Text(
                  'PENDING',
                  style: TextStyle(
                    color: AppTheme.warning,
                    fontSize: 10,
                    fontWeight: FontWeight.bold,
                  ),
                ),
              ),
              if (createdAt != null) ...[
                const SizedBox(height: 4),
                Text(
                  _shortDate(createdAt),
                  style: Theme.of(context).textTheme.bodyMedium?.copyWith(
                        fontSize: 10,
                        color: AppTheme.textMuted,
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

// ────────────────────────────────────────────────────────────────────────────
// Empty & Error States
// ────────────────────────────────────────────────────────────────────────────

class _EmptyApprovals extends StatelessWidget {
  const _EmptyApprovals();

  @override
  Widget build(BuildContext context) {
    return Container(
      width: double.infinity,
      padding: const EdgeInsets.symmetric(vertical: 32),
      child: Column(
        children: [
          const Icon(Icons.check_circle_outline,
              color: AppTheme.success, size: 40),
          const SizedBox(height: 10),
          Text(
            'No pending approvals',
            style: Theme.of(context)
                .textTheme
                .bodyMedium
                ?.copyWith(color: AppTheme.textSecondary),
          ),
        ],
      ),
    );
  }
}

class _ApprovalsError extends StatelessWidget {
  final VoidCallback onRetry;

  const _ApprovalsError({required this.onRetry});

  @override
  Widget build(BuildContext context) {
    return Container(
      width: double.infinity,
      padding: const EdgeInsets.all(16),
      decoration: BoxDecoration(
        color: AppTheme.danger.withValues(alpha: 0.08),
        borderRadius: BorderRadius.circular(14),
        border: Border.all(color: AppTheme.danger.withValues(alpha: 0.2)),
      ),
      child: Column(
        children: [
          Text(
            'Failed to load approvals',
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
