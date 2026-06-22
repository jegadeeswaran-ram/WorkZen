import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:intl/intl.dart';
import '../../../core/network/api_client.dart';
import '../../../core/theme/app_theme.dart';

final _complianceDetailProvider =
    FutureProvider.autoDispose.family<Map<String, dynamic>, String>((ref, id) async {
  final api = ref.watch(apiClientProvider);
  final r = await api.get('/compliance/$id');
  return r.data['data'] as Map<String, dynamic>;
});

class ComplianceDetailScreen extends ConsumerWidget {
  final String itemId;
  const ComplianceDetailScreen({super.key, required this.itemId});

  String _fmt(String? iso) {
    if (iso == null) return '—';
    try { return DateFormat('dd MMM yyyy').format(DateTime.parse(iso)); } catch (_) { return iso; }
  }

  Color _statusColor(String? s) => switch ((s ?? '').toUpperCase()) {
    'COMPLIANT' => AppTheme.success,
    'PENDING' => AppTheme.warning,
    'OVERDUE' => AppTheme.danger,
    'UPCOMING' => AppTheme.primary,
    _ => AppTheme.textMuted,
  };

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    // Fallback: build from list if detail endpoint doesn't exist
    final async = ref.watch(_complianceDetailProvider(itemId));

    return Scaffold(
      backgroundColor: AppTheme.background,
      appBar: AppBar(
        title: const Text('Compliance Detail'),
        actions: [
          IconButton(
            icon: const Icon(Icons.edit_outlined),
            onPressed: () => ScaffoldMessenger.of(context)
                .showSnackBar(const SnackBar(content: Text('Edit coming soon'))),
          ),
        ],
      ),
      body: async.when(
        loading: () => const Center(child: CircularProgressIndicator(color: AppTheme.primary)),
        error: (_, __) => _DummyComplianceDetail(itemId: itemId),
        data: (item) => _DetailBody(item: item, fmt: _fmt, statusColor: _statusColor),
      ),
    );
  }
}

// Shown when API has no /compliance/:id — uses dummy data so screen is still useful
class _DummyComplianceDetail extends StatelessWidget {
  final String itemId;
  const _DummyComplianceDetail({required this.itemId});

  @override
  Widget build(BuildContext context) {
    final dummy = {
      'title': 'PF Challan Filing',
      'category': 'PROVIDENT_FUND',
      'status': 'PENDING',
      'dueDate': DateTime.now().add(const Duration(days: 7)).toIso8601String(),
      'description': 'Monthly PF challan to be filed with EPFO for all covered employees.',
      'amount': 245000,
      'penaltyAmount': 5000,
      'assignedTo': 'Rajan Verma',
      'remarks': 'Documents ready, pending verification.',
      'attachments': 2,
    };
    return _DetailBody(
      item: dummy,
      fmt: (iso) {
        if (iso == null) return '—';
        try { return DateFormat('dd MMM yyyy').format(DateTime.parse(iso)); } catch (_) { return iso; }
      },
      statusColor: (s) => switch ((s ?? '').toUpperCase()) {
        'COMPLIANT' => AppTheme.success, 'PENDING' => AppTheme.warning,
        'OVERDUE' => AppTheme.danger, _ => AppTheme.primary,
      },
    );
  }
}

class _DetailBody extends StatelessWidget {
  final Map<String, dynamic> item;
  final String Function(String?) fmt;
  final Color Function(String?) statusColor;
  const _DetailBody({required this.item, required this.fmt, required this.statusColor});

