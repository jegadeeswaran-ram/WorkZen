import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:intl/intl.dart';
import '../../../core/theme/app_theme.dart';
import '../providers/workflows_provider.dart';

class WorkflowsScreen extends ConsumerWidget {
  const WorkflowsScreen({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final approvalsAsync = ref.watch(myApprovalsProvider);

    return Scaffold(
      backgroundColor: AppTheme.background,
      appBar: AppBar(
        title: approvalsAsync.when(
          data: (list) => Text('Pending Approvals (${list.length})'),
          loading: () => const Text('Pending Approvals'),
          error: (_, __) => const Text('Pending Approvals'),
        ),
        actions: [IconButton(icon: const Icon(Icons.refresh_outlined), onPressed: () => ref.invalidate(myApprovalsProvider))],
      ),
      body: RefreshIndicator(
        color: AppTheme.primary,
        onRefresh: () async => ref.invalidate(myApprovalsProvider),
        child: approvalsAsync.when(
          loading: () => const Center(child: CircularProgressIndicator(color: AppTheme.primary)),
          error: (e, _) => Center(child: TextButton(onPressed: () => ref.invalidate(myApprovalsProvider), child: const Text('Retry'))),
          data: (approvals) {
            if (approvals.isEmpty) {
              return Center(
                child: Column(mainAxisSize: MainAxisSize.min, children: const [
                  Icon(Icons.check_circle_outline, color: AppTheme.success, size: 48),
                  SizedBox(height: 12),
                  Text('All caught up!', style: TextStyle(color: AppTheme.textSecondary, fontSize: 16)),
                  SizedBox(height: 4),
                  Text('No pending approvals', style: TextStyle(color: AppTheme.textMuted, fontSize: 13)),
                ]),
              );
            }
            return ListView.builder(
              padding: const EdgeInsets.all(16),
              itemCount: approvals.length,
              itemBuilder: (_, i) => _ApprovalCard(approval: approvals[i], ref: ref),
            );
          },
        ),
      ),
    );
  }
}

class _ApprovalCard extends StatelessWidget {
  final Map<String, dynamic> approval;
  final WidgetRef ref;
  const _ApprovalCard({required this.approval, required this.ref});

  IconData _icon(String? type) => switch ((type ?? '').toLowerCase()) {
    'payrollrun' || 'payroll' => Icons.receipt_long_outlined,
    'leaverequest' || 'leave' => Icons.beach_access_outlined,
    'tender' => Icons.description_outlined,
    'invoice' || 'billing' => Icons.request_quote_outlined,
    _ => Icons.assignment_outlined,
  };

  String _fmt(String? iso) {
    if (iso == null) return '—';
    try { return DateFormat('dd MMM, h:mm a').format(DateTime.parse(iso)); } catch (_) { return iso; }
  }

  String _shortId(dynamic id) {
    final s = '$id';
    return s.length > 8 ? s.substring(s.length - 8) : s;
  }

  void _showApproveDialog(BuildContext context) {
    final commentCtrl = TextEditingController();
    showDialog(
      context: context,
      builder: (_) => AlertDialog(
        backgroundColor: AppTheme.surface,
        title: const Text('Approve', style: TextStyle(color: AppTheme.textPrimary)),
        content: Column(mainAxisSize: MainAxisSize.min, children: [
          const Text('Add a comment (optional):', style: TextStyle(color: AppTheme.textSecondary)),
          const SizedBox(height: 12),
          TextField(controller: commentCtrl, style: const TextStyle(color: AppTheme.textPrimary),
              decoration: const InputDecoration(hintText: 'Comment...')),
        ]),
        actions: [
          TextButton(onPressed: () => Navigator.pop(context), child: const Text('Cancel')),
          ElevatedButton(
            style: ElevatedButton.styleFrom(backgroundColor: AppTheme.success),
            onPressed: () async {
              Navigator.pop(context);
              final stepId = approval['id'] as String? ?? '';
              final ok = await ref.read(workflowActionProvider.notifier).approve(stepId, comment: commentCtrl.text);
              if (context.mounted) {
                ScaffoldMessenger.of(context).showSnackBar(SnackBar(
                  content: Text(ok ? 'Approved successfully' : 'Failed to approve'),
                  backgroundColor: ok ? AppTheme.success : AppTheme.danger,
                ));
                if (ok) ref.invalidate(myApprovalsProvider);
              }
            },
            child: const Text('Approve'),
          ),
        ],
      ),
    );
  }

