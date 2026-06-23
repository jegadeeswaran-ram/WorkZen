import 'package:flutter/material.dart';
import 'package:flutter_animate/flutter_animate.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import 'package:timeago/timeago.dart' as timeago;
import '../../../core/theme/app_theme.dart';
import '../../../core/providers/auth_provider.dart';
import '../providers/super_admin_provider.dart';
import '../widgets/sa_kpi_card.dart';
import '../widgets/sa_stat_chip.dart';
import '../widgets/sa_section_header.dart';

class SaDashboardScreen extends ConsumerWidget {
  const SaDashboardScreen({super.key});

  // ── HELPERS ──────────────────────────────────────────────────────────────

  String _greeting() {
    final h = DateTime.now().hour;
    if (h < 12) return 'Good Morning';
    if (h < 17) return 'Good Afternoon';
    return 'Good Evening';
  }

  String _formatAmount(double amount) {
    if (amount >= 10000000) {
      final cr = amount / 10000000;
      return '${cr.toStringAsFixed(cr % 1 == 0 ? 0 : 1)}Cr';
    }
    if (amount >= 100000) {
      final l = amount / 100000;
      return '${l.toStringAsFixed(l % 1 == 0 ? 0 : 1)}L';
    }
    if (amount >= 1000) {
      final k = amount / 1000;
      return '${k.toStringAsFixed(k % 1 == 0 ? 0 : 1)}K';
    }
    return amount.toStringAsFixed(0);
  }

  Color _severityColor(String severity) {
    switch (severity.toUpperCase()) {
      case 'CRITICAL':
        return AppTheme.danger;
      case 'HIGH':
        return AppTheme.warning;
      case 'MEDIUM':
        return const Color(0xFF60A5FA);
      case 'LOW':
      default:
        return AppTheme.success;
    }
  }

  Color _siteStatusColor(String status) {
    switch (status.toUpperCase()) {
      case 'ACTIVE':
        return AppTheme.success;
      case 'ISSUE':
        return AppTheme.warning;
      case 'INACTIVE':
      default:
        return AppTheme.danger;
    }
  }

  // ── BUILD ─────────────────────────────────────────────────────────────────

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final summaryAsync = ref.watch(saSummaryProvider);
    final sitesAsync = ref.watch(saSitesProvider);
    final complaintsAsync = ref.watch(saRecentComplaintsProvider);
    final authAsync = ref.watch(authStateProvider);

    final userName = authAsync.valueOrNull?.name ?? 'Admin';

    Future<void> onRefresh() async {
      ref.invalidate(saSummaryProvider);
      ref.invalidate(saSitesProvider);
      ref.invalidate(saRecentComplaintsProvider);
    }

