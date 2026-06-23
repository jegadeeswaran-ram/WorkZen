import 'package:flutter/material.dart';
import 'package:flutter_animate/flutter_animate.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import '../../../core/theme/app_theme.dart';

class SaMoreScreen extends ConsumerWidget {
  const SaMoreScreen({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final items = [
      _MoreItemData(
        label: 'Clients',
        icon: Icons.business_outlined,
        color: const Color(0xFF60A5FA),
        onTap: () => context.go('/sa/clients'),
      ),
      _MoreItemData(
        label: 'Employees',
        icon: Icons.people_outlined,
        color: AppTheme.success,
        onTap: () => context.go('/sa/employees'),
      ),
      _MoreItemData(
        label: 'Billing',
        icon: Icons.receipt_long_outlined,
        color: AppTheme.primary,
        onTap: () => context.go('/sa/billing'),
      ),
      _MoreItemData(
        label: 'Issues',
        icon: Icons.warning_amber_outlined,
        color: AppTheme.warning,
        onTap: () => context.go('/sa/issues'),
      ),
      _MoreItemData(
        label: 'Complaints',
        icon: Icons.report_problem_outlined,
        color: AppTheme.danger,
        onTap: () => context.go('/sa/complaints'),
      ),
      _MoreItemData(
        label: 'Notifications',
        icon: Icons.notifications_outlined,
        color: const Color(0xFF8B5CF6),
        onTap: () => context.go('/notifications'),
      ),
    ];

    return Scaffold(
      backgroundColor: AppTheme.background,
      appBar: AppBar(
        title: const Text('More'),
        backgroundColor: AppTheme.surface,
      ),
      body: Padding(
        padding: const EdgeInsets.all(16),
        child: GridView.count(
          crossAxisCount: 2,
          mainAxisSpacing: 12,
          crossAxisSpacing: 12,
          children: items
              .asMap()
              .entries
              .map(
                (e) => _MoreItem(data: e.value)
                    .animate()
                    .fadeIn(delay: (e.key * 60).ms, duration: 300.ms)
                    .scale(
                      begin: const Offset(0.9, 0.9),
                      end: const Offset(1.0, 1.0),
                      delay: (e.key * 60).ms,
                      duration: 300.ms,
                    ),
              )
              .toList(),
        ),
      ),
    );
  }
}

class _MoreItemData {
  const _MoreItemData({
    required this.label,
    required this.icon,
    required this.color,
    required this.onTap,
  });

  final String label;
  final IconData icon;
  final Color color;
  final VoidCallback onTap;
}

class _MoreItem extends StatelessWidget {
  const _MoreItem({required this.data});

  final _MoreItemData data;

  @override
  Widget build(BuildContext context) {
    return InkWell(
      onTap: data.onTap,
      borderRadius: BorderRadius.circular(16),
      child: Container(
        padding: const EdgeInsets.all(20),
        decoration: BoxDecoration(
          color: data.color.withValues(alpha: 0.08),
          borderRadius: BorderRadius.circular(16),
          border: Border.all(
            color: data.color.withValues(alpha: 0.2),
          ),
        ),
        child: Column(
          mainAxisAlignment: MainAxisAlignment.center,
          children: [
            Icon(data.icon, size: 36, color: data.color),
            const SizedBox(height: 12),
            Text(
              data.label,
              style: const TextStyle(
                fontSize: 13,
                fontWeight: FontWeight.w600,
                color: AppTheme.textPrimary,
              ),
              textAlign: TextAlign.center,
            ),
          ],
        ),
      ),
    );
  }
}
