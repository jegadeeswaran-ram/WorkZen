import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import '../../../core/theme/app_theme.dart';
import '../../../core/providers/auth_provider.dart';
import '../providers/supervisor_provider.dart';

class SupervisorDashboardScreen extends ConsumerWidget {
  const SupervisorDashboardScreen({super.key});

  String _greeting() {
    final h = DateTime.now().hour;
    if (h < 12) return 'Good Morning';
    if (h < 17) return 'Good Afternoon';
    return 'Good Evening';
  }

  String _dateStr() {
    final months = [
      'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun',
      'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'
    ];
    final now = DateTime.now();
    return '${now.day.toString().padLeft(2, '0')} ${months[now.month - 1]} ${now.year}';
  }

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final user = ref.watch(authStateProvider).value;
    final statsAsync = ref.watch(supervisorDashboardStatsProvider);
    final pendingAsync = ref.watch(pendingLeaveRequestsProvider);

    return Scaffold(
      backgroundColor: AppTheme.background,
      appBar: AppBar(
        title: const Text('Dashboard'),
        actions: [
          IconButton(
            icon: const Icon(Icons.refresh_outlined),
            onPressed: () {
              ref.invalidate(supervisorDashboardStatsProvider);
              ref.invalidate(pendingLeaveRequestsProvider);
            },
          ),
        ],
      ),
      body: RefreshIndicator(
        color: AppTheme.primary,
        onRefresh: () async {
          ref.invalidate(supervisorDashboardStatsProvider);
          ref.invalidate(pendingLeaveRequestsProvider);
        },
        child: SingleChildScrollView(
          physics: const AlwaysScrollableScrollPhysics(),
          padding: const EdgeInsets.all(20),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              // ── 1. Header Card ─────────────────────────────────────────────
              _HeaderCard(
                greeting: _greeting(),
                userName: user?.name ?? 'Supervisor',
                dateStr: _dateStr(),
                onNotificationTap: () => context.go('/notifications'),
              ),

              const SizedBox(height: 20),

              // ── 2. Stats Row ───────────────────────────────────────────────
              statsAsync.when(
                loading: () => const Center(
                  child: Padding(
                    padding: EdgeInsets.symmetric(vertical: 24),
                    child: CircularProgressIndicator(color: AppTheme.primary),
                  ),
                ),
                error: (_, __) => _StatsError(
                  onRetry: () => ref.invalidate(supervisorDashboardStatsProvider),
                ),
                data: (stats) => _StatsRow(stats: stats),
              ),

              const SizedBox(height: 24),

              // ── 3. Quick Actions ───────────────────────────────────────────
              Text(
                'Quick Actions',
                style: Theme.of(context).textTheme.titleMedium,
              ),
              const SizedBox(height: 12),
              Row(
                children: [
                  Expanded(
                    child: _ActionCard(
                      label: 'Mark\nAttendance',
                      icon: Icons.how_to_reg,
                      color: AppTheme.primary,
                      onTap: () => context.go('/supervisor/team-attendance'),
                    ),
                  ),
                  const SizedBox(width: 12),
                  Expanded(
                    child: _ActionCard(
                      label: 'Approve\nLeaves',
                      icon: Icons.approval,
                      color: AppTheme.warning,
                      onTap: () => context.go('/supervisor/approvals'),
                    ),
                  ),
                  const SizedBox(width: 12),
                  Expanded(
                    child: _ActionCard(
                      label: 'View\nTeam',
                      icon: Icons.groups,
                      color: AppTheme.success,
                      onTap: () => context.go('/supervisor/team'),
                    ),
                  ),
                ],
              ),
              const SizedBox(height: 12),
              Row(
                children: [
                  Expanded(
                    child: _ActionCard(
                      label: 'Complaints',
                      icon: Icons.report_problem_outlined,
                      color: Colors.orange,
                      onTap: () => context.push('/supervisor/complaints', extra: ''),
                    ),
                  ),
                  const SizedBox(width: 12),
                  const Expanded(child: SizedBox()),
                  const SizedBox(width: 12),
                  const Expanded(child: SizedBox()),
                ],
              ),

              const SizedBox(height: 24),

              // ── 4. Pending Approvals ───────────────────────────────────────
              pendingAsync.when(
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
                      onRetry: () => ref.invalidate(pendingLeaveRequestsProvider),
                    ),
                  ],
                ),
                data: (items) => Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    _SectionTitle(title: 'Pending Approvals', count: items.length),
                    const SizedBox(height: 12),
                    if (items.isEmpty)
                      const _EmptyApprovals()
                    else ...[
                      ...items.take(5).map((item) => _ApprovalItem(item: item)),
                      if (items.isNotEmpty) ...[
                        const SizedBox(height: 8),
                        GestureDetector(
                          onTap: () => context.go('/supervisor/approvals'),
                          child: Container(
                            width: double.infinity,
                            padding: const EdgeInsets.symmetric(vertical: 12),
                            alignment: Alignment.center,
                            child: Text(
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

class _HeaderCard extends StatelessWidget {
  final String greeting;
  final String userName;
  final String dateStr;
  final VoidCallback onNotificationTap;

  const _HeaderCard({
    required this.greeting,
    required this.userName,
    required this.dateStr,
    required this.onNotificationTap,
  });

  @override
  Widget build(BuildContext context) {
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
              // Left: greeting + name
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
                      style: Theme.of(context).textTheme.headlineMedium?.copyWith(
                            fontSize: 22,
                          ),
                    ),
                  ],
                ),
              ),
              // Right: notification bell
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
              const Icon(Icons.badge_outlined, size: 13, color: AppTheme.textMuted),
              const SizedBox(width: 5),
              Text(
                'Site Supervisor  •  $dateStr',
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
// Stats Row
// ────────────────────────────────────────────────────────────────────────────

class _StatsRow extends StatelessWidget {
  final SupervisorStats stats;

  const _StatsRow({required this.stats});

  @override
  Widget build(BuildContext context) {
    return Row(
      children: [
        Expanded(
          child: _StatCard(
            count: stats.presentToday,
            label: 'Present',
            color: AppTheme.success,
          ),
        ),
        const SizedBox(width: 10),
        Expanded(
          child: _StatCard(
            count: stats.absentToday,
            label: 'Absent',
            color: AppTheme.danger,
          ),
        ),
        const SizedBox(width: 10),
        Expanded(
          child: _StatCard(
            count: stats.onLeaveToday,
            label: 'On Leave',
            color: AppTheme.warning,
          ),
        ),
        const SizedBox(width: 10),
        Expanded(
          child: _StatCard(
            count: stats.totalTeam,
            label: 'Total',
            color: AppTheme.primary,
          ),
        ),
      ],
    );
  }
}

class _StatCard extends StatelessWidget {
  final int count;
  final String label;
  final Color color;

  const _StatCard({
    required this.count,
    required this.label,
    required this.color,
  });

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.symmetric(vertical: 14, horizontal: 8),
      decoration: BoxDecoration(
        color: color.withValues(alpha: 0.08),
        borderRadius: BorderRadius.circular(14),
        border: Border.all(color: color.withValues(alpha: 0.25)),
      ),
      child: Column(
        mainAxisSize: MainAxisSize.min,
        children: [
          Icon(Icons.person, color: color, size: 20),
          const SizedBox(height: 6),
          Text(
            '$count',
            style: Theme.of(context).textTheme.titleLarge?.copyWith(
                  color: color,
                  fontSize: 22,
                  fontWeight: FontWeight.bold,
                ),
          ),
          const SizedBox(height: 2),
          Text(
            label,
            style: Theme.of(context).textTheme.bodyMedium?.copyWith(
                  fontSize: 10,
                  color: AppTheme.textSecondary,
                ),
            textAlign: TextAlign.center,
          ),
        ],
      ),
    );
  }
}

class _StatsError extends StatelessWidget {
  final VoidCallback onRetry;

  const _StatsError({required this.onRetry});

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
            'Failed to load stats',
            style: Theme.of(context)
                .textTheme
                .bodyMedium
                ?.copyWith(color: AppTheme.danger),
          ),
          const SizedBox(height: 8),
          TextButton(
            onPressed: onRetry,
            child: const Text('Retry'),
          ),
        ],
      ),
    );
  }
}

