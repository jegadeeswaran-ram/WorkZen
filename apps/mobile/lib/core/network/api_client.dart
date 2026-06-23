import 'package:dio/dio.dart';
import 'package:flutter/foundation.dart' show kIsWeb;
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:flutter_secure_storage/flutter_secure_storage.dart';

// Web (Chrome) uses localhost; Android emulator uses 10.0.2.2 to reach host
const _baseUrl = kIsWeb
    ? 'http://localhost:4000/api/v1'
    : const String.fromEnvironment('API_URL',
        defaultValue: 'http://10.0.2.2:4000/api/v1');

// Single shared storage instance used by both api_client and auth_provider
final secureStorageProvider = Provider<FlutterSecureStorage>((_) =>
    const FlutterSecureStorage(
      webOptions: WebOptions(dbName: 'workzen', publicKey: 'workzen_secure'),
    ));

final apiClientProvider = Provider<Dio>((ref) {
  final dio = Dio(BaseOptions(
    baseUrl: _baseUrl,
    connectTimeout: const Duration(seconds: 15),
    receiveTimeout: const Duration(seconds: 30),
    headers: {'Content-Type': 'application/json'},
  ));

  final storage = ref.read(secureStorageProvider);

  dio.interceptors.add(InterceptorsWrapper(
    onRequest: (options, handler) async {
      final token = await storage.read(key: 'accessToken');
      if (token != null) options.headers['Authorization'] = 'Bearer $token';
      return handler.next(options);
    },
    onError: (error, handler) async {
      if (error.response?.statusCode == 401) {
        try {
          final refreshToken = await storage.read(key: 'refreshToken');
          if (refreshToken == null) return handler.next(error);
          final response = await Dio(BaseOptions(
            baseUrl: _baseUrl,
            connectTimeout: const Duration(seconds: 15),
            receiveTimeout: const Duration(seconds: 15),
          )).post('/auth/refresh', data: {'refreshToken': refreshToken});
          final newToken = response.data['data']['accessToken'];
          await storage.write(key: 'accessToken', value: newToken);
          error.requestOptions.headers['Authorization'] = 'Bearer $newToken';
          final retryResponse = await dio.fetch(error.requestOptions);
          return handler.resolve(retryResponse);
        } catch (_) {
          await storage.deleteAll();
          return handler.next(error);
        }
      }
      return handler.next(error);
    },
  ));

  return dio;
});