    return Scaffold(
      backgroundColor: AppTheme.background,
      body: RefreshIndicator(
        color: AppTheme.primary,
        backgroundColor: AppTheme.surface,
        onRefresh: onRefresh,
        child: CustomScrollView(
          physics: const AlwaysScrollableScrollPhysics(),
          slivers: [
            // ── APP BAR ──────────────────────────────────────────────────
            SliverAppBar(
              pinned: true,
              backgroundColor: AppTheme.surface,
              automaticallyImplyLeading: false,
              elevation: 0,
              titleSpacing: 0,
              title: Padding(
                padding: const EdgeInsets.symmetric(horizontal: 4),
                child: Row(
                  children: [
                    // Hamburger / drawer opener
                    Builder(
                      builder: (ctx) => IconButton(
                        icon: const Icon(
                          Icons.menu,
                          color: AppTheme.textSecondary,
                          size: 22,
                        ),
                        onPressed: () => Scaffold.of(ctx).openDrawer(),
                        splashRadius: 20,
                        tooltip: 'Open menu',
                      ),
                    ),

                    const SizedBox(width: 4),

                    // Greeting column
                    Expanded(
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        mainAxisAlignment: MainAxisAlignment.center,
                        children: [
                          Text(
                            '${_greeting()}, $userName',
                            style: const TextStyle(
                              fontSize: 14,
                              fontWeight: FontWeight.w700,
                              color: AppTheme.textPrimary,
                            ),
                            maxLines: 1,
                            overflow: TextOverflow.ellipsis,
                          ),
                          const Text(
                            'Super Administrator',
                            style: TextStyle(
                              fontSize: 11,
                              color: AppTheme.textMuted,
                              fontWeight: FontWeight.w500,
                            ),
                          ),
                        ],
                      ),
                    ),

                    // Notification bell
                    IconButton(
                      icon: const Icon(
                        Icons.notifications_none_outlined,
                        color: AppTheme.textSecondary,
                        size: 22,
                      ),
                      onPressed: () => context.go('/notifications'),
                      splashRadius: 20,
                      tooltip: 'Notifications',
                    ),
                  ],
                ),
              ),
            ),

            // ── MAIN CONTENT ─────────────────────────────────────────────
            SliverPadding(
              padding: const EdgeInsets.all(16),
              sliver: SliverList(
                delegate: SliverChildListDelegate([
                  summaryAsync.when(
                    loading: () => const _SummaryLoadingShell(),
                    error: (e, _) => _SummaryErrorShell(
                      message: e.toString(),
                      onRetry: () => ref.invalidate(saSummaryProvider),
                    ),
                    data: (summary) => _SummaryContent(
                      summary: summary,
                      formatAmount: _formatAmount,
                    ),
                  ),

                  const SizedBox(height: 24),

                  // ── SITE STATUS SECTION ───────────────────────────────
                  SaSectionHeader(
                    title: 'Site Status',
                    onSeeAll: () => context.go('/sa/sites'),
                  ),
                  const SizedBox(height: 10),
                  sitesAsync.when(
                    loading: () => const _SitesLoadingShell(),
                    error: (e, _) => Padding(
                      padding: const EdgeInsets.symmetric(vertical: 16),
                      child: Center(
                        child: Text(
                          e.toString(),
                          style: const TextStyle(
                            color: AppTheme.textMuted,
                            fontSize: 13,
                          ),
                        ),
                      ),
                    ),
                    data: (sites) => SizedBox(
                      height: 200,
                      child: sites.isEmpty
                          ? const Center(
                              child: Text(
                                'No sites available',
                                style: TextStyle(
                                  color: AppTheme.textMuted,
                                  fontSize: 13,
                                ),
                              ),
                            )
                          : ListView.builder(
                              scrollDirection: Axis.horizontal,
                              physics: const BouncingScrollPhysics(),
                              itemCount: sites.length,
                              itemBuilder: (ctx, i) => _SiteStatusCard(
                                site: sites[i],
                                siteStatusColor: _siteStatusColor,
                              ),
                            ),
                    ),
                  ),

                  const SizedBox(height: 24),

                  // ── RECENT COMPLAINTS SECTION ─────────────────────────
                  SaSectionHeader(
                    title: 'Recent Complaints',
                    onSeeAll: () => context.go('/sa/complaints'),
                  ),
                  const SizedBox(height: 10),
                  complaintsAsync.when(
                    loading: () => const _ComplaintsLoadingShell(),
                    error: (e, _) => Padding(
                      padding: const EdgeInsets.symmetric(vertical: 16),
                      child: Center(
                        child: Text(
                          e.toString(),
                          style: const TextStyle(
                            color: AppTheme.textMuted,
                            fontSize: 13,
                          ),
                        ),
                      ),
                    ),
                    data: (complaints) => complaints.isEmpty
                        ? const Padding(
                            padding: EdgeInsets.symmetric(vertical: 16),
                            child: Center(
                              child: Text(
                                'No recent complaints',
                                style: TextStyle(
                                  color: AppTheme.textMuted,
                                  fontSize: 13,
                                ),
                              ),
                            ),
                          )
                        : Column(
                            children: complaints
                                .take(3)
                                .map(
                                  (c) => _ComplaintCard(
                                    complaint: c,
                                    severityColor: _severityColor,
                                  ),
                                )
                                .toList(),
                          ),
                  ),

                  const SizedBox(height: 24),
                ]),
              ),
            ),
          ],
        ),
      ),
    );
  }
}

