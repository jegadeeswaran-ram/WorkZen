import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../../../core/theme/app_theme.dart';
import '../../../core/network/api_client.dart';
import '../providers/supervisor_provider.dart';

// ---------------------------------------------------------------------------
// Main screen
// ---------------------------------------------------------------------------

class TeamAttendanceScreen extends ConsumerStatefulWidget {
  const TeamAttendanceScreen({super.key});

  @override
  ConsumerState<TeamAttendanceScreen> createState() =>
      _TeamAttendanceScreenState();
}

class _TeamAttendanceScreenState extends ConsumerState<TeamAttendanceScreen> {
  String _filter = 'ALL';

  static const List<String> _filterOptions = [
    'ALL',
    'PRESENT',
    'ABSENT',
    'LEAVE',
    'LATE',
  ];

  String _todayLabel() {
    final now = DateTime.now();
    const months = [
      'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun',
      'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec',
    ];
    const weekdays = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
    final wd = weekdays[now.weekday - 1];
    return '$wd, ${now.day} ${months[now.month - 1]} ${now.year}';
  }

  String _initials(Map<String, dynamic> employee) {
    final emp = employee['employee'] as Map<String, dynamic>? ?? employee;
    final first = (emp['firstName'] as String? ?? '').trim();
    final last = (emp['lastName'] as String? ?? '').trim();
    final f = first.isNotEmpty ? first[0].toUpperCase() : '';
    final l = last.isNotEmpty ? last[0].toUpperCase() : '';
    return '$f$l'.isNotEmpty ? '$f$l' : '?';
  }

  String _fullName(Map<String, dynamic> employee) {
    final emp = employee['employee'] as Map<String, dynamic>? ?? employee;
    final first = emp['firstName'] as String? ?? '';
    final last = emp['lastName'] as String? ?? '';
    return '$first $last'.trim();
  }

  String _employeeCode(Map<String, dynamic> employee) {
    final emp = employee['employee'] as Map<String, dynamic>? ?? employee;
    return emp['employeeCode'] as String? ?? '—';
  }

  Color _statusColor(String? status) {
    switch ((status ?? '').toUpperCase()) {
      case 'PRESENT':
        return AppTheme.success;
      case 'LATE':
        return AppTheme.warning;
      case 'LEAVE':
      case 'HALF_DAY':
        return AppTheme.warning;
      case 'ABSENT':
      default:
        return AppTheme.danger;
    }
  }

