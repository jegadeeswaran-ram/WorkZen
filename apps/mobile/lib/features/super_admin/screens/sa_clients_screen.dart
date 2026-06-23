import 'package:flutter/material.dart';
import 'package:flutter_animate/flutter_animate.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../../../core/theme/app_theme.dart';
import '../providers/super_admin_provider.dart';
import '../widgets/sa_stat_chip.dart';

String _fmt(double v) {
  if (v >= 10000000) return '₹${(v / 10000000).toStringAsFixed(1)}Cr';
  if (v >= 100000) return '₹${(v / 100000).toStringAsFixed(1)}L';
  if (v >= 1000) return '₹${(v / 1000).toStringAsFixed(0)}K';
  return '₹${v.toStringAsFixed(0)}';
}

Color _typeColor(String type) {
  switch (type.toUpperCase()) {
    case 'GOVERNMENT_DEPARTMENT':
      return const Color(0xFF60A5FA);
    case 'PSU':
      return const Color(0xFF8B5CF6);
    default:
      return AppTheme.success;
  }
}

String _typeLabel(String type) {
  switch (type.toUpperCase()) {
    case 'GOVERNMENT_DEPARTMENT':
      return 'Govt';
    case 'PSU':
      return 'PSU';
    case 'PRIVATE_ORGANIZATION':
      return 'Private';
    default:
      return type;
  }
}

const _filterOptions = [
  ('All', ''),
  ('Govt', 'GOVERNMENT_DEPARTMENT'),
  ('PSU', 'PSU'),
  ('Private', 'PRIVATE_ORGANIZATION'),
];

class SaClientsScreen extends ConsumerStatefulWidget {
  const SaClientsScreen({super.key});

  @override
  ConsumerState<SaClientsScreen> createState() => _SaClientsScreenState();
}

class _SaClientsScreenState extends ConsumerState<SaClientsScreen> {
  String _search = '';
  String _typeFilter = '';
  bool _showSearch = false;

  @override
  Widget build(BuildContext context) {
    final clientsAsync = ref.watch(saClientsProvider);

    return Scaffold(
      backgroundColor: AppTheme.background,
      appBar: AppBar(
        title: _showSearch
            ? TextField(
                autofocus: true,
                style: const TextStyle(color: AppTheme.textPrimary),
                decoration: const InputDecoration(
                  hintText: 'Search clients…',
                  border: InputBorder.none,
                  hintStyle: TextStyle(color: AppTheme.textMuted),
                ),
                onChanged: (v) => setState(() => _search = v),
              )
            : const Text('Clients'),
        backgroundColor: AppTheme.surface,
        actions: [
          IconButton(
            icon: Icon(
              _showSearch ? Icons.close : Icons.search,
              color: AppTheme.textSecondary,
            ),
            onPressed: () => setState(() {
              _showSearch = !_showSearch;
              if (!_showSearch) _search = '';
            }),
          ),
        ],
      ),
      body: Column(
        children: [
          // Filter chips
          SizedBox(
            height: 48,
            child: ListView.separated(
              scrollDirection: Axis.horizontal,
              padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 8),
              itemCount: _filterOptions.length,
              separatorBuilder: (_, __) => const SizedBox(width: 8),
              itemBuilder: (context, i) {
                final (label, value) = _filterOptions[i];
                final selected = _typeFilter == value;
                return GestureDetector(
                  onTap: () => setState(() => _typeFilter = value),
                  child: AnimatedContainer(
                    duration: 200.ms,
                    padding: const EdgeInsets.symmetric(
                        horizontal: 14, vertical: 6),
                    decoration: BoxDecoration(
                      color: selected
                          ? AppTheme.primary.withValues(alpha: 0.15)
                          : AppTheme.surfaceVariant,
                      borderRadius: BorderRadius.circular(20),
                      border: Border.all(
                        color: selected
                            ? AppTheme.primary
                            : AppTheme.border,
                      ),
                    ),
                    child: Text(
                      label,
                      style: TextStyle(
                        fontSize: 12,
                        fontWeight: FontWeight.w600,
                        color: selected
                            ? AppTheme.primary
                            : AppTheme.textSecondary,
                      ),
                    ),
                  ),
                );
              },
            ),
          ),
          Expanded(
            child: clientsAsync.when(
              data: (clients) {
                final filtered = clients.where((c) {
                  final matchType =
                      _typeFilter.isEmpty || c.type == _typeFilter;
                  final matchSearch = _search.isEmpty ||
                      c.name
                          .toLowerCase()
                          .contains(_search.toLowerCase());
                  return matchType && matchSearch;
                }).toList();

                if (filtered.isEmpty) {
                  return const Center(
                    child: Text(
                      'No clients found',
                      style: TextStyle(
                          fontSize: 14, color: AppTheme.textMuted),
                    ),
                  );
                }

                return RefreshIndicator(
                  color: AppTheme.primary,
                  onRefresh: () async {
                    ref.invalidate(saClientsProvider);
                    await ref
                        .read(saClientsProvider.future)
                        .catchError((_) => <SaClient>[]);
                  },
                  child: ListView.builder(
                    padding: const EdgeInsets.symmetric(vertical: 6),
                    itemCount: filtered.length,
                    itemBuilder: (context, i) =>
                        _ClientCard(client: filtered[i])
                            .animate()
                            .fadeIn(delay: (i * 30).ms, duration: 250.ms),
                  ),
                );
              },
              loading: () => const Center(
                child: CircularProgressIndicator(color: AppTheme.primary),
              ),
              error: (e, _) => Center(
                child: Padding(
                  padding: const EdgeInsets.all(24),
                  child: Text(
                    e.toString(),
                    style: const TextStyle(
                        fontSize: 13, color: AppTheme.textSecondary),
                    textAlign: TextAlign.center,
                  ),
                ),
              ),
            ),
          ),
        ],
      ),
    );
  }
}

