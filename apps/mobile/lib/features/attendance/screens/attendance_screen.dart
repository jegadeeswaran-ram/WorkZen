import 'package:flutter/material.dart';
import 'package:flutter_animate/flutter_animate.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:geolocator/geolocator.dart';
import 'package:intl/intl.dart';
import '../../../core/theme/app_theme.dart';
import '../../../core/network/api_client.dart';
import '../../../core/providers/auth_provider.dart';
import '../providers/attendance_provider.dart';

class AttendanceScreen extends ConsumerStatefulWidget {
  const AttendanceScreen({super.key});
  @override
  ConsumerState<AttendanceScreen> createState() => _AttendanceScreenState();
}

class _AttendanceScreenState extends ConsumerState<AttendanceScreen> {
  bool _actionLoading = false;

  Future<void> _doCheckIn() async {
    setState(() => _actionLoading = true);
    try {
      Position? pos;
      try {
        final perm = await Geolocator.checkPermission();
        if (perm == LocationPermission.denied) await Geolocator.requestPermission();
        pos = await Geolocator.getCurrentPosition(desiredAccuracy: LocationAccuracy.high);
      } catch (_) {}
      final api = ref.read(apiClientProvider);
      await api.post('/attendance/check-in', data: {
        if (pos != null) 'latitude': pos.latitude,
        if (pos != null) 'longitude': pos.longitude,
        'method': 'GPS',
      });
      ref.invalidate(todayAttendanceProvider);
      ref.invalidate(weekAttendanceProvider);
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(content: Text('✓ Checked in'), backgroundColor: AppTheme.success),
        );
      }
    } catch (e) {
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(content: Text(e.toString()), backgroundColor: AppTheme.danger),
        );
      }
    } finally {
      if (mounted) setState(() => _actionLoading = false);
    }
  }

  Future<void> _doCheckOut() async {
    setState(() => _actionLoading = true);
    try {
      Position? pos;
      try {
        pos = await Geolocator.getCurrentPosition(desiredAccuracy: LocationAccuracy.medium);
      } catch (_) {}
      final api = ref.read(apiClientProvider);
      await api.post('/attendance/check-out', data: {
        if (pos != null) 'latitude': pos.latitude,
        if (pos != null) 'longitude': pos.longitude,
      });
      ref.invalidate(todayAttendanceProvider);
      ref.invalidate(weekAttendanceProvider);
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(content: Text('✓ Checked out'), backgroundColor: AppTheme.success),
        );
      }
    } catch (e) {
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(content: Text(e.toString()), backgroundColor: AppTheme.danger),
        );
      }
    } finally {
      if (mounted) setState(() => _actionLoading = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    final user = ref.watch(authStateProvider).value;
    final todayAsync = ref.watch(todayAttendanceProvider);
    final weekAsync = ref.watch(weekAttendanceProvider);
    final statsAsync = ref.watch(monthStatsProvider);
    final now = DateTime.now();
    final dateFmt = DateFormat('EEEE, dd MMM yyyy');
    final timeFmt = DateFormat('hh:mm a');

    return Scaffold(
      backgroundColor: AppTheme.background,
      appBar: AppBar(
        title: const Text('Attendance'),
        actions: [
          IconButton(
            icon: const Icon(Icons.refresh_outlined),
            onPressed: () {
              ref.invalidate(todayAttendanceProvider);
              ref.invalidate(weekAttendanceProvider);
              ref.invalidate(monthStatsProvider);
            },
          ),
        ],
      ),
      body: RefreshIndicator(
        color: AppTheme.primary,
        onRefresh: () async {
          ref.invalidate(todayAttendanceProvider);
          ref.invalidate(weekAttendanceProvider);
          ref.invalidate(monthStatsProvider);
        },
        child: SingleChildScrollView(
          physics: const AlwaysScrollableScrollPhysics(),
          padding: const EdgeInsets.all(20),
          child: Column(children: [
            // Date + clock card
            Container(
              width: double.infinity,
              padding: const EdgeInsets.all(20),
              decoration: BoxDecoration(
                gradient: const LinearGradient(colors: [Color(0xFF1E1B4B), Color(0xFF312E81)]),
                borderRadius: BorderRadius.circular(20),
                border: Border.all(color: AppTheme.primary.withOpacity(0.3)),
              ),
              child: Column(children: [
                Text(dateFmt.format(now),
                    style: Theme.of(context).textTheme.bodyMedium?.copyWith(color: Colors.white70)),
                const SizedBox(height: 4),
                StreamBuilder(
                  stream: Stream.periodic(const Duration(seconds: 1)),
                  builder: (_, __) => Text(
                    timeFmt.format(DateTime.now()),
                    style: Theme.of(context)
                        .textTheme
                        .displayLarge
                        ?.copyWith(fontSize: 48, letterSpacing: -2),
                  ),
                ),
                const SizedBox(height: 16),
                todayAsync.when(
                  loading: () => const SizedBox(
                      height: 24,
                      child: CircularProgressIndicator(strokeWidth: 2, color: Colors.white54)),
                  error: (_, __) => _infoChip(Icons.person_outline, user?.name ?? 'Employee'),
                  data: (today) => Wrap(
                    alignment: WrapAlignment.center,
                    spacing: 8,
                    runSpacing: 6,
                    children: [
                      _infoChip(Icons.person_outline, user?.name ?? 'Employee'),
                      if (today['checkInTime'] != null)
                        _infoChip(
                          Icons.login,
                          'In: ${timeFmt.format(DateTime.parse(today['checkInTime'] as String).toLocal())}',
                        ),
                      if (today['checkOutTime'] != null)
                        _infoChip(
                          Icons.logout,
                          'Out: ${timeFmt.format(DateTime.parse(today['checkOutTime'] as String).toLocal())}',
                        ),
                    ],
                  ),
                ),
              ]),
            ).animate().fadeIn(duration: 400.ms),

            const SizedBox(height: 24),

            // Check in/out button driven by API state
            todayAsync.when(
              loading: () => _circleButton(isCheckedIn: false, loading: true, onTap: null),
              error: (_, __) => _circleButton(
                  isCheckedIn: false, loading: _actionLoading, onTap: _actionLoading ? null : _doCheckIn),
              data: (today) {
                final isCheckedIn = today['isCheckedIn'] as bool? ?? false;
                return _circleButton(
                  isCheckedIn: isCheckedIn,
                  loading: _actionLoading,
                  onTap: _actionLoading ? null : (isCheckedIn ? _doCheckOut : _doCheckIn),
                );
              },
            ).animate().scale(delay: 200.ms, duration: 400.ms, curve: Curves.elasticOut),

            const SizedBox(height: 32),

            Align(
              alignment: Alignment.centerLeft,
              child: Text('This Week', style: Theme.of(context).textTheme.titleMedium),
            ),
            const SizedBox(height: 12),
            weekAsync.when(
              loading: () => const Center(child: CircularProgressIndicator()),
              error: (_, __) => const SizedBox.shrink(),
              data: (week) => Row(
                children: week.map((d) {
                  final code = d['statusCode'] as String;
                  final color = _dayColor(code);
                  return Expanded(
                    child: Column(children: [
                      Text(d['dayLabel'] as String,
                          style: Theme.of(context).textTheme.bodyMedium?.copyWith(fontSize: 11)),
                      const SizedBox(height: 6),
                      Container(
                        height: 32,
                        width: 32,
                        decoration: BoxDecoration(
                          shape: BoxShape.circle,
                          color: color.withOpacity(0.15),
                          border: Border.all(color: color.withOpacity(0.4)),
                        ),
                        alignment: Alignment.center,
                        child: Text(code,
                            style: TextStyle(color: color, fontSize: 11, fontWeight: FontWeight.bold)),
                      ),
                    ]),
                  );
                }).toList(),
              ),
            ).animate().fadeIn(delay: 300.ms),

            const SizedBox(height: 24),

            statsAsync.when(
              loading: () => const Center(child: CircularProgressIndicator()),
              error: (_, __) => const SizedBox.shrink(),
              data: (stats) => Row(children: [
                _statCard(context, 'Present', '${stats['present']}', AppTheme.success),
                const SizedBox(width: 12),
                _statCard(context, 'Absent', '${stats['absent']}', AppTheme.danger),
                const SizedBox(width: 12),
                _statCard(context, 'Leaves', '${stats['leaves']}', AppTheme.warning),
              ]),
            ).animate().fadeIn(delay: 400.ms),

            const SizedBox(height: 20),
          ]),
        ),
      ),
    );
  }

  Color _dayColor(String code) {
    switch (code) {
      case 'P':
        return AppTheme.success;
      case 'L':
        return AppTheme.warning;
      case 'A':
        return AppTheme.danger;
      case 'H':
        return AppTheme.primary;
      default:
        return AppTheme.textMuted;
    }
  }

  Widget _circleButton(
      {required bool isCheckedIn, required bool loading, required VoidCallback? onTap}) {
    final color = isCheckedIn ? AppTheme.danger : AppTheme.success;
    return GestureDetector(
      onTap: onTap,
      child: Container(
        width: 160,
        height: 160,
        decoration: BoxDecoration(
          shape: BoxShape.circle,
          gradient: RadialGradient(colors: [color.withOpacity(0.3), color.withOpacity(0.05)]),
          border: Border.all(color: color, width: 2),
          boxShadow: [BoxShadow(color: color.withOpacity(0.2), blurRadius: 40, spreadRadius: 4)],
        ),
        child: Column(mainAxisAlignment: MainAxisAlignment.center, children: [
          if (loading)
            const CircularProgressIndicator(strokeWidth: 2)
          else ...[
            Icon(isCheckedIn ? Icons.logout : Icons.fingerprint, color: color, size: 40),
            const SizedBox(height: 8),
            Text(
              isCheckedIn ? 'CHECK OUT' : 'CHECK IN',
              style:
                  TextStyle(color: color, fontWeight: FontWeight.bold, fontSize: 13, letterSpacing: 1),
            ),
          ],
        ]),
      ),
    );
  }

  Widget _infoChip(IconData icon, String label) => Container(
        padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 5),
        decoration: BoxDecoration(
          color: Colors.white.withOpacity(0.08),
          borderRadius: BorderRadius.circular(20),
          border: Border.all(color: Colors.white.withOpacity(0.12)),
        ),
        child: Row(mainAxisSize: MainAxisSize.min, children: [
          Icon(icon, size: 13, color: Colors.white70),
          const SizedBox(width: 5),
          Text(label, style: const TextStyle(color: Colors.white70, fontSize: 12)),
        ]),
      );

  Widget _statCard(BuildContext context, String label, String value, Color color) => Expanded(
        child: Container(
          padding: const EdgeInsets.all(14),
          decoration: BoxDecoration(
            color: color.withOpacity(0.08),
            borderRadius: BorderRadius.circular(14),
            border: Border.all(color: color.withOpacity(0.2)),
          ),
          child: Column(children: [
            Text(value,
                style: Theme.of(context).textTheme.titleLarge?.copyWith(color: color, fontSize: 22)),
            const SizedBox(height: 4),
            Text(label, style: Theme.of(context).textTheme.bodyMedium?.copyWith(fontSize: 11)),
          ]),
        ),
      );
}
