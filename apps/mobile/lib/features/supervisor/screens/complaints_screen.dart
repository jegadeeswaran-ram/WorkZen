import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import '../../../core/network/api_client.dart';
import '../../../core/theme/app_theme.dart';
import '../providers/supervisor_provider.dart';

class ComplaintsScreen extends ConsumerStatefulWidget {
  final String siteId;
  const ComplaintsScreen({super.key, required this.siteId});

  @override
  ConsumerState<ComplaintsScreen> createState() => _ComplaintsScreenState();
}

class _ComplaintsScreenState extends ConsumerState<ComplaintsScreen> {
  String _statusFilter = '';

  static const _statusFilters = ['', 'OPEN', 'IN_REVIEW', 'ESCALATED', 'RESOLVED', 'CLOSED'];

  @override
  void initState() {
    super.initState();
    WidgetsBinding.instance.addPostFrameCallback((_) {
      ref.read(complaintsProvider.notifier).load(widget.siteId);
    });
  }

  Color _statusColor(String status) => switch (status) {
    'OPEN'      => AppTheme.danger,
    'IN_REVIEW' => AppTheme.warning,
    'ESCALATED' => const Color(0xFFFF6B35),
    'RESOLVED'  => AppTheme.success,
    'CLOSED'    => AppTheme.textMuted,
    _           => AppTheme.textMuted,
  };

  Color _sevColor(String sev) => switch (sev) {
    'CRITICAL' => AppTheme.danger,
    'HIGH'     => const Color(0xFFFF6B35),
    'MEDIUM'   => AppTheme.warning,
    _          => AppTheme.textMuted,
  };