  void _showRejectDialog(BuildContext context) {
    final reasonCtrl = TextEditingController();
    showDialog(
      context: context,
      builder: (_) => AlertDialog(
        backgroundColor: AppTheme.surface,
        title: const Text('Reject', style: TextStyle(color: AppTheme.textPrimary)),
        content: Column(mainAxisSize: MainAxisSize.min, children: [
          const Text('Reason for rejection:', style: TextStyle(color: AppTheme.textSecondary)),
          const SizedBox(height: 12),
          TextField(controller: reasonCtrl, style: const TextStyle(color: AppTheme.textPrimary),
              decoration: const InputDecoration(hintText: 'Reason...')),
        ]),
        actions: [
          TextButton(onPressed: () => Navigator.pop(context), child: const Text('Cancel')),
          ElevatedButton(
            style: ElevatedButton.styleFrom(backgroundColor: AppTheme.danger),
            onPressed: () async {
              if (reasonCtrl.text.trim().isEmpty) return;
              Navigator.pop(context);
              final stepId = approval['id'] as String? ?? '';
              final ok = await ref.read(workflowActionProvider.notifier).reject(stepId, reasonCtrl.text.trim());
              if (context.mounted) {
                ScaffoldMessenger.of(context).showSnackBar(SnackBar(
                  content: Text(ok ? 'Rejected' : 'Failed to reject'),
                  backgroundColor: ok ? AppTheme.warning : AppTheme.danger,
                ));
                if (ok) ref.invalidate(myApprovalsProvider);
              }
            },
            child: const Text('Reject'),
          ),
        ],
      ),
    );
  }

  @override
  Widget build(BuildContext context) {
    final instance = approval['instance'] as Map<String, dynamic>? ?? {};
    final workflow = instance['workflow'] as Map<String, dynamic>? ?? {};
    final entityType = instance['entityType'] as String? ?? approval['entityType'] as String? ?? '';
    final entityId = instance['entityId'] as String? ?? approval['entityId'] as String? ?? '';

    return Container(
      margin: const EdgeInsets.only(bottom: 12),
      padding: const EdgeInsets.all(16),
      decoration: BoxDecoration(color: AppTheme.surface, borderRadius: BorderRadius.circular(16), border: Border.all(color: AppTheme.border)),
      child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
        Row(children: [
          Container(
            width: 40, height: 40,
            decoration: BoxDecoration(color: AppTheme.warning.withValues(alpha: 0.12), borderRadius: BorderRadius.circular(10)),
            child: Icon(_icon(entityType), color: AppTheme.warning, size: 20),
          ),
          const SizedBox(width: 12),
          Expanded(
            child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
              Text(workflow['name'] as String? ?? approval['stepName'] as String? ?? 'Approval',
                  style: const TextStyle(color: AppTheme.textPrimary, fontWeight: FontWeight.w600, fontSize: 14)),
              Text(approval['stepName'] as String? ?? '',
                  style: const TextStyle(color: AppTheme.textSecondary, fontSize: 12)),
            ]),
          ),
        ]),
        const SizedBox(height: 10),
        Row(children: [
          const Icon(Icons.tag, size: 12, color: AppTheme.textMuted),
          const SizedBox(width: 4),
          Text('$entityType ${_shortId(entityId)}', style: const TextStyle(color: AppTheme.textMuted, fontSize: 12)),
          const Spacer(),
          const Icon(Icons.access_time, size: 12, color: AppTheme.textMuted),
          const SizedBox(width: 4),
          Text(_fmt(approval['createdAt'] as String?), style: const TextStyle(color: AppTheme.textMuted, fontSize: 11)),
        ]),
        const SizedBox(height: 12),
        Row(children: [
          Expanded(
            child: OutlinedButton(
              onPressed: () => _showRejectDialog(context),
              style: OutlinedButton.styleFrom(
                foregroundColor: AppTheme.danger,
                side: BorderSide(color: AppTheme.danger.withValues(alpha: 0.4)),
                padding: const EdgeInsets.symmetric(vertical: 10),
              ),
              child: const Text('Reject', style: TextStyle(fontSize: 13)),
            ),
          ),
          const SizedBox(width: 10),
          Expanded(
            child: ElevatedButton(
              onPressed: () => _showApproveDialog(context),
              style: ElevatedButton.styleFrom(backgroundColor: AppTheme.success, padding: const EdgeInsets.symmetric(vertical: 10)),
              child: const Text('Approve', style: TextStyle(fontSize: 13)),
            ),
          ),
        ]),
      ]),
    );
  }
}
