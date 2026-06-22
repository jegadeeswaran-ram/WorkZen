import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:intl/intl.dart';
import '../../../core/theme/app_theme.dart';
import '../providers/calendar_provider.dart';

class CalendarScreen extends ConsumerWidget {
  const CalendarScreen({super.key});

  static const _weekdays = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
  static const _months = ['January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December'];

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final selectedMonth = ref.watch(selectedMonthProvider);
    final holidaysAsync = ref.watch(holidaysProvider);
    final eventsAsync = ref.watch(calendarEventsProvider);

    final now = DateTime.now();
    final firstDay = DateTime(selectedMonth.year, selectedMonth.month, 1);
    final daysInMonth = DateTime(selectedMonth.year, selectedMonth.month + 1, 0).day;
    final startWeekday = firstDay.weekday; // 1=Mon, 7=Sun

    return Scaffold(
      backgroundColor: AppTheme.background,
      appBar: AppBar(
        title: const Text('Calendar'),
        actions: [
          IconButton(icon: const Icon(Icons.refresh_outlined), onPressed: () {
            ref.invalidate(holidaysProvider);
            ref.invalidate(calendarEventsProvider);
          }),
        ],
      ),
      body: SingleChildScrollView(
        padding: const EdgeInsets.all(16),
        child: Column(children: [
          // Month navigator
          Container(
            padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
            decoration: BoxDecoration(color: AppTheme.surface, borderRadius: BorderRadius.circular(14), border: Border.all(color: AppTheme.border)),
            child: Row(children: [
              IconButton(
                icon: const Icon(Icons.chevron_left, color: AppTheme.textSecondary),
                onPressed: () => ref.read(selectedMonthProvider.notifier).state =
                    DateTime(selectedMonth.year, selectedMonth.month - 1),
              ),
              Expanded(
                child: Text(
                  '${_months[selectedMonth.month - 1]} ${selectedMonth.year}',
                  textAlign: TextAlign.center,
                  style: const TextStyle(color: AppTheme.textPrimary, fontWeight: FontWeight.w600, fontSize: 15),
                ),
              ),
              IconButton(
                icon: const Icon(Icons.chevron_right, color: AppTheme.textSecondary),
                onPressed: () => ref.read(selectedMonthProvider.notifier).state =
                    DateTime(selectedMonth.year, selectedMonth.month + 1),
              ),
            ]),
          ),
          const SizedBox(height: 12),

          // Calendar grid
          Container(
            padding: const EdgeInsets.all(12),
            decoration: BoxDecoration(color: AppTheme.surface, borderRadius: BorderRadius.circular(16), border: Border.all(color: AppTheme.border)),
            child: Column(children: [
              // Weekday headers
              Row(children: _weekdays.map((d) => Expanded(
                child: Center(child: Text(d, style: const TextStyle(color: AppTheme.textMuted, fontSize: 11, fontWeight: FontWeight.w600))),
              )).toList()),
              const SizedBox(height: 8),
              // Day grid
              holidaysAsync.when(
                loading: () => const CircularProgressIndicator(color: AppTheme.primary),
                error: (_, __) => const SizedBox.shrink(),
                data: (holidays) {
                  final holidayDays = <int>{};
                  for (final h in holidays) {
                    try {
                      final d = DateTime.parse(h['date'] as String);
                      if (d.year == selectedMonth.year && d.month == selectedMonth.month) {
                        holidayDays.add(d.day);
                      }
                    } catch (_) {}
                  }

                  final totalCells = startWeekday - 1 + daysInMonth;
                  final rows = (totalCells / 7).ceil();

                  return GridView.builder(
                    shrinkWrap: true,
                    physics: const NeverScrollableScrollPhysics(),
                    gridDelegate: const SliverGridDelegateWithFixedCrossAxisCount(crossAxisCount: 7, childAspectRatio: 1),
                    itemCount: rows * 7,
                    itemBuilder: (_, index) {
                      final dayNum = index - (startWeekday - 2);
                      if (dayNum < 1 || dayNum > daysInMonth) return const SizedBox.shrink();
                      final isToday = now.year == selectedMonth.year && now.month == selectedMonth.month && now.day == dayNum;
                      final isHoliday = holidayDays.contains(dayNum);

                      return Column(mainAxisAlignment: MainAxisAlignment.center, children: [
                        Container(
                          width: 30, height: 30,
                          decoration: isToday ? BoxDecoration(color: AppTheme.primary, shape: BoxShape.circle) : null,
                          child: Center(
                            child: Text('$dayNum', style: TextStyle(
                              color: isToday ? Colors.white : isHoliday ? AppTheme.danger : AppTheme.textPrimary,
                              fontSize: 12,
                              fontWeight: isToday ? FontWeight.bold : FontWeight.normal,
                            )),
                          ),
                        ),
                        if (isHoliday) Container(width: 4, height: 4, margin: const EdgeInsets.only(top: 1), decoration: const BoxDecoration(color: AppTheme.danger, shape: BoxShape.circle)),
                      ]);
                    },
                  );
                },
              ),
            ]),
          ),
          const SizedBox(height: 16),

          // Events & holidays list
          eventsAsync.when(
            loading: () => const Center(child: CircularProgressIndicator(color: AppTheme.primary)),
            error: (_, __) => const SizedBox.shrink(),
            data: (events) {
              return holidaysAsync.when(
                loading: () => const SizedBox.shrink(),
                error: (_, __) => const SizedBox.shrink(),
                data: (holidays) {
                  final monthHolidays = holidays.where((h) {
                    try {
                      final d = DateTime.parse(h['date'] as String);
                      return d.year == selectedMonth.year && d.month == selectedMonth.month;
                    } catch (_) { return false; }
                  }).toList();

                  if (monthHolidays.isEmpty && events.isEmpty) {
                    return const Center(child: Text('No events this month', style: TextStyle(color: AppTheme.textMuted)));
                  }

                  return Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
                    if (monthHolidays.isNotEmpty) ...[
                      const Text('Holidays', style: TextStyle(color: AppTheme.textPrimary, fontWeight: FontWeight.w600, fontSize: 14)),
                      const SizedBox(height: 8),
                      ...monthHolidays.map((h) => _EventCard(
                        title: h['name'] as String? ?? '',
                        date: h['date'] as String?,
                        badge: h['type'] as String? ?? 'NATIONAL',
                        color: AppTheme.danger,
                      )),
                    ],
                    if (events.isNotEmpty) ...[
                      if (monthHolidays.isNotEmpty) const SizedBox(height: 12),
                      const Text('Events', style: TextStyle(color: AppTheme.textPrimary, fontWeight: FontWeight.w600, fontSize: 14)),
                      const SizedBox(height: 8),
                      ...events.map((e) => _EventCard(
                        title: e['title'] as String? ?? '',
                        date: e['date'] as String?,
                        badge: e['eventType'] as String? ?? 'Event',
                        color: AppTheme.primary,
                      )),
                    ],
                  ]);
                },
              );
            },
          ),
          const SizedBox(height: 24),
        ]),
      ),
    );
  }
}

