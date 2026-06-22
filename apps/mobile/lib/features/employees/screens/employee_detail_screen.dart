import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import 'package:intl/intl.dart';
import '../../../core/theme/app_theme.dart';
import '../providers/employees_provider.dart';

class EmployeeDetailScreen extends ConsumerWidget {
  final String employeeId;
  const EmployeeDetailScreen({super.key, required this.employeeId});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final detailAsync = ref.watch(employeeDetailProvider(employeeId));

    return Scaffold(
      backgroundColor: AppTheme.background,
      appBar: AppBar(
        title: const Text('Employee'),
        actions: [
          IconButton(
            icon: const Icon(Icons.edit_outlined),
            onPressed: () async {
              final detail = ref.read(employeeDetailProvider(employeeId)).value;
              final result = await context.push('/employees/$employeeId/edit', extra: detail);
              if (result == true) ref.invalidate(employeeDetailProvider(employeeId));
            },
          ),
          IconButton(
            icon: const Icon(Icons.refresh_outlined),
            onPressed: () => ref.invalidate(employeeDetailProvider(employeeId)),
          ),
        ],
      ),
      body: detailAsync.when(
        loading: () =>
            const Center(child: CircularProgressIndicator(color: AppTheme.primary)),
        error: (e, _) => Center(
          child: Column(mainAxisSize: MainAxisSize.min, children: [
            const Icon(Icons.error_outline, color: AppTheme.danger, size: 40),
            const SizedBox(height: 12),
            TextButton(
                onPressed: () =>
                    ref.invalidate(employeeDetailProvider(employeeId)),
                child: const Text('Retry')),
          ]),
        ),
        data: (emp) => _EmployeeDetail(emp: emp),
      ),
    );
  }
}

class _EmployeeDetail extends StatelessWidget {
  final Map<String, dynamic> emp;
  const _EmployeeDetail({required this.emp});

  String _fmt(String? iso) {
    if (iso == null) return '—';
    try {
      return DateFormat('dd MMM yyyy').format(DateTime.parse(iso));
    } catch (_) {
      return iso;
    }
  }

  String _mask(String? account) {
    if (account == null || account.length < 4) return '—';
    return '${'*' * (account.length - 4)}${account.substring(account.length - 4)}';
  }

