import 'package:flutter/material.dart';
import 'package:flutter_animate/flutter_animate.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:timeago/timeago.dart' as timeago;
import '../../../core/theme/app_theme.dart';
import '../providers/super_admin_provider.dart';
import '../widgets/sa_stat_chip.dart';
import '../widgets/sa_info_row.dart';

// ── SCREEN ────────────────────────────────────────────────────────────────────

class SaSiteDetailScreen extends ConsumerStatefulWidget {
  final String siteId;

  const SaSiteDetailScreen({super.key, required this.siteId});

  @override
  ConsumerState<SaSiteDetailScreen> createState() =>
      _SaSiteDetailScreenState();
}

class _SaSiteDetailScreenState extends ConsumerState<SaSiteDetailScreen> {
  int _tabIndex = 0;

  static const _tabs = [
    'Overview',
    'Employees',
    'Supervisor',
    'Complaints',
    'Activity',
  ];

  Color _statusColor(String status) {
    switch (status.toUpperCase()) {
      case 'ACTIVE':
      case 'PRESENT':
        return AppTheme.success;
      case 'ISSUE':
      case 'ABSENT':
        return AppTheme.danger;
      case 'ON_LEAVE':
        return AppTheme.warning;
      default:
        return AppTheme.textMuted;
    }
  }

  Color _severityColor(String severity) {
    switch (severity.toUpperCase()) {
      case 'CRITICAL':
        return AppTheme.danger;
      case 'HIGH':
        return AppTheme.warning;
      case 'MEDIUM':
        return const Color(0xFF60A5FA);
      default:
        return AppTheme.success;
    }
  }

  @override
  Widget build(BuildContext context) {
    final detailAsync = ref.watch(saSiteDetailProvider(widget.siteId));

    return Scaffold(
      backgroundColor: AppTheme.background,
      body: detailAsync.when(
        loading: () => const Center(
          child: CircularProgressIndicator(color: AppTheme.primary),
        ),
        error: (e, _) => _DetailError(
          message: e.toString(),
          onRetry: () => ref.invalidate(saSiteDetailProvider(widget.siteId)),
          onBack: () => Navigator.of(context).pop(),
        ),
        data: (detail) {
          final complaints = (detail['complaints'] as List)
              .map((e) => SaSiteComplaint.fromJson(e as Map<String, dynamic>))
              .toList();
          final activityLogs = (detail['activityLogs'] as List)
              .map((e) => SaActivityLog.fromJson(e as Map<String, dynamic>))
              .toList();
          final employees = detail['employees'] as List;
          final attendance =
              (detail['attendance'] as Map<String, dynamic>?) ?? {};

          final site = ref
                  .watch(saSitesProvider)
                  .value
                  ?.firstWhere(
                    (s) => s.id == widget.siteId,
                    orElse: SaSite.placeholder,
                  ) ??
              SaSite.placeholder();

          return Column(
            children: [
              // ── HEADER ─────────────────────────────────────────────────
              _SiteHeader(
                site: site,
                tabIndex: _tabIndex,
                tabs: _tabs,
                statusColor: _statusColor,
                onTabChanged: (i) => setState(() => _tabIndex = i),
                onBack: () => Navigator.of(context).pop(),
              ),

              // ── TAB CONTENT ────────────────────────────────────────────
              Expanded(
                child: IndexedStack(
                  index: _tabIndex,
                  children: [
                    _OverviewTab(
                      site: site,
                      attendance: attendance,
                      complaintCount: complaints.length,
                      activityCount: activityLogs.length,
                    ),
                    _EmployeesTab(employees: employees),
                    _SupervisorTab(site: site),
                    _ComplaintsTab(
                      complaints: complaints,
                      severityColor: _severityColor,
                      statusColor: _statusColor,
                    ),
                    _ActivityTab(activityLogs: activityLogs),
                  ],
                ),
              ),
            ],
          );
        },
      ),
    );
  }
}

// ── HEADER ────────────────────────────────────────────────────────────────────

class _SiteHeader extends StatelessWidget {
  const _SiteHeader({
    required this.site,
    required this.tabIndex,
    required this.tabs,
    required this.statusColor,
    required this.onTabChanged,
    required this.onBack,
  });

  final SaSite site;
  final int tabIndex;
  final List<String> tabs;
  final Color Function(String) statusColor;
  final ValueChanged<int> onTabChanged;
  final VoidCallback onBack;

