import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:intl/intl.dart';
import '../../../core/theme/app_theme.dart';
import '../providers/hr_provider.dart';

class HrAttendanceScreen extends ConsumerWidget {
  const HrAttendanceScreen({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final state = ref.watch(hrAttendanceTodayProvider);
    final todayLabel = DateFormat('d MMM yyyy').format(DateTime.now());

    final appBar = AppBar(
      title: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          const Text('Attendance'),
          Text(
            todayLabel,
            style: const TextStyle(
                fontSize: 12,
                color: AppTheme.textMuted,
                fontWeight: FontWeight.normal),
          ),
        ],
      ),
    );

    return state.when(
      loading: () => Scaffold(
        appBar: appBar,
        body: const Center(child: CircularProgressIndicator()),
      ),
      error: (_, __) => Scaffold(
        appBar: appBar,
        body: const Center(child: Text('Unable to load attendance')),
      ),
      data: (records) {
        final present =
            records.where((r) => r.status == 'PRESENT').length;
        final absent =
            records.where((r) => r.status == 'ABSENT').length;
        final late =
            records.where((r) => r.status == 'LATE').length;
        final onLeave =
            records.where((r) => r.status == 'ON_LEAVE').length;

        return Scaffold(
          appBar: appBar,
          body: CustomScrollView(
            slivers: [
              // ── Stats row ────────────────────────────────────────────────
              SliverToBoxAdapter(
                child: Padding(
                  padding: const EdgeInsets.symmetric(
                      horizontal: 16, vertical: 8),
                  child: Row(
                    children: [
                      _StatBox(
                          label: 'Present',
                          value: present,
                          color: AppTheme.success),
                      _StatBox(
                          label: 'Absent',
                          value: absent,
                          color: AppTheme.danger),
                      _StatBox(
                          label: 'Late',
                          value: late,
                          color: AppTheme.warning),
                      _StatBox(
                          label: 'On Leave',
                          value: onLeave,
                          color: AppTheme.primary),
                    ],
                  ),
                ),
              ),
              // ── Records list ─────────────────────────────────────────────
              SliverList(
                delegate: SliverChildBuilderDelegate(
                  (context, i) => _AttendanceCard(record: records[i]),
                  childCount: records.length,
                ),
              ),
            ],
          ),
        );
      },
    );
  }
}

// ── Stat box ──────────────────────────────────────────────────────────────────

class _StatBox extends StatelessWidget {
  const _StatBox({
    required this.label,
    required this.value,
    required this.color,
  });
  final String label;
  final int value;
  final Color color;

  @override
  Widget build(BuildContext context) {
    return Expanded(
      child: Container(
        margin: const EdgeInsets.symmetric(horizontal: 4),
        padding: const EdgeInsets.symmetric(vertical: 10),
        decoration: BoxDecoration(
          color: AppTheme.surfaceVariant,
          borderRadius: BorderRadius.circular(10),
        ),
        child: Column(
          mainAxisAlignment: MainAxisAlignment.center,
          children: [
            Text(
              value.toString(),
              style: TextStyle(
                  fontSize: 20, fontWeight: FontWeight.bold, color: color),
            ),
            Text(
              label,
              style: const TextStyle(
                  fontSize: 11, color: AppTheme.textMuted),
            ),
          ],
        ),
      ),
    );
  }
}

// ── Attendance card ───────────────────────────────────────────────────────────

class _AttendanceCard extends StatelessWidget {
  const _AttendanceCard({required this.record});
  final HrAttendanceRecord record;

  Color _dotColor(String? status) {
    switch (status) {
      case 'PRESENT':
        return AppTheme.success;
      case 'ABSENT':
        return AppTheme.danger;
      case 'LATE':
        return AppTheme.warning;
      case 'ON_LEAVE':
        return AppTheme.primary;
      default:
        return AppTheme.textMuted;
    }
  }

  Color _statusColor(String? status) {
    switch (status) {
      case 'PRESENT':
        return AppTheme.success;
      case 'ABSENT':
        return AppTheme.danger;
      case 'LATE':
        return AppTheme.warning;
      case 'ON_LEAVE':
        return AppTheme.primary;
      default:
        return AppTheme.textMuted;
    }
  }

  @override
  Widget build(BuildContext context) {
    final statusLabel = record.status ?? 'UNKNOWN';
    final chipColor = _statusColor(record.status);

    return Container(
      margin: const EdgeInsets.symmetric(horizontal: 16, vertical: 4),
      padding: const EdgeInsets.all(12),
      decoration: BoxDecoration(
        color: AppTheme.surface,
        borderRadius: BorderRadius.circular(12),
        border: Border.all(color: AppTheme.border),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            children: [
              Container(
                width: 8,
                height: 8,
                decoration: BoxDecoration(
                  color: _dotColor(record.status),
                  shape: BoxShape.circle,
                ),
              ),
              const SizedBox(width: 8),
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(
                      record.employeeName,
                      style: const TextStyle(
                          fontWeight: FontWeight.bold, fontSize: 14),
                    ),
                    Text(
                      record.designation,
                      style: const TextStyle(
                          color: AppTheme.textMuted, fontSize: 12),
                    ),
                  ],
                ),
              ),
              Column(
                crossAxisAlignment: CrossAxisAlignment.end,
                children: [
                  Text(
                    record.checkInTime ?? '—',
                    style: const TextStyle(fontSize: 12),
                  ),
                  Text(
                    record.checkOutTime ?? '—',
                    style: const TextStyle(
                        fontSize: 11, color: AppTheme.textMuted),
                  ),
                ],
              ),
            ],
          ),
          const SizedBox(height: 4),
          _StatusChip(status: statusLabel, color: chipColor),
        ],
      ),
    );
  }
}

// ── Status chip ───────────────────────────────────────────────────────────────

class _StatusChip extends StatelessWidget {
  const _StatusChip({required this.status, required this.color});
  final String status;
  final Color color;

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
      decoration: BoxDecoration(
        color: color.withValues(alpha: 0.15),
        borderRadius: BorderRadius.circular(20),
      ),
      child: Text(
        status,
        style: TextStyle(color: color, fontSize: 11),
      ),
    );
  }
}
