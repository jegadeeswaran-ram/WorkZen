import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import '../../../core/theme/app_theme.dart';
import '../providers/employees_provider.dart';

class EmployeesScreen extends ConsumerWidget {
  const EmployeesScreen({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final listAsync = ref.watch(employeesListProvider);
    final query = ref.watch(employeeSearchQueryProvider);

    return Scaffold(
      backgroundColor: AppTheme.background,
      appBar: AppBar(
        title: const Text('Employees'),
        actions: [
          IconButton(
            icon: const Icon(Icons.refresh_outlined),
            onPressed: () => ref.invalidate(employeesListProvider),
          ),
        ],
      ),
      floatingActionButton: FloatingActionButton(
        backgroundColor: AppTheme.primary,
        onPressed: () async {
          final result = await context.push('/employees/new');
          if (result == true) ref.invalidate(employeesListProvider);
        },
        child: const Icon(Icons.person_add_outlined, color: Colors.white),
      ),
      body: Column(
        children: [
          Padding(
            padding: const EdgeInsets.fromLTRB(16, 12, 16, 4),
            child: TextField(
              onChanged: (v) =>
                  ref.read(employeeSearchQueryProvider.notifier).state = v,
              style: const TextStyle(color: AppTheme.textPrimary),
              decoration: InputDecoration(
                hintText: 'Search by name or code...',
                prefixIcon: const Icon(Icons.search, color: AppTheme.textMuted),
                suffixIcon: query.isNotEmpty
                    ? IconButton(
                        icon: const Icon(Icons.clear, color: AppTheme.textMuted),
                        onPressed: () => ref
                            .read(employeeSearchQueryProvider.notifier)
                            .state = '',
                      )
                    : null,
              ),
            ),
          ),
          Expanded(
            child: RefreshIndicator(
              color: AppTheme.primary,
              onRefresh: () async => ref.invalidate(employeesListProvider),
              child: listAsync.when(
                loading: () => const Center(
                    child: CircularProgressIndicator(color: AppTheme.primary)),
                error: (e, _) => Center(
                  child: Column(
                    mainAxisSize: MainAxisSize.min,
                    children: [
                      const Icon(Icons.error_outline,
                          color: AppTheme.danger, size: 40),
                      const SizedBox(height: 12),
                      Text('Failed to load',
                          style: const TextStyle(color: AppTheme.danger)),
                      const SizedBox(height: 8),
                      TextButton(
                        onPressed: () => ref.invalidate(employeesListProvider),
                        child: const Text('Retry'),
                      ),
                    ],
                  ),
                ),
                data: (employees) => employees.isEmpty
                    ? const Center(
                        child: Text('No employees found',
                            style: TextStyle(color: AppTheme.textMuted)))
                    : ListView.builder(
                        padding: const EdgeInsets.all(16),
                        itemCount: employees.length,
                        itemBuilder: (_, i) =>
                            _EmployeeCard(emp: employees[i]),
                      ),
              ),
            ),
          ),
        ],
      ),
    );
  }
}

class _EmployeeCard extends StatelessWidget {
  final Map<String, dynamic> emp;
  const _EmployeeCard({required this.emp});

  Color _statusColor(String? status) => switch ((status ?? '').toUpperCase()) {
        'ACTIVE' => AppTheme.success,
        'INACTIVE' => AppTheme.danger,
        'ON_LEAVE' => AppTheme.warning,
        _ => AppTheme.textMuted,
      };

  @override
  Widget build(BuildContext context) {
    final firstName = emp['firstName'] as String? ?? '';
    final lastName = emp['lastName'] as String? ?? '';
    final name = '$firstName $lastName'.trim();
    final code = emp['employeeCode'] as String? ?? '';
    final designation = emp['designation'] as String? ?? emp['jobTitle'] as String? ?? '';
    final status = emp['status'] as String? ?? 'ACTIVE';
    final initials =
        '${firstName.isNotEmpty ? firstName[0] : ''}${lastName.isNotEmpty ? lastName[0] : ''}'
            .toUpperCase();

    return GestureDetector(
      onTap: () => context.push('/employees/${emp['id']}'),
      child: Container(
        margin: const EdgeInsets.only(bottom: 12),
        padding: const EdgeInsets.all(14),
        decoration: BoxDecoration(
          color: AppTheme.surface,
          borderRadius: BorderRadius.circular(16),
          border: Border.all(color: AppTheme.border),
        ),
        child: Row(
          children: [
            Container(
              width: 44,
              height: 44,
              decoration: BoxDecoration(
                color: AppTheme.primary.withValues(alpha: 0.15),
                shape: BoxShape.circle,
                border: Border.all(
                    color: AppTheme.primary.withValues(alpha: 0.3)),
              ),
              child: Center(
                child: Text(initials,
                    style: const TextStyle(
                        color: AppTheme.primary,
                        fontWeight: FontWeight.bold,
                        fontSize: 15)),
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
                  Text(code,
                      style: const TextStyle(
                          color: AppTheme.textMuted, fontSize: 12)),
                  if (designation.isNotEmpty) ...[
                    const SizedBox(height: 2),
                    Text(designation,
                        style: const TextStyle(
                            color: AppTheme.textSecondary, fontSize: 12)),
                  ],
                ],
              ),
            ),
            Container(
              padding:
                  const EdgeInsets.symmetric(horizontal: 8, vertical: 3),
              decoration: BoxDecoration(
                color: _statusColor(status).withValues(alpha: 0.12),
                borderRadius: BorderRadius.circular(20),
                border: Border.all(
                    color: _statusColor(status).withValues(alpha: 0.3)),
              ),
              child: Text(status,
                  style: TextStyle(
                      color: _statusColor(status),
                      fontSize: 10,
                      fontWeight: FontWeight.w600)),
            ),
          ],
        ),
      ),
    );
  }
}
