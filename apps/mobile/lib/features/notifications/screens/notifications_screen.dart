import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:timeago/timeago.dart' as timeago;
import '../../../core/network/api_client.dart';
import '../../../core/theme/app_theme.dart';

final _notifProvider = FutureProvider.autoDispose<List<dynamic>>((ref) async {
  final api = ref.watch(apiClientProvider);
  final r = await api.get('/notifications?limit=20');
  return r.data['data'] as List;
});

class NotificationsScreen extends ConsumerWidget {
  const NotificationsScreen({super.key});

  Future<void> _markAllRead(BuildContext context, WidgetRef ref) async {
    try {
      final api = ref.read(apiClientProvider);
      await api.patch('/notifications/mark-all-read');
      ref.invalidate(_notifProvider);
      if (context.mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
            const SnackBar(content: Text('All marked as read'), backgroundColor: AppTheme.success));
      }
    } catch (e) {
      if (context.mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
            SnackBar(content: Text(e.toString()), backgroundColor: AppTheme.danger));
      }
    }
  }

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final notifs = ref.watch(_notifProvider);

    return Scaffold(
      backgroundColor: AppTheme.background,
      appBar: AppBar(
        title: const Text('Notifications'),
        actions: [
          TextButton(
            onPressed: () => _markAllRead(context, ref),
            child: const Text('Mark all read',
                style: TextStyle(color: AppTheme.primary, fontSize: 12)),
          ),
        ],
      ),
      body: RefreshIndicator(
        color: AppTheme.primary,
        onRefresh: () async => ref.invalidate(_notifProvider),
        child: notifs.when(
          loading: () => const Center(child: CircularProgressIndicator()),
          error: (e, _) => Center(
            child: Column(mainAxisAlignment: MainAxisAlignment.center, children: [
              const Icon(Icons.error_outline, color: AppTheme.danger, size: 48),
              const SizedBox(height: 12),
              const Text('Could not load notifications',
                  style: TextStyle(color: AppTheme.textMuted)),
              const SizedBox(height: 16),
              ElevatedButton(
                  onPressed: () => ref.invalidate(_notifProvider), child: const Text('Retry')),
            ]),
          ),
          data: (data) => data.isEmpty
              ? const Center(
                  child: Column(mainAxisAlignment: MainAxisAlignment.center, children: [
                  Icon(Icons.notifications_off_outlined, size: 48, color: AppTheme.textMuted),
                  SizedBox(height: 12),
                  Text('No notifications', style: TextStyle(color: AppTheme.textMuted)),
                ]))
              : ListView.separated(
                  itemCount: data.length,
                  separatorBuilder: (_, __) => const Divider(color: AppTheme.border, height: 1),
                  itemBuilder: (ctx, i) {
                    final n = data[i] as Map;
                    final isRead = n['isRead'] as bool? ?? false;
                    final createdAt = n['createdAt'] != null
                        ? DateTime.parse(n['createdAt'] as String)
                        : DateTime.now();
                    return ListTile(
                      tileColor:
                          isRead ? Colors.transparent : AppTheme.primary.withOpacity(0.04),
                      leading: Container(
                        width: 40,
                        height: 40,
                        decoration: BoxDecoration(
                            color: AppTheme.primary.withOpacity(0.1), shape: BoxShape.circle),
                        child: const Icon(Icons.notifications_outlined,
                            color: AppTheme.primary, size: 18),
                      ),
                      title: Text(n['title'] as String? ?? '',
                          style: TextStyle(
                              color: Colors.white,
                              fontSize: 13,
                              fontWeight: isRead ? FontWeight.normal : FontWeight.w600)),
                      subtitle: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
                        Text(n['body'] as String? ?? '',
                            style: const TextStyle(color: AppTheme.textMuted, fontSize: 12),
                            maxLines: 2,
                            overflow: TextOverflow.ellipsis),
                        Text(timeago.format(createdAt),
                            style: const TextStyle(color: AppTheme.textMuted, fontSize: 10)),
                      ]),
                      trailing: !isRead
                          ? Container(
                              width: 8,
                              height: 8,
                              decoration: const BoxDecoration(
                                  color: AppTheme.primary, shape: BoxShape.circle))
                          : null,
                    );
                  },
                ),
        ),
      ),
    );
  }
}
