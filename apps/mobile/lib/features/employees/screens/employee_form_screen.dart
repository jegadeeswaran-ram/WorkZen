import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../../../core/network/api_client.dart';
import '../../../core/theme/app_theme.dart';

class EmployeeFormScreen extends ConsumerStatefulWidget {
  final Map<String, dynamic>? employee; // null = create, non-null = edit
  const EmployeeFormScreen({super.key, this.employee});

  @override
  ConsumerState<EmployeeFormScreen> createState() => _EmployeeFormScreenState();
}

class _EmployeeFormScreenState extends ConsumerState<EmployeeFormScreen> {
  final _form = GlobalKey<FormState>();
  bool _saving = false;

  late final _firstName = TextEditingController(text: widget.employee?['firstName'] as String? ?? '');
  late final _lastName  = TextEditingController(text: widget.employee?['lastName']  as String? ?? '');
  late final _phone     = TextEditingController(text: widget.employee?['personalPhone'] as String? ?? '');
  late final _email     = TextEditingController(text: widget.employee?['personalEmail'] as String? ?? '');
  late final _code      = TextEditingController(text: widget.employee?['employeeCode'] as String? ?? '');
  late final _designation = TextEditingController(text: widget.employee?['designation'] as String? ?? '');
  late final _department  = TextEditingController(text: widget.employee?['department'] as String? ?? '');
  String _gender = 'MALE';
  String _empType = 'PERMANENT';

  bool get _isEdit => widget.employee != null;

  @override
  void initState() {
    super.initState();
    _gender = widget.employee?['gender'] as String? ?? 'MALE';
    _empType = widget.employee?['employmentType'] as String? ?? 'PERMANENT';
  }

  @override
  void dispose() {
    for (final c in [_firstName, _lastName, _phone, _email, _code, _designation, _department]) c.dispose();
    super.dispose();
  }

  Future<void> _save() async {
    if (!_form.currentState!.validate()) return;
    setState(() => _saving = true);
    try {
      final api = ref.read(apiClientProvider);
      final payload = {
        'firstName': _firstName.text.trim(),
        'lastName': _lastName.text.trim(),
        'personalPhone': _phone.text.trim(),
        'personalEmail': _email.text.trim().isEmpty ? null : _email.text.trim(),
        'employeeCode': _code.text.trim(),
        'designation': _designation.text.trim(),
        'department': _department.text.trim(),
        'gender': _gender,
        'employmentType': _empType,
      };
      if (_isEdit) {
        await api.patch('/employees/${widget.employee!['id']}', data: payload);
      } else {
        await api.post('/employees', data: payload);
      }
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(SnackBar(
          content: Text(_isEdit ? 'Employee updated' : 'Employee created'),
          backgroundColor: AppTheme.success,
        ));
        Navigator.of(context).pop(true);
      }
    } catch (e) {
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(content: Text('Error: $e'), backgroundColor: AppTheme.danger),
        );
      }
    } finally {
      if (mounted) setState(() => _saving = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: AppTheme.background,
      appBar: AppBar(title: Text(_isEdit ? 'Edit Employee' : 'New Employee')),
      body: Form(
        key: _form,
        child: SingleChildScrollView(
          padding: const EdgeInsets.all(16),
          child: Column(children: [
            _sectionLabel('Personal Info'),
            _field(_firstName, 'First Name', required: true),
            _field(_lastName,  'Last Name',  required: true),
            _dropdown('Gender', _gender, ['MALE', 'FEMALE', 'OTHER'], (v) => setState(() => _gender = v!)),
            _field(_phone, 'Phone', keyboardType: TextInputType.phone, required: true),
            _field(_email, 'Personal Email', keyboardType: TextInputType.emailAddress),
            _sectionLabel('Employment'),
            _field(_code, 'Employee Code', required: true),
            _field(_designation, 'Designation'),
            _field(_department, 'Department'),
            _dropdown('Employment Type', _empType, ['PERMANENT', 'CONTRACT', 'TEMPORARY', 'DAILY_WAGE'],
                (v) => setState(() => _empType = v!)),
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
                    : Text(_isEdit ? 'Update Employee' : 'Create Employee', style: const TextStyle(fontWeight: FontWeight.w600)),
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

  Widget _field(TextEditingController ctrl, String label, {TextInputType? keyboardType, bool required = false}) => Padding(
    padding: const EdgeInsets.only(bottom: 12),
    child: TextFormField(
      controller: ctrl,
      keyboardType: keyboardType,
      style: const TextStyle(color: AppTheme.textPrimary),
      decoration: InputDecoration(
        labelText: label + (required ? ' *' : ''),
        labelStyle: const TextStyle(color: AppTheme.textMuted),
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
      value: value,
      onChanged: onChanged,
      dropdownColor: AppTheme.surface,
      style: const TextStyle(color: AppTheme.textPrimary),
      decoration: InputDecoration(
        labelText: label,
        labelStyle: const TextStyle(color: AppTheme.textMuted),
        filled: true, fillColor: AppTheme.surface,
        border: OutlineInputBorder(borderRadius: BorderRadius.circular(12), borderSide: const BorderSide(color: AppTheme.border)),
        enabledBorder: OutlineInputBorder(borderRadius: BorderRadius.circular(12), borderSide: const BorderSide(color: AppTheme.border)),
        focusedBorder: OutlineInputBorder(borderRadius: BorderRadius.circular(12), borderSide: const BorderSide(color: AppTheme.primary)),
      ),
      items: options.map((o) => DropdownMenuItem(value: o, child: Text(o.replaceAll('_', ' ')))).toList(),
    ),
  );
}
