import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../../../core/theme/app_theme.dart';
import '../providers/hr_provider.dart';

// ── Palette / helpers ─────────────────────────────────────────────────────────

const _avatarPalette = [
  AppTheme.primary,
  AppTheme.success,
  AppTheme.warning,
  Color(0xFF8B5CF6),
  Color(0xFFEC4899),
];

Color _avatarColor(String empCode) =>
    _avatarPalette[empCode.hashCode.abs() % _avatarPalette.length];

String _initials(String name) {
  final parts = name.trim().split(' ');
  return parts
      .map((w) => w.isEmpty ? '' : w[0])
      .where((c) => c.isNotEmpty)
      .take(2)
      .join()
      .toUpperCase();
}

String _maskAccount(String? val) {
  if (val == null || val.length < 4) return val ?? '—';
  return '${'*' * (val.length - 4)}${val.substring(val.length - 4)}';
}

String _maskAadhaar(String? val) {
  if (val == null || val.length < 4) return val ?? '—';
  return '${'*' * (val.length - 4)}${val.substring(val.length - 4)}';
}


// ── Main Screen ───────────────────────────────────────────────────────────────

class HrEmployeeDetailScreen extends ConsumerWidget {
  final String employeeId;

  const HrEmployeeDetailScreen({super.key, required this.employeeId});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final detailAsync = ref.watch(hrEmployeeDetailProvider(employeeId));

    return detailAsync.when(
      loading: () => const Scaffold(
        backgroundColor: AppTheme.background,
        body: Center(
          child: CircularProgressIndicator(color: AppTheme.primary),
        ),
      ),
      error: (e, _) => Scaffold(
        backgroundColor: AppTheme.background,
        appBar: AppBar(backgroundColor: AppTheme.surface),
        body: Center(
          child: Column(
            mainAxisSize: MainAxisSize.min,
            children: [
              const Icon(Icons.error_outline, color: AppTheme.danger, size: 48),
              const SizedBox(height: 12),
              Text(
                e.toString(),
                style: const TextStyle(color: AppTheme.textSecondary),
                textAlign: TextAlign.center,
              ),
              const SizedBox(height: 16),
              ElevatedButton(
                onPressed: () =>
                    ref.invalidate(hrEmployeeDetailProvider(employeeId)),
                child: const Text('Retry'),
              ),
            ],
          ),
        ),
      ),
      data: (detail) => _DetailBody(detail: detail),
    );
  }
}

// ── Detail body with TabController ───────────────────────────────────────────

class _DetailBody extends StatefulWidget {
  final HrEmployeeDetail detail;

  const _DetailBody({required this.detail});

  @override
  State<_DetailBody> createState() => _DetailBodyState();
}

class _DetailBodyState extends State<_DetailBody>
    with SingleTickerProviderStateMixin {
  late final TabController _tabController;

  static const _tabs = [
    'Profile',
    'Employment',
    'Documents',
    'Leave',
    'Payslips',
  ];

  @override
  void initState() {
    super.initState();
    _tabController = TabController(length: _tabs.length, vsync: this);
  }

  @override
  void dispose() {
    _tabController.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    final detail = widget.detail;
    final avatarColor = _avatarColor(detail.empCode);

    return Scaffold(
      backgroundColor: AppTheme.background,
      body: NestedScrollView(
        headerSliverBuilder: (ctx, _) => [
          SliverAppBar(
            expandedHeight: 200,
            pinned: true,
            backgroundColor: AppTheme.surface,
            flexibleSpace: FlexibleSpaceBar(
              background: Container(
                decoration: const BoxDecoration(
                  gradient: LinearGradient(
                    begin: Alignment.topLeft,
                    end: Alignment.bottomRight,
                    colors: [Color(0xFF6366F1), Color(0xFF141F30)],
                  ),
                ),
                child: Center(
                  child: Column(
                    mainAxisSize: MainAxisSize.min,
                    children: [
                      const SizedBox(height: 32),
                      CircleAvatar(
                        radius: 36,
                        backgroundColor: avatarColor.withValues(alpha: 0.25),
                        child: Text(
                          _initials(detail.name),
                          style: TextStyle(
                            color: avatarColor,
                            fontWeight: FontWeight.bold,
                            fontSize: 24,
                          ),
                        ),
                      ),
                      const SizedBox(height: 10),
                      Text(
                        detail.name,
                        style: const TextStyle(
                          color: Colors.white,
                          fontSize: 18,
                          fontWeight: FontWeight.bold,
                        ),
                      ),
                      const SizedBox(height: 4),
                      Text(
                        '${detail.designation} • ${detail.empCode}',
                        style: const TextStyle(
                          color: AppTheme.textSecondary,
                          fontSize: 13,
                        ),
                      ),
                    ],
                  ),
                ),
              ),
            ),
          ),
          SliverPersistentHeader(
            pinned: true,
            delegate: _TabBarDelegate(
              TabBar(
                controller: _tabController,
                isScrollable: true,
                tabAlignment: TabAlignment.start,
                labelColor: AppTheme.primary,
                unselectedLabelColor: AppTheme.textSecondary,
                indicatorColor: AppTheme.primary,
                indicatorSize: TabBarIndicatorSize.tab,
                labelStyle: const TextStyle(
                  fontSize: 13,
                  fontWeight: FontWeight.w600,
                ),
                unselectedLabelStyle: const TextStyle(fontSize: 13),
                tabs: _tabs.map((t) => Tab(text: t)).toList(),
              ),
            ),
          ),
        ],
        body: TabBarView(
          controller: _tabController,
          children: [
            _ProfileTab(detail: detail),
            _EmploymentTab(detail: detail),
            _DocumentsTab(detail: detail),
            _LeaveTab(detail: detail),
            _PayslipsTab(detail: detail),
          ],
        ),
      ),
    );
  }
}