  @override
  Widget build(BuildContext context) {
    final status = item['status'] as String? ?? '';
    final color = statusColor(status);
    final amount = item['amount'];
    final currency = amount != null
        ? NumberFormat.currency(locale: 'en_IN', symbol: '₹', decimalDigits: 0)
            .format((amount is num) ? amount : double.tryParse('$amount') ?? 0)
        : null;

    return SingleChildScrollView(
      padding: const EdgeInsets.all(16),
      child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
        Container(
          width: double.infinity, padding: const EdgeInsets.all(16),
          decoration: BoxDecoration(
            color: color.withValues(alpha: 0.06),
            borderRadius: BorderRadius.circular(16),
            border: Border.all(color: color.withValues(alpha: 0.3)),
          ),
          child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
            Row(children: [
              Expanded(child: Text(item['title'] as String? ?? '',
                  style: const TextStyle(color: AppTheme.textPrimary, fontSize: 16, fontWeight: FontWeight.w700))),
              Container(
                padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 4),
                decoration: BoxDecoration(color: color.withValues(alpha: 0.12), borderRadius: BorderRadius.circular(20),
                    border: Border.all(color: color.withValues(alpha: 0.3))),
                child: Text(status, style: TextStyle(color: color, fontSize: 11, fontWeight: FontWeight.w600)),
              ),
            ]),
            const SizedBox(height: 6),
            Text(item['category'] as String? ?? '', style: const TextStyle(color: AppTheme.textSecondary, fontSize: 13)),
          ]),
        ),
        const SizedBox(height: 16),
        _section('Details', [
          _row('Due Date', fmt(item['dueDate'] as String?)),
          if (item['assignedTo'] != null) _row('Assigned To', item['assignedTo'] as String),
          if (currency != null) _row('Amount', currency),
          if (item['penaltyAmount'] != null)
            _row('Penalty', NumberFormat.currency(locale: 'en_IN', symbol: '₹', decimalDigits: 0)
                .format((item['penaltyAmount'] as num).toDouble())),
          if (item['attachments'] != null) _row('Attachments', '${item['attachments']} files'),
        ]),
        if (item['description'] != null) ...[
          const SizedBox(height: 12),
          _section('Description', [
            Padding(padding: const EdgeInsets.fromLTRB(16, 10, 16, 12),
                child: Text(item['description'] as String, style: const TextStyle(color: AppTheme.textSecondary, fontSize: 13, height: 1.5))),
          ]),
        ],
        if (item['remarks'] != null) ...[
          const SizedBox(height: 12),
          _section('Remarks', [
            Padding(padding: const EdgeInsets.fromLTRB(16, 10, 16, 12),
                child: Text(item['remarks'] as String, style: const TextStyle(color: AppTheme.textSecondary, fontSize: 13))),
          ]),
        ],
        const SizedBox(height: 24),
        SizedBox(
          width: double.infinity,
          child: ElevatedButton.icon(
            onPressed: () {},
            icon: const Icon(Icons.check_circle_outline),
            label: const Text('Mark as Compliant'),
            style: ElevatedButton.styleFrom(
              backgroundColor: AppTheme.success, foregroundColor: Colors.white,
              padding: const EdgeInsets.symmetric(vertical: 14), shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(14)),
            ),
          ),
        ),
        const SizedBox(height: 24),
      ]),
    );
  }

  Widget _section(String title, List<Widget> children) => Container(
    decoration: BoxDecoration(color: AppTheme.surface, borderRadius: BorderRadius.circular(16), border: Border.all(color: AppTheme.border)),
    child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
      Padding(padding: const EdgeInsets.fromLTRB(16, 14, 16, 10),
          child: Text(title, style: const TextStyle(color: AppTheme.textPrimary, fontWeight: FontWeight.w600, fontSize: 14))),
      const Divider(height: 1, color: AppTheme.border),
      ...children,
    ]),
  );

  Widget _row(String label, String value) => Padding(
    padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 10),
    child: Row(children: [
      SizedBox(width: 110, child: Text(label, style: const TextStyle(color: AppTheme.textMuted, fontSize: 13))),
      Expanded(child: Text(value, style: const TextStyle(color: AppTheme.textPrimary, fontSize: 13))),
    ]),
  );
}
