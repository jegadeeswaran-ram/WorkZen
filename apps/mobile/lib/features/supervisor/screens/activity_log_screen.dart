import 'dart:io';
import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:image_picker/image_picker.dart';
import 'package:intl/intl.dart';
import '../providers/supervisor_provider.dart';

class ActivityLogScreen extends ConsumerStatefulWidget {
  final String siteId;
  const ActivityLogScreen({super.key, required this.siteId});
  @override
  ConsumerState<ActivityLogScreen> createState() => _ActivityLogScreenState();
}

class _ActivityLogScreenState extends ConsumerState<ActivityLogScreen>
    with SingleTickerProviderStateMixin {
  late TabController _tabs;
  final _workCtrl = TextEditingController();
  final _headCtrl = TextEditingController(text: '0');
  final _incDescCtrl = TextEditingController();
  bool _hasIncident = false;
  String _incidentType = 'SAFETY';
  List<String> _uploadedUrls = [];
  List<XFile> _pendingPhotos = [];
  bool _submitting = false;
  bool _submitted = false;

  static const _incidentTypes = [
    'SAFETY',
    'OPERATIONAL',
    'HR',
    'COMPLIANCE',
    'EQUIPMENT',
    'OTHER'
  ];

  @override
  void initState() {
    super.initState();
    _tabs = TabController(length: 2, vsync: this);
    WidgetsBinding.instance.addPostFrameCallback((_) {
      ref.read(activityLogProvider.notifier).load(widget.siteId).then((_) {
        final today = ref.read(activityLogProvider.notifier).todayLog;
        if (today != null && mounted) {
          _workCtrl.text = today.workDone;
          _headCtrl.text = today.headcount.toString();
          setState(() {
            _hasIncident = today.hasIncident;
            _incidentType = today.incidentType ?? 'SAFETY';
            _uploadedUrls = today.photoUrls;
          });
          if (today.incidentDesc != null) _incDescCtrl.text = today.incidentDesc!;
        }
      });
    });
  }

  @override
  void dispose() {
    _tabs.dispose();
    _workCtrl.dispose();
    _headCtrl.dispose();
    _incDescCtrl.dispose();
    super.dispose();
  }

  Future<void> _pickPhoto() async {
    final picker = ImagePicker();
    final photo =
        await picker.pickImage(source: ImageSource.camera, imageQuality: 70);
    if (photo != null) setState(() => _pendingPhotos.add(photo));
  }

  Future<void> _submit() async {
    if (_workCtrl.text.trim().isEmpty) {
      ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(content: Text('Please describe the work done today')));
      return;
    }
    setState(() => _submitting = true);
    try {
      final notifier = ref.read(activityLogProvider.notifier);
      // Upload pending photos first
      for (final photo in _pendingPhotos) {
        final url = await notifier.uploadPhoto(photo.path, '');
        _uploadedUrls.add(url);
      }
      await notifier.save(
        siteId: widget.siteId,
        workDone: _workCtrl.text.trim(),
        headcount: int.tryParse(_headCtrl.text) ?? 0,
        hasIncident: _hasIncident,
        incidentType: _hasIncident ? _incidentType : null,
        incidentDesc: _hasIncident && _incDescCtrl.text.isNotEmpty
            ? _incDescCtrl.text.trim()
            : null,
        photoUrls: _uploadedUrls,
      );
      await notifier.load(widget.siteId);
      if (mounted) setState(() {
        _submitted = true;
        _submitting = false;
      });
    } catch (e) {
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
            SnackBar(content: Text('Error: $e'), backgroundColor: Colors.red));
        setState(() => _submitting = false);
      }
    }
  }

  Widget _buildTodayForm() {
    if (_submitted) {
      return Center(
          child: Column(mainAxisSize: MainAxisSize.min, children: [
        const Icon(Icons.check_circle, size: 64, color: Colors.green),
        const SizedBox(height: 16),
        const Text('Log Submitted!',
            style: TextStyle(fontSize: 20, fontWeight: FontWeight.bold)),
        const SizedBox(height: 8),
        const Text('Your activity log has been saved.',
            textAlign: TextAlign.center),
        const SizedBox(height: 24),
        OutlinedButton(
            onPressed: () => setState(() {
                  _submitted = false;
                  _tabs.animateTo(1);
                }),
            child: const Text('View History')),
      ]));
    }
    return ListView(padding: const EdgeInsets.all(16), children: [
      TextFormField(
          controller: _workCtrl,
          decoration: const InputDecoration(
              labelText: 'Work Done Today *',
              hintText: 'Describe tasks, areas covered...',
              border: OutlineInputBorder()),
          maxLines: 4),
      const SizedBox(height: 12),
      TextFormField(
          controller: _headCtrl,
          decoration: const InputDecoration(
              labelText: 'Headcount (Workers Present)',
              border: OutlineInputBorder(),
              prefixIcon: Icon(Icons.groups)),
          keyboardType: TextInputType.number),
      const SizedBox(height: 12),
      SwitchListTile(
        title: const Text('Any incident today?'),
        subtitle: const Text(
            'Toggle if there was an accident, issue, or safety concern'),
        value: _hasIncident,
        onChanged: (v) => setState(() => _hasIncident = v),
        contentPadding: EdgeInsets.zero,
      ),
      if (_hasIncident) ...[
        const SizedBox(height: 8),
        Container(
            padding: const EdgeInsets.all(12),
            decoration: BoxDecoration(
                color: Colors.red.withAlpha(15),
                borderRadius: BorderRadius.circular(8),
                border: Border.all(color: Colors.red.withAlpha(60))),
            child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
              const Text('Incident Type',
                  style: TextStyle(fontWeight: FontWeight.w600, fontSize: 13)),
              const SizedBox(height: 6),
              Wrap(
                  spacing: 6,
                  children: _incidentTypes
                      .map((t) => ChoiceChip(
                          label: Text(t,
                              style: const TextStyle(fontSize: 12)),
                          selected: _incidentType == t,
                          onSelected: (_) =>
                              setState(() => _incidentType = t)))
                      .toList()),
              const SizedBox(height: 10),
              TextFormField(
                  controller: _incDescCtrl,
                  decoration: const InputDecoration(
                      labelText: 'Incident Description',
                      hintText:
                          'What happened, who was involved, action taken...',
                      border: OutlineInputBorder()),
                  maxLines: 3),
            ])),
      ],
      const SizedBox(height: 16),
      const Text('Photos', style: TextStyle(fontWeight: FontWeight.w600)),
      const SizedBox(height: 8),
      Wrap(spacing: 8, runSpacing: 8, children: [
        ..._pendingPhotos.map((p) => ClipRRect(
            borderRadius: BorderRadius.circular(8),
            child: Stack(children: [
              Image.file(File(p.path),
                  width: 72, height: 72, fit: BoxFit.cover),
              Positioned(
                  top: 2,
                  right: 2,
                  child: GestureDetector(
                      onTap: () =>
                          setState(() => _pendingPhotos.remove(p)),
                      child: const CircleAvatar(
                          radius: 10,
                          backgroundColor: Colors.black54,
                          child: Icon(Icons.close,
                              size: 12, color: Colors.white)))),
            ]))),
        GestureDetector(
          onTap: _pickPhoto,
          child: Container(
              width: 72,
              height: 72,
              decoration: BoxDecoration(
                  border: Border.all(
                      color: Colors.grey.shade400,
                      width: 1.5,
                      style: BorderStyle.solid),
                  borderRadius: BorderRadius.circular(8),
                  color: Colors.grey.shade100),
              child: const Column(
                  mainAxisAlignment: MainAxisAlignment.center,
                  children: [
                    Icon(Icons.camera_alt_outlined, color: Colors.grey),
                    SizedBox(height: 4),
                    Text('Photo',
                        style: TextStyle(fontSize: 11, color: Colors.grey))
                  ])),
        ),
      ]),
      const SizedBox(height: 24),
      ElevatedButton.icon(
        onPressed: _submitting ? null : _submit,
        icon: _submitting
            ? const SizedBox(
                width: 18,
                height: 18,
                child: CircularProgressIndicator(
                    strokeWidth: 2, color: Colors.white))
            : const Icon(Icons.send),
        label: Text(_submitting ? 'Submitting...' : 'Submit Log'),
        style:
            ElevatedButton.styleFrom(padding: const EdgeInsets.symmetric(vertical: 14)),
      ),
    ]);
  }

  Widget _buildHistory(List<SiteActivityLog> logs) {
    if (logs.isEmpty) {
      return const Center(child: Text('No logs in the past 30 days'));
    }
    return ListView.separated(
      padding: const EdgeInsets.all(16),
      itemCount: logs.length,
      separatorBuilder: (_, __) => const SizedBox(height: 8),
      itemBuilder: (ctx, i) {
        final log = logs[i];
        final dateStr =
            DateFormat('EEE, dd MMM yyyy').format(DateTime.parse(log.logDate));
        return Card(
            child: Padding(
                padding: const EdgeInsets.all(12),
                child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Row(children: [
                        Expanded(
                            child: Text(dateStr,
                                style: const TextStyle(
                                    fontWeight: FontWeight.w600, fontSize: 13))),
                        if (log.hasIncident)
                          Container(
                              padding: const EdgeInsets.symmetric(
                                  horizontal: 8, vertical: 2),
                              decoration: BoxDecoration(
                                  color: Colors.red.withAlpha(30),
                                  borderRadius: BorderRadius.circular(12)),
                              child: const Text('Incident',
                                  style: TextStyle(
                                      fontSize: 11,
                                      color: Colors.red,
                                      fontWeight: FontWeight.w600))),
                        if (log.photoUrls.isNotEmpty) ...[
                          const SizedBox(width: 6),
                          const Icon(Icons.photo, size: 14, color: Colors.grey)
                        ],
                      ]),
                      const SizedBox(height: 4),
                      Text('${log.headcount} workers present',
                          style: TextStyle(
                              fontSize: 12, color: Colors.grey.shade600)),
                      const SizedBox(height: 6),
                      Text(log.workDone,
                          maxLines: 2,
                          overflow: TextOverflow.ellipsis,
                          style: const TextStyle(fontSize: 13)),
                      if (log.hasIncident && log.incidentType != null) ...[
                        const SizedBox(height: 6),
                        Container(
                            padding: const EdgeInsets.symmetric(
                                horizontal: 8, vertical: 4),
                            decoration: BoxDecoration(
                                color: Colors.orange.withAlpha(20),
                                borderRadius: BorderRadius.circular(6)),
                            child: Text(
                                '${log.incidentType}: ${log.incidentDesc ?? ''}',
                                style: const TextStyle(fontSize: 12),
                                maxLines: 1,
                                overflow: TextOverflow.ellipsis))
                      ],
                    ])));
      },
    );
  }

  @override
  Widget build(BuildContext context) {
    final logsState = ref.watch(activityLogProvider);
    return Scaffold(
      appBar: AppBar(
        title: const Text('Activity Log'),
        centerTitle: false,
        bottom: TabBar(
            controller: _tabs,
            tabs: const [Tab(text: "Today's Log"), Tab(text: 'History')]),
      ),
      body: TabBarView(controller: _tabs, children: [
        _buildTodayForm(),
        logsState.when(
            loading: () =>
                const Center(child: CircularProgressIndicator()),
            error: (e, _) => Center(child: Text('Error: $e')),
            data: _buildHistory),
      ]),
    );
  }
}
