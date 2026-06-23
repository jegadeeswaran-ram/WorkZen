import 'package:flutter/material.dart';
import 'package:flutter_animate/flutter_animate.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import 'package:shimmer/shimmer.dart';
import '../../../core/theme/app_theme.dart';
import '../providers/super_admin_provider.dart';
import '../widgets/sa_stat_chip.dart';
import '../widgets/sa_section_header.dart';
import '../widgets/sa_info_row.dart';

// ── SCREEN ────────────────────────────────────────────────────────────────────

class SaTendersScreen extends ConsumerStatefulWidget {
  const SaTendersScreen({super.key});

  @override
  ConsumerState<SaTendersScreen> createState() => _SaTendersScreenState();
}

class _SaTendersScreenState extends ConsumerState<SaTendersScreen> {
  String _statusFilter = 'ALL';
  String _search = '';
  bool _showSearch = false;
  final _searchController = TextEditingController();

  static const _filters = [
    'ALL',
    'DRAFT',
    'ACTIVE',
    'AWARDED',
    'COMPLETED',
    'EXPIRED',
  ];

  @override
  void dispose() {
    _searchController.dispose();
    super.dispose();
  }

  Color _statusColor(String status) {
    switch (status.toUpperCase()) {
      case 'ACTIVE':
        return AppTheme.success;
      case 'AWARDED':
        return const Color(0xFF8B5CF6);
      case 'COMPLETED':
        return AppTheme.textMuted;
      case 'DRAFT':
        return const Color(0xFF60A5FA);
      case 'EXPIRED':
        return AppTheme.danger;
      default:
        return AppTheme.textMuted;
    }
  }

  String _capitalize(String s) {
    if (s.isEmpty) return s;
    return s[0] + s.substring(1).toLowerCase();
  }

