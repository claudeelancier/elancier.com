import 'dart:convert';
import 'dart:io';

import 'package:flutter_test/flutter_test.dart';
import 'package:http/http.dart' as http;
import 'package:offline_billing_demo/database/sales_database.dart';
import 'package:offline_billing_demo/database/sqlite_setup.dart';
import 'package:offline_billing_demo/services/billing_service.dart';
import 'package:offline_billing_demo/services/server_reachability.dart';
import 'package:offline_billing_demo/services/sync_service.dart';

const _required = bool.fromEnvironment('REQUIRE_LARAVEL');
const _baseUrl = String.fromEnvironment(
  'API_BASE_URL',
  defaultValue: 'http://127.0.0.1:8000/api',
);

void main() {
  setUpAll(configureSqlite);

  test('offline bills sync to the running Laravel API', () async {
    final client = http.Client();
    final reachable = await ServerReachability(
      baseUrl: _baseUrl,
      client: client,
    ).isApiReachable();
    if (!reachable) {
      client.close();
      if (_required) {
        fail('Laravel API is not reachable at $_baseUrl');
      }
      markTestSkipped(
        'Laravel API is not running at $_baseUrl. Start it to exercise this test.',
      );
      return;
    }

    final directory = await Directory.systemTemp.createTemp('billing-e2e');
    final path = '${directory.path}/sales.db';
    final offlineDatabase = await SalesDatabase.open(filePath: path);
    final offlineSync = SyncService(
      database: offlineDatabase,
      reachability: ServerReachability(
        baseUrl: 'http://127.0.0.1:9/api',
        client: client,
      ),
      baseUrl: 'http://127.0.0.1:9/api',
      client: client,
    );
    final billing = BillingService(database: offlineDatabase);
    final first = await billing.generateBill(quantity: 2);
    final second = await billing.generateBill(quantity: 4);
    final offline = await offlineSync.syncPending();
    expect(offline.apiReachable, isFalse);
    await offlineDatabase.close();

    final reopened = await SalesDatabase.open(filePath: path);
    final stillLocal = await reopened.listSales();
    expect(stillLocal, hasLength(2));
    expect(stillLocal.every((sale) => sale.syncStatus == 'pending'), isTrue);

    final online = SyncService(
      database: reopened,
      reachability: ServerReachability(baseUrl: _baseUrl, client: client),
      baseUrl: _baseUrl,
      client: client,
    );
    final synced = await online.syncPending();
    expect(synced.apiReachable, isTrue);
    expect(synced.synced, 2);
    expect(
      (await reopened.listSales()).every((sale) => sale.syncStatus == 'synced'),
      isTrue,
    );

    final listed = await client.get(
      Uri.parse('$_baseUrl/sales'),
      headers: const {'Accept': 'application/json'},
    );
    expect(listed.statusCode, 200);
    final sales = (jsonDecode(listed.body) as Map)['sales'] as List;
    final ours = sales.where((sale) {
      final uuid = (sale as Map)['sale_uuid'];
      return uuid == first.saleUuid || uuid == second.saleUuid;
    }).toList();
    expect(ours, hasLength(2));
    expect(
      ours.firstWhere(
        (sale) => (sale as Map)['sale_uuid'] == first.saleUuid,
      )['total_amount'],
      '200.00',
    );
    expect(
      ours.firstWhere(
        (sale) => (sale as Map)['sale_uuid'] == second.saleUuid,
      )['total_amount'],
      '400.00',
    );

    await reopened.markSyncResult(
      saleUuid: first.saleUuid,
      syncStatus: 'pending',
      lastSyncError: null,
      retryCount: 0,
      lastSyncAttemptAt: null,
      permanentFailure: false,
    );
    final duplicate = await online.syncPending(force: true);
    expect(duplicate.synced, 1);
    final afterDuplicate = await client.get(Uri.parse('$_baseUrl/sales'));
    final afterBody = jsonDecode(afterDuplicate.body) as Map;
    final copies = (afterBody['sales'] as List)
        .where((sale) => (sale as Map)['sale_uuid'] == first.saleUuid)
        .length;
    expect(copies, 1);

    final conflict = Map<String, Object?>.from(first.toApiJson());
    conflict['quantity'] = 9;
    conflict['total_amount'] = '900.00';
    final conflictResponse = await client.post(
      Uri.parse('$_baseUrl/sales/sync'),
      headers: const {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
      },
      body: jsonEncode(conflict),
    );
    expect(conflictResponse.statusCode, 409);
    final conflictBody = jsonDecode(conflictResponse.body) as Map;
    expect(conflictBody['sync_status'], 'conflict');

    final badTotal = Map<String, Object?>.from(second.toApiJson());
    badTotal['sale_uuid'] = '11111111-1111-4111-8111-111111111111';
    badTotal['quantity'] = 2;
    badTotal['total_amount'] = '999.00';
    final badResponse = await client.post(
      Uri.parse('$_baseUrl/sales/sync'),
      headers: const {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
      },
      body: jsonEncode(badTotal),
    );
    expect(badResponse.statusCode, 422);
    final badBody = jsonDecode(badResponse.body) as Map;
    expect(badBody['total_amount'], '200.00');

    client.close();
    await reopened.close();
    await directory.delete(recursive: true);
  });
}
