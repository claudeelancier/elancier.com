import 'dart:convert';

import 'package:http/http.dart' as http;

/// Decides whether the Laravel API is reachable by calling `GET /health`.
/// A Wi-Fi or mobile-data connection is not treated as proof that the API is up.
class ServerReachability {
  ServerReachability({
    required this.baseUrl,
    http.Client? client,
    this.timeout = const Duration(seconds: 4),
  }) : client = client ?? http.Client();

  final String baseUrl;
  final http.Client client;
  final Duration timeout;

  Future<bool> isApiReachable() async {
    try {
      final response = await client
          .get(
            Uri.parse('$baseUrl/health'),
            headers: const {'Accept': 'application/json'},
          )
          .timeout(timeout);
      if (response.statusCode != 200) {
        return false;
      }
      final body = jsonDecode(response.body);
      return body is Map && body['success'] == true && body['status'] == 'ok';
    } catch (_) {
      return false;
    }
  }
}
