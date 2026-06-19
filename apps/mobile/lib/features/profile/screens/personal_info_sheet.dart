import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:intl/intl.dart';
import '../../../core/providers/employee_provider.dart';
import '../../../core/theme/app_theme.dart';

class PersonalInfoSheet extends ConsumerWidget {
  const PersonalInfoSheet({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final empAsync = ref.watch(employeeProvider);

    return Container(
      decoration: const BoxDecoration(
        color: AppTheme.surface,
        borderRadius: BorderRadius.vertical(top: Radius.circular(20)),
      ),
      padding: const EdgeInsets.all(24),
      child: empAsync.when(
        loading: () => const Center(
            child: Padding(padding: EdgeInsets.all(40), child: CircularProgressIndicator())),
        error: (_, __) => const Center(
            child: Text('Could not load profile', style: TextStyle(color: AppTheme.textMuted))),
        data: (emp) => emp == null
            ? const Center(
                child: Text('No employee profile linked',
                    style: TextStyle(color: AppTheme.textMuted)))
            : Column(mainAxisSize: MainAxisSize.min, crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text('Personal Information',
                      style: Theme.of(context).textTheme.headlineMedium?.copyWith(fontSize: 18)),
                  const SizedBox(height: 20),
                  _row('Employee Code', emp.employeeCode),
                  _row('Full Name', emp.fullName),
                  _row('Phone', emp.personalPhone),
                  if (emp.joiningDate != null)
                    _row('Joining Date',
                        DateFormat('dd MMM yyyy').format(DateTime.parse(emp.joiningDate!))),
                  const SizedBox(height: 20),
                ]),
      ),
    );
  }

  Widget _row(String label, String value) => Padding(
        padding: const EdgeInsets.only(bottom: 16),
        child: Row(crossAxisAlignment: CrossAxisAlignment.start, children: [
          SizedBox(
              width: 120,
              child: Text(label, style: const TextStyle(color: AppTheme.textMuted, fontSize: 13))),
          Expanded(
              child: Text(value,
                  style: const TextStyle(
                      color: Colors.white, fontSize: 13, fontWeight: FontWeight.w500))),
        ]),
      );
}