  @override
  Widget build(BuildContext context) {
    final topPad = MediaQuery.of(context).padding.top;
    return Container(
      color: AppTheme.surface,
      padding: EdgeInsets.fromLTRB(16, topPad + 8, 16, 0),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          // Title row
          Row(
            crossAxisAlignment: CrossAxisAlignment.center,
            children: [
              InkWell(
                onTap: onBack,
                borderRadius: BorderRadius.circular(20),
                child: const Padding(
                  padding: EdgeInsets.all(4),
                  child: Icon(Icons.arrow_back, color: Colors.white, size: 22),
                ),
              ),
              const SizedBox(width: 8),
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(
                      site.name,
                      style: const TextStyle(
                        fontSize: 18,
                        fontWeight: FontWeight.w700,
                        color: AppTheme.textPrimary,
                      ),
                      maxLines: 1,
                      overflow: TextOverflow.ellipsis,
                    ),
                    if (site.address.isNotEmpty) ...[
                      const SizedBox(height: 2),
                      Row(
                        children: [
                          const Icon(
                            Icons.location_on_outlined,
                            size: 12,
                            color: AppTheme.textMuted,
                          ),
                          const SizedBox(width: 3),
                          Expanded(
                            child: Text(
                              site.address,
                              style: const TextStyle(
                                fontSize: 12,
                                color: AppTheme.textMuted,
                              ),
                              maxLines: 1,
                              overflow: TextOverflow.ellipsis,
                            ),
                          ),
                        ],
                      ),
                    ],
                  ],
                ),
              ),
              const SizedBox(width: 8),
              SaStatChip(
                label: site.status,
                color: statusColor(site.status),
              ),
            ],
          ),

          const SizedBox(height: 12),

          // Tab bar
          SingleChildScrollView(
            scrollDirection: Axis.horizontal,
            child: Row(
              children: List.generate(tabs.length, (i) {
                final selected = tabIndex == i;
                return InkWell(
                  onTap: () => onTabChanged(i),
                  child: Container(
                    padding: const EdgeInsets.symmetric(
                      horizontal: 14,
                      vertical: 8,
                    ),
                    decoration: BoxDecoration(
                      border: Border(
                        bottom: BorderSide(
                          color:
                              selected ? AppTheme.primary : Colors.transparent,
                          width: 2,
                        ),
                      ),
                    ),
                    child: Text(
                      tabs[i],
                      style: TextStyle(
                        fontSize: 13,
                        fontWeight: FontWeight.w600,
                        color: selected
                            ? AppTheme.primary
                            : AppTheme.textMuted,
                      ),
                    ),
                  ),
                );
              }),
            ),
          ),
        ],
      ),
    );
  }
}

// ── TAB 0: OVERVIEW ───────────────────────────────────────────────────────────

class _OverviewTab extends StatelessWidget {
  const _OverviewTab({
    required this.site,
    required this.attendance,
    required this.complaintCount,
    required this.activityCount,
  });

  final SaSite site;
  final Map<String, dynamic> attendance;
  final int complaintCount;
  final int activityCount;

  @override
  Widget build(BuildContext context) {
    final total = _toInt(attendance['total'] ?? site.employeeCount);
    final present = _toInt(attendance['present']);
    final absent = _toInt(attendance['absent']);
    final onLeave = _toInt(attendance['onLeave']);
    final percent = total > 0 ? (present / total).clamp(0.0, 1.0) : 0.0;

    return SingleChildScrollView(
      padding: const EdgeInsets.all(16),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          // Attendance card
          Container(
            padding: const EdgeInsets.all(16),
            decoration: BoxDecoration(
              color: AppTheme.surfaceVariant,
              borderRadius: BorderRadius.circular(14),
              border: Border.all(color: AppTheme.border),
            ),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Row(
                  children: [
                    const Text(
                      "Today's Attendance",
                      style: TextStyle(
                        fontSize: 13,
                        fontWeight: FontWeight.w600,
                        color: AppTheme.textPrimary,
                      ),
                    ),
                    const Spacer(),
                    Container(
                      padding: const EdgeInsets.symmetric(
                        horizontal: 10,
                        vertical: 4,
                      ),
                      decoration: BoxDecoration(
                        color: AppTheme.primary.withValues(alpha: 0.12),
                        borderRadius: BorderRadius.circular(12),
                      ),
                      child: Text(
                        '$present/$total',
                        style: const TextStyle(
                          fontSize: 12,
                          fontWeight: FontWeight.w700,
                          color: AppTheme.primary,
                        ),
                      ),
                    ),
                  ],
                ),
                const SizedBox(height: 10),
                ClipRRect(
                  borderRadius: BorderRadius.circular(4),
                  child: LinearProgressIndicator(
                    value: percent,
                    backgroundColor: AppTheme.border,
                    color: AppTheme.success,
                    minHeight: 8,
                  ),
                ),
                const SizedBox(height: 12),
                Row(
                  children: [
                    _AttChip(label: 'Present $present', color: AppTheme.success),
                    const SizedBox(width: 8),
                    _AttChip(label: 'Absent $absent', color: AppTheme.danger),
                    const SizedBox(width: 8),
                    _AttChip(
                      label: 'On Leave $onLeave',
                      color: AppTheme.warning,
                    ),
                  ],
                ),
              ],
            ),
          )
              .animate()
              .fadeIn(duration: 300.ms)
              .slideY(begin: 0.05, duration: 280.ms),

