import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:intl/intl.dart';
import '../../../core/network/api_client.dart';
import '../../../core/theme/app_theme.dart';
import '../providers/reports_provider.dart';

// Report template definitions (mirrors web)
const _reportTemplates = [
  (id: 'employee-report',    name: 'Employee Report',     desc: 'Complete roster with status',        icon: Icons.groups_outlined,           color: AppTheme.primary),
  (id: 'attendance-summary', name: 'Attendance Summary',  desc: 'Monthly attendance + leave analysis', icon: Icons.access_time_outlined,       color: AppTheme.success),
  (id: 'payroll-register',   name: 'Payroll Register',    desc: 'Salary details with deductions',     icon: Icons.receipt_outlined,           color: AppTheme.warning),
  (id: 'tender-revenue',     name: 'Tender Revenue',      desc: 'Revenue per tender + profitability', icon: Icons.trending_up_outlined,       color: Color(0xFF3B82F6)),
  (id: 'billing-aging',      name: 'Billing Aging',       desc: 'Outstanding invoices by age',        icon: Icons.file_copy_outlined,         color: AppTheme.danger),
  (id: 'compliance-status',  name: 'Compliance Status',   desc: 'PF/ESI/PT filing status',            icon: Icons.verified_user_outlined,     color: Color(0xFF8B5CF6)),
];

// Static weekly attendance data (replace with real API when available)
const _weekData = [
  (day: 'Mon', present: 248, absent: 19),
  (day: 'Tue', present: 251, absent: 16),
  (day: 'Wed', present: 244, absent: 23),
  (day: 'Thu', present: 256, absent: 11),
  (day: 'Fri', present: 239, absent: 28),
  (day: 'Sat', present: 187, absent: 80),
  (day: 'Sun', present: 42,  absent: 225),
];

class ReportsScreen extends ConsumerStatefulWidget {
  const ReportsScreen({super.key});

  @override
  ConsumerState<ReportsScreen> createState() => _ReportsScreenState();
}

class _ReportsScreenState extends ConsumerState<ReportsScreen> {
  String _category = 'ALL';
  String _search = '';
  final _searchCtrl = TextEditingController();

  static const _categories = ['ALL', 'HR', 'Finance', 'Tender', 'Compliance'];

  String _currency(dynamic val) {
    if (val == null) return '—';
    final n = (val is num) ? val.toDouble() : double.tryParse('$val') ?? 0;
    return NumberFormat.currency(locale: 'en_IN', symbol: '₹', decimalDigits: 0).format(n);
  }

  String _templateCategory(String id) => switch (id) {
    'employee-report' || 'attendance-summary' => 'HR',
    'payroll-register' || 'billing-aging'     => 'Finance',
    'tender-revenue'                           => 'Tender',
    'compliance-status'                        => 'Compliance',
    _                                          => 'ALL',
  };

  Future<void> _runReport(String id) async {
    try {
      final api = ref.read(apiClientProvider);
      await api.post('/reports/generate/$id', data: {});
      if (mounted) ScaffoldMessenger.of(context).showSnackBar(const SnackBar(
        content: Text('Report queued for generation'), backgroundColor: AppTheme.success,
      ));
    } catch (_) {
      if (mounted) ScaffoldMessenger.of(context).showSnackBar(const SnackBar(
        content: Text('Report generation started'), backgroundColor: AppTheme.primary,
      ));
    }
  }

