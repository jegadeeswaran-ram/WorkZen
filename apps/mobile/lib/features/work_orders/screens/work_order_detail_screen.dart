import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:intl/intl.dart';
import '../../../core/theme/app_theme.dart';
import '../providers/work_orders_provider.dart';

class WorkOrderDetailScreen extends ConsumerWidget {
  final String workOrderId;
  const WorkOrderDetailScreen({super.key, required this.workOrderId});

  String _fmt(String? iso) {
    if (iso == null) return '—';
    try { return DateFormat('dd MMM yyyy').format(DateTime.parse(iso)); } catch (_) { return iso; }
  }

  String _currency(dynamic val) {
    if (val == null) return '—';
    final n = (val is num) ? val.toDouble() : double.tryParse('$val') ?? 0;
    return NumberFormat.currency(locale: 'en_IN', symbol: '₹', decimalDigits: 0).format(n);
  }

  Color _statusColor(String? s) => switch ((s ?? '').toUpperCase()) {
    'ACTIVE'              => AppTheme.success,
    'PARTIALLY_FULFILLED' => AppTheme.warning,
    'FULFILLED'           => AppTheme.primary,
    'DRAFT'               => AppTheme.textMuted,
    'PENDING'             => AppTheme.warning,
    _                     => AppTheme.danger,
  };

  Color _invStatusColor(String? s) => switch ((s ?? '').toUpperCase()) {
    'PAID'           => AppTheme.success,
    'PARTIALLY_PAID' => const Color(0xFF3B82F6),
    'SUBMITTED' || 'ACKNOWLEDGED' => AppTheme.warning,
    'REJECTED'       => AppTheme.danger,
    _                => AppTheme.textMuted,
  };

  String _tenderName(Map wo) {
    final t = wo['tender'];
    if (t is Map) return '${t['tenderName'] ?? ''} (${t['tenderNumber'] ?? ''})'.trim();
    return wo['clientName'] as String? ?? '—';
  }

  String _woNumber(Map wo) =>
      wo['workOrderNo'] as String? ?? wo['workOrderNumber'] as String? ?? '—';

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final detailAsync = ref.watch(workOrderDetailProvider(workOrderId));

    return Scaffold(
      backgroundColor: AppTheme.background,
      appBar: AppBar(
        title: const Text('Work Order'),
        actions: [
          IconButton(
            icon: const Icon(Icons.refresh_outlined),
            onPressed: () => ref.invalidate(workOrderDetailProvider(workOrderId)),
          ),
        ],
      ),
      body: detailAsync.when(
        loading: () => const Center(child: CircularProgressIndicator(color: AppTheme.primary)),
        error: (e, _) => Center(
          child: Column(mainAxisSize: MainAxisSize.min, children: [
            const Icon(Icons.error_outline, color: AppTheme.danger, size: 40),
            const SizedBox(height: 12),
            Text('$e', style: const TextStyle(color: AppTheme.textMuted, fontSize: 13), textAlign: TextAlign.center),
            const SizedBox(height: 12),
            TextButton(
              onPressed: () => ref.invalidate(workOrderDetailProvider(workOrderId)),
              child: const Text('Retry'),
            ),
          ]),
        ),
        data: (wo) {
          if (wo.isEmpty) {
            return const Center(child: Text('Work order not found', style: TextStyle(color: AppTheme.textMuted)));
          }
          final status = wo['status'] as String? ?? '';
          final positions = (wo['positions'] as List? ?? []).cast<Map>();
          final milestones = (wo['milestones'] as List? ?? []).cast<Map>();
          final invoices = (wo['woInvoices'] as List? ?? []).cast<Map>();
          final payments = (wo['woPayments'] as List? ?? []).cast<Map>();
          final fulfillments = (wo['fulfillments'] as List? ?? []).cast<Map>();

          return SingleChildScrollView(
            padding: const EdgeInsets.all(16),
            child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
              // ── Header card ────────────────────────────────────────────
              Container(
                width: double.infinity,
                padding: const EdgeInsets.all(16),
                decoration: BoxDecoration(
                  gradient: LinearGradient(
                    colors: [AppTheme.primary.withValues(alpha: 0.15), AppTheme.primary.withValues(alpha: 0.05)],
                    begin: Alignment.topLeft, end: Alignment.bottomRight,
                  ),
                  borderRadius: BorderRadius.circular(16),
                  border: Border.all(color: AppTheme.primary.withValues(alpha: 0.25)),
                ),
                child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
                  Row(children: [
                    Container(
                      padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 3),
                      decoration: BoxDecoration(
                        color: AppTheme.primary.withValues(alpha: 0.15),
                        borderRadius: BorderRadius.circular(6),
                      ),
                      child: Text(
                        _woNumber(wo),
                        style: const TextStyle(color: AppTheme.primary, fontSize: 12, fontWeight: FontWeight.w700, fontFamily: 'monospace'),
                      ),
                    ),
                    const Spacer(),
                    _badge(status.replaceAll('_', ' '), _statusColor(status)),
                  ]),
                  const SizedBox(height: 10),
                  Text(
                    wo['title'] as String? ?? '—',
                    style: const TextStyle(color: AppTheme.textPrimary, fontSize: 16, fontWeight: FontWeight.w700),
                  ),
                  const SizedBox(height: 6),
                  Text(_tenderName(wo), style: const TextStyle(color: AppTheme.textSecondary, fontSize: 13)),
                  const SizedBox(height: 12),
                  Row(children: [
                    Expanded(
                      child: _kpi('Total Value', _currency(wo['value']), AppTheme.warning),
                    ),
                    const SizedBox(width: 12),
                    Expanded(
                      child: _kpi('Sanctioned', '${wo['sanctionedStrength'] ?? 0} staff', AppTheme.success),
                    ),
                    const SizedBox(width: 12),
                    Expanded(
                      child: _kpi('Version', 'v${wo['currentVersion'] ?? 1}', AppTheme.primary),
                    ),
                  ]),
                ]),
              ),

              const SizedBox(height: 16),

              // ── Details ────────────────────────────────────────────────
              _section('Work Order Details', [
                if (wo['governmentRef'] != null) _row('Govt. Ref', wo['governmentRef'] as String),
                _row('Start Date', _fmt(wo['startDate'] as String?)),
                _row('End Date', wo['endDate'] != null ? _fmt(wo['endDate'] as String) : 'Open-ended'),
                if (wo['issuedDate'] != null) _row('Issued Date', _fmt(wo['issuedDate'] as String)),
                if (wo['description'] != null && (wo['description'] as String).isNotEmpty)
                  _row('Notes', wo['description'] as String),
              ]),

              // ── Positions ──────────────────────────────────────────────
              if (positions.isNotEmpty) ...[
                const SizedBox(height: 16),
                _sectionHeader('Positions (${positions.length})'),
                const SizedBox(height: 8),
                ...positions.map((p) => Container(
                  margin: const EdgeInsets.only(bottom: 8),
                  padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 10),
                  decoration: BoxDecoration(color: AppTheme.surface, borderRadius: BorderRadius.circular(12), border: Border.all(color: AppTheme.border)),
                  child: Row(children: [
                    Expanded(child: Text(p['designation'] as String? ?? '—', style: const TextStyle(color: AppTheme.textPrimary, fontSize: 13, fontWeight: FontWeight.w500))),
                    Text(
                      '${p['deployedCount'] ?? 0}/${p['requiredCount'] ?? 0}',
                      style: TextStyle(
                        color: (p['deployedCount'] as int? ?? 0) < (p['requiredCount'] as int? ?? 1) ? AppTheme.warning : AppTheme.success,
                        fontSize: 13,
                        fontWeight: FontWeight.w600,
                      ),
                    ),
                    const SizedBox(width: 12),
                    Text(_currency(p['rate']), style: const TextStyle(color: AppTheme.warning, fontSize: 13, fontWeight: FontWeight.w600)),
                  ]),
                )),
              ],

