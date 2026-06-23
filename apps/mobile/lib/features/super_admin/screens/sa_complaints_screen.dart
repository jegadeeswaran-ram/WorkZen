import 'package:flutter/material.dart';
import 'package:flutter_animate/flutter_animate.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:timeago/timeago.dart' as timeago;
import '../../../core/theme/app_theme.dart';
import '../providers/super_admin_provider.dart';
import '../widgets/sa_stat_chip.dart';

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

Color _statusColor(String status) {
  switch (status.toUpperCase()) {
    case 'OPEN':
      return AppTheme.danger;
    case 'IN_PROGRESS':
      return AppTheme.warning;
    case 'RESOLVED':
      return AppTheme.success;
    default:
      return AppTheme.textMuted;
  }
}

String _timeAgo(String createdAt) {
  if (createdAt.isEmpty) return '';
  try {
    final dt = DateTime.parse(createdAt);
    return timeago.format(dt);
  } catch (_) {
    return '';
  }
}

const _severityFilters = ['ALL', 'CRITICAL', 'HIGH', 'MEDIUM', 'LOW'];
const _statusFilters = ['ALL', 'OPEN', 'IN_PROGRESS', 'RESOLVED'];

class SaComplaintsScreen extends ConsumerStatefulWidget {
  const SaComplaintsScreen({super.key});

  @override
  ConsumerState<SaComplaintsScreen> createState() =>
      _SaComplaintsScreenState();
}

class _SaComplaintsScreenState extends ConsumerState<SaComplaintsScreen> {
  String _severityFilter = 'ALL';
  String _statusFilter = 'ALL';

  @override
  Widget build(BuildContext context) {
    final issuesAsync = ref.watch(saIssuesProvider);

    return Scaffold(
      backgroundColor: AppTheme.background,
      appBar: AppBar(
        title: const Text('Complaints'),
        backgroundColor: AppTheme.surface,
      ),
      body: Column(
        children: [
          // Severity filter
          _FilterRow(
            options: _severityFilters,
            selected: _severityFilter,
            onSelected: (v) => setState(() => _severityFilter = v),
            colorOf: _severityColor,
          ),
          // Status filter
          _FilterRow(
            options: _statusFilters,
            selected: _statusFilter,
            onSelected: (v) => setState(() => _statusFilter = v),
            colorOf: (_) => AppTheme.primary,
          ),
          // Complaints list
          Expanded(
            child: issuesAsync.when(
              data: (issues) {
                final filtered = issues.where((issue) {
                  final matchSeverity = _severityFilter == 'ALL' ||
                      issue.severity.toUpperCase() == _severityFilter;
                  final matchStatus = _statusFilter == 'ALL' ||
                      issue.status.toUpperCase() == _statusFilter;
                  return matchSeverity && matchStatus;
                }).toList();

                if (filtered.isEmpty) {
                  return const Center(
                    child: Text(
                      'No complaints found',
                      style: TextStyle(
                          fontSize: 14, color: AppTheme.textMuted),
                    ),
                  );
                }

                return RefreshIndicator(
                  color: AppTheme.primary,
                  onRefresh: () async {
                    ref.invalidate(saIssuesProvider);
                    await ref
                        .read(saIssuesProvider.future)
                        .catchError((_) => <SaIssue>[]);
                  },
                  child: ListView.builder(
                    padding: const EdgeInsets.symmetric(vertical: 6),
                    itemCount: filtered.length,
                    itemBuilder: (context, i) =>
                        _ComplaintCard(issue: filtered[i])
                            .animate()
                            .fadeIn(
                                delay: (i * 30).ms, duration: 250.ms),
                  ),
                );
              },
              loading: () => const Center(
                child: CircularProgressIndicator(color: AppTheme.primary),
              ),
              error: (e, _) => Center(
                child: Padding(
                  padding: const EdgeInsets.all(24),
                  child: Text(
                    e.toString(),
                    style: const TextStyle(
                        fontSize: 13, color: AppTheme.textSecondary),
                    textAlign: TextAlign.center,
                  ),
                ),
              ),
            ),
          ),
        ],
      ),
    );
  }
}

// ── Filter row ────────────────────────────────────────────────────────────────