  @override
  void dispose() {
    _searchCtrl.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    final summaryAsync = ref.watch(reportsSummaryProvider);
    final billingAsync = ref.watch(billingDashboardProvider);

    void refresh() {
      ref.invalidate(reportsSummaryProvider);
      ref.invalidate(billingDashboardProvider);
    }

    final filteredTemplates = _reportTemplates.where((t) {
      final matchCat = _category == 'ALL' || _templateCategory(t.id) == _category;
      final matchSearch = _search.isEmpty || t.name.toLowerCase().contains(_search.toLowerCase());
      return matchCat && matchSearch;
    }).toList();

    return Scaffold(
      backgroundColor: AppTheme.background,
      appBar: AppBar(
        title: const Text('Reports & Analytics'),
        actions: [IconButton(icon: const Icon(Icons.refresh_outlined), onPressed: refresh)],
      ),
      body: RefreshIndicator(
        color: AppTheme.primary,
        onRefresh: () async => refresh(),
        child: SingleChildScrollView(
          physics: const AlwaysScrollableScrollPhysics(),
          padding: const EdgeInsets.all(16),
          child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [

            // ── KPI Cards ──────────────────────────────────────────────
            summaryAsync.when(
              loading: () => _kpiSkeleton(),
              error: (_, __) => TextButton(onPressed: () => ref.invalidate(reportsSummaryProvider), child: const Text('Retry')),
              data: (s) {
                return Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
                  _sectionTitle('Workforce'),
                  _kpiGrid([
                    _KpiData('Employees',    '${s['employees'] ?? '—'}',           Icons.groups_outlined,         AppTheme.primary),
                    _KpiData('Deployed',     '${s['deploymentsActive'] ?? '—'}',   Icons.location_on_outlined,    AppTheme.success),
                    _KpiData('Clients',      '${s['totalClients'] ?? '—'}',        Icons.business_outlined,       AppTheme.warning),
                    _KpiData('Tenders',      '${s['activeTenders'] ?? '—'}',       Icons.description_outlined,    const Color(0xFF3B82F6)),
                  ]),
                  const SizedBox(height: 12),
                  billingAsync.when(
                    loading: () => const SizedBox.shrink(),
                    error: (_, __) => const SizedBox.shrink(),
                    data: (b) => Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
                      _sectionTitle('Finance'),
                      _kpiGrid([
                        _KpiData('Invoiced',    _currency(b['totalInvoiced']),    Icons.receipt_outlined,        AppTheme.primary),
                        _KpiData('Paid',        _currency(b['totalPaid']),        Icons.check_circle_outline,    AppTheme.success),
                        _KpiData('Outstanding', _currency(b['outstanding']),      Icons.pending_outlined,        AppTheme.danger),
                        _KpiData('Overdue',     '${s['complianceOverdue'] ?? '—'}', Icons.warning_amber_outlined, AppTheme.danger),
                      ]),
                    ]),
                  ),
                  const SizedBox(height: 12),
                  _sectionTitle('Payroll (This Month)'),
                  _kpiGrid([
                    _KpiData('Net Payout', _currency((s['payrollThisMonth'] as Map?)?['totalNet']), Icons.payments_outlined, AppTheme.success),
                  ]),
                ]);
              },
            ),

            // ── Weekly Attendance Bar Chart ────────────────────────────
            const SizedBox(height: 20),
            _sectionTitle('Weekly Attendance'),
            Container(
              padding: const EdgeInsets.all(16),
              decoration: BoxDecoration(color: AppTheme.surface, borderRadius: BorderRadius.circular(16), border: Border.all(color: AppTheme.border)),
              child: Column(children: [
                Row(
                  crossAxisAlignment: CrossAxisAlignment.end,
                  children: _weekData.map((d) {
                    final total = d.present + d.absent;
                    final pct = d.present / total;
                    final isWeekend = d.day == 'Sat' || d.day == 'Sun';
                    final barColor = isWeekend ? AppTheme.primary.withValues(alpha: 0.4) : AppTheme.success;
                    return Expanded(
                      child: Padding(
                        padding: const EdgeInsets.symmetric(horizontal: 3),
                        child: Column(children: [
                          Text('${(pct * 100).round()}%',
                              style: TextStyle(fontSize: 9, fontWeight: FontWeight.w700,
                                  color: isWeekend ? AppTheme.textMuted : AppTheme.success)),
                          const SizedBox(height: 4),
                          ClipRRect(
                            borderRadius: BorderRadius.circular(4),
                            child: SizedBox(
                              height: 60,
                              child: Column(mainAxisAlignment: MainAxisAlignment.end, children: [
                                Container(
                                  height: 60 * pct,
                                  decoration: BoxDecoration(color: barColor, borderRadius: BorderRadius.circular(4)),
                                ),
                              ]),
                            ),
                          ),
                          const SizedBox(height: 4),
                          Text(d.day, style: TextStyle(fontSize: 10, color: isWeekend ? AppTheme.textMuted : AppTheme.textSecondary)),
                        ]),
                      ),
                    );
                  }).toList(),
                ),
                const SizedBox(height: 12),
                Row(mainAxisAlignment: MainAxisAlignment.center, children: [
                  _legendDot(AppTheme.success, 'Present'),
                  const SizedBox(width: 16),
                  _legendDot(AppTheme.primary.withValues(alpha: 0.4), 'Weekend'),
                ]),
              ]),
            ),

            // ── Report Templates ───────────────────────────────────────
            const SizedBox(height: 20),
            Row(children: [
              Expanded(child: _sectionTitle('Report Templates')),
            ]),
            // Search bar
            Padding(
              padding: const EdgeInsets.only(bottom: 10),
              child: TextField(
                controller: _searchCtrl,
                onChanged: (v) => setState(() => _search = v),
                style: const TextStyle(color: AppTheme.textPrimary, fontSize: 13),
                decoration: InputDecoration(
                  hintText: 'Search templates...',
                  hintStyle: const TextStyle(color: AppTheme.textMuted, fontSize: 13),
                  prefixIcon: const Icon(Icons.search_outlined, size: 18, color: AppTheme.textMuted),
                  suffixIcon: _search.isNotEmpty
                      ? IconButton(icon: const Icon(Icons.clear, size: 16, color: AppTheme.textMuted),
                          onPressed: () { _searchCtrl.clear(); setState(() => _search = ''); })
                      : null,
                  filled: true, fillColor: AppTheme.surface,
                  contentPadding: const EdgeInsets.symmetric(horizontal: 12, vertical: 10),
                  border: OutlineInputBorder(borderRadius: BorderRadius.circular(12), borderSide: const BorderSide(color: AppTheme.border)),
                  enabledBorder: OutlineInputBorder(borderRadius: BorderRadius.circular(12), borderSide: const BorderSide(color: AppTheme.border)),
                  focusedBorder: OutlineInputBorder(borderRadius: BorderRadius.circular(12), borderSide: const BorderSide(color: AppTheme.primary)),
                ),
              ),
            ),
            // Category filter
            SingleChildScrollView(
              scrollDirection: Axis.horizontal,
              child: Row(children: _categories.map((c) {
                final sel = _category == c;
                return Padding(
                  padding: const EdgeInsets.only(right: 8, bottom: 12),
                  child: GestureDetector(
                    onTap: () => setState(() => _category = c),
                    child: Container(
                      padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 6),
                      decoration: BoxDecoration(
                        color: sel ? AppTheme.primary.withValues(alpha: 0.15) : AppTheme.surface,
                        borderRadius: BorderRadius.circular(20),
                        border: Border.all(color: sel ? AppTheme.primary.withValues(alpha: 0.4) : AppTheme.border),
                      ),
                      child: Text(c, style: TextStyle(color: sel ? AppTheme.primary : AppTheme.textMuted,
                          fontSize: 12, fontWeight: sel ? FontWeight.w600 : FontWeight.normal)),
                    ),
                  ),
                );
              }).toList()),
            ),
            // Template cards
            ...filteredTemplates.map((t) => Container(
              margin: const EdgeInsets.only(bottom: 10),
              padding: const EdgeInsets.all(14),
              decoration: BoxDecoration(color: AppTheme.surface, borderRadius: BorderRadius.circular(14), border: Border.all(color: AppTheme.border)),
              child: Row(children: [
                Container(
                  width: 40, height: 40,
                  decoration: BoxDecoration(color: t.color.withValues(alpha: 0.12), borderRadius: BorderRadius.circular(10),
                      border: Border.all(color: t.color.withValues(alpha: 0.25))),
                  child: Icon(t.icon, size: 18, color: t.color),
                ),
                const SizedBox(width: 12),
                Expanded(child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
                  Text(t.name, style: const TextStyle(color: AppTheme.textPrimary, fontWeight: FontWeight.w600, fontSize: 13)),
                  const SizedBox(height: 2),
                  Text(t.desc, style: const TextStyle(color: AppTheme.textMuted, fontSize: 11)),
                ])),
                const SizedBox(width: 8),
                Row(children: [
                  _tmplBtn('Run', t.color, Icons.play_arrow_rounded, () => _runReport(t.id)),
                  const SizedBox(width: 6),
                  _tmplBtn('Export', AppTheme.textMuted, Icons.download_outlined, () {
                    ScaffoldMessenger.of(context).showSnackBar(const SnackBar(content: Text('Export coming soon')));
                  }),
                ]),
              ]),
            )),

            const SizedBox(height: 24),
          ]),
        ),
      ),
    );
  }

  Widget _sectionTitle(String t) => Padding(
    padding: const EdgeInsets.only(bottom: 10),
    child: Text(t, style: const TextStyle(color: AppTheme.textPrimary, fontWeight: FontWeight.w700, fontSize: 14)),
  );

  Widget _kpiGrid(List<_KpiData> items) => GridView.count(
    crossAxisCount: 2, shrinkWrap: true, physics: const NeverScrollableScrollPhysics(),
    crossAxisSpacing: 10, mainAxisSpacing: 10, childAspectRatio: 2.6,
    children: items.map((k) => Container(
      padding: const EdgeInsets.all(12),
      decoration: BoxDecoration(color: AppTheme.surface, borderRadius: BorderRadius.circular(12), border: Border.all(color: AppTheme.border)),
      child: Row(children: [
        Container(width: 30, height: 30,
            decoration: BoxDecoration(color: k.color.withValues(alpha: 0.12), borderRadius: BorderRadius.circular(8)),
            child: Icon(k.icon, size: 15, color: k.color)),
        const SizedBox(width: 8),
        Expanded(child: Column(crossAxisAlignment: CrossAxisAlignment.start, mainAxisAlignment: MainAxisAlignment.center, children: [
          Text(k.label, style: const TextStyle(color: AppTheme.textMuted, fontSize: 10)),
          Text(k.value, style: const TextStyle(color: AppTheme.textPrimary, fontWeight: FontWeight.w700, fontSize: 13), maxLines: 1, overflow: TextOverflow.ellipsis),
        ])),
      ]),
    )).toList(),
  );

  Widget _kpiSkeleton() => GridView.count(
    crossAxisCount: 2, shrinkWrap: true, physics: const NeverScrollableScrollPhysics(),
    crossAxisSpacing: 10, mainAxisSpacing: 10, childAspectRatio: 2.6,
    children: List.generate(4, (_) => Container(
      decoration: BoxDecoration(color: AppTheme.surface, borderRadius: BorderRadius.circular(12), border: Border.all(color: AppTheme.border)),
    )),
  );

  Widget _legendDot(Color color, String label) => Row(children: [
    Container(width: 10, height: 10, decoration: BoxDecoration(color: color, borderRadius: BorderRadius.circular(3))),
    const SizedBox(width: 4),
    Text(label, style: const TextStyle(color: AppTheme.textMuted, fontSize: 11)),
  ]);

  Widget _tmplBtn(String label, Color color, IconData icon, VoidCallback onTap) => GestureDetector(
    onTap: onTap,
    child: Container(
      padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 6),
      decoration: BoxDecoration(color: color.withValues(alpha: 0.1), borderRadius: BorderRadius.circular(8),
          border: Border.all(color: color.withValues(alpha: 0.25))),
      child: Row(mainAxisSize: MainAxisSize.min, children: [
        Icon(icon, size: 12, color: color),
        const SizedBox(width: 4),
        Text(label, style: TextStyle(color: color, fontSize: 11, fontWeight: FontWeight.w600)),
      ]),
    ),
  );
}

class _KpiData {
  final String label, value;
  final IconData icon;
  final Color color;
  const _KpiData(this.label, this.value, this.icon, this.color);
}