          const SizedBox(height: 16),

          // Count cards row
          Row(
            children: [
              Expanded(
                child: _CountCard(
                  label: 'Complaints',
                  count: complaintCount,
                  icon: Icons.report_problem_outlined,
                  color: AppTheme.danger,
                ),
              ),
              const SizedBox(width: 12),
              Expanded(
                child: _CountCard(
                  label: 'Activity Logs',
                  count: activityCount,
                  icon: Icons.assignment_outlined,
                  color: AppTheme.primary,
                ),
              ),
            ],
          )
              .animate()
              .fadeIn(duration: 350.ms, delay: 80.ms)
              .slideY(begin: 0.05, duration: 280.ms),
        ],
      ),
    );
  }

  static int _toInt(dynamic v) {
    if (v == null) return 0;
    if (v is int) return v;
    if (v is double) return v.toInt();
    return int.tryParse(v.toString()) ?? 0;
  }
}

class _AttChip extends StatelessWidget {
  const _AttChip({required this.label, required this.color});

  final String label;
  final Color color;

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 5),
      decoration: BoxDecoration(
        color: color.withValues(alpha: 0.12),
        borderRadius: BorderRadius.circular(20),
        border: Border.all(color: color.withValues(alpha: 0.3)),
      ),
      child: Text(
        label,
        style: TextStyle(
          fontSize: 11,
          fontWeight: FontWeight.w600,
          color: color,
        ),
      ),
    );
  }
}

class _CountCard extends StatelessWidget {
  const _CountCard({
    required this.label,
    required this.count,
    required this.icon,
    required this.color,
  });

