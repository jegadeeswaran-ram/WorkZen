import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import '../../../core/theme/app_theme.dart';
import '../providers/hr_provider.dart';

// ── Avatar palette ────────────────────────────────────────────────────────────
const _avatarPalette = [
  AppTheme.primary,
  AppTheme.success,
  AppTheme.warning,
  Color(0xFF8B5CF6),
  Color(0xFFEC4899),
];

Color _avatarColor(String empCode) =>
    _avatarPalette[empCode.hashCode.abs() % _avatarPalette.length];

String _initials(String name) {
  final parts = name.trim().split(' ');
  return parts
      .map((w) => w.isEmpty ? '' : w[0])
      .where((c) => c.isNotEmpty)
      .take(2)
      .join()
      .toUpperCase();
}

Color _statusColor(String status) {
  switch (status.toUpperCase()) {
    case 'ACTIVE':
      return AppTheme.success;
    case 'INACTIVE':
      return AppTheme.danger;
    default:
      return AppTheme.warning;
  }
}

String _statusLabel(String status) {
  switch (status.toUpperCase()) {
    case 'ACTIVE':
      return 'Active';
    case 'INACTIVE':
      return 'Inactive';
    case 'ON_PROBATION':
      return 'Probation';
    default:
      return status;
  }
}

// ── Main Screen ───────────────────────────────────────────────────────────────

class HrEmployeesScreen extends ConsumerStatefulWidget {
  const HrEmployeesScreen({super.key});

  @override
  ConsumerState<HrEmployeesScreen> createState() => _HrEmployeesScreenState();
}

class _HrEmployeesScreenState extends ConsumerState<HrEmployeesScreen> {
  bool _searchVisible = false;
  String _searchQuery = '';
  String _selectedDepartment = 'All';
  final TextEditingController _searchController = TextEditingController();

  @override
  void dispose() {
    _searchController.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    final employeesAsync = ref.watch(hrEmployeesProvider);

    return Scaffold(
      backgroundColor: AppTheme.background,
      appBar: AppBar(
        backgroundColor: AppTheme.surface,
        title: const Text('Employees'),
        actions: [
          IconButton(
            icon: Icon(
              _searchVisible ? Icons.search_off : Icons.search,
              color: AppTheme.textSecondary,
            ),
            onPressed: () {
              setState(() {
                _searchVisible = !_searchVisible;
                if (!_searchVisible) {
                  _searchQuery = '';
                  _searchController.clear();
                }
              });
            },
          ),
        ],
      ),
      body: employeesAsync.when(
        loading: () => const Center(
          child: CircularProgressIndicator(color: AppTheme.primary),
        ),
        error: (e, _) => Center(
          child: Column(
            mainAxisSize: MainAxisSize.min,
            children: [
              const Icon(Icons.error_outline, color: AppTheme.danger, size: 48),
              const SizedBox(height: 12),
              Text(
                e.toString(),
                style: const TextStyle(color: AppTheme.textSecondary),
                textAlign: TextAlign.center,
              ),
              const SizedBox(height: 16),
              ElevatedButton(
                onPressed: () => ref.invalidate(hrEmployeesProvider),
                child: const Text('Retry'),
              ),
            ],
          ),
        ),
        data: (employees) {
          // Stats
          final total = employees.length;
          final active =
              employees.where((e) => e.status.toUpperCase() == 'ACTIVE').length;
          final inactive =
              employees.where((e) => e.status.toUpperCase() == 'INACTIVE').length;
          final probation = employees
              .where((e) =>
                  e.status.toUpperCase() != 'ACTIVE' &&
                  e.status.toUpperCase() != 'INACTIVE')
              .length;

          // Departments
          final departments = <String>{'All'};
          for (final e in employees) {
            if (e.department.isNotEmpty) departments.add(e.department);
          }
          final deptList = departments.toList();

          // Filter
          final filtered = employees.where((e) {
            final matchesDept = _selectedDepartment == 'All' ||
                e.department == _selectedDepartment;
            final q = _searchQuery.toLowerCase();
            final matchesSearch = q.isEmpty ||
                e.name.toLowerCase().contains(q) ||
                e.empCode.toLowerCase().contains(q) ||
                e.designation.toLowerCase().contains(q);
            return matchesDept && matchesSearch;
          }).toList();

          return Column(
            children: [
              // Stats bar
              SizedBox(
                height: 72,
                child: ListView(
                  scrollDirection: Axis.horizontal,
                  padding:
                      const EdgeInsets.symmetric(horizontal: 16, vertical: 12),
                  children: [
                    _StatChip(label: 'Total', count: total),
                    _StatChip(label: 'Active', count: active),
                    _StatChip(label: 'Inactive', count: inactive),
                    _StatChip(label: 'Probation', count: probation),
                  ],
                ),
              ),
              // Department filter chips
              SizedBox(
                height: 44,
                child: ListView.builder(
                  scrollDirection: Axis.horizontal,
                  padding: const EdgeInsets.symmetric(horizontal: 16),
                  itemCount: deptList.length,
                  itemBuilder: (ctx, i) {
                    final dept = deptList[i];
                    final selected = _selectedDepartment == dept;
                    return Padding(
                      padding: const EdgeInsets.only(right: 8),
                      child: FilterChip(
                        label: Text(
                          dept,
                          style: TextStyle(
                            color: selected
                                ? Colors.white
                                : AppTheme.textSecondary,
                            fontSize: 12,
                            fontWeight: selected
                                ? FontWeight.w600
                                : FontWeight.normal,
                          ),
                        ),
                        selected: selected,
                        onSelected: (_) =>
                            setState(() => _selectedDepartment = dept),
                        backgroundColor: AppTheme.surfaceVariant,
                        selectedColor:
                            AppTheme.primary.withValues(alpha: 0.3),
                        checkmarkColor: AppTheme.primary,
                        side: BorderSide(
                          color: selected
                              ? AppTheme.primary
                              : AppTheme.border,
                        ),
                        padding: const EdgeInsets.symmetric(horizontal: 4),
                      ),
                    );
                  },
                ),
              ),
              // Search field
              if (_searchVisible)
                Padding(
                  padding:
                      const EdgeInsets.symmetric(horizontal: 16, vertical: 10),
                  child: TextField(
                    controller: _searchController,
                    autofocus: true,
                    style: const TextStyle(color: Colors.white),
                    decoration: const InputDecoration(
                      hintText: 'Search by name, code or designation…',
                      prefixIcon: Icon(Icons.search, color: AppTheme.textMuted),
                    ),
                    onChanged: (v) => setState(() => _searchQuery = v),
                  ),
                ),
              // Employee list
              Expanded(
                child: filtered.isEmpty
                    ? const Center(
                        child: Text(
                          'No employees found',
                          style: TextStyle(color: AppTheme.textMuted),
                        ),
                      )
                    : ListView.builder(
                        padding: const EdgeInsets.all(16),
                        itemCount: filtered.length,
                        itemBuilder: (ctx, i) =>
                            _EmployeeCard(employee: filtered[i]),
                      ),
              ),
            ],
          );
        },
      ),
    );
  }
}

