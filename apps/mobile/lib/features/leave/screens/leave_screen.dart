import 'package:flutter/material.dart';
import 'package:flutter_animate/flutter_animate.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:intl/intl.dart';
import '../../../core/theme/app_theme.dart';
import '../../../core/network/api_client.dart';
import '../providers/leave_provider.dart';

class LeaveScreen extends ConsumerWidget {
  const LeaveScreen({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final balances = ref.watch(leaveBalanceProvider);
    final requests = ref.watch(leaveRequestsProvider);

    return Scaffold(
      backgroundColor: AppTheme.background,
      appBar: AppBar(
        title: const Text('Leave Management'),
        actions: [
          TextButton.icon(
            onPressed: () => _showApplySheet(context, ref),
            icon: const Icon(Icons.add, size: 16),
            label: const Text('Apply'),
            style: TextButton.styleFrom(foregroundColor: AppTheme.primary),
          ),
        ],
      ),
      body: RefreshIndicator(
        color: AppTheme.primary,
        onRefresh: () async {
          ref.invalidate(leaveBalanceProvider);
          ref.invalidate(leaveRequestsProvider);
        },
        child: SingleChildScrollView(
          physics: const AlwaysScrollableScrollPhysics(),
          padding: const EdgeInsets.all(20),
          child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
            Text('Leave Balance', style: Theme.of(context).textTheme.titleMedium),
            const SizedBox(height: 12),
            balances.when(
              loading: () => const Center(child: CircularProgressIndicator()),
              error: (e, _) =>
                  Text('Could not load balances', style: TextStyle(color: AppTheme.danger)),
              data: (data) => data.isEmpty
                  ? Text('No leave balances allocated',
                      style: TextStyle(color: AppTheme.textMuted))
                  : GridView.count(
                      crossAxisCount: 2,
                      shrinkWrap: true,
                      physics: const NeverScrollableScrollPhysics(),
                      crossAxisSpacing: 12,
                      mainAxisSpacing: 12,
                      childAspectRatio: 1.8,
                      children: data.asMap().entries.map((e) {
                        final colors = [
                          AppTheme.primary,
                          AppTheme.danger,
                          AppTheme.success,
                          AppTheme.warning
                        ];
                        final b = e.value;
                        return _balanceCard(
                          context,
                          b['leaveType']['name'] as String,
                          (b['balance'] as num).toInt(),
                          colors[e.key % colors.length],
                        );
                      }).toList(),
                    ),
            ).animate().fadeIn(),
            const SizedBox(height: 24),
            Text('Recent Requests', style: Theme.of(context).textTheme.titleMedium),
            const SizedBox(height: 12),
            requests.when(
              loading: () => const Center(child: CircularProgressIndicator()),
              error: (e, _) =>
                  Text('Could not load requests', style: TextStyle(color: AppTheme.danger)),
              data: (data) => data.isEmpty
                  ? Text('No leave requests yet', style: TextStyle(color: AppTheme.textMuted))
                  : Column(
                      children: data.map((r) => _requestTile(context, r as Map)).toList()),
            ).animate().fadeIn(delay: 150.ms),
          ]),
        ),
      ),
    );
  }

  Widget _balanceCard(BuildContext context, String type, int days, Color color) => Container(
        padding: const EdgeInsets.all(14),
        decoration: BoxDecoration(
          color: color.withOpacity(0.08),
          borderRadius: BorderRadius.circular(14),
          border: Border.all(color: color.withOpacity(0.2)),
        ),
        child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
          Text(type, style: Theme.of(context).textTheme.bodyMedium?.copyWith(fontSize: 11)),
          const SizedBox(height: 4),
          Row(children: [
            Text('$days',
                style:
                    Theme.of(context).textTheme.headlineMedium?.copyWith(color: color, fontSize: 28)),
            const SizedBox(width: 4),
            Text('days',
                style: Theme.of(context)
                    .textTheme
                    .bodyMedium
                    ?.copyWith(fontSize: 11, color: AppTheme.textMuted)),
          ]),
        ]),
      );

  Widget _requestTile(BuildContext context, Map r) {
    final status = r['status'] as String;
    final color = status == 'APPROVED'
        ? AppTheme.success
        : status == 'REJECTED'
            ? AppTheme.danger
            : AppTheme.warning;
    final fmt = DateFormat('dd MMM');
    final startDate = DateTime.parse(r['startDate'] as String);
    final endDate = DateTime.parse(r['endDate'] as String);
    final days = (r['days'] as num).toInt();
    return Container(
      margin: const EdgeInsets.only(bottom: 10),
      padding: const EdgeInsets.all(14),
      decoration: BoxDecoration(
        color: AppTheme.surface,
        borderRadius: BorderRadius.circular(14),
        border: Border.all(color: AppTheme.border),
      ),
      child: Row(children: [
        Container(
            width: 4,
            height: 48,
            decoration: BoxDecoration(color: color, borderRadius: BorderRadius.circular(2))),
        const SizedBox(width: 12),
        Expanded(
            child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
          Text(r['leaveType']['name'] as String,
              style: Theme.of(context).textTheme.titleMedium?.copyWith(fontSize: 14)),
          Text('${fmt.format(startDate)} – ${fmt.format(endDate)} · $days day(s)',
              style: Theme.of(context).textTheme.bodyMedium?.copyWith(fontSize: 12)),
        ])),
        Container(
          padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 3),
          decoration: BoxDecoration(
            color: color.withOpacity(0.1),
            borderRadius: BorderRadius.circular(8),
            border: Border.all(color: color.withOpacity(0.3)),
          ),
          child: Text(status,
              style: TextStyle(color: color, fontSize: 11, fontWeight: FontWeight.w600)),
        ),
      ]),
    );
  }

  void _showApplySheet(BuildContext context, WidgetRef ref) {
    showModalBottomSheet(
      context: context,
      backgroundColor: AppTheme.surface,
      shape: const RoundedRectangleBorder(
          borderRadius: BorderRadius.vertical(top: Radius.circular(20))),
      isScrollControlled: true,
      builder: (_) => _ApplyLeaveSheet(
        onSuccess: () {
          ref.invalidate(leaveBalanceProvider);
          ref.invalidate(leaveRequestsProvider);
        },
      ),
    );
  }
}