  final String label;
  final int count;
  final IconData icon;
  final Color color;

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.all(16),
      decoration: BoxDecoration(
        color: color.withValues(alpha: 0.08),
        borderRadius: BorderRadius.circular(14),
        border: Border.all(color: color.withValues(alpha: 0.2)),
      ),
      child: Row(
        children: [
          Icon(icon, color: color, size: 26),
          const SizedBox(width: 12),
          Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Text(
                count.toString(),
                style: TextStyle(
                  fontSize: 22,
                  fontWeight: FontWeight.w800,
                  color: color,
                ),
              ),
              Text(
                label,
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

// ── TAB 1: EMPLOYEES ─────────────────────────────────────────────────────────

class _EmployeesTab extends StatelessWidget {
  const _EmployeesTab({required this.employees});

  final List<dynamic> employees;

  @override
  Widget build(BuildContext context) {
    if (employees.isEmpty) {
      return const _TabEmptyState(
        icon: Icons.people_outline,
        message: 'No employees at this site',
      );
    }

    final parsed = employees
        .map((e) => SaSiteEmployee.fromJson(e as Map<String, dynamic>))
        .toList();

    return ListView.builder(
      padding: const EdgeInsets.symmetric(vertical: 8),
      itemCount: parsed.length,
      itemBuilder: (ctx, i) {
        final emp = parsed[i];
        return _EmployeeCard(employee: emp)
            .animate()
            .fadeIn(duration: 280.ms, delay: (i * 35).ms)
            .slideY(begin: 0.05, duration: 260.ms);
      },
    );
  }
}

class _EmployeeCard extends StatelessWidget {
  const _EmployeeCard({required this.employee});

  final SaSiteEmployee employee;

  Color get _statusColor {
    switch (employee.status) {
      case 'PRESENT':
        return AppTheme.success;
      case 'ABSENT':
        return AppTheme.danger;
      case 'ON_LEAVE':
        return AppTheme.warning;
      default:
        return AppTheme.textMuted;
    }
  }

  String get _initial =>
      employee.name.isNotEmpty ? employee.name[0].toUpperCase() : '?';

  @override
  Widget build(BuildContext context) {
    return Container(
      margin: const EdgeInsets.symmetric(horizontal: 16, vertical: 5),
      padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 12),
      decoration: BoxDecoration(
        color: AppTheme.surfaceVariant,
        borderRadius: BorderRadius.circular(12),
        border: Border.all(color: AppTheme.border),
      ),
      child: Row(
        children: [
          // Avatar
          Container(
            width: 40,
            height: 40,
            decoration: BoxDecoration(
              gradient: LinearGradient(
                colors: [
                  AppTheme.primary.withValues(alpha: 0.7),
                  AppTheme.primary,
                ],
                begin: Alignment.topLeft,
                end: Alignment.bottomRight,
              ),
              shape: BoxShape.circle,
            ),
            child: Center(
              child: Text(
                _initial,
                style: const TextStyle(
                  fontSize: 16,
                  fontWeight: FontWeight.w700,
                  color: Colors.white,
                ),
              ),
            ),
          ),
          const SizedBox(width: 12),

          // Name + designation
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(
                  employee.name.isEmpty ? 'Unknown' : employee.name,
                  style: const TextStyle(
                    fontSize: 14,
                    fontWeight: FontWeight.w600,
                    color: AppTheme.textPrimary,
                  ),
                ),
                const SizedBox(height: 2),
                Text(
                  employee.designation.isEmpty
                      ? 'No designation'
                      : employee.designation,
                  style: const TextStyle(
                    fontSize: 12,
                    color: AppTheme.textMuted,
                  ),
                ),
                if (employee.status == 'PRESENT' &&
                    employee.checkInTime != null) ...[
                  const SizedBox(height: 2),
                  Text(
                    'In: ${_formatTime(employee.checkInTime!)}',
                    style: const TextStyle(
                      fontSize: 11,
                      color: AppTheme.success,
                    ),
                  ),
                ],
              ],
            ),
          ),

          // Status chip
          SaStatChip(label: employee.status, color: _statusColor),
        ],
      ),
    );
  }

  String _formatTime(String raw) {
    try {
      final dt = DateTime.parse(raw);
      final h = dt.hour.toString().padLeft(2, '0');
      final m = dt.minute.toString().padLeft(2, '0');
      return '$h:$m';
    } catch (_) {
      // If raw is already HH:mm format
      return raw.length > 5 ? raw.substring(0, 5) : raw;
    }
  }
}

// ── TAB 2: SUPERVISOR ────────────────────────────────────────────────────────

class _SupervisorTab extends StatelessWidget {
  const _SupervisorTab({required this.site});

  final SaSite site;

  String get _initial =>
      (site.supervisorName?.isNotEmpty == true)
          ? site.supervisorName![0].toUpperCase()
          : '?';

