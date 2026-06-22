import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../../../core/providers/auth_provider.dart';
import '../../../core/providers/employee_provider.dart';
import '../../../core/theme/app_theme.dart';
import 'personal_info_sheet.dart';

class ProfileScreen extends ConsumerWidget {
  const ProfileScreen({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final user = ref.watch(authStateProvider).value;
    final empAsync = ref.watch(employeeProvider);

    return Scaffold(
      backgroundColor: AppTheme.background,
      appBar: AppBar(title: const Text('Profile')),
      body: SingleChildScrollView(
        padding: const EdgeInsets.all(20),
        child: Column(children: [
          empAsync.when(
            loading: () => CircleAvatar(
              radius: 44,
              backgroundColor: AppTheme.primary.withOpacity(0.15),
              child: const CircularProgressIndicator(strokeWidth: 2),
            ),
            error: (_, __) => CircleAvatar(
              radius: 44,
              backgroundColor: AppTheme.primary.withOpacity(0.15),
              child: Text(
                      (empAsync.value?.fullName.isNotEmpty == true
                              ? empAsync.value!.fullName
                              : (user?.name ?? 'U'))[0]
                          .toUpperCase(),
                      style: const TextStyle(
                          fontSize: 32, fontWeight: FontWeight.bold, color: AppTheme.primary)),
            ),
            data: (emp) => CircleAvatar(
              radius: 44,
              backgroundColor: AppTheme.primary.withOpacity(0.15),
              backgroundImage: emp?.photo != null ? NetworkImage(emp!.photo!) : null,
              child: emp?.photo == null
                  ? Text((user?.name ?? 'U')[0],
                      style: const TextStyle(
                          fontSize: 32, fontWeight: FontWeight.bold, color: AppTheme.primary))
                  : null,
            ),
          ),
          const SizedBox(height: 12),
          Text(
            empAsync.value?.fullName.isNotEmpty == true
                ? empAsync.value!.fullName
                : (user?.name ?? 'Employee'),
            style: Theme.of(context).textTheme.headlineMedium?.copyWith(fontSize: 20),
          ),
          Text(user?.email ?? '', style: Theme.of(context).textTheme.bodyMedium),
          const SizedBox(height: 4),
          empAsync.maybeWhen(
            data: (emp) => emp != null
                ? Text(emp.employeeCode,
                    style: const TextStyle(color: AppTheme.textMuted, fontSize: 12))
                : const SizedBox.shrink(),
            orElse: () => const SizedBox.shrink(),
          ),
          const SizedBox(height: 8),
          Container(
            padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 3),
            decoration: BoxDecoration(
              color: AppTheme.primary.withOpacity(0.1),
              borderRadius: BorderRadius.circular(8),
              border: Border.all(color: AppTheme.primary.withOpacity(0.3)),
            ),
            child: Text(user?.role ?? 'EMPLOYEE',
                style: const TextStyle(
                    color: AppTheme.primary, fontSize: 12, fontWeight: FontWeight.w600)),
          ),
          const SizedBox(height: 32),
          ...[
            (
              'Personal Info',
              Icons.person_outline,
              () => showModalBottomSheet(
                    context: context,
                    backgroundColor: Colors.transparent,
                    isScrollControlled: true,
                    builder: (_) => const PersonalInfoSheet(),
                  )
            ),
            ('Bank Details', Icons.account_balance_outlined, () {}),
            ('Documents', Icons.folder_outlined, () {}),
            ('Change Password', Icons.lock_outline, () {}),
            ('Notifications', Icons.notifications_outlined, () {}),
          ].map((item) => _tile(context, item.$1, item.$2, item.$3)),
          const SizedBox(height: 16),
          SizedBox(
            width: double.infinity,
            child: OutlinedButton.icon(
              onPressed: () => ref.read(authStateProvider.notifier).logout(),
              icon: const Icon(Icons.logout, size: 16, color: AppTheme.danger),
              label: const Text('Sign Out', style: TextStyle(color: AppTheme.danger)),
              style: OutlinedButton.styleFrom(
                side: const BorderSide(color: AppTheme.danger, width: 1),
                padding: const EdgeInsets.symmetric(vertical: 14),
                shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
              ),
            ),
          ),
        ]),
      ),
    );
  }

  Widget _tile(BuildContext context, String label, IconData icon, VoidCallback onTap) => InkWell(
        onTap: onTap,
        borderRadius: BorderRadius.circular(14),
        child: Container(
          margin: const EdgeInsets.only(bottom: 8),
          padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 14),
          decoration: BoxDecoration(
              color: AppTheme.surface,
              borderRadius: BorderRadius.circular(14),
              border: Border.all(color: AppTheme.border)),
          child: Row(children: [
            Icon(icon, size: 18, color: AppTheme.textSecondary),
            const SizedBox(width: 14),
            Expanded(
                child: Text(label,
                    style: Theme.of(context).textTheme.bodyLarge?.copyWith(fontSize: 14))),
            const Icon(Icons.chevron_right, size: 16, color: AppTheme.textMuted),
          ]),
        ),
      );
}