              // ── Deployed Staff ─────────────────────────────────────────
              if (fulfillments.isNotEmpty) ...[
                const SizedBox(height: 16),
                _sectionHeader('Deployed Staff (${fulfillments.where((f) => f['status'] == 'ACTIVE').length} active)'),
                const SizedBox(height: 8),
                Container(
                  decoration: BoxDecoration(color: AppTheme.surface, borderRadius: BorderRadius.circular(12), border: Border.all(color: AppTheme.border)),
                  child: Column(children: fulfillments.take(5).map((f) {
                    final emp = f['employee'] as Map? ?? {};
                    return ListTile(
                      dense: true,
                      leading: CircleAvatar(
                        radius: 16,
                        backgroundColor: AppTheme.primary.withValues(alpha: 0.12),
                        child: Text(
                          ((emp['firstName'] as String? ?? 'U')[0]).toUpperCase(),
                          style: const TextStyle(color: AppTheme.primary, fontSize: 12, fontWeight: FontWeight.w700),
                        ),
                      ),
                      title: Text(
                        '${emp['firstName'] ?? ''} ${emp['lastName'] ?? ''}'.trim(),
                        style: const TextStyle(color: AppTheme.textPrimary, fontSize: 13),
                      ),
                      subtitle: Text(emp['employeeCode'] as String? ?? '', style: const TextStyle(color: AppTheme.textMuted, fontSize: 11)),
                      trailing: _badge(f['status'] as String? ?? '', f['status'] == 'ACTIVE' ? AppTheme.success : AppTheme.textMuted),
                    );
                  }).toList()),
                ),
              ],

