import 'dart:io';

/// Base URL of the Laravel API, including the `/api` prefix and no trailing slash.
class ApiConfig {
  const ApiConfig._();

  static const definedUrl = String.fromEnvironment('API_BASE_URL');

  static String get baseUrl =>
      resolve(configured: definedUrl, android: Platform.isAndroid);

  static String resolve({required String configured, required bool android}) {
    final trimmed = configured.trim();
    if (trimmed.isNotEmpty) {
      return trimmed.replaceFirst(RegExp(r'/+$'), '');
    }
    if (android) {
      return 'http://10.0.2.2:8000/api';
    }
    return 'http://127.0.0.1:8000/api';
  }
}
