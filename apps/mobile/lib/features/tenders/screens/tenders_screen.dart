import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import 'package:intl/intl.dart';
import '../../../core/theme/app_theme.dart';
import '../providers/tenders_provider.dart';

class TendersScreen extends ConsumerStatefulWidget {
  const TendersScreen({super.key});

  @override
  ConsumerState<TendersScreen> createState() => _TendersScreenState();
}

class _TendersScreenState extends ConsumerState<TendersScreen> {
  String _filter = 'All';
  final _filters = ['All', 'Active', 'Draft', 'Awarded', 'Expired'];

  @override
  Widget build(BuildContext context) {
    final tendersAsync = ref.watch(tendersListProvider);

    return Scaffold(
      backgroundColor: AppTheme.background,
      appBar: AppBar(
        title: const Text('Tenders'),
        actions: [
          IconButton(
            icon: const Icon(Icons.refresh_outlined),
            onPressed: () => ref.invalidate(tendersListProvider),
          ),
        ],
      ),
      floatingActionButton: FloatingActionButton(
        backgroundColor: AppTheme.primary,
        onPressed: () async {
          final result = await context.push('/tenders/new');
          if (result == true) ref.invalidate(tendersListProvider);
        },
        child: const Icon(Icons.add, color: Colors.white),
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
              final selected = _filter == f;
              return GestureDetector(
                onTap: () => setState(() => _filter = f),
                child: Container(
                  padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 4),
                  decoration: BoxDecoration(
                    color: selected
                        ? AppTheme.primary
                        : AppTheme.primary.withValues(alpha: 0.08),
                    borderRadius: BorderRadius.circular(20),
                    border: Border.all(
                        color: selected
                            ? AppTheme.primary
                            : AppTheme.primary.withValues(alpha: 0.25)),
                  ),
                  child: Text(f,
                      style: TextStyle(
                          color: selected
                              ? Colors.white
                              : AppTheme.textSecondary,
                          fontSize: 12,
                          fontWeight: FontWeight.w600)),
                ),
              );
            },
          ),
        ),
        Expanded(
          child: RefreshIndicator(
            color: AppTheme.primary,
            onRefresh: () async => ref.invalidate(tendersListProvider),
            child: tendersAsync.when(
              loading: () => const Center(
                  child: CircularProgressIndicator(color: AppTheme.primary)),
              error: (e, _) => Center(
                  child: TextButton(
                      onPressed: () => ref.invalidate(tendersListProvider),
                      child: const Text('Retry'))),
              data: (tenders) {
                final filtered = _filter == 'All'
                    ? tenders
                    : tenders.where((t) {
                        final s =
                            (t['status'] as String? ?? '').toUpperCase();
                        return switch (_filter) {
                          'Active' => s == 'ACTIVE' || s == 'SUBMITTED',
                          'Draft' => s == 'DRAFT',
                          'Awarded' => s == 'AWARDED',
                          'Expired' => s == 'EXPIRED',
                          _ => true,
                        };
                      }).toList();

                if (filtered.isEmpty) {
                  return const Center(
                      child: Text('No tenders found',
                          style: TextStyle(color: AppTheme.textMuted)));
                }
                return ListView.builder(
                  padding: const EdgeInsets.all(16),
                  itemCount: filtered.length,
                  itemBuilder: (_, i) => _TenderCard(tender: filtered[i]),
                );
              },
            ),
          ),
        ),
      ]),
    );
  }
}

class _TenderCard extends StatelessWidget {
  final Map<String, dynamic> tender;
  const _TenderCard({required this.tender});

  Color _statusColor(String s) => switch (s.toUpperCase()) {
        'AWARDED' => AppTheme.success,
        'SUBMITTED' || 'ACTIVE' => AppTheme.primary,
        'DRAFT' => AppTheme.warning,
        'REJECTED' || 'EXPIRED' => AppTheme.danger,
        _ => AppTheme.textMuted,
      };

  String _fmt(String? iso) {
    if (iso == null) return '—';
    try {
      return DateFormat('dd MMM yyyy').format(DateTime.parse(iso));
    } catch (_) {
      return iso;
    }
  }

  String _currency(dynamic val) {
    if (val == null) return '—';
    final n = (val is num) ? val.toDouble() : double.tryParse('$val') ?? 0;
    return NumberFormat.currency(locale: 'en_IN', symbol: '₹', decimalDigits: 0).format(n);
  }

  @override
  Widget build(BuildContext context) {
    final status = tender['status'] as String? ?? '';

    return GestureDetector(
      onTap: () => context.push('/tenders/${tender['id']}'),
      child: Container(
        margin: const EdgeInsets.only(bottom: 12),
        padding: const EdgeInsets.all(16),
        decoration: BoxDecoration(
          color: AppTheme.surface,
          borderRadius: BorderRadius.circular(16),
          border: Border.all(color: AppTheme.border),
        ),
        child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
          Row(children: [
            Expanded(
              child: Text(tender['tenderNumber'] as String? ?? '',
                  style: const TextStyle(
                      color: AppTheme.primary,
                      fontSize: 12,
                      fontWeight: FontWeight.w600)),
            ),
            _Badge(status, _statusColor(status)),
          ]),
          const SizedBox(height: 6),
          Text(tender['title'] as String? ?? '',
              style: const TextStyle(
                  color: AppTheme.textPrimary,
                  fontSize: 14,
                  fontWeight: FontWeight.w600)),
          const SizedBox(height: 4),
          Text(tender['clientName'] as String? ?? tender['client']?['name'] as String? ?? '',
              style: const TextStyle(color: AppTheme.textSecondary, fontSize: 13)),
          const SizedBox(height: 10),
          Row(children: [
            const Icon(Icons.schedule, size: 13, color: AppTheme.textMuted),
            const SizedBox(width: 4),
            Text('Due: ${_fmt(tender['bidDeadline'] as String?)}',
                style: const TextStyle(color: AppTheme.textMuted, fontSize: 12)),
            const Spacer(),
            Text(_currency(tender['estimatedValue']),
                style: const TextStyle(
                    color: AppTheme.textPrimary,
                    fontSize: 14,
                    fontWeight: FontWeight.w700)),
          ]),
        ]),
      ),
    );
  }
}

class _Badge extends StatelessWidget {
  final String text;
  final Color color;
  const _Badge(this.text, this.color);

  @override
  Widget build(BuildContext context) => Container(
        padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 3),
        decoration: BoxDecoration(
          color: color.withValues(alpha: 0.12),
          borderRadius: BorderRadius.circular(20),
          border: Border.all(color: color.withValues(alpha: 0.3)),
        ),
        child: Text(text,
            style: TextStyle(
                color: color, fontSize: 10, fontWeight: FontWeight.w600)),
      );
}