  @override
  Widget build(BuildContext context) {
    if (site.supervisorName == null || site.supervisorName!.isEmpty) {
      return const _TabEmptyState(
        icon: Icons.person_off_outlined,
        message: 'No supervisor assigned',
      );
    }

    return SingleChildScrollView(
      padding: const EdgeInsets.all(16),
      child: Container(
        padding: const EdgeInsets.all(16),
        decoration: BoxDecoration(
          color: AppTheme.surfaceVariant,
          borderRadius: BorderRadius.circular(14),
          border: Border.all(color: AppTheme.border),
        ),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            // Avatar + name row
            Row(
              children: [
                Container(
                  width: 52,
                  height: 52,
                  decoration: BoxDecoration(
                    gradient: LinearGradient(
                      colors: [
                        AppTheme.primary.withValues(alpha: 0.7),
                        AppTheme.primary,
                      ],
                      begin: Alignment.topLeft,
                      end: Alignment.bottomRight,
                    ),
                    shape: BoxShape.circle,
                  ),
                  child: Center(
                    child: Text(
                      _initial,
                      style: const TextStyle(
                        fontSize: 20,
                        fontWeight: FontWeight.w700,
                        color: Colors.white,
                      ),
                    ),
                  ),
                ),
                const SizedBox(width: 14),
                Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(
                      site.supervisorName!,
                      style: const TextStyle(
                        fontSize: 16,
                        fontWeight: FontWeight.w700,
                        color: AppTheme.textPrimary,
                      ),
                    ),
                    const Text(
                      'Site Supervisor',
                      style: TextStyle(
                        fontSize: 12,
                        color: AppTheme.textMuted,
                      ),
                    ),
                  ],
                ),
              ],
            ),

            const SizedBox(height: 12),

            // Phone
            if (site.supervisorPhone != null) ...[
              Row(
                children: [
                  const Icon(
                    Icons.phone_outlined,
                    size: 16,
                    color: AppTheme.textMuted,
                  ),
                  const SizedBox(width: 8),
                  Text(
                    site.supervisorPhone!,
                    style: const TextStyle(
                      fontSize: 13,
                      color: AppTheme.textSecondary,
                    ),
                  ),
                  const Spacer(),
                  TextButton(
                    onPressed: () {},
                    style: TextButton.styleFrom(
                      padding: const EdgeInsets.symmetric(
                        horizontal: 12,
                        vertical: 6,
                      ),
                      minimumSize: Size.zero,
                      tapTargetSize: MaterialTapTargetSize.shrinkWrap,
                      foregroundColor: AppTheme.primary,
                    ),
                    child: const Text(
                      'Call',
                      style: TextStyle(
                        fontSize: 13,
                        fontWeight: FontWeight.w600,
                      ),
                    ),
                  ),
                ],
              ),
              const Divider(color: AppTheme.border, height: 20),
            ],

            SaInfoRow(
              label: 'Employees',
              value: site.employeeCount.toString(),
              icon: Icons.people_outline,
            ),
            SaInfoRow(
              label: 'Site Status',
              value: site.status,
              icon: Icons.info_outline,
            ),
          ],
        ),
      )
          .animate()
          .fadeIn(duration: 300.ms)
          .slideY(begin: 0.05, duration: 280.ms),
    );
  }
}

// ── TAB 3: COMPLAINTS ────────────────────────────────────────────────────────

class _ComplaintsTab extends StatelessWidget {
  const _ComplaintsTab({
    required this.complaints,
    required this.severityColor,
    required this.statusColor,
  });

  final List<SaSiteComplaint> complaints;
  final Color Function(String) severityColor;
  final Color Function(String) statusColor;

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
    if (complaints.isEmpty) {
      return const _TabEmptyState(
        icon: Icons.check_circle_outline,
        message: 'No complaints filed',
      );
    }

    return ListView.builder(
      padding: const EdgeInsets.symmetric(vertical: 8),
      itemCount: complaints.length,
      itemBuilder: (ctx, i) {
        final c = complaints[i];
        final borderColor = severityColor(c.severity);
        DateTime? parsedDate;
        try {
          parsedDate = DateTime.parse(c.createdAt);
        } catch (_) {}

        return Container(
          margin: const EdgeInsets.symmetric(horizontal: 16, vertical: 5),
          padding: const EdgeInsets.all(14),
          decoration: BoxDecoration(
            color: AppTheme.surfaceVariant,
            borderRadius: BorderRadius.circular(12),
            border: Border(
              left: BorderSide(color: borderColor, width: 4),
              top: const BorderSide(color: AppTheme.border),
              right: const BorderSide(color: AppTheme.border),
              bottom: const BorderSide(color: AppTheme.border),
            ),
          ),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Text(
                c.title,
                style: const TextStyle(
                  fontSize: 14,
                  fontWeight: FontWeight.w600,
                  color: AppTheme.textPrimary,
                ),
              ),
              const SizedBox(height: 8),
              Row(
                children: [
                  SaStatChip(label: c.severity, color: borderColor),
                  const SizedBox(width: 8),
                  SaStatChip(
                    label: c.status,
                    color: _resolveStatusColor(c.status),
                  ),
                  const Spacer(),
                  if (parsedDate != null)
                    Text(
                      timeago.format(parsedDate),
                      style: const TextStyle(
                        fontSize: 11,
                        color: AppTheme.textMuted,
                      ),
                    ),
                ],
              ),
            ],
          ),
        )
            .animate()
            .fadeIn(duration: 280.ms, delay: (i * 35).ms)
            .slideY(begin: 0.05, duration: 260.ms);
      },
    );
  }
}

// ── TAB 4: ACTIVITY LOG ──────────────────────────────────────────────────────

class _ActivityTab extends StatelessWidget {
  const _ActivityTab({required this.activityLogs});

  final List<SaActivityLog> activityLogs;

