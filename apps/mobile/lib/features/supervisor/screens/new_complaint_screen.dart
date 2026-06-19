import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import '../providers/supervisor_provider.dart';

const _categories = [
  ('LABOUR_HR', 'Labour / HR', 'Dispute, misconduct, absenteeism, harassment'),
  ('SAFETY', 'Safety', 'Accident, near-miss, unsafe equipment, hazard'),
  ('OPERATIONS', 'Operations', 'Material shortage, equipment breakdown, work stoppage'),
  ('COMPLIANCE', 'Compliance', 'Contractor violation, document expiry, labour law'),
  ('CLIENT_SITE', 'Client / Site', 'Client complaint, scope change, site access problem'),
  ('RESOURCE', 'Resource', 'Headcount shortage, skill gap, overtime overrun'),
];
const _severities = ['LOW', 'MEDIUM', 'HIGH', 'CRITICAL'];

class NewComplaintScreen extends ConsumerStatefulWidget {
  final String siteId;
  const NewComplaintScreen({super.key, required this.siteId});

  @override
  ConsumerState<NewComplaintScreen> createState() => _NewComplaintScreenState();
}

class _NewComplaintScreenState extends ConsumerState<NewComplaintScreen> {
  final _formKey = GlobalKey<FormState>();
  final _titleCtrl = TextEditingController();
  final _descCtrl = TextEditingController();
  String _category = 'SAFETY';
  String _severity = 'MEDIUM';
  bool _loading = false;

  @override
  void dispose() {
    _titleCtrl.dispose();
    _descCtrl.dispose();
    super.dispose();
  }

  Future<void> _submit() async {
    if (!_formKey.currentState!.validate()) return;
    setState(() => _loading = true);
    try {
      await ref.read(complaintsProvider.notifier).create(
        siteId: widget.siteId,
        category: _category,
        severity: _severity,
        title: _titleCtrl.text.trim(),
        description: _descCtrl.text.trim(),
      );
      if (mounted) {
        context.pop();
        ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(
            content: Text('Complaint submitted successfully'),
            backgroundColor: Colors.green,
          ),
        );
      }
    } catch (e) {
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(content: Text('Error: $e'), backgroundColor: Colors.red),
        );
      }
    }
    if (mounted) setState(() => _loading = false);
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(title: const Text('Raise Complaint'), centerTitle: false),
      body: Form(
        key: _formKey,
        child: ListView(
          padding: const EdgeInsets.all(16),
          children: [
            const Text('Category', style: TextStyle(fontWeight: FontWeight.w600, fontSize: 13)),
            const SizedBox(height: 8),
            ...(_categories.map((c) => RadioListTile<String>(
              title: Text(c.$2, style: const TextStyle(fontWeight: FontWeight.w500)),
              subtitle: Text(c.$3, style: const TextStyle(fontSize: 12)),
              value: c.$1,
              groupValue: _category,
              onChanged: (v) => setState(() => _category = v!),
              contentPadding: EdgeInsets.zero,
              dense: true,
            ))),
            const SizedBox(height: 12),
            const Text('Severity', style: TextStyle(fontWeight: FontWeight.w600, fontSize: 13)),
            const SizedBox(height: 8),
            Wrap(
              spacing: 8,
              children: _severities
                  .map((s) => ChoiceChip(
                        label: Text(s),
                        selected: _severity == s,
                        onSelected: (_) => setState(() => _severity = s),
                      ))
                  .toList(),
            ),
            const SizedBox(height: 16),
            TextFormField(
              controller: _titleCtrl,
              decoration: const InputDecoration(
                labelText: 'Title',
                hintText: 'Brief summary',
                border: OutlineInputBorder(),
              ),
              validator: (v) => v!.isEmpty ? 'Required' : null,
            ),
            const SizedBox(height: 12),
            TextFormField(
              controller: _descCtrl,
              decoration: const InputDecoration(
                labelText: 'Description',
                hintText: 'Full details of the issue...',
                border: OutlineInputBorder(),
              ),
              maxLines: 5,
              validator: (v) => v!.isEmpty ? 'Required' : null,
            ),
            const SizedBox(height: 24),
            ElevatedButton(
              onPressed: _loading ? null : _submit,
              style: ElevatedButton.styleFrom(
                padding: const EdgeInsets.symmetric(vertical: 16),
              ),
              child: _loading
                  ? const SizedBox(
                      height: 20,
                      width: 20,
                      child: CircularProgressIndicator(strokeWidth: 2),
                    )
                  : const Text('Submit Complaint', style: TextStyle(fontSize: 16)),
            ),
          ],
        ),
      ),
    );
  }
}
