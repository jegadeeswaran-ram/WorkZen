import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../../../core/theme/app_theme.dart';
import '../providers/hr_provider.dart';

class HrLeaveApprovalsScreen extends ConsumerStatefulWidget {
  const HrLeaveApprovalsScreen({super.key});

  @override
  ConsumerState<HrLeaveApprovalsScreen> createState() =>
      _HrLeaveApprovalsScreenState();
}

class _HrLeaveApprovalsScreenState
    extends ConsumerState<HrLeaveApprovalsScreen> {
  String _filter = 'PENDING';

  static const _filters = ['PENDING', 'APPROVED', 'REJECTED', 'ALL'];

  @override
  Widget build(BuildContext context) {
    final leavesAsync = ref.watch(hrAllLeavesProvider);

    return Scaffold(
      appBar: AppBar(title: const Text('Leave Approvals')),
      body: Column(
        children: [
          // ── Filter chips ────────────────────────────────────────────────
          SingleChildScrollView(
            scrollDirection: Axis.horizontal,
            padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 8),
            child: Row(
              children: _filters.map((f) {
                final selected = _filter == f;
                return Padding(
                  padding: const EdgeInsets.only(right: 8),
                  child: GestureDetector(
                    onTap: () => setState(() => _filter = f),
                    child: Container(
                      padding: const EdgeInsets.symmetric(
                          horizontal: 16, vertical: 8),
                      decoration: BoxDecoration(
                        color: selected
                            ? AppTheme.primary
                            : AppTheme.surfaceVariant,
                        borderRadius: BorderRadius.circular(20),
                        border: selected
                            ? null
                            : Border.all(color: AppTheme.border),
                      ),
                      child: Text(
                        f,
                        style: TextStyle(
                          color: selected
                              ? Colors.white
                              : AppTheme.textMuted,
                          fontSize: 13,
                          fontWeight: selected
                              ? FontWeight.w600
                              : FontWeight.normal,
                        ),
                      ),
                    ),
                  ),
                );
              }).toList(),
            ),
          ),
          // ── Leave list ──────────────────────────────────────────────────
          Expanded(
            child: leavesAsync.when(
              loading: () =>
                  const Center(child: CircularProgressIndicator()),
              error: (_, __) =>
                  const Center(child: Text('Unable to load leave requests')),
              data: (all) {
                final leaves = _filter == 'ALL'
                    ? all
                    : all.where((l) => l.status == _filter).toList();
                if (leaves.isEmpty) {
                  return const Center(
                    child: Column(
                      mainAxisSize: MainAxisSize.min,
                      children: [
                        Icon(Icons.event_available,
                            size: 48, color: AppTheme.textMuted),
                        SizedBox(height: 12),
                        Text('No leave requests',
                            style: TextStyle(color: AppTheme.textMuted)),
                      ],
                    ),
                  );
                }
                return ListView.builder(
                  padding: const EdgeInsets.all(12),
                  itemCount: leaves.length,
                  itemBuilder: (context, i) => _LeaveCard(leave: leaves[i]),
                );
              },
            ),
          ),
        ],
      ),
    );
  }
}

// ── Leave card (needs ref for notifier) ──────────────────────────────────────

class _LeaveCard extends ConsumerStatefulWidget {
  const _LeaveCard({required this.leave});
  final HrLeaveRequest leave;

  @override
  ConsumerState<_LeaveCard> createState() => _LeaveCardState();
}

class _LeaveCardState extends ConsumerState<_LeaveCard> {
  bool _loading = false;

