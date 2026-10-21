import 'dart:convert';

import 'package:http/http.dart' as http;

import '../database/sales_database.dart';
import '../models/sale_record.dart';
import 'server_reachability.dart';

class SyncReport {
  const SyncReport({
    required this.apiReachable,
    required this.synced,
    required this.failed,
    required this.busy,
  });

  final bool apiReachable;
  final int synced;
  final int failed;
  final bool busy;
}

class SyncService {
  SyncService({
    required this.database,
    required this.reachability,
    required this.baseUrl,
    http.Client? client,
    DateTime Function()? now,
  }) : client = client ?? http.Client(),
       now = now ?? DateTime.now;

  final SalesDatabase database;
  final ServerReachability reachability;
  final String baseUrl;
  final http.Client client;
  final DateTime Function() now;

  bool _running = false;
  bool _lastReachable = false;

  static const _headers = {
    'Content-Type': 'application/json',
    'Accept': 'application/json',
  };

  /// Sends pending bills only after the health endpoint responds.
  /// A bill becomes synced only when the API confirms `synced` or `already_synced`.
  Future<SyncReport> syncPending({bool force = false}) async {
    if (_running) {
      return SyncReport(
        apiReachable: _lastReachable,
        synced: 0,
        failed: 0,
        busy: true,
      );
    }

    _running = true;
    var synced = 0;
    var failed = 0;
    try {
      final reachable = await reachability.isApiReachable();
      _lastReachable = reachable;
      if (!reachable) {
        return const SyncReport(
          apiReachable: false,
          synced: 0,
          failed: 0,
          busy: false,
        );
      }

      await database.recoverInterruptedSyncs();
      var useForce = force;
      while (true) {
        final due = await database.salesDueForSync(
          now().toUtc(),
          force: useForce,
        );
        if (due.isEmpty) {
          break;
        }
        useForce = false;
        final pass = due.length == 1
            ? await _syncOne(due.first)
            : await _syncBatch(due);
        synced += pass.synced;
        failed += pass.failed;
        if (pass.synced == 0) {
          break;
        }
      }

      return SyncReport(
        apiReachable: true,
        synced: synced,
        failed: failed,
        busy: false,
      );
    } finally {
      _running = false;
    }
  }

  Future<SyncReport> _syncOne(SaleRecord sale) async {
    final attempt = now().toUtc();
    await database.markSyncing([sale.saleUuid], attempt);
    try {
      final response = await client
          .post(
            Uri.parse('$baseUrl/sales/sync'),
            headers: _headers,
            body: jsonEncode(sale.toApiJson()),
          )
          .timeout(const Duration(seconds: 20));
      return await _applySingle(sale, response, attempt);
    } catch (error) {
      await _markFailed(
        sale: sale,
        attempt: attempt,
        message:
            'Could not reach the billing API. The bill is still saved on this device. ($error)',
        permanent: false,
      );
      return const SyncReport(
        apiReachable: true,
        synced: 0,
        failed: 1,
        busy: false,
      );
    }
  }