// ── SUMMARY CONTENT ───────────────────────────────────────────────────────────

class _SummaryContent extends StatelessWidget {
  const _SummaryContent({
    required this.summary,
    required this.formatAmount,
  });

  final SaSummary summary;
  final String Function(double) formatAmount;

  @override
  Widget build(BuildContext context) {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        // Alerts banner
        if (summary.overdueCompliance > 0 || summary.openIssues > 0) ...[
          _AlertsBanner(summary: summary),
          const SizedBox(height: 16),
        ],

        // KPI grid
        GridView.count(
          crossAxisCount: 2,
          childAspectRatio: 1.1,
          crossAxisSpacing: 10,
          mainAxisSpacing: 10,
          shrinkWrap: true,
          physics: const NeverScrollableScrollPhysics(),
          children: [
            SaKpiCard(
              label: 'Total Employees',
              value: summary.totalEmployees.toString(),
              icon: Icons.people_outlined,
              color: AppTheme.primary,
            ),
            SaKpiCard(
              label: 'Active Sites',
              value: summary.activeSites.toString(),
              icon: Icons.location_city_outlined,
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
              value: '₹${formatAmount(summary.monthlyBilling)}',
              icon: Icons.currency_rupee,
              color: const Color(0xFFF59E0B),
            ),
            SaKpiCard(
              label: 'Open Issues',
              value: summary.openIssues.toString(),
              icon: Icons.warning_amber_outlined,
              color: summary.openIssues > 0 ? AppTheme.danger : AppTheme.success,
            ),
            SaKpiCard(
              label: 'Compliance Due',
              value: summary.overdueCompliance.toString(),
              icon: Icons.check_circle_outline,
              color: summary.overdueCompliance > 0
                  ? AppTheme.danger
                  : AppTheme.success,
            ),
          ],
        ),
      ],
    );
  }
}

// ── ALERTS BANNER ─────────────────────────────────────────────────────────────

class _AlertsBanner extends StatelessWidget {
  const _AlertsBanner({required this.summary});

  final SaSummary summary;

  @override
  Widget build(BuildContext context) {
    final String message;
    if (summary.overdueCompliance > 0 && summary.openIssues > 0) {
      message =
          '${summary.overdueCompliance} compliance items overdue · ${summary.openIssues} open issues require attention';
    } else if (summary.overdueCompliance > 0) {
      message = '${summary.overdueCompliance} compliance items overdue';
    } else {
      message = '${summary.openIssues} open issues require attention';
    }

    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 12),
      decoration: BoxDecoration(
        color: AppTheme.warning.withValues(alpha: 0.1),
        borderRadius: BorderRadius.circular(12),
        border: Border.all(
          color: AppTheme.warning.withValues(alpha: 0.3),
          width: 1,
        ),
      ),
      child: Row(
        children: [
          const Icon(
            Icons.warning_amber_rounded,
            size: 16,
            color: AppTheme.warning,
          ),
          const SizedBox(width: 8),
          Expanded(
            child: Text(
              message,
              style: const TextStyle(
                fontSize: 12,
                fontWeight: FontWeight.w500,
                color: AppTheme.warning,
              ),
            ),
          ),
        ],
      ),
    )
        .animate()
        .fadeIn(duration: 300.ms)
        .slideY(begin: -0.1, duration: 300.ms);
  }
}

// ── SITE STATUS CARD ──────────────────────────────────────────────────────────

class _SiteStatusCard extends StatelessWidget {
  const _SiteStatusCard({
    required this.site,
    required this.siteStatusColor,
  });

