import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:intl/intl.dart';
import '../../../core/theme/app_theme.dart';
import '../providers/recruitment_provider.dart';

class JobDetailScreen extends ConsumerWidget {
  final String requisitionId;
  const JobDetailScreen({super.key, required this.requisitionId});

  Color _candidateStatusColor(String? s) => switch ((s ?? '').toUpperCase()) {
    'HIRED' => AppTheme.success,
    'OFFERED' => AppTheme.primary,
    'INTERVIEW' => AppTheme.warning,
    'REJECTED' => AppTheme.danger,
    'SCREENING' => AppTheme.primaryLight,
    _ => AppTheme.textMuted,
  };

  String _fmt(String? iso) {
    if (iso == null) return '—';
    try { return DateFormat('dd MMM yyyy').format(DateTime.parse(iso)); } catch (_) { return iso; }
  }

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final jobsAsync = ref.watch(jobRequisitionsProvider);
    final candidatesAsync = ref.watch(jobCandidatesProvider(requisitionId));

    return Scaffold(
      backgroundColor: AppTheme.background,
      appBar: AppBar(title: const Text('Job Details')),
      body: jobsAsync.when(
        loading: () => const Center(child: CircularProgressIndicator(color: AppTheme.primary)),
        error: (_, __) => const Center(child: Text('Failed to load', style: TextStyle(color: AppTheme.danger))),
        data: (jobs) {
          final job = jobs.where((j) => j['id'] == requisitionId).firstOrNull;
          if (job == null) return const Center(child: Text('Job not found', style: TextStyle(color: AppTheme.textMuted)));

          final openings = (job['openings'] as num?)?.toInt() ?? 0;
          final filled = (job['filled'] as num?)?.toInt() ?? 0;

          return SingleChildScrollView(
            padding: const EdgeInsets.all(16),
            child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
              Container(
                width: double.infinity, padding: const EdgeInsets.all(16),
                decoration: BoxDecoration(color: AppTheme.surface, borderRadius: BorderRadius.circular(16), border: Border.all(color: AppTheme.border)),
                child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
                  Text(job['title'] as String? ?? '', style: const TextStyle(color: AppTheme.textPrimary, fontSize: 18, fontWeight: FontWeight.w700)),
                  const SizedBox(height: 8),
                  Row(children: [
                    const Icon(Icons.business_outlined, size: 14, color: AppTheme.textMuted),
                    const SizedBox(width: 4),
                    Text(job['department'] as String? ?? '', style: const TextStyle(color: AppTheme.textSecondary, fontSize: 13)),
                    const SizedBox(width: 12),
                    const Icon(Icons.location_on_outlined, size: 14, color: AppTheme.textMuted),
                    const SizedBox(width: 4),
                    Text(job['location'] as String? ?? '', style: const TextStyle(color: AppTheme.textSecondary, fontSize: 13)),
                  ]),
                  const SizedBox(height: 12),
                  Row(children: [
                    Expanded(child: ClipRRect(
                      borderRadius: BorderRadius.circular(4),
                      child: LinearProgressIndicator(
                        value: openings > 0 ? (filled / openings).clamp(0.0, 1.0) : 0,
                        backgroundColor: AppTheme.border,
                        valueColor: const AlwaysStoppedAnimation(AppTheme.success),
                        minHeight: 8,
                      ),
                    )),
                    const SizedBox(width: 10),
                    Text('$filled / $openings filled', style: const TextStyle(color: AppTheme.textSecondary, fontSize: 12, fontWeight: FontWeight.w600)),
                  ]),
                ]),
              ),
              const SizedBox(height: 16),
              const Text('Candidates', style: TextStyle(color: AppTheme.textPrimary, fontWeight: FontWeight.w600, fontSize: 14)),
              const SizedBox(height: 10),
              candidatesAsync.when(
                loading: () => const Center(child: CircularProgressIndicator(color: AppTheme.primary)),
                error: (e, _) => Center(child: TextButton(onPressed: () => ref.invalidate(jobCandidatesProvider(requisitionId)), child: const Text('Retry'))),
                data: (candidates) {
                  if (candidates.isEmpty) return const Center(child: Padding(padding: EdgeInsets.all(24), child: Text('No candidates yet', style: TextStyle(color: AppTheme.textMuted))));
                  return Column(children: candidates.map((c) {
                    final status = c['status'] as String? ?? '';
                    final color = _candidateStatusColor(status);
                    final name = c['name'] as String? ?? '';
                    return Container(
                      margin: const EdgeInsets.only(bottom: 10),
                      padding: const EdgeInsets.all(14),
                      decoration: BoxDecoration(color: AppTheme.surface, borderRadius: BorderRadius.circular(14), border: Border.all(color: AppTheme.border)),
                      child: Row(children: [
                        Container(
                          width: 40, height: 40,
                          decoration: BoxDecoration(color: color.withValues(alpha: 0.12), shape: BoxShape.circle),
                          child: Center(child: Text(name.isNotEmpty ? name[0].toUpperCase() : '?', style: TextStyle(color: color, fontWeight: FontWeight.bold))),
                        ),
                        const SizedBox(width: 12),
                        Expanded(child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
                          Text(name, style: const TextStyle(color: AppTheme.textPrimary, fontSize: 13, fontWeight: FontWeight.w600)),
                          if (c['phone'] != null) Text(c['phone'] as String, style: const TextStyle(color: AppTheme.textMuted, fontSize: 12)),
                          Text('Applied: ${_fmt(c['appliedAt'] as String?)}', style: const TextStyle(color: AppTheme.textMuted, fontSize: 11)),
                        ])),
                        Container(
                          padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 3),
                          decoration: BoxDecoration(color: color.withValues(alpha: 0.12), borderRadius: BorderRadius.circular(10), border: Border.all(color: color.withValues(alpha: 0.3))),
                          child: Text(status, style: TextStyle(color: color, fontSize: 10, fontWeight: FontWeight.w600)),
                        ),
                      ]),
                    );
                  }).toList());
                },
              ),
              const SizedBox(height: 24),
            ]),
          );
        },
      ),
    );
  }
}
