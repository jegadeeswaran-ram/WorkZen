import 'package:dio/dio.dart' show Options;
import 'package:firebase_messaging/firebase_messaging.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:flutter_secure_storage/flutter_secure_storage.dart';
import '../network/api_client.dart';

class AuthUser {
  final String id;
  final String name;
  final String email;
  final String role;
  final String tenantId;
  const AuthUser({required this.id, required this.name, required this.email, required this.role, required this.tenantId});

  factory AuthUser.fromJson(Map<String, dynamic> json) {
    final firstName = json['firstName'] as String? ?? '';
    final lastName = json['lastName'] as String? ?? '';
    final roles = (json['userRoles'] ?? json['roles']) as List?;
    return AuthUser(
      id: json['id'] as String? ?? '',
      name: '$firstName $lastName'.trim(),
      email: json['email'] as String? ?? '',
      role: roles?.isNotEmpty == true
          ? (roles!.first['role']['name'] as String?) ?? 'EMPLOYEE'
          : 'EMPLOYEE',
      tenantId: json['tenantId'] as String? ?? '',
    );
  }
}

class AuthNotifier extends AsyncNotifier<AuthUser?> {
  late final FlutterSecureStorage _storage;

  @override
  Future<AuthUser?> build() async {
    _storage = ref.read(secureStorageProvider);
    final token = await _storage.read(key: 'accessToken');
    if (token == null) return null;
    try {
      final api = ref.read(apiClientProvider);
      final response = await api.get('/auth/me',
          options: Options(
            sendTimeout: const Duration(seconds: 5),
            receiveTimeout: const Duration(seconds: 5),
          ));
      return AuthUser.fromJson(response.data['data']);
    } catch (_) {
      await _storage.deleteAll();
      return null;
    }
  }

  Future<void> login(String email, String password, {String? totpCode}) async {
    state = const AsyncLoading();
    try {
      final api = ref.read(apiClientProvider);
      final response = await api.post('/auth/login', data: {'email': email, 'password': password, if (totpCode != null) 'totpCode': totpCode});
      final tokens = response.data['data'];
      await _storage.write(key: 'accessToken', value: tokens['accessToken']);
      await _storage.write(key: 'refreshToken', value: tokens['refreshToken']);
      final me = await api.get('/auth/me');
      state = AsyncData(AuthUser.fromJson(me.data['data']));
      try {
        final fcmToken = await FirebaseMessaging.instance.getToken();
        if (fcmToken != null) {
          await api.post('/auth/fcm-token', data: {'token': fcmToken, 'device': 'flutter'});
        }
      } catch (_) {}
    } catch (e, s) {
      state = AsyncError(e, s);
    }
  }

  Future<void> logout() async {
    await _storage.deleteAll();
    state = const AsyncData(null);
  }
}

final authStateProvider = AsyncNotifierProvider<AuthNotifier, AuthUser?>(AuthNotifier.new);