  final SaSite site;
  final Color Function(String) siteStatusColor;

  @override
  Widget build(BuildContext context) {
    final borderColor = siteStatusColor(site.status);

    return GestureDetector(
      onTap: () => context.go('/sa/sites/${site.id}'),
      child: Container(
        width: 160,
        margin: const EdgeInsets.only(right: 10),
        padding: const EdgeInsets.all(12),
        decoration: BoxDecoration(
          color: AppTheme.surfaceVariant,
          borderRadius: BorderRadius.circular(14),
          border: Border.all(color: borderColor.withValues(alpha: 0.5), width: 1.5),
        ),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            // Site name + status chip
            Row(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Expanded(
                  child: Text(
                    site.name,
                    style: const TextStyle(
                      fontSize: 13,
                      fontWeight: FontWeight.w700,
                      color: AppTheme.textPrimary,
                    ),
                    maxLines: 2,
                    overflow: TextOverflow.ellipsis,
                  ),
                ),
                const SizedBox(width: 4),
                SaStatChip(
                  label: site.status,
                  color: borderColor,
                ),
              ],
            ),

            const SizedBox(height: 8),

            // Supervisor row
            Row(
              children: [
                const Icon(
                  Icons.person_outline,
                  size: 12,
                  color: AppTheme.textMuted,
                ),
                const SizedBox(width: 4),
                Expanded(
                  child: Text(
                    site.supervisorName ?? 'No supervisor',
                    style: const TextStyle(
                      fontSize: 11,
                      color: AppTheme.textMuted,
                    ),
                    maxLines: 1,
                    overflow: TextOverflow.ellipsis,
                  ),
                ),
              ],
            ),

            const SizedBox(height: 6),

            // Employee count
            Row(
              children: [
                const Icon(
                  Icons.people_outline,
                  size: 12,
                  color: AppTheme.textMuted,
                ),
                const SizedBox(width: 4),
                Text(
                  '${site.employeeCount} employees',
                  style: const TextStyle(
                    fontSize: 11,
                    color: AppTheme.textSecondary,
                  ),
                ),
              ],
            ),

            const SizedBox(height: 8),

            // Attendance bar
            Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Row(
                  mainAxisAlignment: MainAxisAlignment.spaceBetween,
                  children: [
                    const Text(
                      'Attendance',
                      style: TextStyle(
                        fontSize: 10,
                        color: AppTheme.textMuted,
                      ),
                    ),
                    Text(
                      '${site.attendancePercent.toStringAsFixed(0)}%',
                      style: const TextStyle(
                        fontSize: 10,
                        fontWeight: FontWeight.w600,
                        color: AppTheme.textSecondary,
                      ),
                    ),
                  ],
                ),
                const SizedBox(height: 4),
                ClipRRect(
                  borderRadius: BorderRadius.circular(4),
                  child: LinearProgressIndicator(
                    value: (site.attendancePercent / 100).clamp(0.0, 1.0),
                    backgroundColor: AppTheme.border,
                    color: AppTheme.success,
                    minHeight: 4,
                  ),
                ),
              ],
            ),

            const Spacer(),

            // Tap hint
            const Text(
              'Tap to view',
              style: TextStyle(
                fontSize: 10,
                color: AppTheme.textMuted,
              ),
            ),
          ],
        ),
      )
          .animate()
          .fadeIn(duration: 350.ms)
          .slideX(begin: 0.08, duration: 300.ms),
    );
  }
}

// ── COMPLAINT CARD ────────────────────────────────────────────────────────────

class _ComplaintCard extends StatelessWidget {
  const _ComplaintCard({
    required this.complaint,
    required this.severityColor,
  });

  final SaSiteComplaint complaint;
  final Color Function(String) severityColor;

  String _statusColor(String status) => status.toUpperCase();