// ────────────────────────────────────────────────────────────────────────────
// Action Card
// ────────────────────────────────────────────────────────────────────────────

class _ActionCard extends StatelessWidget {
  final String label;
  final IconData icon;
  final Color color;
  final VoidCallback onTap;

  const _ActionCard({
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
        padding: const EdgeInsets.symmetric(vertical: 16, horizontal: 8),
        decoration: BoxDecoration(
          color: color.withValues(alpha: 0.08),
          borderRadius: BorderRadius.circular(16),
          border: Border.all(color: color.withValues(alpha: 0.25)),
        ),
        child: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            Container(
              padding: const EdgeInsets.all(10),
              decoration: BoxDecoration(
                color: color.withValues(alpha: 0.15),
                shape: BoxShape.circle,
              ),
              child: Icon(icon, color: color, size: 22),
            ),
            const SizedBox(height: 8),
            Text(
              label,
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
// Section Title with badge
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
              border: Border.all(color: AppTheme.warning.withValues(alpha: 0.4)),
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
// Helpers
// ────────────────────────────────────────────────────────────────────────────

String _shortDate(String? iso) {
  if (iso == null) return '—';
  try {
    final d = DateTime.parse(iso);
    const months = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
    return '${d.day} ${months[d.month-1]}';
  } catch (_) {
    return iso;
  }
}

// ────────────────────────────────────────────────────────────────────────────
// Pending Approval Item
// ────────────────────────────────────────────────────────────────────────────

class _ApprovalItem extends StatelessWidget {
  final Map<String, dynamic> item;

  const _ApprovalItem({required this.item});

  @override
  Widget build(BuildContext context) {
    final employee = item['employee'] as Map<String, dynamic>? ?? {};
    final leaveType = item['leaveType'] as Map<String, dynamic>? ?? {};
    final firstName = employee['firstName'] as String? ?? '';
    final lastName = employee['lastName'] as String? ?? '';
    final fullName = '$firstName $lastName'.trim().isEmpty ? 'Unknown' : '$firstName $lastName'.trim();
    final leaveTypeName = leaveType['name'] as String? ?? 'Leave';
    final startDate = item['startDate'] as String?;
    final endDate = item['endDate'] as String?;
    final days = item['days'];

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
          // Avatar
          Container(
            width: 40,
            height: 40,
            decoration: BoxDecoration(
              color: AppTheme.warning.withValues(alpha: 0.12),
              shape: BoxShape.circle,
              border: Border.all(color: AppTheme.warning.withValues(alpha: 0.3)),
            ),
            child: Center(
              child: Text(
                firstName.isNotEmpty ? firstName[0].toUpperCase() : '?',
                style: const TextStyle(
                  color: AppTheme.warning,
                  fontWeight: FontWeight.bold,
                  fontSize: 16,
                ),
              ),
            ),
          ),
          const SizedBox(width: 12),
          // Details
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(
                  fullName,
                  style: Theme.of(context).textTheme.bodyLarge?.copyWith(
                        fontWeight: FontWeight.w600,
                        fontSize: 14,
                      ),
                ),
                const SizedBox(height: 2),
                Text(
                  leaveTypeName,
                  style: Theme.of(context).textTheme.bodyMedium?.copyWith(
                        color: AppTheme.warning,
                        fontSize: 12,
                      ),
                ),
                const SizedBox(height: 2),
                Text(
                  '${_shortDate(startDate)} – ${_shortDate(endDate)}',
                  style: Theme.of(context).textTheme.bodyMedium?.copyWith(
                        fontSize: 11,
                        color: AppTheme.textMuted,
                      ),
                ),
              ],
            ),
          ),
          // Days badge
          if (days != null)
            Container(
              padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 4),
              decoration: BoxDecoration(
                color: AppTheme.primary.withValues(alpha: 0.12),
                borderRadius: BorderRadius.circular(20),
                border: Border.all(color: AppTheme.primary.withValues(alpha: 0.3)),
              ),
              child: Text(
                '$days d',
                style: const TextStyle(
                  color: AppTheme.primary,
                  fontSize: 12,
                  fontWeight: FontWeight.bold,
                ),
              ),
            ),
        ],
      ),
    );
  }
}

// ────────────────────────────────────────────────────────────────────────────
// Empty & Error states for approvals
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
          const Icon(Icons.check_circle_outline, color: AppTheme.success, size: 40),
          const SizedBox(height: 10),
          Text(
            'No pending approvals',
            style: Theme.of(context).textTheme.bodyMedium?.copyWith(
                  color: AppTheme.textSecondary,
                ),
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
          TextButton(
            onPressed: onRetry,
            child: const Text('Retry'),
          ),
        ],
      ),
    );
  }
}