  @override
  Widget build(BuildContext context) {
    if (activityLogs.isEmpty) {
      return const _TabEmptyState(
        icon: Icons.assignment_outlined,
        message: 'No activity logs',
      );
    }

    return ListView.builder(
      padding: const EdgeInsets.symmetric(vertical: 8),
      itemCount: activityLogs.length,
      itemBuilder: (ctx, i) {
        final log = activityLogs[i];
        return _ActivityCard(log: log)
            .animate()
            .fadeIn(duration: 280.ms, delay: (i * 35).ms)
            .slideY(begin: 0.05, duration: 260.ms);
      },
    );
  }
}

class _ActivityCard extends StatelessWidget {
  const _ActivityCard({required this.log});

  final SaActivityLog log;

  String _formatDate(String raw) {
    try {
      final dt = DateTime.parse(raw);
      const months = [
        'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun',
        'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec',
      ];
      return '${dt.day} ${months[dt.month - 1]} ${dt.year}';
    } catch (_) {
      return raw;
    }
  }

  @override
  Widget build(BuildContext context) {
    return Container(
      margin: const EdgeInsets.symmetric(horizontal: 16, vertical: 5),
      padding: const EdgeInsets.all(14),
      decoration: BoxDecoration(
        color: AppTheme.surfaceVariant,
        borderRadius: BorderRadius.circular(12),
        border: Border.all(color: AppTheme.border),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          // Header: date + headcount badge
          Row(
            children: [
              Text(
                _formatDate(log.logDate),
                style: const TextStyle(
                  fontSize: 13,
                  fontWeight: FontWeight.w600,
                  color: AppTheme.textPrimary,
                ),
              ),
              const Spacer(),
              Container(
                padding:
                    const EdgeInsets.symmetric(horizontal: 8, vertical: 3),
                decoration: BoxDecoration(
                  color: AppTheme.primary.withValues(alpha: 0.12),
                  borderRadius: BorderRadius.circular(10),
                ),
                child: Row(
                  mainAxisSize: MainAxisSize.min,
                  children: [
                    const Icon(
                      Icons.people_outline,
                      size: 12,
                      color: AppTheme.primary,
                    ),
                    const SizedBox(width: 4),
                    Text(
                      log.headcount.toString(),
                      style: const TextStyle(
                        fontSize: 11,
                        fontWeight: FontWeight.w600,
                        color: AppTheme.primary,
                      ),
                    ),
                  ],
                ),
              ),
            ],
          ),

          const SizedBox(height: 8),

          // Work done
          Text(
            log.workDone,
            style: const TextStyle(
              fontSize: 13,
              color: AppTheme.textSecondary,
            ),
          ),

          // Incident
          if (log.hasIncident) ...[
            const SizedBox(height: 8),
            Row(
              children: [
                const Icon(
                  Icons.warning_amber_rounded,
                  size: 14,
                  color: AppTheme.warning,
                ),
                const SizedBox(width: 6),
                Expanded(
                  child: Text(
                    log.incidentType ?? 'Incident reported',
                    style: const TextStyle(
                      fontSize: 12,
                      color: AppTheme.warning,
                      fontWeight: FontWeight.w500,
                    ),
                  ),
                ),
              ],
            ),
          ],
        ],
      ),
    );
  }
}

// ── SHARED HELPERS ────────────────────────────────────────────────────────────

class _TabEmptyState extends StatelessWidget {
  const _TabEmptyState({required this.icon, required this.message});

  final IconData icon;
  final String message;

  @override
  Widget build(BuildContext context) {
    return Center(
      child: Column(
        mainAxisSize: MainAxisSize.min,
        children: [
          Icon(icon, size: 56, color: AppTheme.textMuted),
          const SizedBox(height: 12),
          Text(
            message,
            style: const TextStyle(
              fontSize: 15,
              color: AppTheme.textMuted,
              fontWeight: FontWeight.w500,
            ),
          ),
        ],
      ),
    );
  }
}

class _DetailError extends StatelessWidget {
  const _DetailError({
    required this.message,
    required this.onRetry,
    required this.onBack,
  });

  final String message;
  final VoidCallback onRetry;
  final VoidCallback onBack;

  @override
  Widget build(BuildContext context) {
    final topPad = MediaQuery.of(context).padding.top;
    return Padding(
      padding: EdgeInsets.only(top: topPad),
      child: Column(
        children: [
          // Minimal back row
          Row(
            children: [
              IconButton(
                icon: const Icon(
                  Icons.arrow_back,
                  color: AppTheme.textSecondary,
                ),
                onPressed: onBack,
              ),
            ],
          ),
          Expanded(
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
      ),
    );
  }
}