  Future<void> _approve() async {
    setState(() => _loading = true);
    try {
      await ref
          .read(hrLeaveNotifierProvider.notifier)
          .approve(widget.leave.id);
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(content: Text('Leave approved')),
        );
      }
    } catch (_) {
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(content: Text('Failed to approve leave')),
        );
      }
    } finally {
      if (mounted) setState(() => _loading = false);
    }
  }

  Future<void> _reject() async {
    setState(() => _loading = true);
    try {
      await ref
          .read(hrLeaveNotifierProvider.notifier)
          .reject(widget.leave.id);
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(content: Text('Leave rejected')),
        );
      }
    } catch (_) {
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(content: Text('Failed to reject leave')),
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

    return Container(
      margin: const EdgeInsets.only(bottom: 8),
      padding: const EdgeInsets.all(16),
      decoration: BoxDecoration(
        color: AppTheme.surface,
        borderRadius: BorderRadius.circular(12),
        border: Border.all(color: AppTheme.border),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          // ── Header row ──────────────────────────────────────────────────
          Row(
            children: [
              CircleAvatar(
                radius: 16,
                backgroundColor: _avatarColor(leave.employeeName),
                child: Text(
                  initials,
                  style: const TextStyle(
                      fontSize: 10,
                      color: Colors.white,
                      fontWeight: FontWeight.bold),
                ),
              ),
              const SizedBox(width: 8),
              Expanded(
                child: Text(
                  leave.employeeName,
                  style: const TextStyle(
                      fontWeight: FontWeight.bold, fontSize: 14),
                ),
              ),
              Container(
                padding:
                    const EdgeInsets.symmetric(horizontal: 8, vertical: 3),
                decoration: BoxDecoration(
                  color: AppTheme.primary.withValues(alpha: 0.15),
                  borderRadius: BorderRadius.circular(20),
                ),
                child: Text(
                  leave.leaveType,
                  style: const TextStyle(
                      color: AppTheme.primary, fontSize: 11),
                ),
              ),
              const SizedBox(width: 8),
              Text(
                '${leave.days} days',
                style: const TextStyle(
                    color: AppTheme.warning,
                    fontSize: 12,
                    fontWeight: FontWeight.bold),
              ),
            ],
          ),
          const SizedBox(height: 6),
          // ── Date range ──────────────────────────────────────────────────
          Text(
            '${leave.startDate} → ${leave.endDate}',
            style: const TextStyle(color: AppTheme.textMuted, fontSize: 12),
          ),
          const SizedBox(height: 4),
          // ── Reason ──────────────────────────────────────────────────────
          Text(
            leave.reason,
            style: const TextStyle(
                color: AppTheme.textMuted,
                fontSize: 12,
                fontStyle: FontStyle.italic),
            maxLines: 2,
            overflow: TextOverflow.ellipsis,
          ),
          const SizedBox(height: 8),
          // ── Actions ──────────────────────────────────────────────────────
          if (leave.status == 'PENDING')
            Row(
              children: [
                Expanded(
                  child: OutlinedButton(
                    style: OutlinedButton.styleFrom(
                      foregroundColor: AppTheme.danger,
                      side: const BorderSide(color: AppTheme.danger),
                    ),
                    onPressed: _loading ? null : _reject,
                    child: _loading
                        ? const SizedBox(
                            width: 12,
                            height: 12,
                            child: CircularProgressIndicator(
                                strokeWidth: 2,
                                color: AppTheme.danger),
                          )
                        : const Text('Reject'),
                  ),
                ),
                const SizedBox(width: 8),
                Expanded(
                  child: ElevatedButton(
                    style: ElevatedButton.styleFrom(
                      backgroundColor: AppTheme.success,
                      foregroundColor: Colors.white,
                    ),
                    onPressed: _loading ? null : _approve,
                    child: _loading
                        ? const SizedBox(
                            width: 12,
                            height: 12,
                            child: CircularProgressIndicator(
                                strokeWidth: 2,
                                color: Colors.white),
                          )
                        : const Text('Approve'),
                  ),
                ),
              ],
            )
          else
            Align(
              alignment: Alignment.centerRight,
              child: _StatusChip(
                status: leave.status,
                color: leave.status == 'APPROVED'
                    ? AppTheme.success
                    : AppTheme.danger,
              ),
            ),
        ],
      ),
    );
  }
}

// ── Shared helpers ────────────────────────────────────────────────────────────

Color _avatarColor(String name) {
  const colors = [
    AppTheme.primary,
    AppTheme.success,
    AppTheme.warning,
    Color(0xFF8B5CF6),
    Color(0xFFEC4899),
  ];
  return colors[name.hashCode.abs() % 5];
}

String _initials(String name) {
  final parts = name.trim().split(RegExp(r'\s+'));
  if (parts.length >= 2) {
    return '${parts[0][0]}${parts[1][0]}'.toUpperCase();
  } else if (parts.isNotEmpty && parts[0].isNotEmpty) {
    return parts[0][0].toUpperCase();
  }
  return '?';
}

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
