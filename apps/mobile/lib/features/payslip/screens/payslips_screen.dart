import 'package:flutter/material.dart';
import 'package:flutter_animate/flutter_animate.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:intl/intl.dart';
import 'package:url_launcher/url_launcher.dart';
import '../../../core/theme/app_theme.dart';
import '../../../core/network/api_client.dart';

final _payslipsProvider = FutureProvider.autoDispose<List<dynamic>>((ref) async {
  final api = ref.watch(apiClientProvider);
  final r = await api.get('/payroll/my-payslips?limit=12');
  return r.data['data'] as List;
});

class PayslipsScreen extends ConsumerWidget {
  const PayslipsScreen({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final payslips = ref.watch(_payslipsProvider);
    final currFmt = NumberFormat.currency(locale: 'en_IN', symbol: '₹', decimalDigits: 0);
    final monthFmt = DateFormat('MMM yyyy');

    return Scaffold(
      backgroundColor: AppTheme.background,
      appBar: AppBar(
        title: const Text('Payslips'),
        actions: [
          IconButton(
              icon: const Icon(Icons.refresh_outlined),
              onPressed: () => ref.invalidate(_payslipsProvider)),
        ],
      ),
      body: RefreshIndicator(
        color: AppTheme.primary,
        onRefresh: () async => ref.invalidate(_payslipsProvider),
        child: payslips.when(
          loading: () => const Center(child: CircularProgressIndicator()),
          error: (e, _) => Center(
            child: Column(mainAxisAlignment: MainAxisAlignment.center, children: [
              const Icon(Icons.error_outline, color: AppTheme.danger, size: 48),
              const SizedBox(height: 12),
              Text(e.toString(),
                  style: const TextStyle(color: AppTheme.textMuted), textAlign: TextAlign.center),
              const SizedBox(height: 16),
              ElevatedButton(
                  onPressed: () => ref.invalidate(_payslipsProvider),
                  child: const Text('Retry')),
            ]),
          ),
          data: (data) => data.isEmpty
              ? const Center(
                  child: Column(mainAxisAlignment: MainAxisAlignment.center, children: [
                  Icon(Icons.receipt_long_outlined, size: 48, color: AppTheme.textMuted),
                  SizedBox(height: 12),
                  Text('No payslips found', style: TextStyle(color: AppTheme.textMuted)),
                ]))
              : ListView.separated(
                  padding: const EdgeInsets.all(20),
                  itemCount: data.length,
                  separatorBuilder: (_, __) => const SizedBox(height: 12),
                  itemBuilder: (ctx, i) =>
                      _payslipCard(context, data[i] as Map, currFmt, monthFmt),
                ),
        ),
      ),
    );
  }

  Widget _payslipCard(BuildContext context, Map data, NumberFormat curr, DateFormat month) {
    final date = DateTime.parse(data['payPeriod'] as String);
    final isPaid = data['status'] == 'PAID';
    final pdfUrl = data['pdfUrl'] as String?;

    return Container(
      padding: const EdgeInsets.all(16),
      decoration: BoxDecoration(
          color: AppTheme.surface,
          borderRadius: BorderRadius.circular(16),
          border: Border.all(color: AppTheme.border)),
      child: Row(children: [
        Container(
          width: 44,
          height: 44,
          decoration: BoxDecoration(
            color: AppTheme.primary.withOpacity(0.1),
            borderRadius: BorderRadius.circular(12),
            border: Border.all(color: AppTheme.primary.withOpacity(0.2)),
          ),
          child: const Icon(Icons.receipt_long_outlined, color: AppTheme.primary, size: 20),
        ),
        const SizedBox(width: 14),
        Expanded(
          child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
            Text(month.format(date),
                style: Theme.of(context).textTheme.titleMedium?.copyWith(fontSize: 14)),
            Text(
              'Gross: ${curr.format((data['grossSalary'] as num).toInt())} · Net: ${curr.format((data['netSalary'] as num).toInt())}',
              style: Theme.of(context).textTheme.bodyMedium?.copyWith(fontSize: 12),
            ),
          ]),
        ),
        Column(crossAxisAlignment: CrossAxisAlignment.end, children: [
          Container(
            padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 3),
            decoration: BoxDecoration(
              color: (isPaid ? AppTheme.success : AppTheme.warning).withOpacity(0.1),
              borderRadius: BorderRadius.circular(8),
              border: Border.all(
                  color: (isPaid ? AppTheme.success : AppTheme.warning).withOpacity(0.3)),
            ),
            child: Text(isPaid ? 'PAID' : 'PENDING',
                style: TextStyle(
                    color: isPaid ? AppTheme.success : AppTheme.warning,
                    fontSize: 10,
                    fontWeight: FontWeight.bold)),
          ),
          const SizedBox(height: 8),
          if (pdfUrl != null)
            GestureDetector(
              onTap: () async {
                final uri = Uri.parse(pdfUrl);
                if (await canLaunchUrl(uri)) {
                  await launchUrl(uri, mode: LaunchMode.externalApplication);
                }
              },
              child: const Row(mainAxisSize: MainAxisSize.min, children: [
                Icon(Icons.download_outlined, size: 14, color: AppTheme.primary),
                SizedBox(width: 4),
                Text('PDF',
                    style: TextStyle(
                        color: AppTheme.primary, fontSize: 12, fontWeight: FontWeight.w600)),
              ]),
            )
          else
            const Row(mainAxisSize: MainAxisSize.min, children: [
              Icon(Icons.download_outlined, size: 14, color: AppTheme.textMuted),
              SizedBox(width: 4),
              Text('PDF', style: TextStyle(color: AppTheme.textMuted, fontSize: 12)),
            ]),
        ]),
      ]),
    ).animate().fadeIn(delay: Duration(milliseconds: 50));
  }
}
