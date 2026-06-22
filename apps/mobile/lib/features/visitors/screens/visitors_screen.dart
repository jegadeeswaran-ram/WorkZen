import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:intl/intl.dart';
import 'package:go_router/go_router.dart';
import '../../../core/network/api_client.dart';
import '../../../core/theme/app_theme.dart';

final _visitorsProvider =
    FutureProvider.autoDispose<List<Map<String, dynamic>>>((ref) async {
  final api = ref.watch(apiClientProvider);
  final r = await api.get('/visitors', queryParameters: {'page': '1', 'limit': '20'});
  final data = r.data['data'];
  if (data is List) return data.cast<Map<String, dynamic>>();
  if (data is Map && data['items'] is List) return (data['items'] as List).cast<Map<String, dynamic>>();
  return [];
});

class VisitorsScreen extends ConsumerStatefulWidget {
  const VisitorsScreen({super.key});

  @override
  ConsumerState<VisitorsScreen> createState() => _VisitorsScreenState();
}

class _VisitorsScreenState extends ConsumerState<VisitorsScreen> {
  String _filter = 'All';
  final _filters = ['All', 'Checked In', 'Expected'];

  Color _statusColor(String? s) => switch ((s ?? '').toUpperCase()) {
    'CHECKED_IN' => AppTheme.success,
    'EXPECTED' => AppTheme.primary,
    'CHECKED_OUT' => AppTheme.textMuted,
    _ => AppTheme.textMuted,
  };

  String _fmtTime(String? iso) {
    if (iso == null) return '—';
    try { return DateFormat('dd MMM, hh:mm a').format(DateTime.parse(iso)); } catch (_) { return iso; }
  }

  @override
  Widget build(BuildContext context) {
    final visitorsAsync = ref.watch(_visitorsProvider);

    return Scaffold(
      backgroundColor: AppTheme.background,
      appBar: AppBar(
        title: const Text('Visitors'),
        actions: [IconButton(icon: const Icon(Icons.refresh_outlined), onPressed: () => ref.invalidate(_visitorsProvider))],
      ),
      floatingActionButton: FloatingActionButton.extended(
        backgroundColor: AppTheme.success,
        onPressed: () async {
          final result = await context.push('/visitors/new');
          if (result == true) ref.invalidate(_visitorsProvider);
        },
        icon: const Icon(Icons.how_to_reg, color: Colors.white),
        label: const Text('Check In', style: TextStyle(color: Colors.white, fontWeight: FontWeight.w600)),
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
            onRefresh: () async => ref.invalidate(_visitorsProvider),
            child: visitorsAsync.when(
              loading: () => const Center(child: CircularProgressIndicator(color: AppTheme.primary)),
              error: (e, _) => Center(child: TextButton(onPressed: () => ref.invalidate(_visitorsProvider), child: const Text('Retry'))),
              data: (visitors) {
                final filtered = _filter == 'All' ? visitors : visitors.where((v) {
                  final s = (v['status'] as String? ?? '').toUpperCase();
                  return switch (_filter) {
                    'Checked In' => s == 'CHECKED_IN',
                    'Expected' => s == 'EXPECTED',
                    _ => true,
                  };
                }).toList();

                if (filtered.isEmpty) return const Center(child: Text('No visitors', style: TextStyle(color: AppTheme.textMuted)));

                return ListView.builder(
                  padding: const EdgeInsets.all(16),
                  itemCount: filtered.length,
                  itemBuilder: (_, i) {
                    final v = filtered[i];
                    final status = v['status'] as String? ?? '';
                    final color = _statusColor(status);
                    final name = v['visitorName'] as String? ?? '';
                    final host = v['hostEmployee'] as Map<String, dynamic>? ?? {};
                    final hostName = '${host['firstName'] ?? ''} ${host['lastName'] ?? ''}'.trim();

                    return Container(
                      margin: const EdgeInsets.only(bottom: 10),
                      padding: const EdgeInsets.all(14),
                      decoration: BoxDecoration(color: AppTheme.surface, borderRadius: BorderRadius.circular(14), border: Border.all(color: AppTheme.border)),
                      child: Row(children: [
                        Container(
                          width: 44, height: 44,
                          decoration: BoxDecoration(color: color.withValues(alpha: 0.12), shape: BoxShape.circle),
                          child: Center(child: Text(name.isNotEmpty ? name[0].toUpperCase() : '?', style: TextStyle(color: color, fontWeight: FontWeight.bold, fontSize: 16))),
                        ),
                        const SizedBox(width: 12),
                        Expanded(child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
                          Text(name, style: const TextStyle(color: AppTheme.textPrimary, fontSize: 13, fontWeight: FontWeight.w600)),
                          if (v['phone'] != null) Text(v['phone'] as String, style: const TextStyle(color: AppTheme.textMuted, fontSize: 12)),
                          if (v['purpose'] != null) Text(v['purpose'] as String, style: const TextStyle(color: AppTheme.textSecondary, fontSize: 12)),
                          if (hostName.isNotEmpty) Row(children: [
                            const Icon(Icons.person_outline, size: 11, color: AppTheme.textMuted),
                            const SizedBox(width: 3),
                            Text('Host: $hostName', style: const TextStyle(color: AppTheme.textMuted, fontSize: 11)),
                          ]),
                          Text('In: ${_fmtTime(v['checkInTime'] as String?)}  Out: ${v['checkOutTime'] != null ? _fmtTime(v['checkOutTime'] as String?) : 'Active'}',
                              style: const TextStyle(color: AppTheme.textMuted, fontSize: 11)),
                        ])),
                        Container(
                          padding: const EdgeInsets.symmetric(horizontal: 7, vertical: 3),
                          decoration: BoxDecoration(color: color.withValues(alpha: 0.12), borderRadius: BorderRadius.circular(10), border: Border.all(color: color.withValues(alpha: 0.3))),
                          child: Text(status.replaceAll('_', ' '), style: TextStyle(color: color, fontSize: 9, fontWeight: FontWeight.w600)),
                        ),
                      ]),
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
}