// ── Persistent tab bar delegate ───────────────────────────────────────────────

class _TabBarDelegate extends SliverPersistentHeaderDelegate {
  final TabBar tabBar;

  const _TabBarDelegate(this.tabBar);

  @override
  double get minExtent => tabBar.preferredSize.height;

  @override
  double get maxExtent => tabBar.preferredSize.height;

  @override
  Widget build(
      BuildContext context, double shrinkOffset, bool overlapsContent) {
    return Container(
      color: AppTheme.surface,
      child: tabBar,
    );
  }

  @override
  bool shouldRebuild(_TabBarDelegate oldDelegate) => false;
}

// ── Tab 1: Profile ────────────────────────────────────────────────────────────

class _ProfileTab extends StatelessWidget {
  final HrEmployeeDetail detail;

  const _ProfileTab({required this.detail});

  @override
  Widget build(BuildContext context) {
    return ListView(
      padding: const EdgeInsets.all(16),
      children: [
        _InfoSection(
          title: 'Personal Information',
          children: [
            _InfoRow(label: 'Name', value: detail.name),
            _InfoRow(label: 'Date of Birth', value: detail.dateOfBirth ?? '—'),
            _InfoRow(label: 'Gender', value: detail.gender ?? '—'),
            _InfoRow(label: 'Phone', value: detail.phone ?? '—'),
            _InfoRow(label: 'Email', value: detail.email ?? '—'),
            _InfoRow(label: 'Address', value: detail.address ?? '—'),
          ],
        ),
        _InfoSection(
          title: 'Identity',
          children: [
            _InfoRow(
              label: 'Aadhaar',
              value: _maskAadhaar(detail.aadhaarNumber),
            ),
            _InfoRow(label: 'PAN', value: detail.panNumber ?? '—'),
          ],
        ),
        _InfoSection(
          title: 'Bank Details',
          children: [
            _InfoRow(label: 'Bank Name', value: detail.bankName ?? '—'),
            _InfoRow(
              label: 'Account No.',
              value: _maskAccount(detail.accountNumber),
            ),
            _InfoRow(label: 'IFSC Code', value: detail.ifscCode ?? '—'),
          ],
        ),
      ],
    );
  }
}

// ── Tab 2: Employment ─────────────────────────────────────────────────────────

class _EmploymentTab extends StatelessWidget {
  final HrEmployeeDetail detail;

  const _EmploymentTab({required this.detail});

  String _salaryText(double? salary) {
    if (salary == null) return '—';
    final formatted = salary.toStringAsFixed(0).replaceAllMapped(
          RegExp(r'(\d)(?=(\d{2})+(\d{3})\b)'),
          (m) => '${m[1]},',
        );
    return '₹$formatted/month';
  }