// ── Stat chip ─────────────────────────────────────────────────────────────────

class _StatChip extends StatelessWidget {
  final String label;
  final int count;

  const _StatChip({required this.label, required this.count});

  @override
  Widget build(BuildContext context) {
    return Container(
      margin: const EdgeInsets.only(right: 10),
      padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 6),
      decoration: BoxDecoration(
        color: AppTheme.surfaceVariant,
        borderRadius: BorderRadius.circular(20),
        border: Border.all(color: AppTheme.border),
      ),
      child: Row(
        mainAxisSize: MainAxisSize.min,
        children: [
          Text(
            '$count',
            style: const TextStyle(
              color: Colors.white,
              fontWeight: FontWeight.bold,
              fontSize: 14,
            ),
          ),
          const SizedBox(width: 6),
          Text(
            label,
            style: const TextStyle(
              color: AppTheme.textSecondary,
              fontSize: 12,
            ),
          ),
        ],
      ),
    );
  }
}

// ── Employee card ─────────────────────────────────────────────────────────────

class _EmployeeCard extends StatelessWidget {
  final HrEmployee employee;

  const _EmployeeCard({required this.employee});

  @override
  Widget build(BuildContext context) {
    final color = _avatarColor(employee.empCode);
    final statusColor = _statusColor(employee.status);

    return Container(
      margin: const EdgeInsets.only(bottom: 10),
      decoration: BoxDecoration(
        color: AppTheme.surface,
        borderRadius: BorderRadius.circular(12),
        border: Border.all(color: AppTheme.border),
      ),
      child: ListTile(
        contentPadding:
            const EdgeInsets.symmetric(horizontal: 16, vertical: 6),
        leading: CircleAvatar(
          radius: 22,
          backgroundColor: color.withValues(alpha: 0.2),
          child: Text(
            _initials(employee.name),
            style: TextStyle(
              color: color,
              fontWeight: FontWeight.bold,
              fontSize: 14,
            ),
          ),
        ),
        title: Text(
          employee.name,
          style: const TextStyle(
            color: Colors.white,
            fontWeight: FontWeight.bold,
            fontSize: 14,
          ),
        ),
        subtitle: Padding(
          padding: const EdgeInsets.only(top: 2),
          child: Text(
            '${employee.designation} • ${employee.department}',
            style: const TextStyle(
              color: AppTheme.textSecondary,
              fontSize: 12,
            ),
          ),
        ),
        trailing: Row(
          mainAxisSize: MainAxisSize.min,
          children: [
            Container(
              padding:
                  const EdgeInsets.symmetric(horizontal: 8, vertical: 3),
              decoration: BoxDecoration(
                color: statusColor.withValues(alpha: 0.15),
                borderRadius: BorderRadius.circular(6),
                border: Border.all(
                    color: statusColor.withValues(alpha: 0.4)),
              ),
              child: Text(
                _statusLabel(employee.status),
                style: TextStyle(
                  color: statusColor,
                  fontSize: 11,
                  fontWeight: FontWeight.w600,
                ),
              ),
            ),
            const SizedBox(width: 8),
            const Icon(
              Icons.chevron_right,
              color: AppTheme.textMuted,
              size: 20,
            ),
          ],
        ),
        onTap: () => context.go('/hr/employees/${employee.id}'),
      ),
    );
  }
}