class _ClientCard extends StatelessWidget {
  const _ClientCard({required this.client});

  final SaClient client;

  @override
  Widget build(BuildContext context) {
    final typeColor = _typeColor(client.type);

    return Container(
      margin: const EdgeInsets.symmetric(horizontal: 16, vertical: 6),
      padding: const EdgeInsets.all(14),
      decoration: BoxDecoration(
        color: AppTheme.surfaceVariant,
        borderRadius: BorderRadius.circular(12),
        border: Border.all(color: AppTheme.border),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            children: [
              Container(
                width: 40,
                height: 40,
                decoration: BoxDecoration(
                  gradient: LinearGradient(
                    colors: [
                      typeColor.withValues(alpha: 0.3),
                      typeColor.withValues(alpha: 0.1),
                    ],
                    begin: Alignment.topLeft,
                    end: Alignment.bottomRight,
                  ),
                  borderRadius: BorderRadius.circular(10),
                ),
                child: Icon(Icons.business, color: typeColor, size: 20),
              ),
              const SizedBox(width: 12),
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(
                      client.name,
                      style: const TextStyle(
                        fontSize: 14,
                        fontWeight: FontWeight.w700,
                        color: AppTheme.textPrimary,
                      ),
                      overflow: TextOverflow.ellipsis,
                    ),
                    const SizedBox(height: 2),
                    SaStatChip(
                        label: _typeLabel(client.type), color: typeColor),
                  ],
                ),
              ),
              const SizedBox(width: 8),
              if (client.outstandingBalance > 0)
                Text(
                  _fmt(client.outstandingBalance),
                  style: const TextStyle(
                    fontSize: 13,
                    fontWeight: FontWeight.w700,
                    color: AppTheme.warning,
                  ),
                ),
            ],
          ),
          const SizedBox(height: 10),
          Row(
            children: [
              const Icon(Icons.description_outlined,
                  size: 13, color: AppTheme.textSecondary),
              const SizedBox(width: 4),
              Text(
                'Active Tenders: ${client.activeTenders}',
                style: const TextStyle(
                    fontSize: 12, color: AppTheme.textSecondary),
              ),
            ],
          ),
          if (client.outstandingBalance > 0) ...[
            const SizedBox(height: 4),
            Row(
              children: [
                const Icon(Icons.account_balance_wallet_outlined,
                    size: 13, color: AppTheme.warning),
                const SizedBox(width: 4),
                Text(
                  'Outstanding: ${_fmt(client.outstandingBalance)}',
                  style: const TextStyle(
                      fontSize: 12, color: AppTheme.warning),
                ),
              ],
            ),
          ],
        ],
      ),
    );
  }
}
