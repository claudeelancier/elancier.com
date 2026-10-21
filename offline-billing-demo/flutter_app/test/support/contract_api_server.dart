import 'dart:convert';
import 'dart:io';

/// Small HTTP stand-in used by Flutter tests. It speaks the same JSON contract
/// as the Laravel API so the client is exercised over a real socket.
class ContractApiServer {
  HttpServer? _server;
  final Map<String, Map<String, Object?>> sales = {};
  final Set<String> rejectUuids = {};
  int failuresRemaining = 0;
  Duration delay = Duration.zero;

  Future<String> start() async {
    final server = await HttpServer.bind(InternetAddress.loopbackIPv4, 0);
    _server = server;
    server.listen(_handle);
    return 'http://127.0.0.1:${server.port}/api';
  }

  Future<void> close() async {
    await _server?.close(force: true);
  }

  Future<void> _handle(HttpRequest request) async {
    if (delay > Duration.zero) {
      await Future<void>.delayed(delay);
    }
    final path = request.uri.path;
    if (request.method == 'GET' && path == '/api/health') {
      if (failuresRemaining > 0) {
        failuresRemaining -= 1;
        await _send(request, 503, {'success': false, 'status': 'down'});
        return;
      }
      await _send(request, 200, {'success': true, 'status': 'ok'});
      return;
    }
    if (request.method == 'POST' && path == '/api/sales/sync') {
      final body = await _readObject(request);
      final result = _syncOne(body);
      await _send(request, _statusCode(result), result);
      return;
    }
    if (request.method == 'POST' && path == '/api/sales/sync-batch') {
      final body = await _readObject(request);
      final items = body['sales'];
      if (items is! List) {
        await _send(request, 422, {
          'success': false,
          'sync_status': 'rejected',
          'message': 'sales is required',
          'results': [],
        });
        return;
      }
      final results = <Map<String, Object?>>[];
      for (final item in items) {
        if (item is Map) {
          results.add(_syncOne(Map<String, dynamic>.from(item)));
        } else {
          results.add({
            'success': false,
            'sale_uuid': null,
            'sync_status': 'rejected',
            'message': 'Each sale must be an object.',
          });
        }
      }
      await _send(request, 200, {'success': true, 'results': results});
      return;
    }
    if (request.method == 'GET' && path == '/api/sales') {
      await _send(request, 200, {
        'success': true,
        'sales': sales.values.toList(),
      });
      return;
    }
    await _send(request, 404, {'success': false, 'message': 'Not found'});
  }

  Map<String, Object?> _syncOne(Map<String, dynamic> body) {
    final saleUuid = body['sale_uuid']?.toString() ?? '';
    if (rejectUuids.contains(saleUuid)) {
      return {
        'success': false,
        'sale_uuid': saleUuid,
        'sync_status': 'rejected',
        'message': 'Rejected by the demo API.',
      };
    }
    final quantity = body['quantity'];
    final total = body['total_amount']?.toString();
    final expected = quantity is int ? _money(quantity) : null;
    if (body['product_id'] != 'DEMO-PRODUCT-001' ||
        body['product_name'] != 'Demo Rice Bag' ||
        body['unit_price'] != '100.00' ||
        quantity is! int ||
        quantity < 1 ||
        expected == null ||
        total != expected) {
      return {
        'success': false,
        'sale_uuid': saleUuid,
        'sync_status': 'rejected',
        'message': 'Rejected by the demo API.',
        'total_amount': ?expected,
      };
    }

    final existing = sales[saleUuid];
    if (existing != null) {
      final same =
          existing['quantity'] == quantity &&
          existing['total_amount'] == total &&
          existing['created_at'] == body['created_at'];
      if (same) {
        return {
          'success': true,
          'sale_uuid': saleUuid,
          'sync_status': 'already_synced',
          'total_amount': total,
        };
      }
      return {
        'success': false,
        'sale_uuid': saleUuid,
        'sync_status': 'conflict',
        'message': 'This sale_uuid already exists with different sale data and was not overwritten.',
      };
    }

    sales[saleUuid] = {
      'sale_uuid': saleUuid,
      'product_id': body['product_id'],
      'product_name': body['product_name'],
      'unit_price': body['unit_price'],
      'quantity': quantity,
      'total_amount': total,
      'created_at': body['created_at'],
    };
    return {
      'success': true,
      'sale_uuid': saleUuid,
      'sync_status': 'synced',
      'total_amount': total,
    };
  }

  int _statusCode(Map<String, Object?> result) {
    return switch (result['sync_status']) {
      'synced' => 201,
      'already_synced' => 200,
      'conflict' => 409,
      'rejected' => 422,
      _ => 500,
    };
  }

  String _money(int quantity) {
    final paise = quantity * 10000;
    final rupees = paise ~/ 100;
    final fraction = (paise % 100).toString().padLeft(2, '0');
    return '$rupees.$fraction';
  }

  Future<Map<String, dynamic>> _readObject(HttpRequest request) async {
    final raw = await utf8.decoder.bind(request).join();
    final decoded = jsonDecode(raw);
    return Map<String, dynamic>.from(decoded as Map);
  }

  Future<void> _send(
    HttpRequest request,
    int status,
    Map<String, Object?> body,
  ) async {
    request.response.statusCode = status;
    request.response.headers.contentType = ContentType.json;
    request.response.write(jsonEncode(body));
    await request.response.close();
  }
}
