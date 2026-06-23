import 'package:flutter/material.dart';
import 'package:flutter_animate/flutter_animate.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import 'package:shimmer/shimmer.dart';
import '../../../core/theme/app_theme.dart';
import '../providers/super_admin_provider.dart';
import '../widgets/sa_stat_chip.dart';

// ── SCREEN ────────────────────────────────────────────────────────────────────

class SaSitesScreen extends ConsumerStatefulWidget {
  const SaSitesScreen({super.key});

  @override
  ConsumerState<SaSitesScreen> createState() => _SaSitesScreenState();
}

class _SaSitesScreenState extends ConsumerState<SaSitesScreen> {
  String _filter = 'ALL';
  String _search = '';
  bool _showSearch = false;
  final _searchController = TextEditingController();

  static const _filters = ['ALL', 'ACTIVE', 'ISSUE', 'INACTIVE'];

  @override
  void dispose() {
    _searchController.dispose();
    super.dispose();
  }

  Color _statusColor(String status) {
    switch (status.toUpperCase()) {
      case 'ACTIVE':
        return AppTheme.success;
      case 'ISSUE':
        return AppTheme.warning;
      default:
        return AppTheme.textMuted;
    }
  }

  @override
  Widget build(BuildContext context) {
    final sitesAsync = ref.watch(saSitesProvider);

    return Scaffold(
      backgroundColor: AppTheme.background,
      appBar: AppBar(
        title: _showSearch
            ? TextField(
                controller: _searchController,
                autofocus: true,
                style: const TextStyle(
                  color: AppTheme.textPrimary,
                  fontSize: 15,
                ),
                decoration: const InputDecoration(
                  hintText: 'Search sites…',
                  hintStyle: TextStyle(
                    color: AppTheme.textMuted,
                    fontSize: 15,
                  ),
                  border: InputBorder.none,
                  enabledBorder: InputBorder.none,
                  focusedBorder: InputBorder.none,
                  contentPadding: EdgeInsets.zero,
                  isDense: true,
                  fillColor: Colors.transparent,
                  filled: false,
                ),
                onChanged: (v) => setState(() => _search = v.toLowerCase()),
              )
            : const Text('Site Management'),
        actions: [
          IconButton(
            icon: Icon(
              _showSearch ? Icons.close : Icons.search,
              color: AppTheme.textSecondary,
            ),
            onPressed: () {
              setState(() {
                _showSearch = !_showSearch;
                if (!_showSearch) {
                  _search = '';
                  _searchController.clear();
                }
              });
            },
          ),
          IconButton(
            icon: const Icon(Icons.refresh, color: AppTheme.textSecondary),
            onPressed: () => ref.invalidate(saSitesProvider),
            tooltip: 'Refresh',
          ),
        ],
      ),
      body: Column(
        children: [
          // ── FILTER CHIPS ────────────────────────────────────────────────
          Container(
            color: AppTheme.surface,
            padding: const EdgeInsets.fromLTRB(12, 8, 12, 12),
            child: SingleChildScrollView(
              scrollDirection: Axis.horizontal,
              child: Row(
                children: _filters.map((f) => _buildFilterChip(f)).toList(),
              ),
            ),
          ),

          // ── SITE LIST ────────────────────────────────────────────────────
          Expanded(
            child: sitesAsync.when(
              loading: () => _SitesShimmer(),
              error: (e, _) => _ErrorWidget(
                message: e.toString(),
                onRetry: () => ref.invalidate(saSitesProvider),
              ),
              data: (sites) {
                final filtered = sites
                    .where(
                      (s) => _filter == 'ALL' || s.status == _filter,
                    )
                    .where(
                      (s) =>
                          _search.isEmpty ||
                          s.name.toLowerCase().contains(_search),
                    )
                    .toList();

                if (filtered.isEmpty) {
                  return const _EmptyState(message: 'No sites found');
                }

                return RefreshIndicator(
                  color: AppTheme.primary,
                  backgroundColor: AppTheme.surface,
                  onRefresh: () async => ref.invalidate(saSitesProvider),
                  child: ListView.builder(
                    padding: const EdgeInsets.only(top: 8, bottom: 24),
                    itemCount: filtered.length,
                    itemBuilder: (ctx, i) => _SiteCard(
                      site: filtered[i],
                      statusColor: _statusColor,
                    )
                        .animate()
                        .fadeIn(duration: 300.ms, delay: (i * 40).ms)
                        .slideY(begin: 0.06, duration: 280.ms),
                  ),
                );
              },
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildFilterChip(String filter) {
    final selected = _filter == filter;
    return Padding(
      padding: const EdgeInsets.only(right: 8),
      child: GestureDetector(
        onTap: () => setState(() => _filter = filter),
        child: AnimatedContainer(
          duration: const Duration(milliseconds: 200),
          padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 8),
          decoration: BoxDecoration(
            color: selected
                ? AppTheme.primary.withValues(alpha: 0.15)
                : AppTheme.surfaceVariant,
            borderRadius: BorderRadius.circular(20),
            border: Border.all(
              color: selected ? AppTheme.primary : AppTheme.border,
              width: 1,
            ),
          ),
          child: Text(
            filter == 'ALL' ? 'All' : _capitalize(filter),
            style: TextStyle(
              fontSize: 13,
              fontWeight: FontWeight.w600,
              color: selected ? AppTheme.primary : AppTheme.textMuted,
            ),
          ),
        ),
      ),
    );
  }

  String _capitalize(String s) {
    if (s.isEmpty) return s;
    return s[0] + s.substring(1).toLowerCase();
  }
}

// ── SITE CARD ─────────────────────────────────────────────────────────────────

class _SiteCard extends StatelessWidget {
  const _SiteCard({
    required this.site,
    required this.statusColor,
  });

  final SaSite site;
  final Color Function(String) statusColor;

  Color get _borderColor => statusColor(site.status);

  Color get _attColor {
    if (site.attendancePercent > 80) return AppTheme.success;
    if (site.attendancePercent > 60) return AppTheme.warning;
    return AppTheme.danger;
  }

  @override
  Widget build(BuildContext context) {
    return Card(
      margin: const EdgeInsets.symmetric(horizontal: 16, vertical: 6),
      shape: const RoundedRectangleBorder(
        borderRadius: BorderRadius.zero,
      ),
      child: InkWell(
        onTap: () => context.go('/sa/sites/${site.id}'),
        borderRadius: BorderRadius.circular(12),
        child: Container(
          decoration: BoxDecoration(
            color: AppTheme.surfaceVariant,
            borderRadius: BorderRadius.circular(12),
            border: Border(
              left: BorderSide(color: _borderColor, width: 4),
            ),
          ),
          padding: const EdgeInsets.all(14),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              // Row 1: name + status chip
              Row(
                children: [
                  Expanded(
                    child: Text(
                      site.name,
                      style: const TextStyle(
                        fontSize: 15,
                        fontWeight: FontWeight.w700,
                        color: AppTheme.textPrimary,
                      ),
                      maxLines: 1,
                      overflow: TextOverflow.ellipsis,
                    ),
                  ),
                  const SizedBox(width: 8),
                  SaStatChip(
                    label: site.status,
                    color: _borderColor,
                  ),
                ],
              ),

              const SizedBox(height: 6),

              // Row 2: address
              Row(
                children: [
                  const Icon(
                    Icons.location_on_outlined,
                    size: 12,
                    color: AppTheme.textMuted,
                  ),
                  const SizedBox(width: 4),
                  Expanded(
                    child: Text(
                      site.address,
                      style: const TextStyle(
                        fontSize: 12,
                        color: AppTheme.textMuted,
                      ),
                      maxLines: 1,
                      overflow: TextOverflow.ellipsis,
                    ),
                  ),
                ],
              ),

              const Divider(color: AppTheme.border, height: 16),

              // Row 3: stats
              Row(
                children: [
                  // Supervisor
                  Expanded(
                    child: Row(
                      children: [
                        const Text(
                          '👤',
                          style: TextStyle(fontSize: 11),
                        ),
                        const SizedBox(width: 4),
                        Expanded(
                          child: Text(
                            site.supervisorName ?? 'No Supervisor',
                            style: const TextStyle(
                              fontSize: 12,
                              color: AppTheme.textSecondary,
                            ),
                            maxLines: 1,
                            overflow: TextOverflow.ellipsis,
                          ),
                        ),
                      ],
                    ),
                  ),

                  // Employee count
                  Row(
                    children: [
                      const Text('👥', style: TextStyle(fontSize: 11)),
                      const SizedBox(width: 4),
                      Text(
                        '${site.employeeCount} emp',
                        style: const TextStyle(
                          fontSize: 12,
                          color: AppTheme.textSecondary,
                        ),
                      ),
                    ],
                  ),

                  const SizedBox(width: 12),

                  // Attendance
                  Row(
                    children: [
                      const Text('📅', style: TextStyle(fontSize: 11)),
                      const SizedBox(width: 4),
                      Text(
                        '${site.attendancePercent.toStringAsFixed(0)}% att',
                        style: TextStyle(
                          fontSize: 12,
                          color: _attColor,
                          fontWeight: FontWeight.w600,
                        ),
                      ),
                    ],
                  ),
                ],
              ),
            ],
          ),
        ),
      ),
    );
  }
}

// ── SHIMMER ───────────────────────────────────────────────────────────────────

class _SitesShimmer extends StatelessWidget {
  @override
  Widget build(BuildContext context) {
    return Shimmer.fromColors(
      baseColor: AppTheme.surface,
      highlightColor: AppTheme.surfaceVariant,
      child: ListView.builder(
        padding: const EdgeInsets.only(top: 8),
        itemCount: 6,
        itemBuilder: (_, __) => Container(
          margin: const EdgeInsets.symmetric(horizontal: 16, vertical: 6),
          height: 110,
          decoration: BoxDecoration(
            color: AppTheme.surface,
            borderRadius: BorderRadius.circular(12),
          ),
        ),
      ),
    );
  }
}

// ── ERROR WIDGET ──────────────────────────────────────────────────────────────

class _ErrorWidget extends StatelessWidget {
  const _ErrorWidget({required this.message, required this.onRetry});

  final String message;
  final VoidCallback onRetry;

  @override
  Widget build(BuildContext context) {
    return Center(
      child: Padding(
        padding: const EdgeInsets.all(24),
        child: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            const Icon(Icons.error_outline, color: AppTheme.danger, size: 44),
            const SizedBox(height: 12),
            Text(
              message,
              textAlign: TextAlign.center,
              style: const TextStyle(
                color: AppTheme.textMuted,
                fontSize: 13,
              ),
            ),
            const SizedBox(height: 16),
            ElevatedButton.icon(
              onPressed: onRetry,
              icon: const Icon(Icons.refresh, size: 16),
              label: const Text('Retry'),
            ),
          ],
        ),
      ),
    );
  }
}

// ── EMPTY STATE ───────────────────────────────────────────────────────────────

class _EmptyState extends StatelessWidget {
  const _EmptyState({required this.message});

  final String message;

  @override
  Widget build(BuildContext context) {
    return Center(
      child: Column(
        mainAxisSize: MainAxisSize.min,
        children: [
          const Icon(
            Icons.location_city_outlined,
            size: 56,
            color: AppTheme.textMuted,
          ),
          const SizedBox(height: 12),
          Text(
            message,
            style: const TextStyle(
              fontSize: 15,
              color: AppTheme.textMuted,
              fontWeight: FontWeight.w500,
            ),
          ),
        ],
      ),
    );
  }
}