class _EventCard extends StatelessWidget {
  final String title;
  final String? date;
  final String badge;
  final Color color;
  const _EventCard({required this.title, this.date, required this.badge, required this.color});

  String _fmt(String? iso) {
    if (iso == null) return '—';
    try { return DateFormat('dd MMM yyyy').format(DateTime.parse(iso)); } catch (_) { return iso; }
  }

  @override
  Widget build(BuildContext context) => Container(
    margin: const EdgeInsets.only(bottom: 8),
    padding: const EdgeInsets.all(14),
    decoration: BoxDecoration(color: AppTheme.surface, borderRadius: BorderRadius.circular(14), border: Border.all(color: AppTheme.border)),
    child: Row(children: [
      Container(width: 4, height: 40, decoration: BoxDecoration(color: color, borderRadius: BorderRadius.circular(4))),
      const SizedBox(width: 12),
      Expanded(child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
        Text(title, style: const TextStyle(color: AppTheme.textPrimary, fontSize: 13, fontWeight: FontWeight.w600)),
        const SizedBox(height: 2),
        Text(_fmt(date), style: const TextStyle(color: AppTheme.textMuted, fontSize: 11)),
      ])),
      Container(
        padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 3),
        decoration: BoxDecoration(color: color.withValues(alpha: 0.12), borderRadius: BorderRadius.circular(10), border: Border.all(color: color.withValues(alpha: 0.3))),
        child: Text(badge, style: TextStyle(color: color, fontSize: 10, fontWeight: FontWeight.w600)),
      ),
    ]),
  );
}