  @override
  Widget build(BuildContext context) {
    return ListView(
      padding: const EdgeInsets.all(16),
      children: [
        _InfoSection(
          title: 'Employment Details',
          children: [
            _InfoRow(label: 'Employee Code', value: detail.empCode),
            _InfoRow(label: 'Department', value: detail.department),
            _InfoRow(label: 'Designation', value: detail.designation),
            _InfoRow(label: 'Employment Type', value: detail.employmentType),
            _InfoRow(label: 'Joining Date', value: detail.joiningDate ?? '—'),
            _InfoRow(label: 'Status', value: detail.status),
          ],
        ),
        _InfoSection(
          title: 'Salary',
          children: [
            _InfoRow(
              label: 'Monthly Salary',
              value: _salaryText(detail.monthlySalary),
            ),
          ],
        ),
      ],
    );
  }
}

// ── Tab 3: Documents ──────────────────────────────────────────────────────────

const _defaultDocTypes = [
  'Aadhaar',
  'PAN',
  'Photo',
  'Address Proof',
  'Bank Passbook',
];

class _DocumentsTab extends StatelessWidget {
  final HrEmployeeDetail detail;

  const _DocumentsTab({required this.detail});

  @override
  Widget build(BuildContext context) {
    final docs = detail.documents.isNotEmpty
        ? detail.documents
        : _defaultDocTypes
            .map((t) => {'type': t, 'status': 'PENDING'})
            .toList();

    return ListView(
      padding: const EdgeInsets.all(16),
      children: [
        Container(
          decoration: BoxDecoration(
            color: AppTheme.surfaceVariant,
            borderRadius: BorderRadius.circular(12),
            border: Border.all(color: AppTheme.border),
          ),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              const Padding(
                padding: EdgeInsets.fromLTRB(16, 14, 16, 10),
                child: Text(
                  'Documents',
                  style: TextStyle(
                    color: AppTheme.textMuted,
                    fontSize: 13,
                    fontWeight: FontWeight.bold,
                  ),
                ),
              ),
              const Divider(height: 1, color: AppTheme.border),
              ...docs.asMap().entries.map((entry) {
                final i = entry.key;
                final doc = entry.value;
                final status =
                    (doc['status'] as String? ?? 'PENDING').toUpperCase();
                final type = doc['type'] as String? ?? '';
                final isLast = i == docs.length - 1;

                Color iconColor;
                IconData iconData;
                switch (status) {
                  case 'VERIFIED':
                    iconColor = AppTheme.success;
                    iconData = Icons.check_circle;
                    break;
                  case 'MISSING':
                    iconColor = AppTheme.danger;
                    iconData = Icons.cancel;
                    break;
                  default:
                    iconColor = AppTheme.warning;
                    iconData = Icons.pending;
                }

                return Column(
                  children: [
                    Padding(
                      padding: const EdgeInsets.symmetric(
                          horizontal: 16, vertical: 12),
                      child: Row(
                        children: [
                          Icon(iconData, color: iconColor, size: 20),
                          const SizedBox(width: 12),
                          Expanded(
                            child: Text(
                              type,
                              style: const TextStyle(
                                color: Colors.white,
                                fontSize: 13,
                              ),
                            ),
                          ),
                          Container(
                            padding: const EdgeInsets.symmetric(
                                horizontal: 8, vertical: 3),
                            decoration: BoxDecoration(
                              color: iconColor.withValues(alpha: 0.15),
                              borderRadius: BorderRadius.circular(6),
                              border: Border.all(
                                  color: iconColor.withValues(alpha: 0.4)),
                            ),
                            child: Text(
                              status[0] + status.substring(1).toLowerCase(),
                              style: TextStyle(
                                color: iconColor,
                                fontSize: 11,
                                fontWeight: FontWeight.w600,
                              ),
                            ),
                          ),
                        ],
                      ),
                    ),
                    if (!isLast)
                      const Divider(
                          height: 1, color: AppTheme.border, indent: 16),
                  ],
                );
              }),
            ],
          ),
        ),
      ],
    );
  }
}

// ── Tab 4: Leave ──────────────────────────────────────────────────────────────

class _LeaveTab extends StatelessWidget {
  final HrEmployeeDetail detail;

  const _LeaveTab({required this.detail});