  Color _statusColor(String? s) => switch ((s ?? '').toUpperCase()) {
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
    final status = emp['status'] as String? ?? '';
    final initials =
        '${firstName.isNotEmpty ? firstName[0] : ''}${lastName.isNotEmpty ? lastName[0] : ''}'
            .toUpperCase();

    final bank = emp['bankDetails'] as Map<String, dynamic>?;
    final deployments = emp['deployments'] as List? ?? [];
    final activeDeploy = deployments.cast<Map<String, dynamic>>().where(
        (d) => (d['status'] as String?)?.toUpperCase() == 'ACTIVE').firstOrNull;

    return SingleChildScrollView(
      padding: const EdgeInsets.all(16),
      child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
        // Header
        Container(
          width: double.infinity,
          padding: const EdgeInsets.all(20),
          decoration: BoxDecoration(
            color: AppTheme.surface,
            borderRadius: BorderRadius.circular(16),
            border: Border.all(color: AppTheme.border),
          ),
          child: Column(children: [
            Container(
              width: 64,
              height: 64,
              decoration: BoxDecoration(
                color: AppTheme.primary.withValues(alpha: 0.15),
                shape: BoxShape.circle,
                border: Border.all(color: AppTheme.primary.withValues(alpha: 0.3)),
              ),
              child: Center(
                child: Text(initials,
                    style: const TextStyle(
                        color: AppTheme.primary,
                        fontSize: 22,
                        fontWeight: FontWeight.bold)),
              ),
            ),
            const SizedBox(height: 12),
            Text(name,
                style: const TextStyle(
                    color: AppTheme.textPrimary,
                    fontSize: 18,
                    fontWeight: FontWeight.w700)),
            const SizedBox(height: 4),
            Text(emp['employeeCode'] as String? ?? '',
                style: const TextStyle(color: AppTheme.textMuted, fontSize: 13)),
            const SizedBox(height: 8),
            Container(
              padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 4),
              decoration: BoxDecoration(
                color: _statusColor(status).withValues(alpha: 0.12),
                borderRadius: BorderRadius.circular(20),
                border:
                    Border.all(color: _statusColor(status).withValues(alpha: 0.3)),
              ),
              child: Text(status,
                  style: TextStyle(
                      color: _statusColor(status),
                      fontSize: 12,
                      fontWeight: FontWeight.w600)),
            ),
          ]),
        ),

        const SizedBox(height: 16),
        _Section(title: 'Personal Information', rows: [
          _Row('Email', emp['email'] as String? ?? '—'),
          _Row('Phone', emp['personalPhone'] as String? ?? emp['phone'] as String? ?? '—'),
          _Row('Gender', emp['gender'] as String? ?? '—'),
          _Row('Date of Birth', _fmt(emp['dateOfBirth'] as String?)),
          _Row('Address', emp['address'] as String? ?? '—'),
        ]),

        const SizedBox(height: 12),
        _Section(title: 'Employment', rows: [
          _Row('Designation', emp['designation'] as String? ?? emp['jobTitle'] as String? ?? '—'),
          _Row('Department', (emp['department'] as Map<String, dynamic>?)?['name'] as String? ?? '—'),
          _Row('Joining Date', _fmt(emp['joiningDate'] as String?)),
          _Row('Status', status),
        ]),

        if (bank != null) ...[
          const SizedBox(height: 12),
          _Section(title: 'Bank Details', rows: [
            _Row('Bank', bank['bankName'] as String? ?? '—'),
            _Row('Account', _mask(bank['accountNumber'] as String?)),
            _Row('IFSC', bank['ifscCode'] as String? ?? '—'),
          ]),
        ],

        if (activeDeploy != null) ...[
          const SizedBox(height: 12),
          _Section(title: 'Current Deployment', rows: [
            _Row('Site', (activeDeploy['site'] as Map<String, dynamic>?)?['name'] as String? ?? '—'),
            _Row('Since', _fmt(activeDeploy['startDate'] as String?)),
          ]),
        ],

        const SizedBox(height: 24),
      ]),
    );
  }
}

class _Section extends StatelessWidget {
  final String title;
  final List<_Row> rows;
  const _Section({required this.title, required this.rows});

  @override
  Widget build(BuildContext context) {
    return Container(
      width: double.infinity,
      decoration: BoxDecoration(
        color: AppTheme.surface,
        borderRadius: BorderRadius.circular(16),
        border: Border.all(color: AppTheme.border),
      ),
      child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
        Padding(
          padding: const EdgeInsets.fromLTRB(16, 14, 16, 10),
          child: Text(title,
              style: const TextStyle(
                  color: AppTheme.textPrimary,
                  fontWeight: FontWeight.w600,
                  fontSize: 14)),
        ),
        const Divider(height: 1, color: AppTheme.border),
        ...rows.map((r) => _RowWidget(row: r)),
      ]),
    );
  }
}

class _Row {
  final String label;
  final String value;
  const _Row(this.label, this.value);
}

class _RowWidget extends StatelessWidget {
  final _Row row;
  const _RowWidget({required this.row});

  @override
  Widget build(BuildContext context) {
    return Padding(
      padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 10),
      child: Row(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          SizedBox(
            width: 110,
            child: Text(row.label,
                style: const TextStyle(
                    color: AppTheme.textMuted, fontSize: 13)),
          ),
          Expanded(
            child: Text(row.value,
                style: const TextStyle(
                    color: AppTheme.textPrimary, fontSize: 13)),
          ),
        ],
      ),
    );
  }
}
