import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import '../../../core/theme/app_theme.dart';
import '../providers/clients_provider.dart';

class ClientsScreen extends ConsumerStatefulWidget {
  const ClientsScreen({super.key});

  @override
  ConsumerState<ClientsScreen> createState() => _ClientsScreenState();
}

class _ClientsScreenState extends ConsumerState<ClientsScreen> {
  String _filter = 'All';
  final _filters = ['All', 'Government', 'PSU', 'Private'];

  Color _typeColor(String? type) => switch ((type ?? '').toUpperCase()) {
        'GOVERNMENT' => AppTheme.primary,
        'PSU' => AppTheme.warning,
        'PRIVATE' => AppTheme.success,
        _ => AppTheme.textMuted,
      };

  @override
  Widget build(BuildContext context) {
    final clientsAsync = ref.watch(clientsListProvider);

    return Scaffold(
      backgroundColor: AppTheme.background,
      appBar: AppBar(
        title: const Text('Clients'),
        actions: [
          IconButton(
            icon: const Icon(Icons.refresh_outlined),
            onPressed: () => ref.invalidate(clientsListProvider),
          ),
        ],
      ),
      floatingActionButton: FloatingActionButton(
        backgroundColor: AppTheme.primary,
        onPressed: () async {
          final result = await context.push('/clients/new');
          if (result == true) ref.invalidate(clientsListProvider);
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
                          color: selected ? Colors.white : AppTheme.textSecondary,
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
            onRefresh: () async => ref.invalidate(clientsListProvider),
            child: clientsAsync.when(
              loading: () => const Center(
                  child: CircularProgressIndicator(color: AppTheme.primary)),
              error: (e, _) => Center(
                  child: TextButton(
                      onPressed: () => ref.invalidate(clientsListProvider),
                      child: const Text('Retry'))),
              data: (clients) {
                final filtered = _filter == 'All'
                    ? clients
                    : clients.where((c) {
                        final t = (c['type'] as String? ?? '').toUpperCase();
                        return t == _filter.toUpperCase();
                      }).toList();

                if (filtered.isEmpty) {
                  return const Center(
                      child: Text('No clients found',
                          style: TextStyle(color: AppTheme.textMuted)));
                }

                return ListView.builder(
                  padding: const EdgeInsets.all(16),
                  itemCount: filtered.length,
                  itemBuilder: (_, i) {
                    final c = filtered[i];
                    final type = c['type'] as String? ?? '';
                    final name = c['name'] as String? ?? '';
                    final initial = name.isNotEmpty ? name[0].toUpperCase() : '?';
                    final color = _typeColor(type);

                    return GestureDetector(
                      onTap: () => context.push('/clients/${c['id']}'),
                      child: Container(
                        margin: const EdgeInsets.only(bottom: 12),
                        padding: const EdgeInsets.all(14),
                        decoration: BoxDecoration(
                          color: AppTheme.surface,
                          borderRadius: BorderRadius.circular(16),
                          border: Border.all(color: AppTheme.border),
                        ),
                        child: Row(children: [
                          Container(
                            width: 44,
                            height: 44,
                            decoration: BoxDecoration(
                              color: color.withValues(alpha: 0.15),
                              shape: BoxShape.circle,
                              border: Border.all(
                                  color: color.withValues(alpha: 0.3)),
                            ),
                            child: Center(
                              child: Text(initial,
                                  style: TextStyle(
                                      color: color,
                                      fontWeight: FontWeight.bold,
                                      fontSize: 16)),
                            ),
                          ),
                          const SizedBox(width: 12),
                          Expanded(
                            child: Column(
                                crossAxisAlignment: CrossAxisAlignment.start,
                                children: [
                                  Text(name,
                                      style: const TextStyle(
                                          color: AppTheme.textPrimary,
                                          fontWeight: FontWeight.w600,
                                          fontSize: 14)),
                                  const SizedBox(height: 2),
                                  Text(c['code'] as String? ?? '',
                                      style: const TextStyle(
                                          color: AppTheme.textMuted,
                                          fontSize: 12)),
                                  const SizedBox(height: 4),
                                  Row(children: [
                                    Container(
                                      padding: const EdgeInsets.symmetric(
                                          horizontal: 6, vertical: 2),
                                      decoration: BoxDecoration(
                                        color: color.withValues(alpha: 0.12),
                                        borderRadius: BorderRadius.circular(10),
                                        border: Border.all(
                                            color: color.withValues(alpha: 0.3)),
                                      ),
                                      child: Text(type,
                                          style: TextStyle(
                                              color: color,
                                              fontSize: 10,
                                              fontWeight: FontWeight.w600)),
                                    ),
                                    const SizedBox(width: 8),
                                    if (c['city'] != null)
                                      Row(children: [
                                        const Icon(Icons.location_on,
                                            size: 11,
                                            color: AppTheme.textMuted),
                                        const SizedBox(width: 2),
                                        Text(c['city'] as String,
                                            style: const TextStyle(
                                                color: AppTheme.textMuted,
                                                fontSize: 11)),
                                      ]),
                                  ]),
                                ]),
                          ),
                          const Icon(Icons.chevron_right,
                              color: AppTheme.textMuted),
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
}
