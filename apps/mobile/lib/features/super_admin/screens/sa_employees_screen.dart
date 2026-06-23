import 'package:flutter/material.dart';
import 'package:flutter_animate/flutter_animate.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../../../core/theme/app_theme.dart';
import '../providers/super_admin_provider.dart';
import '../widgets/sa_stat_chip.dart';

class SaEmployeesScreen extends ConsumerStatefulWidget {
  const SaEmployeesScreen({super.key});

  @override
  ConsumerState<SaEmployeesScreen> createState() =>
      _SaEmployeesScreenState();
}

class _SaEmployeesScreenState extends ConsumerState<SaEmployeesScreen> {
  String _search = '';
  String _deptFilter = 'All';
  bool _showSearch = false;

  @override
  Widget build(BuildContext context) {
    final employeesAsync = ref.watch(saEmployeesProvider);

    return Scaffold(
      backgroundColor: AppTheme.background,
      appBar: AppBar(
        title: _showSearch
            ? TextField(
                autofocus: true,
                style: const TextStyle(color: AppTheme.textPrimary),
                decoration: const InputDecoration(
                  hintText: 'Search employees…',
                  border: InputBorder.none,
                  hintStyle: TextStyle(color: AppTheme.textMuted),
                ),
                onChanged: (v) => setState(() => _search = v),
              )
            : const Text('Employees'),
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
      body: employeesAsync.when(
        data: (employees) {
          final departments = [
            'All',
            ...{for (final e in employees) e.department}
                .where((d) => d.isNotEmpty)
                .toList()
              ..sort(),
          ];

          final total = employees.length;
          final active = employees
              .where((e) => e.status.toUpperCase() == 'ACTIVE')
              .length;
          final inactive = total - active;

          final filtered = employees.where((e) {
            final matchDept =
                _deptFilter == 'All' || e.department == _deptFilter;
            final matchSearch = _search.isEmpty ||
                e.name.toLowerCase().contains(_search.toLowerCase()) ||
                e.empCode
                    .toLowerCase()
                    .contains(_search.toLowerCase());
            return matchDept && matchSearch;
          }).toList();

          return Column(
            children: [
              // Stats bar
              Container(
                color: AppTheme.surface,
                padding: const EdgeInsets.symmetric(
                    horizontal: 16, vertical: 12),
                child: Row(
                  children: [
                    _StatBadge(
                        label: 'Total',
                        value: total,
                        color: AppTheme.textPrimary),
                    const SizedBox(width: 16),
                    _StatBadge(
                        label: 'Active',
                        value: active,
                        color: AppTheme.success),
                    const SizedBox(width: 16),
                    _StatBadge(
                        label: 'Inactive',
                        value: inactive,
                        color: AppTheme.textMuted),
                  ],
                ),
              ),
              // Department filter chips
              SizedBox(
                height: 48,
                child: ListView.separated(
                  scrollDirection: Axis.horizontal,
                  padding: const EdgeInsets.symmetric(
                      horizontal: 16, vertical: 8),
                  itemCount: departments.length,
                  separatorBuilder: (_, __) => const SizedBox(width: 8),
                  itemBuilder: (context, i) {
                    final dept = departments[i];
                    final selected = _deptFilter == dept;
                    return GestureDetector(
                      onTap: () => setState(() => _deptFilter = dept),
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
                          dept,
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
              // Employee list
              Expanded(
                child: filtered.isEmpty
                    ? const Center(
                        child: Text(
                          'No employees found',
                          style: TextStyle(
                              fontSize: 14, color: AppTheme.textMuted),
                        ),
                      )
                    : RefreshIndicator(
                        color: AppTheme.primary,
                        onRefresh: () async {
                          ref.invalidate(saEmployeesProvider);
                          await ref
                              .read(saEmployeesProvider.future)
                              .catchError((_) => <SaEmployee>[]);
                        },
                        child: ListView.builder(
                          padding:
                              const EdgeInsets.symmetric(vertical: 6),
                          itemCount: filtered.length,
                          itemBuilder: (context, i) =>
                              _EmployeeCard(employee: filtered[i])
                                  .animate()
                                  .fadeIn(
                                      delay: (i * 25).ms,
                                      duration: 250.ms),
                        ),
                      ),
              ),
            ],
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
    );
  }
}

class _StatBadge extends StatelessWidget {
  const _StatBadge({
    required this.label,
    required this.value,
    required this.color,
  });

  final String label;
  final int value;
  final Color color;

  @override
  Widget build(BuildContext context) {
    return Row(
      mainAxisSize: MainAxisSize.min,
      children: [
        Text(
          '$value',
          style: TextStyle(
            fontSize: 16,
            fontWeight: FontWeight.w700,
            color: color,
          ),
        ),
        const SizedBox(width: 4),
        Text(
          label,
          style: const TextStyle(
              fontSize: 12, color: AppTheme.textSecondary),
        ),
      ],
    );
  }
}

class _EmployeeCard extends StatelessWidget {
  const _EmployeeCard({required this.employee});

  final SaEmployee employee;

  @override
  Widget build(BuildContext context) {
    final isActive = employee.status.toUpperCase() == 'ACTIVE';
    final statusColor = isActive ? AppTheme.success : AppTheme.danger;
    final initials = employee.name
        .split(' ')
        .where((w) => w.isNotEmpty)
        .take(2)
        .map((w) => w[0].toUpperCase())
        .join();

    return Container(
      margin: const EdgeInsets.symmetric(horizontal: 16, vertical: 5),
      padding: const EdgeInsets.all(12),
      decoration: BoxDecoration(
        color: AppTheme.surfaceVariant,
        borderRadius: BorderRadius.circular(12),
        border: Border.all(color: AppTheme.border),
      ),
      child: Row(
        children: [
          // Avatar circle with initials
          Container(
            width: 42,
            height: 42,
            decoration: BoxDecoration(
              gradient: LinearGradient(
                colors: [
                  AppTheme.primary.withValues(alpha: 0.4),
                  AppTheme.primary.withValues(alpha: 0.15),
                ],
                begin: Alignment.topLeft,
                end: Alignment.bottomRight,
              ),
              borderRadius: BorderRadius.circular(21),
            ),
            alignment: Alignment.center,
            child: Text(
              initials.isEmpty ? '?' : initials,
              style: const TextStyle(
                fontSize: 14,
                fontWeight: FontWeight.w700,
                color: AppTheme.primary,
              ),
            ),
          ),
          const SizedBox(width: 12),
          // Name + code/designation
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(
                  employee.name,
                  style: const TextStyle(
                    fontSize: 14,
                    fontWeight: FontWeight.w700,
                    color: AppTheme.textPrimary,
                  ),
                  overflow: TextOverflow.ellipsis,
                ),
                const SizedBox(height: 2),
                Text(
                  '${employee.empCode} · ${employee.designation}',
                  style: const TextStyle(
                      fontSize: 12, color: AppTheme.textMuted),
                  overflow: TextOverflow.ellipsis,
                ),
              ],
            ),
          ),
          const SizedBox(width: 8),
          // Status chip + site name
          Column(
            crossAxisAlignment: CrossAxisAlignment.end,
            children: [
              SaStatChip(label: employee.status, color: statusColor),
              const SizedBox(height: 4),
              Text(
                employee.siteName,
                style: const TextStyle(
                    fontSize: 11, color: AppTheme.textMuted),
                overflow: TextOverflow.ellipsis,
              ),
            ],
          ),
        ],
      ),
    );
  }
}