class _ApplyLeaveSheet extends ConsumerStatefulWidget {
  final VoidCallback onSuccess;
  const _ApplyLeaveSheet({required this.onSuccess});
  @override
  ConsumerState<_ApplyLeaveSheet> createState() => _ApplyLeaveSheetState();
}

class _ApplyLeaveSheetState extends ConsumerState<_ApplyLeaveSheet> {
  String? _selectedLeaveTypeId;
  DateTime? _start, _end;
  final _reasonCtrl = TextEditingController();
  bool _submitting = false;

  @override
  void dispose() {
    _reasonCtrl.dispose();
    super.dispose();
  }

  Future<void> _submit() async {
    if (_selectedLeaveTypeId == null ||
        _start == null ||
        _end == null ||
        _reasonCtrl.text.isEmpty) {
      ScaffoldMessenger.of(context).showSnackBar(const SnackBar(
          content: Text('Please fill all fields'), backgroundColor: AppTheme.warning));
      return;
    }
    setState(() => _submitting = true);
    try {
      final api = ref.read(apiClientProvider);
      await api.post('/attendance/my-leave-requests', data: {
        'leaveTypeId': _selectedLeaveTypeId,
        'startDate': _start!.toIso8601String().split('T')[0],
        'endDate': _end!.toIso8601String().split('T')[0],
        'reason': _reasonCtrl.text.trim(),
      });
      if (mounted) {
        Navigator.pop(context);
        ScaffoldMessenger.of(context).showSnackBar(const SnackBar(
            content: Text('Leave applied successfully'), backgroundColor: AppTheme.success));
        widget.onSuccess();
      }
    } catch (e) {
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
            SnackBar(content: Text(e.toString()), backgroundColor: AppTheme.danger));
      }
    } finally {
      if (mounted) setState(() => _submitting = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    final leaveTypesAsync = ref.watch(leaveTypesProvider);
    final fmt = DateFormat('dd MMM yyyy');

    return Padding(
      padding: EdgeInsets.only(
          left: 20, right: 20, top: 20, bottom: MediaQuery.of(context).viewInsets.bottom + 20),
      child: Column(mainAxisSize: MainAxisSize.min, crossAxisAlignment: CrossAxisAlignment.start,
          children: [
        Text('Apply Leave',
            style: Theme.of(context).textTheme.headlineMedium?.copyWith(fontSize: 18)),
        const SizedBox(height: 20),
        leaveTypesAsync.when(
          loading: () => const CircularProgressIndicator(),
          error: (_, __) =>
              Text('Could not load leave types', style: TextStyle(color: AppTheme.danger)),
          data: (types) => DropdownButtonFormField<String>(
            value: _selectedLeaveTypeId,
            dropdownColor: AppTheme.surface,
            decoration: const InputDecoration(labelText: 'Leave Type'),
            hint: const Text('Select leave type'),
            items: (types).map((t) => DropdownMenuItem(
                value: t['id'] as String, child: Text(t['name'] as String))).toList(),
            onChanged: (v) => setState(() => _selectedLeaveTypeId = v),
          ),
        ),
        const SizedBox(height: 12),
        Row(children: [
          Expanded(
            child: InkWell(
              onTap: () async {
                final d = await showDatePicker(
                    context: context,
                    initialDate: DateTime.now(),
                    firstDate: DateTime.now(),
                    lastDate: DateTime.now().add(const Duration(days: 365)));
                if (d != null) setState(() => _start = d);
              },
              child: InputDecorator(
                decoration: const InputDecoration(labelText: 'From'),
                child: Text(_start != null ? fmt.format(_start!) : 'Select',
                    style: const TextStyle(color: Colors.white70)),
              ),
            ),
          ),
          const SizedBox(width: 12),
          Expanded(
            child: InkWell(
              onTap: () async {
                final d = await showDatePicker(
                    context: context,
                    initialDate: _start ?? DateTime.now(),
                    firstDate: _start ?? DateTime.now(),
                    lastDate: DateTime.now().add(const Duration(days: 365)));
                if (d != null) setState(() => _end = d);
              },
              child: InputDecorator(
                decoration: const InputDecoration(labelText: 'To'),
                child: Text(_end != null ? fmt.format(_end!) : 'Select',
                    style: const TextStyle(color: Colors.white70)),
              ),
            ),
          ),
        ]),
        const SizedBox(height: 12),
        TextField(
          controller: _reasonCtrl,
          maxLines: 3,
          style: const TextStyle(color: Colors.white),
          decoration: const InputDecoration(labelText: 'Reason'),
        ),
        const SizedBox(height: 20),
        SizedBox(
          width: double.infinity,
          child: ElevatedButton(
            onPressed: _submitting ? null : _submit,
            child: _submitting
                ? const SizedBox(
                    width: 18,
                    height: 18,
                    child: CircularProgressIndicator(strokeWidth: 2, color: Colors.white))
                : const Text('Submit Application'),
          ),
        ),
      ]),
    );
  }
}
