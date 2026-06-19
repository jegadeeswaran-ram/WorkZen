import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../../../core/theme/app_theme.dart';
import '../../../core/network/api_client.dart';
import '../providers/supervisor_provider.dart';

// ---------------------------------------------------------------------------
// Date formatting helper
// ---------------------------------------------------------------------------

String _fmtDate(String? iso) {
  if (iso == null) return '—';
  try {
    final d = DateTime.parse(iso);
    const m = [
      'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun',
      'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'
    ];
    return '${d.day} ${m[d.month - 1]} ${d.year}';
  } catch (_) {
    return iso;
  }
}

// ---------------------------------------------------------------------------
// LeaveApprovalsScreen
// ---------------------------------------------------------------------------

class LeaveApprovalsScreen extends ConsumerWidget {
  const LeaveApprovalsScreen({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    return DefaultTabController(
      length: 2,
      child: Scaffold(
        backgroundColor: AppTheme.background,
        appBar: AppBar(
          title: const Text('Leave Approvals'),
          bottom: const TabBar(
            indicatorColor: AppTheme.primary,
            labelColor: AppTheme.primary,
            unselectedLabelColor: AppTheme.textMuted,
            tabs: [
              Tab(text: 'Pending'),
              Tab(text: 'History'),
            ],
          ),
        ),
        body: TabBarView(
          children: [
            _PendingTab(),
            _HistoryTab(),
          ],
        ),
      ),
    );
  }
}

// ---------------------------------------------------------------------------
// Pending Tab
// ---------------------------------------------------------------------------

class _PendingTab extends ConsumerWidget {
  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final async = ref.watch(pendingLeaveRequestsProvider);
    return async.when(
      loading: () => const Center(child: CircularProgressIndicator(color: AppTheme.primary)),
      error: (e, _) => Center(
        child: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            Text('Failed to load', style: TextStyle(color: AppTheme.danger)),
            const SizedBox(height: 12),
            OutlinedButton(
              onPressed: () => ref.invalidate(pendingLeaveRequestsProvider),
              child: const Text('Retry'),
            ),
          ],
        ),
      ),
      data: (items) {
        if (items.isEmpty) {
          return Center(
            child: Column(
              mainAxisSize: MainAxisSize.min,
              children: [
                Icon(Icons.check_circle_outline, size: 56, color: AppTheme.textMuted),
                const SizedBox(height: 12),
                Text(
                  'No pending requests',
                  style: TextStyle(color: AppTheme.textMuted, fontSize: 16),
                ),
              ],
            ),
          );
        }
        return RefreshIndicator(
          color: AppTheme.primary,
          onRefresh: () async => ref.invalidate(pendingLeaveRequestsProvider),
          child: ListView.builder(
            padding: const EdgeInsets.symmetric(vertical: 8),
            itemCount: items.length,
            itemBuilder: (_, i) => _LeaveRequestCard(item: items[i]),
          ),
        );
      },
    );
  }
}

// ---------------------------------------------------------------------------
// History Tab
// ---------------------------------------------------------------------------

class _HistoryTab extends ConsumerWidget {
  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final async = ref.watch(supervisorLeaveRequestsHistoryProvider);
    return async.when(
      loading: () => const Center(child: CircularProgressIndicator(color: AppTheme.primary)),
      error: (e, _) => Center(
        child: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            Text('Failed to load', style: TextStyle(color: AppTheme.danger)),
            const SizedBox(height: 12),
            OutlinedButton(
              onPressed: () => ref.invalidate(supervisorLeaveRequestsHistoryProvider),
              child: const Text('Retry'),
            ),
          ],
        ),
      ),
      data: (items) {
        if (items.isEmpty) {
          return Center(
            child: Column(
              mainAxisSize: MainAxisSize.min,
              children: [
                Icon(Icons.history, size: 56, color: AppTheme.textMuted),
                const SizedBox(height: 12),
                Text(
                  'No leave history',
                  style: TextStyle(color: AppTheme.textMuted, fontSize: 16),
                ),
              ],
            ),
          );
        }
        return RefreshIndicator(
          color: AppTheme.primary,
          onRefresh: () async => ref.invalidate(supervisorLeaveRequestsHistoryProvider),
          child: ListView.builder(
            padding: const EdgeInsets.symmetric(vertical: 8),
            itemCount: items.length,
            itemBuilder: (_, i) => _LeaveRequestCard(item: items[i]),
          ),
        );
      },
    );
  }
}

// ---------------------------------------------------------------------------
// Leave Request Card
// ---------------------------------------------------------------------------

class _LeaveRequestCard extends ConsumerStatefulWidget {
  final Map<String, dynamic> item;
  const _LeaveRequestCard({required this.item});

  @override
  ConsumerState<_LeaveRequestCard> createState() => _LeaveRequestCardState();
}

class _LeaveRequestCardState extends ConsumerState<_LeaveRequestCard> {
  bool _loading = false;

