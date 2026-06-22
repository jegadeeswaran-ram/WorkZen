import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:intl/intl.dart';
import '../../../core/network/api_client.dart';
import '../../../core/theme/app_theme.dart';

class ComplianceFormScreen extends ConsumerStatefulWidget {
  final Map<String, dynamic>? item;
  const ComplianceFormScreen({super.key, this.item});

  @override
  ConsumerState<ComplianceFormScreen> createState() => _ComplianceFormScreenState();
}

class _ComplianceFormScreenState extends ConsumerState<ComplianceFormScreen> {
  final _form = GlobalKey<FormState>();
  bool _saving = false;

  late final _title       = TextEditingController(text: widget.item?['title'] as String? ?? '');
  late final _description = TextEditingController(text: widget.item?['description'] as String? ?? '');
  late final _amount      = TextEditingController(text: widget.item?['amount']?.toString() ?? '');
  late final _assignedTo  = TextEditingController(text: widget.item?['assignedTo'] as String? ?? '');
  String _category = 'PROVIDENT_FUND';
  String _status = 'PENDING';
  DateTime? _dueDate;

  bool get _isEdit => widget.item != null;

  @override
  void initState() {
    super.initState();
    _category = widget.item?['category'] as String? ?? 'PROVIDENT_FUND';
    _status = widget.item?['status'] as String? ?? 'PENDING';
    if (widget.item?['dueDate'] != null) _dueDate = DateTime.tryParse(widget.item!['dueDate'] as String);
  }

  @override
  void dispose() {
    for (final c in [_title, _description, _amount, _assignedTo]) c.dispose();
    super.dispose();
  }