  @override
  Widget build(BuildContext context) {
    final balances = detail.leaveBalances;

    return ListView(
      padding: const EdgeInsets.all(16),
      children: [
        const Text(
          'Leave Balances',
          style: TextStyle(
            color: Colors.white,
            fontWeight: FontWeight.bold,
            fontSize: 15,
          ),
        ),
        const SizedBox(height: 12),
        SizedBox(
          height: 96,
          child: ListView(
            scrollDirection: Axis.horizontal,
            children: balances.entries.map((e) {
              return Container(
                width: 100,
                margin: const EdgeInsets.only(right: 12),
                padding: const EdgeInsets.all(16),
                decoration: BoxDecoration(
                  color: AppTheme.surfaceVariant,
                  borderRadius: BorderRadius.circular(12),
                  border: Border.all(color: AppTheme.border),
                ),
                child: Column(
                  mainAxisAlignment: MainAxisAlignment.center,
                  children: [
                    Text(
                      '${e.value}',
                      style: const TextStyle(
                        color: AppTheme.primary,
                        fontSize: 24,
                        fontWeight: FontWeight.bold,
                      ),
                    ),
                    const SizedBox(height: 4),
                    Text(
                      e.key,
                      style: const TextStyle(
                        color: AppTheme.textSecondary,
                        fontSize: 13,
                        fontWeight: FontWeight.w500,
                      ),
                    ),
                  ],
                ),
              );
            }).toList(),
          ),
        ),
        const SizedBox(height: 24),
        const _InfoSection(
          title: 'Leave History',
          children: [
            Padding(
              padding: EdgeInsets.symmetric(horizontal: 16, vertical: 14),
              child: Text(
                'View full leave history in the web portal',
                style: TextStyle(color: AppTheme.textSecondary, fontSize: 13),
              ),
            ),
          ],
        ),
      ],
    );
  }
}

// ── Tab 5: Payslips ───────────────────────────────────────────────────────────

class _PayslipsTab extends StatelessWidget {
  final HrEmployeeDetail detail;

  const _PayslipsTab({required this.detail});

  static const _dummyPayslips = ['May 2026', 'Apr 2026', 'Mar 2026'];

  @override
  Widget build(BuildContext context) {
    return ListView(
      padding: const EdgeInsets.all(16),
      children: _dummyPayslips.map((month) {
        return Container(
          margin: const EdgeInsets.only(bottom: 10),
          padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 14),
          decoration: BoxDecoration(
            color: AppTheme.surfaceVariant,
            borderRadius: BorderRadius.circular(12),
            border: Border.all(color: AppTheme.border),
          ),
          child: Row(
            children: [
              const Icon(Icons.description_outlined,
                  color: AppTheme.textSecondary, size: 22),
              const SizedBox(width: 12),
              Expanded(
                child: Text(
                  'Payslip — $month',
                  style: const TextStyle(
                    color: Colors.white,
                    fontSize: 14,
                    fontWeight: FontWeight.w500,
                  ),
                ),
              ),
              TextButton.icon(
                onPressed: () {
                  ScaffoldMessenger.of(context).showSnackBar(
                    const SnackBar(content: Text('Download coming soon')),
                  );
                },
                icon: const Icon(Icons.download_outlined, size: 16),
                label: const Text('Download'),
                style: TextButton.styleFrom(
                  foregroundColor: AppTheme.primary,
                  padding:
                      const EdgeInsets.symmetric(horizontal: 10, vertical: 6),
                ),
              ),
            ],
          ),
        );
      }).toList(),
    );
  }
}

// ── Shared widgets ────────────────────────────────────────────────────────────

class _InfoSection extends StatelessWidget {
  final String title;
  final List<Widget> children;

  const _InfoSection({required this.title, required this.children});

  @override
  Widget build(BuildContext context) {
    return Container(
      margin: const EdgeInsets.only(bottom: 16),
      decoration: BoxDecoration(
        color: AppTheme.surfaceVariant,
        borderRadius: BorderRadius.circular(12),
        border: Border.all(color: AppTheme.border),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Padding(
            padding: const EdgeInsets.fromLTRB(16, 14, 16, 10),
            child: Text(
              title,
              style: const TextStyle(
                color: AppTheme.textMuted,
                fontSize: 13,
                fontWeight: FontWeight.bold,
              ),
            ),
          ),
          const Divider(height: 1, color: AppTheme.border),
          ...children,
        ],
      ),
    );
  }
}

class _InfoRow extends StatelessWidget {
  final String label;
  final String value;

  const _InfoRow({required this.label, required this.value});

  @override
  Widget build(BuildContext context) {
    return Padding(
      padding: const EdgeInsets.symmetric(vertical: 10, horizontal: 16),
      child: Row(
        children: [
          Expanded(
            flex: 2,
            child: Text(
              label,
              style: const TextStyle(
                color: AppTheme.textMuted,
                fontSize: 13,
              ),
            ),
          ),
          Expanded(
            flex: 3,
            child: Text(
              value,
              style: const TextStyle(
                color: Colors.white,
                fontSize: 13,
              ),
            ),
          ),
        ],
      ),
    );
  }
}