  Future<SyncReport> _syncBatch(List<SaleRecord> sales) async {
    final attempt = now().toUtc();
    await database.markSyncing(
      sales.map((sale) => sale.saleUuid).toList(),
      attempt,
    );
    try {
      final response = await client
          .post(
            Uri.parse('$baseUrl/sales/sync-batch'),
            headers: _headers,
            body: jsonEncode({
              'sales': sales.map((sale) => sale.toApiJson()).toList(),
            }),
          )
          .timeout(const Duration(seconds: 20));
      final decoded = _decodeObject(response.body);
      final results = decoded?['results'];
      if (response.statusCode < 200 ||
          response.statusCode >= 300 ||
          results is! List) {
        for (final sale in sales) {
          await _markFailed(
            sale: sale,
            attempt: attempt,
            message:
                'The billing API rejected the batch (HTTP ${response.statusCode}).',
            permanent: false,
          );
        }
        return SyncReport(
          apiReachable: true,
          synced: 0,
          failed: sales.length,
          busy: false,
        );
      }

      final byUuid = <String, Map<String, dynamic>>{};
      for (final item in results) {
        if (item is Map) {
          final mapped = Map<String, dynamic>.from(item);
          final uuid = mapped['sale_uuid']?.toString();
          if (uuid != null) {
            byUuid[uuid] = mapped;
          }
        }
      }

      var synced = 0;
      var failed = 0;
      for (final sale in sales) {
        final result = byUuid[sale.saleUuid];
        if (result == null) {
          await _markFailed(
            sale: sale,
            attempt: attempt,
            message: 'The server did not return a result for this bill.',
            permanent: false,
          );
          failed += 1;
          continue;
        }
        if (_isConfirmed(result)) {
          await _markSynced(sale: sale, attempt: attempt);
          synced += 1;
        } else {
          await _markFailed(
            sale: sale,
            attempt: attempt,
            message:
                result['message']?.toString() ??
                'The server did not confirm this bill.',
            permanent: _isPermanent(result),
          );
          failed += 1;
        }
      }
      return SyncReport(
        apiReachable: true,
        synced: synced,
        failed: failed,
        busy: false,
      );
    } catch (error) {
      for (final sale in sales) {
        await _markFailed(
          sale: sale,
          attempt: attempt,
          message:
              'Could not reach the billing API. The bill is still saved on this device. ($error)',
          permanent: false,
        );
      }
      return SyncReport(
        apiReachable: true,
        synced: 0,
        failed: sales.length,
        busy: false,
      );
    }
  }

  Future<SyncReport> _applySingle(
    SaleRecord sale,
    http.Response response,
    DateTime attempt,
  ) async {
    final body = _decodeObject(response.body);
    if (body != null && _isConfirmed(body)) {
      await _markSynced(sale: sale, attempt: attempt);
      return const SyncReport(
        apiReachable: true,
        synced: 1,
        failed: 0,
        busy: false,
      );
    }

    await _markFailed(
      sale: sale,
      attempt: attempt,
      message:
          body?['message']?.toString() ??
          'The server did not confirm this bill (HTTP ${response.statusCode}).',
      permanent: body != null
          ? _isPermanent(body, httpStatus: response.statusCode)
          : response.statusCode == 409 || response.statusCode == 422,
    );
    return const SyncReport(
      apiReachable: true,
      synced: 0,
      failed: 1,
      busy: false,
    );
  }

  bool _isConfirmed(Map<String, dynamic> body) {
    final status = body['sync_status']?.toString();
    return body['success'] == true &&
        (status == 'synced' || status == 'already_synced');
  }

  bool _isPermanent(Map<String, dynamic> body, {int? httpStatus}) {
    final status = body['sync_status']?.toString();
    return status == 'conflict' ||
        status == 'rejected' ||
        httpStatus == 409 ||
        httpStatus == 422;
  }

  Future<void> _markSynced({
    required SaleRecord sale,
    required DateTime attempt,
  }) {
    return database.markSyncResult(
      saleUuid: sale.saleUuid,
      syncStatus: 'synced',
      lastSyncError: null,
      retryCount: sale.retryCount,
      lastSyncAttemptAt: attempt,
      permanentFailure: false,
    );
  }

  Future<void> _markFailed({
    required SaleRecord sale,
    required DateTime attempt,
    required String message,
    required bool permanent,
  }) {
    final trimmed = message.length > 500 ? message.substring(0, 500) : message;
    return database.markSyncResult(
      saleUuid: sale.saleUuid,
      syncStatus: 'failed',
      lastSyncError: trimmed,
      retryCount: sale.retryCount + 1,
      lastSyncAttemptAt: attempt,
      permanentFailure: permanent,
    );
  }

  Map<String, dynamic>? _decodeObject(String body) {
    try {
      final decoded = jsonDecode(body);
      if (decoded is Map<String, dynamic>) {
        return decoded;
      }
      if (decoded is Map) {
        return Map<String, dynamic>.from(decoded);
      }
    } catch (_) {
      return null;
    }
    return null;
  }
}