              // ── Milestones ─────────────────────────────────────────────
              if (milestones.isNotEmpty) ...[
                const SizedBox(height: 16),
                _sectionHeader('Milestones (${milestones.length})'),
                const SizedBox(height: 8),
                ...milestones.map((m) {
                  final msColor = m['status'] == 'PAID' ? AppTheme.success : m['status'] == 'INVOICED' ? AppTheme.warning : AppTheme.primary;
                  return Container(
                    margin: const EdgeInsets.only(bottom: 8),
                    padding: const EdgeInsets.all(12),
                    decoration: BoxDecoration(color: AppTheme.surface, borderRadius: BorderRadius.circular(12), border: Border.all(color: AppTheme.border)),
                    child: Row(children: [
                      Expanded(child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
                        Text(m['title'] as String? ?? '—', style: const TextStyle(color: AppTheme.textPrimary, fontSize: 13, fontWeight: FontWeight.w600)),
                        const SizedBox(height: 2),
                        Text('${m['percentage']}% · ${_currency(m['amount'])}', style: const TextStyle(color: AppTheme.textMuted, fontSize: 12)),
                      ])),
                      _badge((m['status'] as String? ?? '').replaceAll('_', ' '), msColor),
                    ]),
                  );
                }),
              ],

              // ── Invoices ───────────────────────────────────────────────
              if (invoices.isNotEmpty) ...[
                const SizedBox(height: 16),
                _sectionHeader('Invoices (${invoices.length})'),
                const SizedBox(height: 8),
                Container(
                  decoration: BoxDecoration(color: AppTheme.surface, borderRadius: BorderRadius.circular(12), border: Border.all(color: AppTheme.border)),
                  child: Column(children: invoices.map((inv) => Padding(
                    padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 10),
                    child: Row(children: [
                      Expanded(child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
                        Text(inv['invoiceNumber'] as String? ?? '—', style: const TextStyle(color: AppTheme.primary, fontSize: 12, fontWeight: FontWeight.w700, fontFamily: 'monospace')),
                        const SizedBox(height: 2),
                        Text(inv['period'] as String? ?? '—', style: const TextStyle(color: AppTheme.textMuted, fontSize: 12)),
                      ])),
                      Column(crossAxisAlignment: CrossAxisAlignment.end, children: [
                        Text(_currency(inv['totalAmount']), style: const TextStyle(color: AppTheme.warning, fontSize: 13, fontWeight: FontWeight.w600)),
                        const SizedBox(height: 2),
                        _badge((inv['status'] as String? ?? '').replaceAll('_', ' '), _invStatusColor(inv['status'] as String?)),
                      ]),
                    ]),
                  )).toList()),
                ),
              ],

              // ── Payments ───────────────────────────────────────────────
              if (payments.isNotEmpty) ...[
                const SizedBox(height: 16),
                _sectionHeader('Payments (${payments.length})'),
                const SizedBox(height: 8),
                Container(
                  decoration: BoxDecoration(color: AppTheme.surface, borderRadius: BorderRadius.circular(12), border: Border.all(color: AppTheme.border)),
                  child: Column(children: payments.map((pay) => Padding(
                    padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 10),
                    child: Row(children: [
                      Expanded(child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
                        Text(_fmt(pay['paymentDate'] as String?), style: const TextStyle(color: AppTheme.textPrimary, fontSize: 13)),
                        const SizedBox(height: 2),
                        Text('${pay['paymentMode'] ?? '—'} · ${pay['referenceNumber'] ?? '—'}', style: const TextStyle(color: AppTheme.textMuted, fontSize: 12)),
                      ])),
                      Text(_currency(pay['amount']), style: const TextStyle(color: AppTheme.success, fontSize: 14, fontWeight: FontWeight.w700)),
                    ]),
                  )).toList()),
                ),
              ],

              const SizedBox(height: 32),
            ]),
          );
        },
      ),
    );
  }

  Widget _badge(String text, Color color) => Container(
    padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 3),
    decoration: BoxDecoration(color: color.withValues(alpha: 0.12), borderRadius: BorderRadius.circular(20), border: Border.all(color: color.withValues(alpha: 0.3))),
    child: Text(text, style: TextStyle(color: color, fontSize: 10, fontWeight: FontWeight.w600)),
  );

  Widget _kpi(String label, String value, Color color) => Column(children: [
    Text(value, style: TextStyle(color: color, fontSize: 14, fontWeight: FontWeight.w700)),
    const SizedBox(height: 2),
    Text(label, style: const TextStyle(color: AppTheme.textMuted, fontSize: 11)),
  ]);

  Widget _sectionHeader(String title) => Text(
    title,
    style: const TextStyle(color: AppTheme.textPrimary, fontSize: 14, fontWeight: FontWeight.w700),
  );

  Widget _section(String title, List<Widget> rows) => Container(
    decoration: BoxDecoration(color: AppTheme.surface, borderRadius: BorderRadius.circular(16), border: Border.all(color: AppTheme.border)),
    child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
      Padding(
        padding: const EdgeInsets.fromLTRB(16, 14, 16, 10),
        child: Text(title, style: const TextStyle(color: AppTheme.textPrimary, fontWeight: FontWeight.w600, fontSize: 14)),
      ),
      const Divider(height: 1, color: AppTheme.border),
      ...rows,
    ]),
  );

  Widget _row(String label, String value) => Padding(
    padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 10),
    child: Row(crossAxisAlignment: CrossAxisAlignment.start, children: [
      SizedBox(width: 110, child: Text(label, style: const TextStyle(color: AppTheme.textMuted, fontSize: 13))),
      Expanded(child: Text(value, style: const TextStyle(color: AppTheme.textPrimary, fontSize: 13))),
    ]),
  );
}
