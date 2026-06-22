import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../../../core/network/api_client.dart';
import '../../../core/theme/app_theme.dart';

class CreateVisitorScreen extends ConsumerStatefulWidget {
  const CreateVisitorScreen({super.key});

  @override
  ConsumerState<CreateVisitorScreen> createState() => _CreateVisitorScreenState();
}

class _CreateVisitorScreenState extends ConsumerState<CreateVisitorScreen> {
  final _form = GlobalKey<FormState>();
  bool _saving = false;

  final _name    = TextEditingController();
  final _phone   = TextEditingController();
  final _company = TextEditingController();
  final _purpose = TextEditingController();
  final _host    = TextEditingController();
  String _idType = 'AADHAAR';

  @override
  void dispose() {
    for (final c in [_name, _phone, _company, _purpose, _host]) c.dispose();
    super.dispose();
  }

  Future<void> _checkIn() async {
    if (!_form.currentState!.validate()) return;
    setState(() => _saving = true);
    try {
      final api = ref.read(apiClientProvider);
      await api.post('/visitors', data: {
        'visitorName': _name.text.trim(),
        'phone': _phone.text.trim(),
        'company': _company.text.trim().isEmpty ? null : _company.text.trim(),
        'purpose': _purpose.text.trim(),
        'hostName': _host.text.trim().isEmpty ? null : _host.text.trim(),
        'idType': _idType,
        'checkInTime': DateTime.now().toIso8601String(),
        'status': 'CHECKED_IN',
      });
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(const SnackBar(
          content: Text('Visitor checked in successfully'),
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
      appBar: AppBar(title: const Text('Visitor Check-In')),
      body: Form(
        key: _form,
        child: SingleChildScrollView(
          padding: const EdgeInsets.all(16),
          child: Column(children: [
            Container(
              padding: const EdgeInsets.all(14),
              margin: const EdgeInsets.only(bottom: 20),
              decoration: BoxDecoration(color: AppTheme.primary.withValues(alpha: 0.08), borderRadius: BorderRadius.circular(14), border: Border.all(color: AppTheme.primary.withValues(alpha: 0.25))),
              child: Row(children: const [
                Icon(Icons.badge_outlined, color: AppTheme.primary, size: 20),
                SizedBox(width: 10),
                Text('Fill visitor details to issue entry pass', style: TextStyle(color: AppTheme.primary, fontSize: 13)),
              ]),
            ),
            _sectionLabel('Visitor Info'),
            _field(_name, 'Full Name', required: true),
            _field(_phone, 'Phone Number', keyboardType: TextInputType.phone, required: true),
            _field(_company, 'Company / Organisation'),
            _field(_purpose, 'Purpose of Visit', required: true, maxLines: 2),
            _sectionLabel('Host Details'),
            _field(_host, 'Host Employee Name'),
            _sectionLabel('ID Proof'),
            _dropdown('ID Type', _idType, ['AADHAAR', 'PAN', 'PASSPORT', 'DRIVING_LICENSE', 'VOTER_ID'],
                (v) => setState(() => _idType = v!)),
            const SizedBox(height: 24),
            SizedBox(
              width: double.infinity,
              child: ElevatedButton.icon(
                onPressed: _saving ? null : _checkIn,
                icon: const Icon(Icons.how_to_reg),
                label: _saving
                    ? const SizedBox(height: 20, width: 20, child: CircularProgressIndicator(strokeWidth: 2, color: Colors.white))
                    : const Text('Check In Visitor', style: TextStyle(fontWeight: FontWeight.w600, fontSize: 15)),
                style: ElevatedButton.styleFrom(
                  backgroundColor: AppTheme.success, foregroundColor: Colors.white,
                  padding: const EdgeInsets.symmetric(vertical: 15),
                  shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(14)),
                ),
              ),
            ),
            const SizedBox(height: 24),
          ]),
        ),
      ),
    );
  }

  Widget _sectionLabel(String text) => Padding(
    padding: const EdgeInsets.only(top: 8, bottom: 8),
    child: Align(alignment: Alignment.centerLeft,
        child: Text(text, style: const TextStyle(color: AppTheme.textMuted, fontSize: 11, fontWeight: FontWeight.w700, letterSpacing: 1.2))),
  );

  Widget _field(TextEditingController ctrl, String label, {TextInputType? keyboardType, bool required = false, int maxLines = 1}) => Padding(
    padding: const EdgeInsets.only(bottom: 12),
    child: TextFormField(
      controller: ctrl,
      keyboardType: keyboardType,
      maxLines: maxLines,
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
