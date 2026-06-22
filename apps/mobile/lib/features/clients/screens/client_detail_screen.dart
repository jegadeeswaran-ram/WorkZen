import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import '../../../core/theme/app_theme.dart';
import '../providers/clients_provider.dart';

class ClientDetailScreen extends ConsumerWidget {
  final String clientId;
  const ClientDetailScreen({super.key, required this.clientId});

  Color _typeColor(String? t) => switch ((t ?? '').toUpperCase()) {
        'GOVERNMENT' => AppTheme.primary,
        'PSU' => AppTheme.warning,
        'PRIVATE' => AppTheme.success,
        _ => AppTheme.textMuted,
      };

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final detailAsync = ref.watch(clientDetailProvider(clientId));

    return Scaffold(
      backgroundColor: AppTheme.background,
      appBar: AppBar(
        title: const Text('Client'),
        actions: [
          IconButton(
            icon: const Icon(Icons.edit_outlined),
            onPressed: () async {
              final detail = ref.read(clientDetailProvider(clientId)).value;
              final result = await context.push('/clients/$clientId/edit', extra: detail);
              if (result == true) ref.invalidate(clientDetailProvider(clientId));
            },
          ),
        ],
      ),
      body: detailAsync.when(
        loading: () =>
            const Center(child: CircularProgressIndicator(color: AppTheme.primary)),
        error: (e, _) => Center(
          child: TextButton(
              onPressed: () => ref.invalidate(clientDetailProvider(clientId)),
              child: const Text('Retry')),
        ),
        data: (c) {
          final type = c['type'] as String? ?? '';
          final color = _typeColor(type);
          final contacts = (c['contacts'] as List? ?? []).cast<Map<String, dynamic>>();
          final tenders = (c['tenders'] as List? ?? []);

          return SingleChildScrollView(
            padding: const EdgeInsets.all(16),
            child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
              Container(
                width: double.infinity,
                padding: const EdgeInsets.all(16),
                decoration: BoxDecoration(
                  color: AppTheme.surface,
                  borderRadius: BorderRadius.circular(16),
                  border: Border.all(color: AppTheme.border),
                ),
                child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
                  Row(children: [
                    Expanded(
                      child: Text(c['name'] as String? ?? '',
                          style: const TextStyle(
                              color: AppTheme.textPrimary,
                              fontSize: 18,
                              fontWeight: FontWeight.w700)),
                    ),
                    Container(
                      padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 3),
                      decoration: BoxDecoration(
                        color: color.withValues(alpha: 0.12),
                        borderRadius: BorderRadius.circular(20),
                        border: Border.all(color: color.withValues(alpha: 0.3)),
                      ),
                      child: Text(type,
                          style: TextStyle(
                              color: color,
                              fontSize: 11,
                              fontWeight: FontWeight.w600)),
                    ),
                  ]),
                  const SizedBox(height: 4),
                  Text(c['code'] as String? ?? '',
                      style: const TextStyle(color: AppTheme.textMuted, fontSize: 13)),
                ]),
              ),
              const SizedBox(height: 12),
              _section('Contact Info', [
                if (c['phone'] != null) _row(Icons.phone, c['phone'] as String),
                if (c['email'] != null) _row(Icons.email_outlined, c['email'] as String),
                if (c['city'] != null) _row(Icons.location_on_outlined, c['city'] as String),
                if (c['address'] != null) _row(Icons.home_outlined, c['address'] as String),
              ]),

              if (contacts.isNotEmpty) ...[
                const SizedBox(height: 12),
                Container(
                  decoration: BoxDecoration(
                    color: AppTheme.surface,
                    borderRadius: BorderRadius.circular(16),
                    border: Border.all(color: AppTheme.border),
                  ),
                  child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
                    Padding(
                      padding: const EdgeInsets.fromLTRB(16, 14, 16, 10),
                      child: Text('Contacts (${contacts.length})',
                          style: const TextStyle(
                              color: AppTheme.textPrimary,
                              fontWeight: FontWeight.w600,
                              fontSize: 14)),
                    ),
                    const Divider(height: 1, color: AppTheme.border),
                    ...contacts.map((con) => Padding(
                          padding: const EdgeInsets.symmetric(
                              horizontal: 16, vertical: 10),
                          child: Row(children: [
                            Container(
                              width: 36,
                              height: 36,
                              decoration: BoxDecoration(
                                color: AppTheme.primary.withValues(alpha: 0.12),
                                shape: BoxShape.circle,
                              ),
                              child: Center(
                                child: Text(
                                    ((con['name'] as String? ?? ' ')[0])
                                        .toUpperCase(),
                                    style: const TextStyle(
                                        color: AppTheme.primary,
                                        fontWeight: FontWeight.bold)),
                              ),
                            ),
                            const SizedBox(width: 12),
                            Expanded(
                              child: Column(
                                  crossAxisAlignment: CrossAxisAlignment.start,
                                  children: [
                                    Text(con['name'] as String? ?? '',
                                        style: const TextStyle(
                                            color: AppTheme.textPrimary,
                                            fontSize: 13,
                                            fontWeight: FontWeight.w600)),
                                    if (con['role'] != null)
                                      Text(con['role'] as String,
                                          style: const TextStyle(
                                              color: AppTheme.textMuted,
                                              fontSize: 12)),
                                    if (con['phone'] != null)
                                      Text(con['phone'] as String,
                                          style: const TextStyle(
                                              color: AppTheme.textSecondary,
                                              fontSize: 12)),
                                  ]),
                            ),
                          ]),
                        )),
                  ]),
                ),
              ],

              const SizedBox(height: 12),
              Container(
                padding: const EdgeInsets.all(16),
                decoration: BoxDecoration(
                  color: AppTheme.surface,
                  borderRadius: BorderRadius.circular(16),
                  border: Border.all(color: AppTheme.border),
                ),
                child: Row(children: [
                  const Icon(Icons.description_outlined,
                      color: AppTheme.textMuted, size: 18),
                  const SizedBox(width: 8),
                  Text('${tenders.length} Active Tender${tenders.length == 1 ? '' : 's'}',
                      style: const TextStyle(
                          color: AppTheme.textSecondary, fontSize: 13)),
                ]),
              ),
              const SizedBox(height: 24),
            ]),
          );
        },
      ),
    );
  }

  Widget _section(String title, List<Widget> rows) => Container(
        decoration: BoxDecoration(
          color: AppTheme.surface,
          borderRadius: BorderRadius.circular(16),
          border: Border.all(color: AppTheme.border),
        ),
        child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
          Padding(
            padding: const EdgeInsets.fromLTRB(16, 14, 16, 10),
            child: Text(title,
                style: const TextStyle(
                    color: AppTheme.textPrimary,
                    fontWeight: FontWeight.w600,
                    fontSize: 14)),
          ),
          const Divider(height: 1, color: AppTheme.border),
          ...rows,
        ]),
      );

  Widget _row(IconData icon, String value) => Padding(
        padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 10),
        child: Row(children: [
          Icon(icon, size: 16, color: AppTheme.textMuted),
          const SizedBox(width: 10),
          Expanded(
              child: Text(value,
                  style: const TextStyle(
                      color: AppTheme.textPrimary, fontSize: 13))),
        ]),
      );
}
