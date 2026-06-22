import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:intl/intl.dart';
import '../../../core/network/api_client.dart';
import '../../../core/theme/app_theme.dart';

class AddTransactionScreen extends ConsumerStatefulWidget {
  const AddTransactionScreen({super.key});

  @override
  ConsumerState<AddTransactionScreen> createState() => _AddTransactionScreenState();
}

class _AddTransactionScreenState extends ConsumerState<AddTransactionScreen> {
  final _form = GlobalKey<FormState>();
  bool _saving = false;

  final _description = TextEditingController();
  final _amount      = TextEditingController();
  final _reference   = TextEditingController();
  final _notes       = TextEditingController();
  String _type = 'INCOME';
  String _category = 'OPERATIONS';
  DateTime _txnDate = DateTime.now();

  @override
  void dispose() {
    for (final c in [_description, _amount, _reference, _notes]) c.dispose();
    super.dispose();
  }

  Future<void> _pickDate() async {
    final picked = await showDatePicker(
      context: context, initialDate: _txnDate,
      firstDate: DateTime(2020), lastDate: DateTime.now(),
      builder: (ctx, child) => Theme(data: ThemeData.dark(), child: child!),
    );
    if (picked != null) setState(() => _txnDate = picked);
  }

  Future<void> _save() async {
    if (!_form.currentState!.validate()) return;
    setState(() => _saving = true);
    try {
      final api = ref.read(apiClientProvider);
      await api.post('/finance/transactions', data: {
        'description': _description.text.trim(),
        'amount': double.parse(_amount.text.replaceAll(',', '')),
        'type': _type,
        'category': _category,
        'transactionDate': _txnDate.toIso8601String(),
        'reference': _reference.text.trim().isEmpty ? null : _reference.text.trim(),
        'notes': _notes.text.trim().isEmpty ? null : _notes.text.trim(),
      });
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(const SnackBar(
          content: Text('Transaction recorded'), backgroundColor: AppTheme.success,
        ));
        Navigator.of(context).pop(true);
      }
    } catch (e) {
      if (mounted) ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(content: Text('Error: $e'), backgroundColor: AppTheme.danger),
      );
    } finally {
      if (mounted) setState(() => _saving = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: AppTheme.background,
      appBar: AppBar(title: const Text('Add Transaction')),
      body: Form(
        key: _form,
        child: SingleChildScrollView(
          padding: const EdgeInsets.all(16),
          child: Column(children: [
            // Type toggle
            Container(
              margin: const EdgeInsets.only(bottom: 16),
              decoration: BoxDecoration(color: AppTheme.surface, borderRadius: BorderRadius.circular(14), border: Border.all(color: AppTheme.border)),
              child: Row(children: ['INCOME', 'EXPENSE'].map((t) {
                final sel = _type == t;
                final color = t == 'INCOME' ? AppTheme.success : AppTheme.danger;
                return Expanded(
                  child: GestureDetector(
                    onTap: () => setState(() => _type = t),
                    child: Container(
                      padding: const EdgeInsets.symmetric(vertical: 13),
                      decoration: BoxDecoration(
                        color: sel ? color : Colors.transparent,
                        borderRadius: BorderRadius.circular(12),
                      ),
                      child: Text(t, textAlign: TextAlign.center,
                          style: TextStyle(color: sel ? Colors.white : AppTheme.textMuted, fontWeight: FontWeight.w600)),
                    ),
                  ),
                );
              }).toList()),
            ),
            _field(_description, 'Description', required: true),
            _field(_amount, 'Amount (₹)', keyboardType: TextInputType.number, required: true),
            _dropdown('Category', _category,
                ['OPERATIONS', 'PAYROLL', 'RENT', 'UTILITIES', 'TRAVEL', 'COMPLIANCE', 'BILLING', 'OTHER'],
                (v) => setState(() => _category = v!)),
            // Date picker
            GestureDetector(
              onTap: _pickDate,
              child: Container(
                margin: const EdgeInsets.only(bottom: 12),
                padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 14),
                decoration: BoxDecoration(color: AppTheme.surface, borderRadius: BorderRadius.circular(12), border: Border.all(color: AppTheme.border)),
                child: Row(children: [
                  Expanded(child: Text(DateFormat('dd MMM yyyy').format(_txnDate),
                      style: const TextStyle(color: AppTheme.textPrimary, fontSize: 14))),
                  const Icon(Icons.calendar_today_outlined, size: 16, color: AppTheme.textMuted),
                ]),
              ),
            ),
            _field(_reference, 'Reference / Voucher No.'),
            _field(_notes, 'Notes', maxLines: 2),
            const SizedBox(height: 24),
            SizedBox(
              width: double.infinity,
              child: ElevatedButton(
                onPressed: _saving ? null : _save,
                style: ElevatedButton.styleFrom(
                  backgroundColor: _type == 'INCOME' ? AppTheme.success : AppTheme.danger,
                  foregroundColor: Colors.white,
                  padding: const EdgeInsets.symmetric(vertical: 15),
                  shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(14)),
                ),
                child: _saving
                    ? const SizedBox(height: 20, width: 20, child: CircularProgressIndicator(strokeWidth: 2, color: Colors.white))
                    : const Text('Save Transaction', style: TextStyle(fontWeight: FontWeight.w600, fontSize: 15)),
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
      items: options.map((o) => DropdownMenuItem(value: o, child: Text(o))).toList(),
    ),
  );
}