  Future<void> _updateStatus(String complaintId, String newStatus) async {
    try {
      final api = ref.read(apiClientProvider);
      await api.patch('/complaints/$complaintId', data: {'status': newStatus});
      ref.read(complaintsProvider.notifier).load(widget.siteId);
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(SnackBar(
          content: Text('Marked as ${newStatus.replaceAll('_', ' ')}'),
          backgroundColor: AppTheme.success,
        ));
      }
    } catch (e) {
      if (mounted) ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(content: Text('Failed: $e'), backgroundColor: AppTheme.danger),
      );
    }
  }

  Widget _badge(String text, Color color) => Container(
    padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 3),
    decoration: BoxDecoration(color: color.withValues(alpha: 0.12), borderRadius: BorderRadius.circular(12),
        border: Border.all(color: color.withValues(alpha: 0.25))),
    child: Text(text.replaceAll('_', ' '), style: TextStyle(fontSize: 10, color: color, fontWeight: FontWeight.w600)),
  );

  @override
  Widget build(BuildContext context) {
    final complaints = ref.watch(complaintsProvider);
    return Scaffold(
      backgroundColor: AppTheme.background,
      appBar: AppBar(
        title: const Text('Complaints'),
        centerTitle: false,
        actions: [
          IconButton(
            icon: const Icon(Icons.refresh_outlined),
            onPressed: () => ref.read(complaintsProvider.notifier).load(widget.siteId),
          ),
        ],
      ),
      floatingActionButton: FloatingActionButton.extended(
        backgroundColor: AppTheme.primary,
        onPressed: () => context.push('/supervisor/complaints/new', extra: widget.siteId),
        icon: const Icon(Icons.add, color: Colors.white),
        label: const Text('New Complaint', style: TextStyle(color: Colors.white, fontWeight: FontWeight.w600)),
      ),
      body: Column(children: [
        // Status filter chips
        SingleChildScrollView(
          scrollDirection: Axis.horizontal,
          padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 10),
          child: Row(children: _statusFilters.map((s) {
            final selected = _statusFilter == s;
            final label = s.isEmpty ? 'All' : s.replaceAll('_', ' ');
            final color = s.isEmpty ? AppTheme.primary : _statusColor(s);
            return Padding(
              padding: const EdgeInsets.only(right: 8),
              child: FilterChip(
                label: Text(label),
                selected: selected,
                onSelected: (_) => setState(() => _statusFilter = s),
                selectedColor: color.withValues(alpha: 0.18),
                backgroundColor: Colors.transparent,
                checkmarkColor: color,
                showCheckmark: false,
                labelStyle: TextStyle(color: selected ? color : AppTheme.textSecondary,
                    fontWeight: selected ? FontWeight.w600 : FontWeight.normal, fontSize: 12),
                side: BorderSide(color: selected ? color : AppTheme.border),
                padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 4),
              ),
            );
          }).toList()),
        ),
        Expanded(
          child: complaints.when(
            loading: () => const Center(child: CircularProgressIndicator(color: AppTheme.primary)),
            error: (e, _) => Center(child: Text('Error: $e', style: const TextStyle(color: AppTheme.danger))),
            data: (list) {
              final filtered = _statusFilter.isEmpty ? list : list.where((c) => c.status == _statusFilter).toList();
              if (filtered.isEmpty) {
                return Center(child: Column(mainAxisSize: MainAxisSize.min, children: [
                  const Icon(Icons.check_circle_outline, size: 48, color: AppTheme.success),
                  const SizedBox(height: 12),
                  Text(_statusFilter.isEmpty ? 'No complaints' : 'No ${_statusFilter.replaceAll('_', ' ')} complaints',
                      style: const TextStyle(color: AppTheme.textSecondary)),
                ]));
              }
              return ListView.separated(
                padding: const EdgeInsets.fromLTRB(16, 4, 16, 100),
                itemCount: filtered.length,
                separatorBuilder: (_, __) => const SizedBox(height: 8),
                itemBuilder: (ctx, i) {
                  final c = filtered[i];
                  return Container(
                    decoration: BoxDecoration(
                      color: AppTheme.surface, borderRadius: BorderRadius.circular(14),
                      border: Border.all(color: AppTheme.border),
                    ),
                    child: Padding(
                      padding: const EdgeInsets.all(14),
                      child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
                        Row(children: [
                          Expanded(child: Text(c.title,
                              style: const TextStyle(fontWeight: FontWeight.w600, color: AppTheme.textPrimary, fontSize: 13))),
                          _badge(c.status, _statusColor(c.status)),
                        ]),
                        const SizedBox(height: 6),
                        Row(children: [
                          Expanded(child: Text(c.category.replaceAll('_', ' / '),
                              style: const TextStyle(fontSize: 12, color: AppTheme.textSecondary))),
                          _badge(c.severity, _sevColor(c.severity)),
                        ]),
                        const SizedBox(height: 8),
                        Text(c.description, maxLines: 2, overflow: TextOverflow.ellipsis,
                            style: const TextStyle(fontSize: 13, color: AppTheme.textSecondary, height: 1.4)),
                        // Inline action buttons
                        if (c.status == 'OPEN' || c.status == 'IN_REVIEW') ...[
                          const SizedBox(height: 10),
                          const Divider(height: 1, color: AppTheme.border),
                          const SizedBox(height: 8),
                          Row(children: [
                            if (c.status == 'OPEN')
                              _actionBtn('Mark In Review', AppTheme.warning, () => _updateStatus(c.id, 'IN_REVIEW')),
                            if (c.status == 'IN_REVIEW') ...[
                              _actionBtn('Resolve', AppTheme.success, () => _updateStatus(c.id, 'RESOLVED')),
                              const SizedBox(width: 8),
                              _actionBtn('Escalate', AppTheme.danger, () => _updateStatus(c.id, 'ESCALATED')),
                            ],
                          ]),
                        ],
                      ]),
                    ),
                  );
                },
              );
            },
          ),
        ),
      ]),
    );
  }

  Widget _actionBtn(String label, Color color, VoidCallback onTap) => GestureDetector(
    onTap: onTap,
    child: Container(
      padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 6),
      decoration: BoxDecoration(color: color.withValues(alpha: 0.12), borderRadius: BorderRadius.circular(8),
          border: Border.all(color: color.withValues(alpha: 0.25))),
      child: Text(label, style: TextStyle(color: color, fontSize: 11, fontWeight: FontWeight.w600)),
    ),
  );
}
