import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../../../core/network/api_client.dart';
import '../../../core/theme/app_theme.dart';

class ClientFormScreen extends ConsumerStatefulWidget {
  final Map<String, dynamic>? client;
  const ClientFormScreen({super.key, this.client});

  @override
  ConsumerState<ClientFormScreen> createState() => _ClientFormScreenState();
}

class _ClientFormScreenState extends ConsumerState<ClientFormScreen> {
  final _form = GlobalKey<FormState>();
  bool _saving = false;

  late final _name        = TextEditingController(text: widget.client?['name'] as String? ?? '');
  late final _code        = TextEditingController(text: widget.client?['code'] as String? ?? '');
  late final _gstin       = TextEditingController(text: widget.client?['gstin'] as String? ?? '');
  late final _pan         = TextEditingController(text: widget.client?['pan'] as String? ?? '');
  late final _address     = TextEditingController(text: widget.client?['address'] as String? ?? '');
  late final _city        = TextEditingController(text: widget.client?['city'] as String? ?? '');
  late final _state       = TextEditingController(text: widget.client?['state'] as String? ?? '');
  late final _contactName = TextEditingController(text: widget.client?['primaryContactName'] as String? ?? '');
  late final _contactPhone= TextEditingController(text: widget.client?['primaryContactPhone'] as String? ?? '');
  late final _contactEmail= TextEditingController(text: widget.client?['primaryContactEmail'] as String? ?? '');
  String _type = 'GOVERNMENT';

  bool get _isEdit => widget.client != null;

  @override
  void initState() {
    super.initState();
    _type = widget.client?['type'] as String? ?? 'GOVERNMENT';
  }

  @override
  void dispose() {
    for (final c in [_name, _code, _gstin, _pan, _address, _city, _state, _contactName, _contactPhone, _contactEmail]) c.dispose();
    super.dispose();
  }

  Future<void> _save() async {
    if (!_form.currentState!.validate()) return;
    setState(() => _saving = true);
    try {
      final api = ref.read(apiClientProvider);
      final payload = {
        'name': _name.text.trim(),
        'code': _code.text.trim().isEmpty ? null : _code.text.trim(),
        'type': _type,
        'gstin': _gstin.text.trim().isEmpty ? null : _gstin.text.trim(),
        'pan': _pan.text.trim().isEmpty ? null : _pan.text.trim(),
        'address': _address.text.trim().isEmpty ? null : _address.text.trim(),
        'city': _city.text.trim().isEmpty ? null : _city.text.trim(),
        'state': _state.text.trim().isEmpty ? null : _state.text.trim(),
        'primaryContactName': _contactName.text.trim().isEmpty ? null : _contactName.text.trim(),
        'primaryContactPhone': _contactPhone.text.trim().isEmpty ? null : _contactPhone.text.trim(),
        'primaryContactEmail': _contactEmail.text.trim().isEmpty ? null : _contactEmail.text.trim(),
      };
      if (_isEdit) {
        await api.patch('/clients/${widget.client!['id']}', data: payload);
      } else {
        await api.post('/clients', data: payload);
      }
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(SnackBar(
          content: Text(_isEdit ? 'Client updated' : 'Client created'),
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
    return Scaffold(
      backgroundColor: AppTheme.background,
      appBar: AppBar(title: Text(_isEdit ? 'Edit Client' : 'New Client')),
      body: Form(
        key: _form,
        child: SingleChildScrollView(
          padding: const EdgeInsets.all(16),
          child: Column(children: [
            _sectionLabel('Client Info'),
            _field(_name, 'Client Name', required: true),
            _field(_code, 'Client Code'),
            _dropdown('Type', _type, ['GOVERNMENT', 'PSU', 'PRIVATE', 'NGO'], (v) => setState(() => _type = v!)),
            _field(_gstin, 'GSTIN'),
            _field(_pan, 'PAN'),
            _sectionLabel('Address'),
            _field(_address, 'Street Address'),
            _field(_city, 'City'),
            _field(_state, 'State'),
            _sectionLabel('Primary Contact'),
            _field(_contactName, 'Contact Person Name'),
            _field(_contactPhone, 'Contact Phone', keyboardType: TextInputType.phone),
            _field(_contactEmail, 'Contact Email', keyboardType: TextInputType.emailAddress),
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
                    : Text(_isEdit ? 'Update Client' : 'Create Client', style: const TextStyle(fontWeight: FontWeight.w600)),
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
      controller: ctrl, keyboardType: keyboardType,
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