  @override
  Widget build(BuildContext context) {
    final tendersAsync = ref.watch(saTendersProvider);

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
                  hintText: 'Search tenders…',
                  hintStyle: TextStyle(color: AppTheme.textMuted, fontSize: 15),
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
            : const Text('Tenders'),
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
            onPressed: () => ref.invalidate(saTendersProvider),
            tooltip: 'Refresh',
          ),
        ],
      ),
      body: Column(
        children: [
          // ── FILTER CHIPS ──────────────────────────────────────────────────
          Container(
            color: AppTheme.surface,
            padding: const EdgeInsets.fromLTRB(12, 8, 12, 12),
            child: SingleChildScrollView(
              scrollDirection: Axis.horizontal,
              child: Row(
                children: _filters.map(_buildFilterChip).toList(),
              ),
            ),
          ),

          // ── TENDER LIST ───────────────────────────────────────────────────
          Expanded(
            child: tendersAsync.when(
              loading: () => _TendersShimmer(),
              error: (e, _) => _ErrorWidget(
                message: e.toString(),
                onRetry: () => ref.invalidate(saTendersProvider),
              ),
              data: (tenders) {
                final filtered = tenders
                    .where(
                      (t) =>
                          _statusFilter == 'ALL' ||
                          t.status.toUpperCase() == _statusFilter,
                    )
                    .where(
                      (t) =>
                          _search.isEmpty ||
                          t.title.toLowerCase().contains(_search) ||
                          t.tenderNumber.toLowerCase().contains(_search) ||
                          t.clientName.toLowerCase().contains(_search),
                    )
                    .toList();

                if (filtered.isEmpty) {
                  return const _EmptyState(message: 'No tenders found');
                }

                return RefreshIndicator(
                  color: AppTheme.primary,
                  backgroundColor: AppTheme.surface,
                  onRefresh: () async => ref.invalidate(saTendersProvider),
                  child: ListView.builder(
                    padding: const EdgeInsets.only(top: 8, bottom: 24),
                    itemCount: filtered.length,
                    itemBuilder: (ctx, i) => _TenderCard(
                      tender: filtered[i],
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
    final selected = _statusFilter == filter;
    return Padding(
      padding: const EdgeInsets.only(right: 8),
      child: GestureDetector(
        onTap: () => setState(() => _statusFilter = filter),
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
}

// ── TENDER CARD ───────────────────────────────────────────────────────────────

class _TenderCard extends StatelessWidget {
  const _TenderCard({
    required this.tender,
    required this.statusColor,
  });

  final SaTender tender;
  final Color Function(String) statusColor;

  String _formatAmount(double amount) {
    if (amount >= 1e7) {
      return '${(amount / 1e7).toStringAsFixed(2)} Cr';
    } else if (amount >= 1e5) {
      return '${(amount / 1e5).toStringAsFixed(2)} L';
    } else if (amount >= 1e3) {
      return '${(amount / 1e3).toStringAsFixed(1)} K';
    }
    return amount.toStringAsFixed(0);
  }

  String _shortDate(String iso) {
    if (iso.isEmpty) return '—';
    try {
      final dt = DateTime.parse(iso);
      return '${dt.day}/${dt.month}/${dt.year.toString().substring(2)}';
    } catch (_) {
      return iso.length >= 10 ? iso.substring(0, 10) : iso;
    }
  }

  Color _progressColor(double p) {
    if (p > 70) return AppTheme.success;
    if (p > 30) return AppTheme.warning;
    return AppTheme.danger;
  }

  @override
  Widget build(BuildContext context) {
    final chipColor = statusColor(tender.status);
    final progColor = _progressColor(tender.progressPercent);

    return Card(
      margin: const EdgeInsets.symmetric(horizontal: 16, vertical: 6),
      shape: const RoundedRectangleBorder(
        borderRadius: BorderRadius.zero,
      ),
      child: InkWell(
        onTap: () => context.go('/sa/tenders/${tender.id}'),
        borderRadius: BorderRadius.circular(12),
        child: Container(
          decoration: BoxDecoration(
            color: AppTheme.surfaceVariant,
            borderRadius: BorderRadius.circular(12),
            border: Border.all(color: AppTheme.border, width: 1),
          ),
          padding: const EdgeInsets.all(14),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              // Row 1: tender number + status chip
              Row(
                children: [
                  Text(
                    tender.tenderNumber,
                    style: const TextStyle(
                      fontSize: 12,
                      color: AppTheme.textMuted,
                    ),
                  ),
                  const Spacer(),
                  SaStatChip(
                    label: tender.status,
                    color: chipColor,
                  ),
                ],
              ),
              const SizedBox(height: 4),

              // Row 2: title
              Text(
                tender.title,
                style: const TextStyle(
                  fontSize: 15,
                  fontWeight: FontWeight.w700,
                  color: AppTheme.textPrimary,
                ),
                maxLines: 2,
                overflow: TextOverflow.ellipsis,
              ),
              const SizedBox(height: 6),

              // Row 3: client name
              Row(
                children: [
                  const Icon(
                    Icons.business_outlined,
                    size: 13,
                    color: AppTheme.textSecondary,
                  ),
                  const SizedBox(width: 4),
                  Expanded(
                    child: Text(
                      tender.clientName,
                      style: const TextStyle(
                        fontSize: 13,
                        color: AppTheme.textSecondary,
                      ),
                      maxLines: 1,
                      overflow: TextOverflow.ellipsis,
                    ),
                  ),
                ],
              ),
              const SizedBox(height: 10),

              // Row 4: contract value + date range
              Row(
                children: [
                  const Icon(
                    Icons.currency_rupee,
                    size: 14,
                    color: AppTheme.primary,
                  ),
                  const SizedBox(width: 2),
                  Text(
                    _formatAmount(tender.contractValue),
                    style: const TextStyle(
                      fontSize: 14,
                      fontWeight: FontWeight.w600,
                      color: AppTheme.primary,
                    ),
                  ),
                  const Spacer(),
                  Text(
                    '${_shortDate(tender.startDate)} → ${_shortDate(tender.endDate)}',
                    style: const TextStyle(
                      fontSize: 11,
                      color: AppTheme.textMuted,
                    ),
                  ),
                ],
              ),
              const SizedBox(height: 8),

              // Row 5: progress label
              Row(
                children: [
                  const Text(
                    'Progress',
                    style: TextStyle(fontSize: 11, color: AppTheme.textMuted),
                  ),
                  const Spacer(),
                  Text(
                    '${tender.progressPercent.toStringAsFixed(0)}%',
                    style: TextStyle(
                      fontSize: 11,
                      color: progColor,
                      fontWeight: FontWeight.w600,
                    ),
                  ),
                ],
              ),
              const SizedBox(height: 4),

              // Progress bar
              ClipRRect(
                borderRadius: BorderRadius.circular(3),
                child: LinearProgressIndicator(
                  value: tender.progressPercent / 100,
                  minHeight: 6,
                  backgroundColor: AppTheme.border,
                  valueColor: AlwaysStoppedAnimation<Color>(progColor),
                ),
              ),
            ],
          ),
        ),
      ),
    );
  }
}

// ── SHIMMER ───────────────────────────────────────────────────────────────────

class _TendersShimmer extends StatelessWidget {
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
          height: 130,
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
            Icons.description_outlined,
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

// ignore_for_file: unused_import
// SaInfoRow and SaSectionHeader imported for shared widget availability
