import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import 'package:intl/intl.dart';
import '../../../core/theme/app_theme.dart';
import '../providers/recruitment_provider.dart';

class RecruitmentScreen extends ConsumerStatefulWidget {
  const RecruitmentScreen({super.key});

  @override
  ConsumerState<RecruitmentScreen> createState() => _RecruitmentScreenState();
}

class _RecruitmentScreenState extends ConsumerState<RecruitmentScreen> {
  String _filter = 'All';
  final _filters = ['All', 'Open', 'On Hold', 'Closed'];

  Color _statusColor(String? s) => switch ((s ?? '').toUpperCase()) {
    'OPEN' => AppTheme.success,
    'ON_HOLD' => AppTheme.warning,
    'CLOSED' => AppTheme.danger,
    _ => AppTheme.textMuted,
  };

  String _fmt(String? iso) {
    if (iso == null) return '—';
    try { return DateFormat('dd MMM yyyy').format(DateTime.parse(iso)); } catch (_) { return iso; }
  }

  @override
  Widget build(BuildContext context) {
    final jobsAsync = ref.watch(jobRequisitionsProvider);

    return Scaffold(
      backgroundColor: AppTheme.background,
      appBar: AppBar(
        title: const Text('Recruitment'),
        actions: [IconButton(icon: const Icon(Icons.refresh_outlined), onPressed: () => ref.invalidate(jobRequisitionsProvider))],
      ),
      body: Column(children: [
        SizedBox(
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
        Expanded(
          child: RefreshIndicator(
            color: AppTheme.primary,
            onRefresh: () async => ref.invalidate(jobRequisitionsProvider),
            child: jobsAsync.when(
              loading: () => const Center(child: CircularProgressIndicator(color: AppTheme.primary)),
              error: (e, _) => Center(child: TextButton(onPressed: () => ref.invalidate(jobRequisitionsProvider), child: const Text('Retry'))),
              data: (jobs) {
                final filtered = _filter == 'All' ? jobs : jobs.where((j) {
                  final s = (j['status'] as String? ?? '').toUpperCase();
                  return switch (_filter) {
                    'Open' => s == 'OPEN',
                    'On Hold' => s == 'ON_HOLD',
                    'Closed' => s == 'CLOSED',
                    _ => true,
                  };
                }).toList();

                if (filtered.isEmpty) return const Center(child: Text('No job requisitions', style: TextStyle(color: AppTheme.textMuted)));

                return ListView.builder(
                  padding: const EdgeInsets.all(16),
                  itemCount: filtered.length,
                  itemBuilder: (_, i) {
                    final job = filtered[i];
                    final status = job['status'] as String? ?? '';
                    final openings = (job['openings'] as num?)?.toInt() ?? 0;
                    final filled = (job['filled'] as num?)?.toInt() ?? 0;
                    final progress = openings > 0 ? filled / openings : 0.0;

                    return GestureDetector(
                      onTap: () => context.push('/recruitment/${job['id']}'),
                      child: Container(
                        margin: const EdgeInsets.only(bottom: 12),
                        padding: const EdgeInsets.all(16),
                        decoration: BoxDecoration(color: AppTheme.surface, borderRadius: BorderRadius.circular(16), border: Border.all(color: AppTheme.border)),
                        child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
                          Row(children: [
                            Expanded(child: Text(job['title'] as String? ?? '', style: const TextStyle(color: AppTheme.textPrimary, fontSize: 14, fontWeight: FontWeight.w600))),
                            _badge(status, _statusColor(status)),
                          ]),
                          const SizedBox(height: 6),
                          Row(children: [
                            const Icon(Icons.business_outlined, size: 13, color: AppTheme.textMuted),
                            const SizedBox(width: 4),
                            Text(job['department'] as String? ?? '', style: const TextStyle(color: AppTheme.textSecondary, fontSize: 12)),
                            const SizedBox(width: 12),
                            const Icon(Icons.location_on_outlined, size: 13, color: AppTheme.textMuted),
                            const SizedBox(width: 4),
                            Text(job['location'] as String? ?? '', style: const TextStyle(color: AppTheme.textSecondary, fontSize: 12)),
                          ]),
                          const SizedBox(height: 10),
                          Row(children: [
                            Expanded(child: ClipRRect(
                              borderRadius: BorderRadius.circular(4),
                              child: LinearProgressIndicator(
                                value: progress.clamp(0.0, 1.0),
                                backgroundColor: AppTheme.border,
                                valueColor: const AlwaysStoppedAnimation(AppTheme.success),
                                minHeight: 6,
                              ),
                            )),
                            const SizedBox(width: 10),
                            Text('$filled/$openings filled', style: const TextStyle(color: AppTheme.textMuted, fontSize: 11)),
                          ]),
                          const SizedBox(height: 4),
                          Text('Posted: ${_fmt(job['createdAt'] as String?)}', style: const TextStyle(color: AppTheme.textMuted, fontSize: 11)),
                        ]),
                      ),
                    );
                  },
                );
              },
            ),
          ),
        ),
      ]),
    );
  }

  Widget _badge(String text, Color color) => Container(
    padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 3),
    decoration: BoxDecoration(color: color.withValues(alpha: 0.12), borderRadius: BorderRadius.circular(20), border: Border.all(color: color.withValues(alpha: 0.3))),
    child: Text(text, style: TextStyle(color: color, fontSize: 10, fontWeight: FontWeight.w600)),
  );
}
