import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import '../../../core/theme/app_theme.dart';
import '../../deployment/providers/deployment_provider.dart';

class SitesScreen extends ConsumerWidget {
  const SitesScreen({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final sitesAsync = ref.watch(mySitesProvider);

    return Scaffold(
      backgroundColor: AppTheme.background,
      appBar: AppBar(
        title: const Text('My Sites'),
        actions: [IconButton(icon: const Icon(Icons.refresh_outlined), onPressed: () => ref.invalidate(mySitesProvider))],
      ),
      body: RefreshIndicator(
        color: AppTheme.primary,
        onRefresh: () async => ref.invalidate(mySitesProvider),
        child: sitesAsync.when(
          loading: () => const Center(child: CircularProgressIndicator(color: AppTheme.primary)),
          error: (e, _) => Center(
            child: Column(mainAxisSize: MainAxisSize.min, children: [
              const Icon(Icons.error_outline, color: AppTheme.danger, size: 40),
              const SizedBox(height: 12),
              TextButton(onPressed: () => ref.invalidate(mySitesProvider), child: const Text('Retry')),
            ]),
          ),
          data: (sites) {
            if (sites.isEmpty) {
              return const Center(
                child: Column(mainAxisSize: MainAxisSize.min, children: [
                  Icon(Icons.location_off_outlined, color: AppTheme.textMuted, size: 48),
                  SizedBox(height: 12),
                  Text('No sites assigned', style: TextStyle(color: AppTheme.textMuted)),
                ]),
              );
            }
            return ListView.builder(
              padding: const EdgeInsets.all(16),
              itemCount: sites.length,
              itemBuilder: (_, i) => _SiteCard(site: sites[i]),
            );
          },
        ),
      ),
    );
  }
}

class _SiteCard extends StatelessWidget {
  final Map<String, dynamic> site;
  const _SiteCard({required this.site});

  @override
  Widget build(BuildContext context) {
    final active = (site['activeDeployments'] as num?)?.toInt() ?? 0;
    final total = (site['totalCapacity'] as num?)?.toInt() ?? 0;
    final progress = total > 0 ? active / total : 0.0;
    final siteId = site['id'] as String? ?? '';

    return Container(
      margin: const EdgeInsets.only(bottom: 14),
      padding: const EdgeInsets.all(16),
      decoration: BoxDecoration(
        color: AppTheme.surface,
        borderRadius: BorderRadius.circular(16),
        border: Border.all(color: AppTheme.border),
      ),
      child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
        Row(children: [
          Container(
            width: 40, height: 40,
            decoration: BoxDecoration(color: AppTheme.primary.withValues(alpha: 0.12), borderRadius: BorderRadius.circular(10)),
            child: const Icon(Icons.location_city_outlined, color: AppTheme.primary, size: 20),
          ),
          const SizedBox(width: 12),
          Expanded(child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
            Text(site['name'] as String? ?? '', style: const TextStyle(color: AppTheme.textPrimary, fontSize: 14, fontWeight: FontWeight.w700)),
            Text(site['clientName'] as String? ?? '', style: const TextStyle(color: AppTheme.textSecondary, fontSize: 12)),
          ])),
          Container(
            padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 3),
            decoration: BoxDecoration(
              color: AppTheme.success.withValues(alpha: 0.12),
              borderRadius: BorderRadius.circular(20),
              border: Border.all(color: AppTheme.success.withValues(alpha: 0.3)),
            ),
            child: const Text('ACTIVE', style: TextStyle(color: AppTheme.success, fontSize: 10, fontWeight: FontWeight.w600)),
          ),
        ]),
        if (site['location'] != null) ...[
          const SizedBox(height: 8),
          Row(children: [
            const Icon(Icons.place_outlined, size: 13, color: AppTheme.textMuted),
            const SizedBox(width: 4),
            Text(site['location'] as String, style: const TextStyle(color: AppTheme.textMuted, fontSize: 12)),
          ]),
        ],
        const SizedBox(height: 12),
        Row(children: [
          const Icon(Icons.people_outline, size: 13, color: AppTheme.textMuted),
          const SizedBox(width: 4),
          Text('$active / $total deployed', style: const TextStyle(color: AppTheme.textSecondary, fontSize: 12)),
        ]),
        const SizedBox(height: 6),
        ClipRRect(
          borderRadius: BorderRadius.circular(4),
          child: LinearProgressIndicator(
            value: progress.clamp(0.0, 1.0),
            backgroundColor: AppTheme.border,
            valueColor: const AlwaysStoppedAnimation(AppTheme.success),
            minHeight: 6,
          ),
        ),
        const SizedBox(height: 12),
        Row(children: [
          Expanded(
            child: _ActionBtn(
              label: 'Attendance',
              icon: Icons.fingerprint,
              color: AppTheme.primary,
              onTap: () => context.go('/supervisor/team-attendance'),
            ),
          ),
          const SizedBox(width: 8),
          Expanded(
            child: _ActionBtn(
              label: 'Complaints',
              icon: Icons.report_problem_outlined,
              color: AppTheme.warning,
              onTap: () => context.push('/supervisor/complaints', extra: siteId),
            ),
          ),
          const SizedBox(width: 8),
          Expanded(
            child: _ActionBtn(
              label: 'Activity',
              icon: Icons.assignment_outlined,
              color: AppTheme.success,
              onTap: () => context.push('/supervisor/activity', extra: siteId),
            ),
          ),
        ]),
      ]),
    );
  }
}

class _ActionBtn extends StatelessWidget {
  final String label;
  final IconData icon;
  final Color color;
  final VoidCallback onTap;
  const _ActionBtn({required this.label, required this.icon, required this.color, required this.onTap});

  @override
  Widget build(BuildContext context) => GestureDetector(
    onTap: onTap,
    child: Container(
      padding: const EdgeInsets.symmetric(vertical: 8),
      decoration: BoxDecoration(
        color: color.withValues(alpha: 0.08),
        borderRadius: BorderRadius.circular(10),
        border: Border.all(color: color.withValues(alpha: 0.25)),
      ),
      child: Column(mainAxisSize: MainAxisSize.min, children: [
        Icon(icon, size: 16, color: color),
        const SizedBox(height: 3),
        Text(label, style: TextStyle(color: color, fontSize: 10, fontWeight: FontWeight.w600)),
      ]),
    ),
  );
}