  Future<void> _save() async {
    if (!_form.currentState!.validate()) return;
    if (_dueDate == null) {
      ScaffoldMessenger.of(context).showSnackBar(const SnackBar(content: Text('Please select a due date'), backgroundColor: AppTheme.warning));
      return;
    }
    setState(() => _saving = true);
    try {
      final api = ref.read(apiClientProvider);
      final payload = {
        'title': _title.text.trim(),
        'category': _category,
        'status': _status,
        'dueDate': _dueDate!.toIso8601String(),
        'description': _description.text.trim().isEmpty ? null : _description.text.trim(),
        'amount': _amount.text.trim().isEmpty ? null : double.tryParse(_amount.text.replaceAll(',', '')),
        'assignedTo': _assignedTo.text.trim().isEmpty ? null : _assignedTo.text.trim(),
      };
      if (_isEdit) {
        await api.patch('/compliance/${widget.item!['id']}', data: payload);
      } else {
        await api.post('/compliance', data: payload);
      }
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(SnackBar(
          content: Text(_isEdit ? 'Updated' : 'Compliance item created'), backgroundColor: AppTheme.success,
        ));
        Navigator.of(context).pop(true);
      }
    } catch (e) {
      if (mounted) ScaffoldMessenger.of(context).showSnackBar(SnackBar(content: Text('Error: $e'), backgroundColor: AppTheme.danger));
    } finally {
      if (mounted) setState(() => _saving = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: AppTheme.background,
      appBar: AppBar(title: Text(_isEdit ? 'Edit Compliance Item' : 'New Compliance Item')),
      body: Form(
        key: _form,
        child: SingleChildScrollView(
          padding: const EdgeInsets.all(16),
          child: Column(children: [
            _field(_title, 'Title', required: true),
            _dropdown('Category', _category, [
              'PROVIDENT_FUND', 'ESI', 'PROFESSIONAL_TAX', 'LABOUR_WELFARE_FUND',
              'MINIMUM_WAGES', 'CONTRACT_LABOUR', 'BONUS', 'GRATUITY', 'OTHER',
            ], (v) => setState(() => _category = v!)),
            _dropdown('Status', _status, ['PENDING', 'COMPLIANT', 'OVERDUE', 'UPCOMING'],
                (v) => setState(() => _status = v!)),
            GestureDetector(
              onTap: () async {
                final picked = await showDatePicker(
                  context: context, initialDate: _dueDate ?? DateTime.now().add(const Duration(days: 30)),
                  firstDate: DateTime(2020), lastDate: DateTime(2030),
                  builder: (ctx, child) => Theme(data: ThemeData.dark(), child: child!),
                );
                if (picked != null) setState(() => _dueDate = picked);
              },
              child: Container(
                margin: const EdgeInsets.only(bottom: 12),
                padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 14),
                decoration: BoxDecoration(color: AppTheme.surface, borderRadius: BorderRadius.circular(12), border: Border.all(color: AppTheme.border)),
                child: Row(children: [
                  Expanded(child: Text(
                    _dueDate != null ? DateFormat('dd MMM yyyy').format(_dueDate!) : 'Due Date *',
                    style: TextStyle(color: _dueDate != null ? AppTheme.textPrimary : AppTheme.textMuted),
                  )),
                  const Icon(Icons.calendar_today_outlined, size: 16, color: AppTheme.textMuted),
                ]),
              ),
            ),
            _field(_amount, 'Amount (₹)', keyboardType: TextInputType.number),
            _field(_assignedTo, 'Assigned To'),
            _field(_description, 'Description / Notes', maxLines: 3),
            const SizedBox(height: 24),
            SizedBox(
              width: double.infinity,
              child: ElevatedButton(
                onPressed: _saving ? null : _save,
                style: ElevatedButton.styleFrom(
                  backgroundColor: AppTheme.primary, foregroundColor: Colors.white,
                  padding: const EdgeInsets.symmetric(vertical: 15),
                  shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(14)),
                ),
                child: _saving
                    ? const SizedBox(height: 20, width: 20, child: CircularProgressIndicator(strokeWidth: 2, color: Colors.white))
                    : Text(_isEdit ? 'Update' : 'Create', style: const TextStyle(fontWeight: FontWeight.w600)),
              ),
            ),
            const SizedBox(height: 24),
          ]),
        ),
      ),
    );
  }

  Widget _field(TextEditingController ctrl, String label, {TextInputType? keyboardType, bool required = false, int maxLines = 1}) => Padding(
    padding: const EdgeInsets.only(bottom: 12),
    child: TextFormField(
      controller: ctrl, keyboardType: keyboardType, maxLines: maxLines,
      style: const TextStyle(color: AppTheme.textPrimary),
      decoration: InputDecoration(
        labelText: label + (required ? ' *' : ''), labelStyle: const TextStyle(color: AppTheme.textMuted),
        filled: true, fillColor: AppTheme.surface,
        border: OutlineInputBorder(borderRadius: BorderRadius.circular(12), borderSide: const BorderSide(color: AppTheme.border)),
        enabledBorder: OutlineInputBorder(borderRadius: BorderRadius.circular(12), borderSide: const BorderSide(color: AppTheme.border)),
        focusedBorder: OutlineInputBorder(borderRadius: BorderRadius.circular(12), borderSide: const BorderSide(color: AppTheme.primary)),
      ),
      validator: required ? (v) => (v == null || v.trim().isEmpty) ? '$label is required' : null : null,
    ),
  );

  Widget _dropdown(String label, String value, List<String> options, ValueChanged<String?> onChanged) => Padding(
    padding: const EdgeInsets.only(bottom: 12),
    child: DropdownButtonFormField<String>(
      value: value, onChanged: onChanged, dropdownColor: AppTheme.surface,
      style: const TextStyle(color: AppTheme.textPrimary),
      decoration: InputDecoration(
        labelText: label, labelStyle: const TextStyle(color: AppTheme.textMuted),
        filled: true, fillColor: AppTheme.surface,
        border: OutlineInputBorder(borderRadius: BorderRadius.circular(12), borderSide: const BorderSide(color: AppTheme.border)),
        enabledBorder: OutlineInputBorder(borderRadius: BorderRadius.circular(12), borderSide: const BorderSide(color: AppTheme.border)),
        focusedBorder: OutlineInputBorder(borderRadius: BorderRadius.circular(12), borderSide: const BorderSide(color: AppTheme.primary)),
      ),
      items: options.map((o) => DropdownMenuItem(value: o, child: Text(o.replaceAll('_', ' ')))).toList(),
    ),
  );
}
