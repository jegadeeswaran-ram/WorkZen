import 'package:dio/dio.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../../../core/network/api_client.dart';

List<Map<String, dynamic>> _parseList(dynamic responseData) {
  final data = responseData['data'];
  if (data is List) return data.cast<Map<String, dynamic>>();
  if (data is Map && data['items'] is List) {
    return (data['items'] as List).cast<Map<String, dynamic>>();
  }
  return <Map<String, dynamic>>[];
}

final myApprovalsProvider =
    FutureProvider.autoDispose<List<Map<String, dynamic>>>((ref) async {
  final api = ref.watch(apiClientProvider);
  final r = await api.get('/workflows/my-approvals');
  return _parseList(r.data);
});

class WorkflowNotifier extends StateNotifier<AsyncValue<void>> {
  WorkflowNotifier(this._dio) : super(const AsyncValue.data(null));
  final Dio _dio;

  Future<bool> approve(String stepId, {String? comment}) async {
    state = const AsyncValue.loading();
    try {
      await _dio.post('/workflows/steps/$stepId/approve',
          data: {if (comment != null && comment.isNotEmpty) 'comment': comment});
      state = const AsyncValue.data(null);
      return true;
    } catch (e, s) {
      state = AsyncValue.error(e, s);
      return false;
    }
  }

  Future<bool> reject(String stepId, String reason) async {
    state = const AsyncValue.loading();
    try {
      await _dio.post('/workflows/steps/$stepId/reject', data: {'reason': reason});
      state = const AsyncValue.data(null);
      return true;
    } catch (e, s) {
      state = AsyncValue.error(e, s);
      return false;
    }
  }
}

final workflowActionProvider =
    StateNotifierProvider<WorkflowNotifier, AsyncValue<void>>((ref) {
  return WorkflowNotifier(ref.watch(apiClientProvider));
});
