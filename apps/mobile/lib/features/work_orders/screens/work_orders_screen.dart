import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import 'package:intl/intl.dart';
import '../../../core/theme/app_theme.dart';
import '../providers/work_orders_provider.dart';

class WorkOrdersScreen extends ConsumerStatefulWidget {
  const WorkOrdersScreen({super.key});

  @override
  ConsumerState<WorkOrdersScreen> createState() => _WorkOrdersScreenState();
}

class _WorkOrdersScreenState extends ConsumerState<WorkOrdersScreen> {
  String _filter = 'All';
  final _filters = ['All', 'Active', 'Pending', 'Completed'];

  Color _statusColor(String? s) => switch ((s ?? '').toUpperCase()) {
        'ACTIVE' => AppTheme.success,
        'PENDING' => AppTheme.warning,
        'COMPLETED' => AppTheme.primary,
        'CANCELLED' => AppTheme.danger,
        _ => AppTheme.textMuted,
      };

  String _fmt(String? iso) {
    if (iso == null) return '—';
    try { return DateFormat('dd MMM yy').format(DateTime.parse(iso)); } catch (_) { return iso; }
  }

  String _currency(dynamic val) {
    if (val == null) return '—';
    final n = (val is num) ? val.toDouble() : double.tryParse('$val') ?? 0;
    return NumberFormat.currency(locale: 'en_IN', symbol: '₹', decimalDigits: 0).format(n);
  }

  @override
  Widget build(BuildContext context) {
    final ordersAsync = ref.watch(workOrdersListProvider);

    return Scaffold(
      backgroundColor: AppTheme.background,
      appBar: AppBar(
        title: const Text('Work Orders'),
        actions: [
          IconButton(icon: const Icon(Icons.refresh_outlined),
              onPressed: () => ref.invalidate(workOrdersListProvider)),
        ],
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
            onRefresh: () async => ref.invalidate(workOrdersListProvider),
            child: ordersAsync.when(
              loading: () => const Center(child: CircularProgressIndicator(color: AppTheme.primary)),
              error: (e, _) => Center(child: TextButton(onPressed: () => ref.invalidate(workOrdersListProvider), child: const Text('Retry'))),
              data: (orders) {
                final filtered = _filter == 'All' ? orders : orders.where((o) {
                  final s = (o['status'] as String? ?? '').toUpperCase();
                  return s == _filter.toUpperCase();
                }).toList();

                if (filtered.isEmpty) return const Center(child: Text('No work orders', style: TextStyle(color: AppTheme.textMuted)));

                return ListView.builder(
                  padding: const EdgeInsets.all(16),
                  itemCount: filtered.length,
                  itemBuilder: (_, i) {
                    final wo = filtered[i];
                    final status = wo['status'] as String? ?? '';
                    return GestureDetector(
                      onTap: () => context.push('/work-orders/${wo['id']}'),
                      child: Container(
                        margin: const EdgeInsets.only(bottom: 12),
                        padding: const EdgeInsets.all(16),
                        decoration: BoxDecoration(color: AppTheme.surface, borderRadius: BorderRadius.circular(16), border: Border.all(color: AppTheme.border)),
                        child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
                          Row(children: [
                            Expanded(child: Text(wo['orderNumber'] as String? ?? '', style: const TextStyle(color: AppTheme.primary, fontSize: 12, fontWeight: FontWeight.w600))),
                            _badge(status, _statusColor(status)),
                          ]),
                          const SizedBox(height: 6),
                          Text(wo['title'] as String? ?? '', style: const TextStyle(color: AppTheme.textPrimary, fontSize: 14, fontWeight: FontWeight.w600)),
                          const SizedBox(height: 4),
                          Text(wo['clientName'] as String? ?? (wo['client'] as Map?)?['name'] as String? ?? '', style: const TextStyle(color: AppTheme.textSecondary, fontSize: 13)),
                          const SizedBox(height: 8),
                          Row(children: [
                            const Icon(Icons.calendar_today, size: 12, color: AppTheme.textMuted),
                            const SizedBox(width: 4),
                            Text('${_fmt(wo['startDate'] as String?)} – ${_fmt(wo['endDate'] as String?)}', style: const TextStyle(color: AppTheme.textMuted, fontSize: 12)),
                            const Spacer(),
                            Text(_currency(wo['value']), style: const TextStyle(color: AppTheme.textPrimary, fontSize: 14, fontWeight: FontWeight.w700)),
                          ]),
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