  Color _resolveStatusColor(String status) {
    switch (status.toUpperCase()) {
      case 'RESOLVED':
        return AppTheme.success;
      case 'OPEN':
        return AppTheme.danger;
      case 'IN_PROGRESS':
      case 'INPROGRESS':
        return AppTheme.warning;
      default:
        return AppTheme.textMuted;
    }
  }

  @override
  Widget build(BuildContext context) {
    final dotColor = severityColor(complaint.severity);
    DateTime? parsedDate;
    try {
      parsedDate = DateTime.parse(complaint.createdAt);
    } catch (_) {}

    return Container(
      margin: const EdgeInsets.only(bottom: 10),
      padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 12),
      decoration: BoxDecoration(
        color: AppTheme.surfaceVariant,
        borderRadius: BorderRadius.circular(12),
        border: Border.all(color: AppTheme.border, width: 1),
      ),
      child: Row(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          // Severity dot
          Padding(
            padding: const EdgeInsets.only(top: 2),
            child: Text(
              '●',
              style: TextStyle(
                fontSize: 12,
                color: dotColor,
              ),
            ),
          ),
          const SizedBox(width: 10),

          // Title + status
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(
                  complaint.title,
                  style: const TextStyle(
                    fontSize: 13,
                    fontWeight: FontWeight.w600,
                    color: AppTheme.textPrimary,
                  ),
                  maxLines: 2,
                  overflow: TextOverflow.ellipsis,
                ),
                const SizedBox(height: 6),
                Row(
                  children: [
                    SaStatChip(
                      label: _statusColor(complaint.status),
                      color: _resolveStatusColor(complaint.status),
                    ),
                  ],
                ),
              ],
            ),
          ),

          // Time ago
          if (parsedDate != null) ...[
            const SizedBox(width: 8),
            Text(
              timeago.format(parsedDate, allowFromNow: true),
              style: const TextStyle(
                fontSize: 11,
                color: AppTheme.textMuted,
              ),
            ),
          ],
        ],
      ),
    )
        .animate()
        .fadeIn(duration: 300.ms)
        .slideY(begin: 0.05, duration: 280.ms);
  }
}

// ── LOADING / ERROR SHELLS ────────────────────────────────────────────────────

class _SummaryLoadingShell extends StatelessWidget {
  const _SummaryLoadingShell();

  @override
  Widget build(BuildContext context) {
    return const Center(
      child: Padding(
        padding: EdgeInsets.symmetric(vertical: 32),
        child: CircularProgressIndicator(color: AppTheme.primary),
      ),
    );
  }
}

class _SummaryErrorShell extends StatelessWidget {
  const _SummaryErrorShell({
    required this.message,
    required this.onRetry,
  });

  final String message;
  final VoidCallback onRetry;

  @override
  Widget build(BuildContext context) {
    return Center(
      child: Padding(
        padding: const EdgeInsets.symmetric(vertical: 32),
        child: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            const Icon(
              Icons.error_outline,
              color: AppTheme.danger,
              size: 40,
            ),
            const SizedBox(height: 10),
            Text(
              message,
              textAlign: TextAlign.center,
              style: const TextStyle(
                color: AppTheme.textMuted,
                fontSize: 13,
              ),
            ),
            const SizedBox(height: 14),
            ElevatedButton(
              onPressed: onRetry,
              child: const Text('Retry'),
            ),
          ],
        ),
      ),
    );
  }
}

class _SitesLoadingShell extends StatelessWidget {
  const _SitesLoadingShell();

  @override
  Widget build(BuildContext context) {
    return const SizedBox(
      height: 200,
      child: Center(
        child: CircularProgressIndicator(color: AppTheme.primary),
      ),
    );
  }
}

class _ComplaintsLoadingShell extends StatelessWidget {
  const _ComplaintsLoadingShell();

  @override
  Widget build(BuildContext context) {
    return const Padding(
      padding: EdgeInsets.symmetric(vertical: 24),
      child: Center(
        child: CircularProgressIndicator(color: AppTheme.primary),
      ),
    );
  }
}
