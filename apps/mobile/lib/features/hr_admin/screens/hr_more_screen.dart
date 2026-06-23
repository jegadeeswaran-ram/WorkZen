import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import '../../../core/theme/app_theme.dart';

class HrMoreScreen extends ConsumerWidget {
  const HrMoreScreen({super.key});

  static const _items = [
    _MoreItem(
      label: 'Recruitment',
      icon: Icons.work_outline,
      route: '/hr/recruitment',
      color: AppTheme.primary,
    ),
    _MoreItem(
      label: 'Leave Mgmt',
      icon: Icons.event_available_outlined,
      route: '/hr/leaves',
      color: AppTheme.warning,
    ),
    _MoreItem(
      label: 'Attendance',
      icon: Icons.how_to_reg,
      route: '/hr/attendance',
      color: AppTheme.success,
    ),
    _MoreItem(
      label: 'Reports',
      icon: Icons.bar_chart_outlined,
      route: '/hr/reports',
      color: Color(0xFF8B5CF6),
    ),
    _MoreItem(
      label: 'Settings',
      icon: Icons.settings_outlined,
      route: null,
      color: AppTheme.textMuted,
    ),
    _MoreItem(
      label: 'Help',
      icon: Icons.help_outline,
      route: null,
      color: AppTheme.textMuted,
    ),
  ];

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    return Scaffold(
      appBar: AppBar(title: const Text('More')),
      body: ListView(
        padding: const EdgeInsets.all(16),
        children: [
          const Padding(
            padding: EdgeInsets.only(bottom: 12),
            child: Text(
              'HR Management',
              style: TextStyle(
                color: AppTheme.textMuted,
                fontSize: 12,
                fontWeight: FontWeight.bold,
              ),
            ),
          ),
          GridView.count(
            shrinkWrap: true,
            physics: const NeverScrollableScrollPhysics(),
            crossAxisCount: 2,
            crossAxisSpacing: 12,
            mainAxisSpacing: 12,
            childAspectRatio: 1.2,
            children: _items
                .map((item) => _MoreItemCard(item: item))
                .toList(),
          ),
        ],
      ),
    );
  }
}

class _MoreItem {
  const _MoreItem({
    required this.label,
    required this.icon,
    required this.route,
    required this.color,
  });
  final String label;
  final IconData icon;
  final String? route;
  final Color color;
}

class _MoreItemCard extends StatelessWidget {
  const _MoreItemCard({required this.item});
  final _MoreItem item;

  @override
  Widget build(BuildContext context) {
    return GestureDetector(
      onTap: () {
        if (item.route != null) {
          context.go(item.route!);
        } else {
          ScaffoldMessenger.of(context).showSnackBar(
            SnackBar(
              content: Text('${item.label} — Coming soon'),
            ),
          );
        }
      },
      child: Container(
        padding: const EdgeInsets.all(16),
        decoration: BoxDecoration(
          color: AppTheme.surface,
          borderRadius: BorderRadius.circular(16),
          border: Border.all(color: AppTheme.border),
        ),
        child: Column(
          mainAxisAlignment: MainAxisAlignment.center,
          children: [
            Container(
              width: 44,
              height: 44,
              decoration: BoxDecoration(
                color: item.color.withValues(alpha: 0.15),
                borderRadius: BorderRadius.circular(12),
              ),
              child: Icon(item.icon, color: item.color, size: 22),
            ),
            const SizedBox(height: 10),
            Text(
              item.label,
              style: const TextStyle(fontSize: 13),
              textAlign: TextAlign.center,
            ),
          ],
        ),
      ),
    );
  }
}
