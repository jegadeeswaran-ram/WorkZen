import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../../../core/theme/app_theme.dart';

class HrReportsScreen extends ConsumerWidget {
  const HrReportsScreen({super.key});

  static const _reports = [
    _ReportItem(
      title: 'Headcount Report',
      icon: Icons.people_outlined,
      color: AppTheme.primary,
    ),
    _ReportItem(
      title: 'Payroll Summary',
      icon: Icons.payments_outlined,
      color: AppTheme.success,
    ),
    _ReportItem(
      title: 'Attendance Report',
      icon: Icons.how_to_reg,
      color: AppTheme.warning,
    ),
    _ReportItem(
      title: 'Leave Summary',
      icon: Icons.event_available_outlined,
      color: AppTheme.primary,
    ),
    _ReportItem(
      title: 'Compliance Report',
      icon: Icons.verified_outlined,
      color: AppTheme.success,
    ),
    _ReportItem(
      title: 'Recruitment Report',
      icon: Icons.work_outline,
      color: Color(0xFF8B5CF6),
    ),
  ];

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    return Scaffold(
      appBar: AppBar(title: const Text('HR Reports')),
      body: GridView.count(
        padding: const EdgeInsets.all(16),
        crossAxisCount: 2,
        crossAxisSpacing: 12,
        mainAxisSpacing: 12,
        childAspectRatio: 1.1,
        children: _reports
            .map((r) => _ReportCard(item: r))
            .toList(),
      ),
    );
  }
}

class _ReportItem {
  const _ReportItem({
    required this.title,
    required this.icon,
    required this.color,
  });
  final String title;
  final IconData icon;
  final Color color;
}

class _ReportCard extends StatelessWidget {
  const _ReportCard({required this.item});
  final _ReportItem item;

  @override
  Widget build(BuildContext context) {
    return GestureDetector(
      onTap: () {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(
            content: Text(
                'Generating ${item.title}... View in web portal'),
          ),
        );
      },
      child: Container(
        padding: const EdgeInsets.all(20),
        decoration: BoxDecoration(
          color: AppTheme.surface,
          borderRadius: BorderRadius.circular(16),
          border: Border.all(color: AppTheme.border),
        ),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Container(
              width: 40,
              height: 40,
              decoration: BoxDecoration(
                color: item.color.withValues(alpha: 0.15),
                borderRadius: BorderRadius.circular(12),
              ),
              child: Icon(item.icon, color: item.color, size: 22),
            ),
            const SizedBox(height: 12),
            Text(
              item.title,
              style: const TextStyle(
                  fontWeight: FontWeight.bold, fontSize: 14),
              maxLines: 2,
            ),
            const SizedBox(height: 4),
            const Text(
              'Tap to generate',
              style: TextStyle(color: AppTheme.textMuted, fontSize: 11),
            ),
          ],
        ),
      ),
    );
  }
}
