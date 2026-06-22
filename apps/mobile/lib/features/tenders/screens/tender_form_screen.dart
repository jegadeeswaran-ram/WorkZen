import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:intl/intl.dart';
import '../../../core/network/api_client.dart';
import '../../../core/theme/app_theme.dart';

class TenderFormScreen extends ConsumerStatefulWidget {
  final Map<String, dynamic>? tender;
  const TenderFormScreen({super.key, this.tender});

  @override
  ConsumerState<TenderFormScreen> createState() => _TenderFormScreenState();
}

class _TenderFormScreenState extends ConsumerState<TenderFormScreen> {
  final _form = GlobalKey<FormState>();
  bool _saving = false;

  late final _title         = TextEditingController(text: widget.tender?['title'] as String? ?? '');
  late final _tenderNumber  = TextEditingController(text: widget.tender?['tenderNumber'] as String? ?? '');
  late final _department    = TextEditingController(text: widget.tender?['department'] as String? ?? '');
  late final _value         = TextEditingController(text: widget.tender?['tenderValue']?.toString() ?? '');
  late final _emd           = TextEditingController(text: widget.tender?['emdAmount']?.toString() ?? '');
  late final _requiredEmp   = TextEditingController(text: widget.tender?['requiredEmployees']?.toString() ?? '');
  late final _description   = TextEditingController(text: widget.tender?['description'] as String? ?? '');
  String _status = 'DRAFT';
  DateTime? _submissionDate;
  DateTime? _startDate;

  bool get _isEdit => widget.tender != null;

  @override
  void initState() {
    super.initState();
    _status = widget.tender?['status'] as String? ?? 'DRAFT';
    if (widget.tender?['submissionDate'] != null) {
      _submissionDate = DateTime.tryParse(widget.tender!['submissionDate'] as String);
    }
    if (widget.tender?['workStartDate'] != null) {
      _startDate = DateTime.tryParse(widget.tender!['workStartDate'] as String);
    }
  }

  @override
  void dispose() {
    for (final c in [_title, _tenderNumber, _department, _value, _emd, _requiredEmp, _description]) c.dispose();
    super.dispose();
  }

  Future<void> _pickDate(bool isSubmission) async {
    final picked = await showDatePicker(
      context: context,
      initialDate: DateTime.now().add(const Duration(days: 30)),
      firstDate: DateTime.now(),
      lastDate: DateTime.now().add(const Duration(days: 365 * 3)),
      builder: (ctx, child) => Theme(data: ThemeData.dark(), child: child!),
    );
    if (picked != null) setState(() => isSubmission ? _submissionDate = picked : _startDate = picked);
  }

  Future<void> _save() async {
    if (!_form.currentState!.validate()) return;
    setState(() => _saving = true);
    try {
      final api = ref.read(apiClientProvider);
      final payload = {
        'title': _title.text.trim(),
        'tenderNumber': _tenderNumber.text.trim().isEmpty ? null : _tenderNumber.text.trim(),
        'department': _department.text.trim(),
        'tenderValue': double.tryParse(_value.text.replaceAll(',', '')),
        'emdAmount': double.tryParse(_emd.text.replaceAll(',', '')),
        'requiredEmployees': int.tryParse(_requiredEmp.text),
        'status': _status,
        'description': _description.text.trim().isEmpty ? null : _description.text.trim(),
        if (_submissionDate != null) 'submissionDate': _submissionDate!.toIso8601String(),
        if (_startDate != null) 'workStartDate': _startDate!.toIso8601String(),
      };
      if (_isEdit) {
        await api.patch('/tenders/${widget.tender!['id']}', data: payload);
      } else {
        await api.post('/tenders', data: payload);
      }
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(SnackBar(
          content: Text(_isEdit ? 'Tender updated' : 'Tender created'),
          backgroundColor: AppTheme.success,
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
    final dateFmt = DateFormat('dd MMM yyyy');

    return Scaffold(
      backgroundColor: AppTheme.background,
      appBar: AppBar(title: Text(_isEdit ? 'Edit Tender' : 'New Tender')),
      body: Form(
        key: _form,
        child: SingleChildScrollView(
          padding: const EdgeInsets.all(16),
          child: Column(children: [
            _sectionLabel('Basic Info'),
            _field(_title, 'Tender Title', required: true),
            _field(_tenderNumber, 'Tender Number / Reference'),
            _field(_department, 'Department / Ministry'),
            _dropdown('Status', _status, ['DRAFT', 'ACTIVE', 'SUBMITTED', 'AWARDED', 'LOST', 'CANCELLED'],
                (v) => setState(() => _status = v!)),
            _sectionLabel('Financials'),
            _field(_value, 'Tender Value (₹)', keyboardType: TextInputType.number),
            _field(_emd, 'EMD Amount (₹)', keyboardType: TextInputType.number),
            _field(_requiredEmp, 'Required Employees', keyboardType: TextInputType.number),
            _sectionLabel('Dates'),
            _dateTile('Submission Deadline', _submissionDate, dateFmt, () => _pickDate(true)),
            _dateTile('Work Start Date', _startDate, dateFmt, () => _pickDate(false)),
            _sectionLabel('Description'),
            _field(_description, 'Description / Scope of Work', maxLines: 3),
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
                    : Text(_isEdit ? 'Update Tender' : 'Create Tender', style: const TextStyle(fontWeight: FontWeight.w600)),
              ),
            ),
            const SizedBox(height: 24),
          ]),
        ),
      ),
    );
  }

  Widget _sectionLabel(String text) => Padding(
    padding: const EdgeInsets.only(top: 16, bottom: 8),
    child: Align(alignment: Alignment.centerLeft,
        child: Text(text, style: const TextStyle(color: AppTheme.textMuted, fontSize: 11, fontWeight: FontWeight.w700, letterSpacing: 1.2))),
  );

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
      items: options.map((o) => DropdownMenuItem(value: o, child: Text(o))).toList(),
    ),
  );

  Widget _dateTile(String label, DateTime? date, DateFormat fmt, VoidCallback onTap) => Padding(
    padding: const EdgeInsets.only(bottom: 12),
    child: GestureDetector(
      onTap: onTap,
      child: Container(
        padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 14),
        decoration: BoxDecoration(color: AppTheme.surface, borderRadius: BorderRadius.circular(12), border: Border.all(color: AppTheme.border)),
        child: Row(children: [
          Expanded(child: Text(date != null ? fmt.format(date) : label,
              style: TextStyle(color: date != null ? AppTheme.textPrimary : AppTheme.textMuted, fontSize: 14))),
          const Icon(Icons.calendar_today_outlined, size: 16, color: AppTheme.textMuted),
        ]),
      ),
    ),
  );
}
