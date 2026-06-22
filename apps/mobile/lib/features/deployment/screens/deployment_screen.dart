import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import 'package:intl/intl.dart';
import '../../../core/theme/app_theme.dart';
import '../providers/deployment_provider.dart';

class DeploymentScreen extends ConsumerStatefulWidget {
  const DeploymentScreen({super.key});

  @override
  ConsumerState<DeploymentScreen> createState() => _DeploymentScreenState();
}

class _DeploymentScreenState extends ConsumerState<DeploymentScreen> {
  String _filter = 'Active';
  final _filters = ['Active', 'Inactive', 'All'];

  Color _statusColor(String? s) => switch ((s ?? '').toUpperCase()) {
    'ACTIVE' => AppTheme.success,
    'INACTIVE' => AppTheme.textMuted,
    'TRANSFERRED' => AppTheme.warning,
    _ => AppTheme.textMuted,
  };

  String _fmt(String? iso) {
    if (iso == null) return '—';
    try { return DateFormat('dd MMM yyyy').format(DateTime.parse(iso)); } catch (_) { return iso; }
  }

  @override
  Widget build(BuildContext context) {
    final deploymentsAsync = ref.watch(deploymentsListProvider);

    return Scaffold(
      backgroundColor: AppTheme.background,
      appBar: AppBar(
        title: const Text('Deployments'),
        actions: [IconButton(icon: const Icon(Icons.refresh_outlined), onPressed: () => ref.invalidate(deploymentsListProvider))],
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
            onRefresh: () async => ref.invalidate(deploymentsListProvider),
            child: deploymentsAsync.when(
              loading: () => const Center(child: CircularProgressIndicator(color: AppTheme.primary)),
              error: (e, _) => Center(child: TextButton(onPressed: () => ref.invalidate(deploymentsListProvider), child: const Text('Retry'))),
              data: (deployments) {
                final filtered = _filter == 'All' ? deployments : deployments.where((d) {
                  final s = (d['status'] as String? ?? '').toUpperCase();
                  return s == _filter.toUpperCase();
                }).toList();

                if (filtered.isEmpty) return const Center(child: Text('No deployments', style: TextStyle(color: AppTheme.textMuted)));

                return ListView.builder(
                  padding: const EdgeInsets.all(16),
                  itemCount: filtered.length,
                  itemBuilder: (_, i) {
                    final d = filtered[i];
                    final emp = d['employee'] as Map<String, dynamic>? ?? {};
                    final site = d['site'] as Map<String, dynamic>? ?? {};
                    final shift = d['shift'] as Map<String, dynamic>? ?? {};
                    final status = d['status'] as String? ?? '';
                    final empName = '${emp['firstName'] ?? ''} ${emp['lastName'] ?? ''}'.trim();

                    return GestureDetector(
                      onTap: () => context.push('/deployment/${d['id']}'),
                      child: Container(
                      margin: const EdgeInsets.only(bottom: 12),
                      padding: const EdgeInsets.all(16),
                      decoration: BoxDecoration(color: AppTheme.surface, borderRadius: BorderRadius.circular(16), border: Border.all(color: AppTheme.border)),
                      child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
                        Row(children: [
                          Expanded(child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
                            Text(empName.isEmpty ? 'Unknown' : empName, style: const TextStyle(color: AppTheme.textPrimary, fontSize: 14, fontWeight: FontWeight.w600)),
                            Text(emp['employeeCode'] as String? ?? '', style: const TextStyle(color: AppTheme.textMuted, fontSize: 12)),
                          ])),
                          _badge(status, _statusColor(status)),
                        ]),
                        const SizedBox(height: 10),
                        const Divider(height: 1, color: AppTheme.border),
                        const SizedBox(height: 10),
                        if (site['name'] != null)
                          _infoRow(Icons.location_on_outlined, '${site['name']}${site['location'] != null ? ' • ${site['location']}' : ''}'),
                        if (site['clientName'] != null)
                          _infoRow(Icons.business_outlined, site['clientName'] as String),
                        if (shift['name'] != null)
                          _infoRow(Icons.schedule_outlined, '${shift['name']}: ${shift['startTime'] ?? ''} – ${shift['endTime'] ?? ''}'),
                        _infoRow(Icons.calendar_today_outlined, 'Since ${_fmt(d['startDate'] as String?)}'),
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

  Widget _infoRow(IconData icon, String text) => Padding(
    padding: const EdgeInsets.only(bottom: 4),
    child: Row(children: [
      Icon(icon, size: 13, color: AppTheme.textMuted),
      const SizedBox(width: 6),
      Expanded(child: Text(text, style: const TextStyle(color: AppTheme.textSecondary, fontSize: 12))),
    ]),
  );

  Widget _badge(String text, Color color) => Container(
    padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 3),
    decoration: BoxDecoration(color: color.withValues(alpha: 0.12), borderRadius: BorderRadius.circular(20), border: Border.all(color: color.withValues(alpha: 0.3))),
    child: Text(text, style: TextStyle(color: color, fontSize: 10, fontWeight: FontWeight.w600)),
  );
}