  Widget _statusBadge(String? status) {
    final label = status ?? 'ABSENT';
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 4),
      decoration: BoxDecoration(
        borderRadius: BorderRadius.circular(20),
        color: _statusColor(status).withValues(alpha: 0.18),
      ),
      child: Text(
        label.toUpperCase(),
        style: TextStyle(
          color: _statusColor(status),
          fontSize: 11,
          fontWeight: FontWeight.w600,
          letterSpacing: 0.4,
        ),
      ),
    );
  }

  void _showMarkSheet(
    BuildContext ctx,
    WidgetRef ref,
    Map<String, dynamic> employee,
    String? currentStatus,
  ) {
    showModalBottomSheet(
      context: ctx,
      isScrollControlled: true,
      backgroundColor: AppTheme.surface,
      shape: const RoundedRectangleBorder(
        borderRadius: BorderRadius.vertical(top: Radius.circular(20)),
      ),
      builder: (_) => _MarkSheet(
        employee: employee,
        currentStatus: currentStatus,
      ),
    );
  }

  Widget _buildFilterChips() {
    return SingleChildScrollView(
      scrollDirection: Axis.horizontal,
      padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 10),
      child: Row(
        children: _filterOptions.map((opt) {
          final selected = _filter == opt;
          return Padding(
            padding: const EdgeInsets.only(right: 8),
            child: FilterChip(
              label: Text(opt),
              selected: selected,
              onSelected: (_) => setState(() => _filter = opt),
              selectedColor: AppTheme.primary.withValues(alpha: 0.3),
              backgroundColor: Colors.transparent,
              checkmarkColor: AppTheme.primary,
              labelStyle: TextStyle(
                color: selected ? AppTheme.primary : AppTheme.textSecondary,
                fontWeight:
                    selected ? FontWeight.w600 : FontWeight.normal,
                fontSize: 13,
              ),
              side: BorderSide(
                color: selected ? AppTheme.primary : AppTheme.border,
                width: 1,
              ),
              showCheckmark: false,
              padding:
                  const EdgeInsets.symmetric(horizontal: 12, vertical: 6),
            ),
          );
        }).toList(),
      ),
    );
  }

  Widget _buildEmployeeCard(
    Map<String, dynamic> displayItem,
  ) {
    final employee = displayItem['deployment'] as Map<String, dynamic>;
    final status = displayItem['status'] as String?;
    final name = _fullName(employee);
    final code = _employeeCode(employee);
    final initials = _initials(employee);

    return Container(
      margin: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
      decoration: BoxDecoration(
        color: AppTheme.surface,
        borderRadius: BorderRadius.circular(12),
        border: Border.all(color: AppTheme.border, width: 1),
      ),
      child: ListTile(
        contentPadding:
            const EdgeInsets.symmetric(horizontal: 16, vertical: 6),
        leading: CircleAvatar(
          backgroundColor: AppTheme.primary.withValues(alpha: 0.2),
          child: Text(
            initials,
            style: const TextStyle(
              color: AppTheme.primary,
              fontWeight: FontWeight.w700,
              fontSize: 14,
            ),
          ),
        ),
        title: Text(
          name,
          style: const TextStyle(
            color: AppTheme.textPrimary,
            fontWeight: FontWeight.w600,
            fontSize: 14,
          ),
        ),
        subtitle: Text(
          code,
          style: const TextStyle(
            color: AppTheme.textSecondary,
            fontSize: 12,
          ),
        ),
        trailing: Row(
          mainAxisSize: MainAxisSize.min,
          children: [
            _statusBadge(status),
            const SizedBox(width: 4),
            IconButton(
              icon: const Icon(Icons.edit_note,
                  size: 22, color: AppTheme.textSecondary),
              tooltip: 'Mark',
              onPressed: () =>
                  _showMarkSheet(context, ref, employee, status),
            ),
          ],
        ),
      ),
    );
  }

  Widget _buildContent(
    List<Map<String, dynamic>> team,
    List<Map<String, dynamic>> attendance,
  ) {
    // Build attendance map keyed by employeeId
    final attMap = <String, Map<String, dynamic>>{
      for (final a in attendance)
        if (a['employeeId'] != null)
          a['employeeId'].toString(): a,
    };

    // Build display list: merge deployment + attendance status
    final displayList = team.map((emp) {
      final empId = (emp['employeeId'] ??
              (emp['employee'] as Map<String, dynamic>?)?['id'])
          ?.toString();
      final att = empId != null ? attMap[empId] : null;
      return {
        'deployment': emp,
        'status': att?['status'] as String?,
        'attendanceRecord': att,
      };
    }).toList();

    // Apply filter
    final filtered = _filter == 'ALL'
        ? displayList
        : displayList.where((item) {
            final s = (item['status'] as String? ?? 'ABSENT').toUpperCase();
            return s == _filter;
          }).toList();

    if (filtered.isEmpty) {
      return const Center(
        child: Column(
          mainAxisAlignment: MainAxisAlignment.center,
          children: [
            Icon(Icons.people_outline,
                size: 56, color: AppTheme.textMuted),
            SizedBox(height: 16),
            Text(
              'No employees found',
              style: TextStyle(
                color: AppTheme.textSecondary,
                fontSize: 16,
              ),
            ),
          ],
        ),
      );
    }

    return ListView.builder(
      padding: const EdgeInsets.only(bottom: 24),
      itemCount: filtered.length,
      itemBuilder: (_, i) => _buildEmployeeCard(filtered[i]),
    );
  }

  @override
  Widget build(BuildContext context) {
    final teamAsync = ref.watch(supervisorTeamProvider);
    final attendanceAsync = ref.watch(teamTodayAttendanceProvider);

    final isLoading = teamAsync.isLoading || attendanceAsync.isLoading;
    final hasError = teamAsync.hasError || attendanceAsync.hasError;

    return Scaffold(
      backgroundColor: AppTheme.background,
      appBar: AppBar(
        title: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            const Text('Team Attendance'),
            Text(
              _todayLabel(),
              style: const TextStyle(
                fontSize: 12,
                color: AppTheme.textSecondary,
                fontWeight: FontWeight.normal,
              ),
            ),
          ],
        ),
        actions: [
          IconButton(
            icon: const Icon(Icons.refresh),
            tooltip: 'Refresh',
            onPressed: () {
              ref.invalidate(supervisorTeamProvider);
              ref.invalidate(teamTodayAttendanceProvider);
            },
          ),
        ],
      ),
      body: Column(
        children: [
          _buildFilterChips(),
          Expanded(
            child: RefreshIndicator(
              color: AppTheme.primary,
              onRefresh: () async {
                ref.invalidate(supervisorTeamProvider);
                ref.invalidate(teamTodayAttendanceProvider);
              },
              child: isLoading
                  ? const Center(
                      child: CircularProgressIndicator(
                        color: AppTheme.primary,
                      ),
                    )
                  : hasError
                      ? Center(
                          child: Column(
                            mainAxisAlignment: MainAxisAlignment.center,
                            children: [
                              const Icon(Icons.error_outline,
                                  size: 48, color: AppTheme.danger),
                              const SizedBox(height: 12),
                              const Text(
                                'Failed to load team',
                                style: TextStyle(
                                  color: AppTheme.textSecondary,
                                  fontSize: 16,
                                ),
                              ),
                              const SizedBox(height: 12),
                              TextButton(
                                onPressed: () {
                                  ref.invalidate(supervisorTeamProvider);
                                  ref.invalidate(
                                      teamTodayAttendanceProvider);
                                },
                                child: const Text(
                                  'Retry',
                                  style: TextStyle(color: AppTheme.primary),
                                ),
                              ),
                            ],
                          ),
                        )
                      : _buildContent(
                          teamAsync.value ?? [],
                          attendanceAsync.value ?? [],
                        ),
            ),
          ),
        ],
      ),
    );
  }
}

