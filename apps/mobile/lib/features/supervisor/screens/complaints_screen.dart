import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import '../providers/supervisor_provider.dart';

class ComplaintsScreen extends ConsumerStatefulWidget {
  final String siteId;
  const ComplaintsScreen({super.key, required this.siteId});

  @override
  ConsumerState<ComplaintsScreen> createState() => _ComplaintsScreenState();
}

class _ComplaintsScreenState extends ConsumerState<ComplaintsScreen> {
  @override
  void initState() {
    super.initState();
    WidgetsBinding.instance.addPostFrameCallback((_) {
      ref.read(complaintsProvider.notifier).load(widget.siteId);
    });
  }

  Color _statusColor(String status) => switch (status) {
    'OPEN' => Colors.red,
    'IN_REVIEW' => Colors.orange,
    'ESCALATED' => Colors.deepOrange,
    'RESOLVED' => Colors.green,
    _ => Colors.grey,
  };

  Color _sevColor(String sev) => switch (sev) {
    'CRITICAL' => Colors.red,
    'HIGH' => Colors.deepOrange,
    'MEDIUM' => Colors.orange,
    _ => Colors.grey,
  };

  @override
  Widget build(BuildContext context) {
    final complaints = ref.watch(complaintsProvider);
    return Scaffold(
      appBar: AppBar(title: const Text('Complaints'), centerTitle: false),
      floatingActionButton: FloatingActionButton.extended(
        onPressed: () => context.push('/supervisor/complaints/new', extra: widget.siteId),
        icon: const Icon(Icons.add),
        label: const Text('New Complaint'),
      ),
      body: complaints.when(
        loading: () => const Center(child: CircularProgressIndicator()),
        error: (e, _) => Center(child: Text('Error: $e')),
        data: (list) => list.isEmpty
          ? const Center(child: Column(mainAxisSize: MainAxisSize.min, children: [Icon(Icons.check_circle_outline, size: 48, color: Colors.green), SizedBox(height: 12), Text('No open complaints')]))
          : ListView.separated(
              padding: const EdgeInsets.all(16),
              itemCount: list.length,
              separatorBuilder: (_, __) => const SizedBox(height: 8),
              itemBuilder: (ctx, i) {
                final c = list[i];
                return Card(
                  child: Padding(
                    padding: const EdgeInsets.all(12),
                    child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
                      Row(children: [
                        Expanded(child: Text(c.title, style: const TextStyle(fontWeight: FontWeight.w600))),
                        Container(
                          padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 2),
                          decoration: BoxDecoration(
                            color: _statusColor(c.status).withValues(alpha: 0.12),
                            borderRadius: BorderRadius.circular(12),
                          ),
                          child: Text(
                            c.status.replaceAll('_', ' '),
                            style: TextStyle(fontSize: 11, color: _statusColor(c.status), fontWeight: FontWeight.w600),
                          ),
                        ),
                      ]),
                      const SizedBox(height: 4),
                      Row(children: [
                        Text(
                          c.category.replaceAll('_', ' / '),
                          style: TextStyle(fontSize: 12, color: Theme.of(context).colorScheme.onSurface.withValues(alpha: 0.6)),
                        ),
                        const Spacer(),
                        Container(
                          padding: const EdgeInsets.symmetric(horizontal: 6, vertical: 2),
                          decoration: BoxDecoration(
                            color: _sevColor(c.severity).withValues(alpha: 0.12),
                            borderRadius: BorderRadius.circular(8),
                          ),
                          child: Text(
                            c.severity,
                            style: TextStyle(fontSize: 10, color: _sevColor(c.severity), fontWeight: FontWeight.w600),
                          ),
                        ),
                      ]),
                      const SizedBox(height: 6),
                      Text(
                        c.description,
                        maxLines: 2,
                        overflow: TextOverflow.ellipsis,
                        style: TextStyle(fontSize: 13, color: Theme.of(context).colorScheme.onSurface.withValues(alpha: 0.7)),
                      ),
                    ]),
                  ),
                );
              },
            ),
      ),
    );
  }
}
