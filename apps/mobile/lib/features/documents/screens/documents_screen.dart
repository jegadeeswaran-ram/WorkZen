import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:intl/intl.dart';
import '../../../core/network/api_client.dart';
import '../../../core/theme/app_theme.dart';

const _dummyDocs = <Map<String, dynamic>>[
  {'id': 'dd1', 'name': 'Employment Contract — Ravi Kumar',  'type': 'pdf',  'size': 245760,  'category': 'Employee',   'uploadedAt': '2026-06-01T00:00:00Z', 'uploadedBy': 'HR Manager'},
  {'id': 'dd2', 'name': 'Salary Slip — May 2026',            'type': 'pdf',  'size': 102400,  'category': 'Payroll',    'uploadedAt': '2026-06-05T00:00:00Z', 'uploadedBy': 'Payroll Mgr'},
  {'id': 'dd3', 'name': 'NHAI Work Order WO-2026-0018',      'type': 'pdf',  'size': 512000,  'category': 'Tender',     'uploadedAt': '2026-05-20T00:00:00Z', 'uploadedBy': 'Tender Mgr'},
  {'id': 'dd4', 'name': 'PF ECR — June 2026',                'type': 'xlsx', 'size': 81920,   'category': 'Compliance', 'uploadedAt': '2026-06-15T00:00:00Z', 'uploadedBy': 'Compliance'},
  {'id': 'dd5', 'name': 'Site Inspection Report — AAI',      'type': 'docx', 'size': 163840,  'category': 'Operations', 'uploadedAt': '2026-06-10T00:00:00Z', 'uploadedBy': 'Ops Manager'},
  {'id': 'dd6', 'name': 'ESI Challan Receipt — May 2026',    'type': 'pdf',  'size': 73728,   'category': 'Compliance', 'uploadedAt': '2026-06-07T00:00:00Z', 'uploadedBy': 'Compliance'},
];

final _documentsProvider =
    FutureProvider.autoDispose<List<Map<String, dynamic>>>((ref) async {
  final api = ref.watch(apiClientProvider);
  try {
    final r = await api.get('/documents', queryParameters: {'page': '1', 'limit': '20'});
    final data = r.data['data'];
    if (data is List && data.isNotEmpty) return data.cast<Map<String, dynamic>>();
    if (data is Map && data['items'] is List && (data['items'] as List).isNotEmpty) {
      return (data['items'] as List).cast<Map<String, dynamic>>();
    }
  } catch (_) {}
  return _dummyDocs;
});

class DocumentsScreen extends ConsumerWidget {
  const DocumentsScreen({super.key});

  IconData _fileIcon(String? type) => switch ((type ?? '').toLowerCase()) {
    'pdf' => Icons.picture_as_pdf_outlined,
    'jpg' || 'jpeg' || 'png' || 'image' => Icons.image_outlined,
    'xls' || 'xlsx' || 'excel' => Icons.table_chart_outlined,
    'doc' || 'docx' || 'word' => Icons.description_outlined,
    _ => Icons.insert_drive_file_outlined,
  };

  Color _fileColor(String? type) => switch ((type ?? '').toLowerCase()) {
    'pdf' => AppTheme.danger,
    'jpg' || 'jpeg' || 'png' || 'image' => AppTheme.primary,
    'xls' || 'xlsx' || 'excel' => AppTheme.success,
    _ => AppTheme.primaryLight,
  };

  String _fileSize(dynamic bytes) {
    if (bytes == null) return '';
    final n = (bytes is num) ? bytes.toInt() : int.tryParse('$bytes') ?? 0;
    if (n < 1024) return '${n}B';
    if (n < 1024 * 1024) return '${(n / 1024).toStringAsFixed(1)}KB';
    return '${(n / (1024 * 1024)).toStringAsFixed(1)}MB';
  }

  String _fmt(String? iso) {
    if (iso == null) return '—';
    try { return DateFormat('dd MMM yyyy').format(DateTime.parse(iso)); } catch (_) { return iso; }
  }

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final docsAsync = ref.watch(_documentsProvider);

    return Scaffold(
      backgroundColor: AppTheme.background,
      appBar: AppBar(
        title: const Text('Documents'),
        actions: [IconButton(icon: const Icon(Icons.refresh_outlined), onPressed: () => ref.invalidate(_documentsProvider))],
      ),
      body: RefreshIndicator(
        color: AppTheme.primary,
        onRefresh: () async => ref.invalidate(_documentsProvider),
        child: docsAsync.when(
          loading: () => const Center(child: CircularProgressIndicator(color: AppTheme.primary)),
          error: (e, _) => Center(child: TextButton(onPressed: () => ref.invalidate(_documentsProvider), child: const Text('Retry'))),
          data: (docs) {
            if (docs.isEmpty) return const Center(child: Text('No documents', style: TextStyle(color: AppTheme.textMuted)));
            return ListView.builder(
              padding: const EdgeInsets.all(16),
              itemCount: docs.length,
              itemBuilder: (_, i) {
                final doc = docs[i];
                final type = doc['type'] as String? ?? '';
                final uploader = doc['uploadedBy'] as Map<String, dynamic>? ?? {};
                final uploaderName = '${uploader['firstName'] ?? ''} ${uploader['lastName'] ?? ''}'.trim();
                final color = _fileColor(type);

                return GestureDetector(
                  onTap: () => ScaffoldMessenger.of(context).showSnackBar(const SnackBar(content: Text('Preview coming soon'))),
                  child: Container(
                    margin: const EdgeInsets.only(bottom: 10),
                    padding: const EdgeInsets.all(14),
                    decoration: BoxDecoration(color: AppTheme.surface, borderRadius: BorderRadius.circular(14), border: Border.all(color: AppTheme.border)),
                    child: Row(children: [
                      Container(
                        width: 44, height: 44,
                        decoration: BoxDecoration(color: color.withValues(alpha: 0.12), borderRadius: BorderRadius.circular(10)),
                        child: Icon(_fileIcon(type), color: color, size: 22),
                      ),
                      const SizedBox(width: 12),
                      Expanded(child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
                        Text(doc['name'] as String? ?? '', style: const TextStyle(color: AppTheme.textPrimary, fontSize: 13, fontWeight: FontWeight.w600)),
                        const SizedBox(height: 2),
                        Row(children: [
                          Text(type.toUpperCase(), style: TextStyle(color: color, fontSize: 11, fontWeight: FontWeight.w600)),
                          if (doc['fileSize'] != null) ...[
                            const Text(' • ', style: TextStyle(color: AppTheme.textMuted)),
                            Text(_fileSize(doc['fileSize']), style: const TextStyle(color: AppTheme.textMuted, fontSize: 11)),
                          ],
                        ]),
                        if (uploaderName.isNotEmpty || doc['uploadedAt'] != null)
                          Text('${uploaderName.isNotEmpty ? uploaderName : ''} • ${_fmt(doc['uploadedAt'] as String?)}',
                              style: const TextStyle(color: AppTheme.textMuted, fontSize: 11)),
                      ])),
                      const Icon(Icons.open_in_new, size: 16, color: AppTheme.textMuted),
                    ]),
                  ),
                );
              },
            );
          },
        ),
      ),
    );
  }
}
