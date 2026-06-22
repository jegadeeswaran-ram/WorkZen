import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import '../../../core/theme/app_theme.dart';
import '../providers/compliance_provider.dart';

class ComplianceScreen extends ConsumerStatefulWidget {
  const ComplianceScreen({super.key});

  @override
  ConsumerState<ComplianceScreen> createState() => _ComplianceScreenState();
}

class _ComplianceScreenState extends ConsumerState<ComplianceScreen> {
  String _filter = 'All';
  final _filters = ['All', 'Overdue', 'Pending', 'Completed'];

  Color _statusColor(String? s) => switch ((s ?? '').toUpperCase()) {
    'OVERDUE' => AppTheme.danger,
    'PENDING' => AppTheme.warning,
    'COMPLETED' => AppTheme.success,
    _ => AppTheme.textMuted,
  };

  @override
  Widget build(BuildContext context) {
    final itemsAsync = ref.watch(complianceItemsProvider);

    return Scaffold(
      backgroundColor: AppTheme.background,
      appBar: AppBar(
        title: const Text('Compliance'),
        actions: [IconButton(icon: const Icon(Icons.refresh_outlined), onPressed: () => ref.invalidate(complianceItemsProvider))],
      ),
      floatingActionButton: FloatingActionButton(
        backgroundColor: AppTheme.primary,
        onPressed: () => context.push('/compliance/new'),
        child: const Icon(Icons.add, color: Colors.white),
      ),
      body: RefreshIndicator(
        color: AppTheme.primary,
        onRefresh: () async => ref.invalidate(complianceItemsProvider),
        child: itemsAsync.when(
          loading: () => const Center(child: CircularProgressIndicator(color: AppTheme.primary)),
          error: (e, _) => Center(child: TextButton(onPressed: () => ref.invalidate(complianceItemsProvider), child: const Text('Retry'))),
          data: (items) {
            final overdue = items.where((i) => (i['status'] as String? ?? '').toUpperCase() == 'OVERDUE').length;
            final pending = items.where((i) => (i['status'] as String? ?? '').toUpperCase() == 'PENDING').length;
            final completed = items.where((i) => (i['status'] as String? ?? '').toUpperCase() == 'COMPLETED').length;

            final filtered = _filter == 'All' ? items : items.where((i) => (i['status'] as String? ?? '').toUpperCase() == _filter.toUpperCase()).toList();

            return CustomScrollView(
              slivers: [
                SliverToBoxAdapter(
                  child: Padding(
                    padding: const EdgeInsets.fromLTRB(16, 12, 16, 0),
                    child: Row(children: [
                      _StatChip('Total', items.length, AppTheme.primary),
                      const SizedBox(width: 8),
                      _StatChip('Overdue', overdue, AppTheme.danger),
                      const SizedBox(width: 8),
                      _StatChip('Pending', pending, AppTheme.warning),
                      const SizedBox(width: 8),
                      _StatChip('Done', completed, AppTheme.success),
                    ]),
                  ),
                ),
                SliverToBoxAdapter(
                  child: SizedBox(
                    height: 44,
                    child: ListView.separated(
                      scrollDirection: Axis.horizontal,
                      padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 6),
                      itemCount: _filters.length,
                      separatorBuilder: (_, __) => const SizedBox(width: 8),
                      itemBuilder: (_, i) {
                        final f = _filters[i];
                        final sel = _filter == f;
                        return GestureDetector(
                          onTap: () => setState(() => _filter = f),
                          child: Container(
                            padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 4),
                            decoration: BoxDecoration(
                              color: sel ? AppTheme.primary : AppTheme.primary.withValues(alpha: 0.08),
                              borderRadius: BorderRadius.circular(20),
                              border: Border.all(color: sel ? AppTheme.primary : AppTheme.primary.withValues(alpha: 0.25)),
                            ),
                            child: Text(f, style: TextStyle(color: sel ? Colors.white : AppTheme.textSecondary, fontSize: 12, fontWeight: FontWeight.w600)),
                          ),
                        );
                      },
                    ),
                  ),
                ),
                if (filtered.isEmpty)
                  const SliverFillRemaining(child: Center(child: Text('No items', style: TextStyle(color: AppTheme.textMuted))))
                else
                  SliverPadding(
                    padding: const EdgeInsets.all(16),
                    sliver: SliverList(
                      delegate: SliverChildBuilderDelegate((_, i) {
                        final item = filtered[i];
                        final status = item['status'] as String? ?? '';
                        final color = _statusColor(status);
                        final dueDate = item['dueDate'] as String?;
                        String daysStr = '';
                        if (dueDate != null) {
                          try {
                            final due = DateTime.parse(dueDate);
                            final diff = due.difference(DateTime.now()).inDays;
                            daysStr = diff < 0 ? '${diff.abs()}d overdue' : diff == 0 ? 'Due today' : 'Due in ${diff}d';
                          } catch (_) {}
                        }

                        return GestureDetector(
                          onTap: () => context.push('/compliance/${item['id']}'),
                          child: Container(
                          margin: const EdgeInsets.only(bottom: 12),
                          decoration: BoxDecoration(color: AppTheme.surface, borderRadius: BorderRadius.circular(16), border: Border.all(color: AppTheme.border)),
                          child: Row(children: [
                            Container(width: 4, height: 72, decoration: BoxDecoration(color: color, borderRadius: const BorderRadius.only(topLeft: Radius.circular(16), bottomLeft: Radius.circular(16)))),
                            Expanded(
                              child: Padding(
                                padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 12),
                                child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
                                  Row(children: [
                                    Expanded(child: Text(item['name'] as String? ?? '', style: const TextStyle(color: AppTheme.textPrimary, fontWeight: FontWeight.w600, fontSize: 13))),
                                    _chip(item['frequency'] as String? ?? '', AppTheme.textMuted),
                                  ]),
                                  const SizedBox(height: 4),
                                  Row(children: [
                                    _chip(item['category'] as String? ?? '', AppTheme.primary),
                                    const SizedBox(width: 6),
                                    if (daysStr.isNotEmpty)
                                      Text(daysStr, style: TextStyle(color: color, fontSize: 11, fontWeight: FontWeight.w600)),
                                  ]),
                                ]),
                              ),
                            ),
                          ]),
                          ),
                        );
                      }, childCount: filtered.length),
                    ),
                  ),
              ],
            );
          },
        ),
      ),
    );
  }

  Widget _chip(String text, Color color) => Container(
    padding: const EdgeInsets.symmetric(horizontal: 6, vertical: 2),
    decoration: BoxDecoration(color: color.withValues(alpha: 0.12), borderRadius: BorderRadius.circular(10), border: Border.all(color: color.withValues(alpha: 0.3))),
    child: Text(text, style: TextStyle(color: color, fontSize: 10, fontWeight: FontWeight.w600)),
  );
}

class _StatChip extends StatelessWidget {
  final String label;
  final int count;
  final Color color;
  const _StatChip(this.label, this.count, this.color);

  @override
  Widget build(BuildContext context) => Expanded(
    child: Container(
      padding: const EdgeInsets.symmetric(vertical: 8),
      decoration: BoxDecoration(color: color.withValues(alpha: 0.08), borderRadius: BorderRadius.circular(12), border: Border.all(color: color.withValues(alpha: 0.25))),
      child: Column(children: [
        Text('$count', style: TextStyle(color: color, fontSize: 18, fontWeight: FontWeight.bold)),
        Text(label, style: const TextStyle(color: AppTheme.textMuted, fontSize: 10)),
      ]),
    ),
  );
}