class _FilterRow extends StatelessWidget {
  const _FilterRow({
    required this.options,
    required this.selected,
    required this.onSelected,
    required this.colorOf,
  });

  final List<String> options;
  final String selected;
  final ValueChanged<String> onSelected;
  final Color Function(String) colorOf;

  @override
  Widget build(BuildContext context) {
    return SizedBox(
      height: 44,
      child: ListView.separated(
        scrollDirection: Axis.horizontal,
        padding:
            const EdgeInsets.symmetric(horizontal: 16, vertical: 6),
        itemCount: options.length,
        separatorBuilder: (_, __) => const SizedBox(width: 8),
        itemBuilder: (context, i) {
          final opt = options[i];
          final isSelected = selected == opt;
          final color = opt == 'ALL' ? AppTheme.primary : colorOf(opt);
          return GestureDetector(
            onTap: () => onSelected(opt),
            child: AnimatedContainer(
              duration: 200.ms,
              padding:
                  const EdgeInsets.symmetric(horizontal: 12, vertical: 5),
              decoration: BoxDecoration(
                color: isSelected
                    ? color.withValues(alpha: 0.15)
                    : AppTheme.surfaceVariant,
                borderRadius: BorderRadius.circular(20),
                border: Border.all(
                  color: isSelected ? color : AppTheme.border,
                ),
              ),
              child: Text(
                opt,
                style: TextStyle(
                  fontSize: 11,
                  fontWeight: FontWeight.w600,
                  color: isSelected ? color : AppTheme.textSecondary,
                ),
              ),
            ),
          );
        },
      ),
    );
  }
}

// ── Complaint card ────────────────────────────────────────────────────────────

class _ComplaintCard extends StatelessWidget {
  const _ComplaintCard({required this.issue});

  final SaIssue issue;

  @override
  Widget build(BuildContext context) {
    final severityColor = _severityColor(issue.severity);
    final timeAgoStr = _timeAgo(issue.createdAt);

    return Container(
      margin: const EdgeInsets.symmetric(horizontal: 16, vertical: 5),
      decoration: BoxDecoration(
        color: AppTheme.surfaceVariant,
        borderRadius: BorderRadius.circular(12),
        border: Border.all(color: AppTheme.border),
      ),
      clipBehavior: Clip.hardEdge,
      child: IntrinsicHeight(
        child: Row(
          crossAxisAlignment: CrossAxisAlignment.stretch,
          children: [
            // Severity left border
            Container(width: 4, color: severityColor),
            Expanded(
              child: Padding(
                padding: const EdgeInsets.all(14),
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Row(
                      children: [
                        SaStatChip(
                            label: issue.severity,
                            color: severityColor),
                        const Spacer(),
                        SaStatChip(
                            label: issue.status,
                            color: _statusColor(issue.status)),
                        if (timeAgoStr.isNotEmpty) ...[
                          const SizedBox(width: 8),
                          Text(
                            timeAgoStr,
                            style: const TextStyle(
                                fontSize: 11,
                                color: AppTheme.textMuted),
                          ),
                        ],
                      ],
                    ),
                    const SizedBox(height: 8),
                    Text(
                      issue.title,
                      style: const TextStyle(
                        fontSize: 14,
                        fontWeight: FontWeight.w600,
                        color: AppTheme.textPrimary,
                      ),
                    ),
                    const SizedBox(height: 6),
                    Row(
                      children: [
                        const Icon(Icons.location_on_outlined,
                            size: 12, color: AppTheme.textMuted),
                        const SizedBox(width: 4),
                        Expanded(
                          child: Text(
                            issue.siteName,
                            style: const TextStyle(
                                fontSize: 12,
                                color: AppTheme.textMuted),
                            overflow: TextOverflow.ellipsis,
                          ),
                        ),
                        const SizedBox(width: 8),
                        const Icon(Icons.person_outline,
                            size: 12, color: AppTheme.textMuted),
                        const SizedBox(width: 4),
                        Text(
                          issue.reportedBy,
                          style: const TextStyle(
                              fontSize: 12,
                              color: AppTheme.textMuted),
                          overflow: TextOverflow.ellipsis,
                        ),
                      ],
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
}