// ---------------------------------------------------------------------------
// Mark Attendance Bottom Sheet
// ---------------------------------------------------------------------------

class _MarkSheet extends ConsumerStatefulWidget {
  final Map<String, dynamic> employee;
  final String? currentStatus;

  const _MarkSheet({
    required this.employee,
    required this.currentStatus,
  });

  @override
  ConsumerState<_MarkSheet> createState() => _MarkSheetState();
}

class _MarkSheetState extends ConsumerState<_MarkSheet> {
  late String _selectedStatus;
  final TextEditingController _remarksCtrl = TextEditingController();
  bool _loading = false;

  static const List<String> _statusOptions = [
    'PRESENT',
    'ABSENT',
    'HALF_DAY',
    'LEAVE',
    'LATE',
  ];

  @override
  void initState() {
    super.initState();
    _selectedStatus = widget.currentStatus ?? 'PRESENT';
  }

  @override
  void dispose() {
    _remarksCtrl.dispose();
    super.dispose();
  }

  String _firstName() {
    final emp = widget.employee['employee'] as Map<String, dynamic>? ??
        widget.employee;
    return emp['firstName'] as String? ?? 'Employee';
  }

  String _employeeId() {
    final emp = widget.employee['employee'] as Map<String, dynamic>? ??
        widget.employee;
    return (widget.employee['employeeId'] ?? emp['id'] ?? '').toString();
  }

  Future<void> _submit() async {
    setState(() => _loading = true);
    try {
      final api = ref.read(apiClientProvider);
      final now = DateTime.now();
      final date =
          '${now.year}-${now.month.toString().padLeft(2, '0')}-${now.day.toString().padLeft(2, '0')}';
      await api.post('/attendance/mark', data: {
        'employeeId': _employeeId(),
        'date': date,
        'status': _selectedStatus,
        'method': 'MANUAL',
        if (_remarksCtrl.text.isNotEmpty)
          'remarks': _remarksCtrl.text.trim(),
      });
      ref.invalidate(teamTodayAttendanceProvider);
      if (mounted) Navigator.pop(context);
    } catch (e) {
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(
            content: Text('Failed: $e'),
            backgroundColor: AppTheme.danger,
          ),
        );
      }
    } finally {
      if (mounted) setState(() => _loading = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    return Padding(
      padding: EdgeInsets.only(
        bottom: MediaQuery.of(context).viewInsets.bottom + 16,
      ),
      child: Column(
        mainAxisSize: MainAxisSize.min,
        crossAxisAlignment: CrossAxisAlignment.stretch,
        children: [
          // Handle bar
          Center(
            child: Container(
              margin: const EdgeInsets.only(top: 12, bottom: 16),
              width: 40,
              height: 4,
              decoration: BoxDecoration(
                color: AppTheme.border,
                borderRadius: BorderRadius.circular(2),
              ),
            ),
          ),

          // Title
          Padding(
            padding: const EdgeInsets.symmetric(horizontal: 20),
            child: Text(
              'Mark Attendance for ${_firstName()}',
              style: const TextStyle(
                color: AppTheme.textPrimary,
                fontSize: 17,
                fontWeight: FontWeight.w600,
              ),
            ),
          ),
          const SizedBox(height: 20),

          // Status dropdown
          Padding(
            padding: const EdgeInsets.symmetric(horizontal: 20),
            child: DropdownButtonFormField<String>(
              value: _selectedStatus,
              dropdownColor: AppTheme.surfaceVariant,
              decoration: const InputDecoration(
                labelText: 'Status',
                labelStyle: TextStyle(color: AppTheme.textSecondary),
              ),
              style: const TextStyle(color: AppTheme.textPrimary),
              items: _statusOptions
                  .map(
                    (s) => DropdownMenuItem(
                      value: s,
                      child: Text(s),
                    ),
                  )
                  .toList(),
              onChanged: (v) {
                if (v != null) setState(() => _selectedStatus = v);
              },
            ),
          ),
          const SizedBox(height: 16),

          // Remarks field
          Padding(
            padding: const EdgeInsets.symmetric(horizontal: 20),
            child: TextFormField(
              controller: _remarksCtrl,
              style: const TextStyle(color: AppTheme.textPrimary),
              decoration: const InputDecoration(
                labelText: 'Remarks (optional)',
                labelStyle: TextStyle(color: AppTheme.textSecondary),
                hintText: 'Enter any remarks...',
              ),
              maxLines: 2,
              textInputAction: TextInputAction.done,
            ),
          ),
          const SizedBox(height: 24),

          // Submit button
          Padding(
            padding: const EdgeInsets.symmetric(horizontal: 20),
            child: ElevatedButton(
              onPressed: _loading ? null : _submit,
              child: _loading
                  ? const SizedBox(
                      height: 20,
                      width: 20,
                      child: CircularProgressIndicator(
                        strokeWidth: 2,
                        color: Colors.white,
                      ),
                    )
                  : const Text('Submit'),
            ),
          ),
          const SizedBox(height: 8),
        ],
      ),
    );
  }
}