  Color _statusColor(String status) {
    switch (status.toUpperCase()) {
      case 'APPROVED':
        return AppTheme.success;
      case 'REJECTED':
        return AppTheme.danger;
      case 'CANCELLED':
        return AppTheme.textMuted;
      default:
        return AppTheme.warning; // PENDING
    }
  }

  String _initials(String firstName, String lastName) {
    final f = firstName.isNotEmpty ? firstName[0].toUpperCase() : '';
    final l = lastName.isNotEmpty ? lastName[0].toUpperCase() : '';
    return '$f$l';
  }

  Future<void> _handleAction(String action) async {
    final remarks = await showDialog<String>(
      context: context,
      builder: (_) => _RemarksDialog(
        action: action,
        onConfirm: (r) async => r,
      ),
    );
    if (remarks == null) return; // cancelled

    setState(() => _loading = true);
    try {
      final dio = ref.read(apiClientProvider);
      await dio.patch(
        '/attendance/leave-requests/${widget.item['id']}/approve',
        data: {'status': action, 'remarks': remarks},
      );
      ref.invalidate(pendingLeaveRequestsProvider);
      ref.invalidate(supervisorLeaveRequestsHistoryProvider);
      if (mounted) {
        final label = action == 'APPROVED' ? 'approved' : 'rejected';
        final color = action == 'APPROVED' ? AppTheme.success : AppTheme.danger;
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(
            content: Text('Leave $label'),
            backgroundColor: color,
          ),
        );
      }
    } catch (e) {
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(
            content: Text('Failed: $e'),
            backgroundColor: AppTheme.danger,
          ),
        );
      }
    } finally {
      if (mounted) setState(() => _loading = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    final item = widget.item;
    final employee = item['employee'] as Map<String, dynamic>? ?? {};
    final leaveType = item['leaveType'] as Map<String, dynamic>? ?? {};
    final firstName = (employee['firstName'] as String?) ?? '';
    final lastName = (employee['lastName'] as String?) ?? '';
    final employeeName = '$firstName $lastName'.trim();
    final leaveTypeName = (leaveType['name'] as String?) ?? '—';
    final startDate = _fmtDate(item['startDate'] as String?);
    final endDate = _fmtDate(item['endDate'] as String?);
    final days = (item['days'] as num?)?.toDouble() ?? 0.0;
    final daysStr = days == days.truncate() ? '${days.toInt()}' : days.toStringAsFixed(1);
    final reason = (item['reason'] as String?) ?? '';
    final status = ((item['status'] as String?) ?? 'PENDING').toUpperCase();
    final statusColor = _statusColor(status);
    final initials = _initials(firstName, lastName);

    return Container(
      margin: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
      padding: const EdgeInsets.all(14),
      decoration: BoxDecoration(
        color: AppTheme.surface,
        borderRadius: BorderRadius.circular(12),
        border: Border.all(color: AppTheme.border),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          // Header row: avatar + name + status badge
          Row(
            children: [
              CircleAvatar(
                radius: 20,
                backgroundColor: AppTheme.primary.withOpacity(0.15),
                child: Text(
                  initials,
                  style: const TextStyle(
                    color: AppTheme.primary,
                    fontWeight: FontWeight.bold,
                    fontSize: 14,
                  ),
                ),
              ),
              const SizedBox(width: 10),
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(
                      employeeName.isEmpty ? '—' : employeeName,
                      style: Theme.of(context).textTheme.titleMedium?.copyWith(
                            fontSize: 14,
                            fontWeight: FontWeight.bold,
                          ),
                    ),
                    const SizedBox(height: 2),
                    Text(
                      '$leaveTypeName · $daysStr day${days == 1 ? '' : 's'}',
                      style: Theme.of(context).textTheme.bodyMedium?.copyWith(fontSize: 12),
                    ),
                  ],
                ),
              ),
              // Status badge
              Container(
                padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 3),
                decoration: BoxDecoration(
                  color: statusColor.withOpacity(0.12),
                  borderRadius: BorderRadius.circular(8),
                  border: Border.all(color: statusColor.withOpacity(0.35)),
                ),
                child: Text(
                  status,
                  style: TextStyle(
                    color: statusColor,
                    fontSize: 11,
                    fontWeight: FontWeight.w600,
                  ),
                ),
              ),
            ],
          ),
          const SizedBox(height: 10),

          // Date range
          Row(
            children: [
              Icon(Icons.calendar_today_outlined, size: 13, color: AppTheme.textMuted),
              const SizedBox(width: 4),
              Text(
                '$startDate → $endDate',
                style: Theme.of(context)
                    .textTheme
                    .bodyMedium
                    ?.copyWith(fontSize: 12, color: AppTheme.textSecondary),
              ),
            ],
          ),
          const SizedBox(height: 6),

          // Reason
          if (reason.isNotEmpty)
            Text(
              reason,
              maxLines: 2,
              overflow: TextOverflow.ellipsis,
              style: Theme.of(context)
                  .textTheme
                  .bodyMedium
                  ?.copyWith(fontSize: 12, color: AppTheme.textSecondary),
            ),

          // Approve / Reject buttons (only for PENDING)
          if (status == 'PENDING') ...[
            const SizedBox(height: 12),
            if (_loading)
              const Center(
                child: SizedBox(
                  width: 24,
                  height: 24,
                  child: CircularProgressIndicator(
                    strokeWidth: 2,
                    color: AppTheme.primary,
                  ),
                ),
              )
            else
              Row(
                children: [
                  Expanded(
                    child: OutlinedButton(
                      onPressed: () => _handleAction('APPROVED'),
                      style: OutlinedButton.styleFrom(
                        foregroundColor: AppTheme.success,
                        side: BorderSide(color: AppTheme.success.withOpacity(0.5)),
                        padding: const EdgeInsets.symmetric(vertical: 10),
                        shape: RoundedRectangleBorder(
                          borderRadius: BorderRadius.circular(8),
                        ),
                      ),
                      child: const Text(
                        'Approve',
                        style: TextStyle(fontSize: 13, fontWeight: FontWeight.w600),
                      ),
                    ),
                  ),
                  const SizedBox(width: 10),
                  Expanded(
                    child: OutlinedButton(
                      onPressed: () => _handleAction('REJECTED'),
                      style: OutlinedButton.styleFrom(
                        foregroundColor: AppTheme.danger,
                        side: BorderSide(color: AppTheme.danger.withOpacity(0.5)),
                        padding: const EdgeInsets.symmetric(vertical: 10),
                        shape: RoundedRectangleBorder(
                          borderRadius: BorderRadius.circular(8),
                        ),
                      ),
                      child: const Text(
                        'Reject',
                        style: TextStyle(fontSize: 13, fontWeight: FontWeight.w600),
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

// ---------------------------------------------------------------------------
// Remarks Dialog
// ---------------------------------------------------------------------------

class _RemarksDialog extends StatefulWidget {
  final String action; // 'APPROVED' or 'REJECTED'
  final Future<String> Function(String remarks) onConfirm;

  const _RemarksDialog({required this.action, required this.onConfirm});

  @override
  State<_RemarksDialog> createState() => _RemarksDialogState();
}

class _RemarksDialogState extends State<_RemarksDialog> {
  final _controller = TextEditingController();
  bool _confirming = false;

  @override
  void dispose() {
    _controller.dispose();
    super.dispose();
  }

  String get _title =>
      widget.action == 'APPROVED' ? 'Approve Leave' : 'Reject Leave';

  @override
  Widget build(BuildContext context) {
    return AlertDialog(
      backgroundColor: AppTheme.surface,
      shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(16)),
      title: Text(
        _title,
        style: Theme.of(context).textTheme.titleLarge?.copyWith(fontSize: 16),
      ),
      content: Column(
        mainAxisSize: MainAxisSize.min,
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Text(
            'Remarks (optional)',
            style: TextStyle(color: AppTheme.textSecondary, fontSize: 13),
          ),
          const SizedBox(height: 8),
          TextFormField(
            controller: _controller,
            maxLines: 3,
            style: const TextStyle(color: AppTheme.textPrimary),
            decoration: InputDecoration(
              hintText: 'Add a note...',
              hintStyle: TextStyle(color: AppTheme.textMuted),
              filled: true,
              fillColor: AppTheme.surfaceVariant,
              border: OutlineInputBorder(
                borderRadius: BorderRadius.circular(10),
                borderSide: const BorderSide(color: AppTheme.border),
              ),
              enabledBorder: OutlineInputBorder(
                borderRadius: BorderRadius.circular(10),
                borderSide: const BorderSide(color: AppTheme.border),
              ),
              focusedBorder: OutlineInputBorder(
                borderRadius: BorderRadius.circular(10),
                borderSide: const BorderSide(color: AppTheme.primary),
              ),
              contentPadding:
                  const EdgeInsets.symmetric(horizontal: 12, vertical: 10),
            ),
          ),
        ],
      ),
      actions: [
        TextButton(
          onPressed: _confirming ? null : () => Navigator.pop(context),
          child: Text('Cancel', style: TextStyle(color: AppTheme.textSecondary)),
        ),
        ElevatedButton(
          onPressed: _confirming
              ? null
              : () async {
                  setState(() => _confirming = true);
                  // Return the remarks text as the dialog result
                  Navigator.pop(context, _controller.text.trim());
                },
          style: ElevatedButton.styleFrom(
            backgroundColor: widget.action == 'APPROVED'
                ? AppTheme.success
                : AppTheme.danger,
            foregroundColor: Colors.white,
            shape:
                RoundedRectangleBorder(borderRadius: BorderRadius.circular(8)),
          ),
          child: Text(
            widget.action == 'APPROVED' ? 'Approve' : 'Reject',
            style: const TextStyle(fontWeight: FontWeight.w600),
          ),
        ),
      ],
    );
  }
}
