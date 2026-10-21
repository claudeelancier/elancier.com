import 'dart:io';

import 'package:flutter_test/flutter_test.dart';
import 'package:http/http.dart' as http;
import 'package:offline_billing_demo/database/sales_database.dart';
import 'package:offline_billing_demo/database/sqlite_setup.dart';
import 'package:offline_billing_demo/services/billing_service.dart';
import 'package:offline_billing_demo/services/server_reachability.dart';
import 'package:offline_billing_demo/services/sync_service.dart';

import 'support/contract_api_server.dart';

void main() {
  setUpAll(configureSqlite);

  test('an unreachable API leaves the local bill pending', () async {
    final directory = await Directory.systemTemp.createTemp('sync-offline');
    final database = await SalesDatabase.open(
      filePath: '${directory.path}/sales.db',
    );
    final client = http.Client();
    const baseUrl = 'http://127.0.0.1:9/api';
    final sync = SyncService(
      database: database,
      reachability: ServerReachability(baseUrl: baseUrl, client: client),
      baseUrl: baseUrl,
      client: client,
    );
    final saved = await BillingService(database: database)
        .generateBill(quantity: 2);

    final report = await sync.syncPending();

    expect(report.apiReachable, isFalse);
    expect(report.synced, 0);
    final rows = await database.listSales();
    expect(rows.single.saleUuid, saved.saleUuid);
    expect(rows.single.syncStatus, 'pending');
    expect(rows.single.quantity, 2);
    client.close();
    await database.close();
    await directory.delete(recursive: true);
  });

  test('a bill is marked synced only after the API confirms it', () async {
    final server = ContractApiServer();
    final baseUrl = await server.start();
    final directory = await Directory.systemTemp.createTemp('sync-online');
    final database = await SalesDatabase.open(
      filePath: '${directory.path}/sales.db',
    );
    final client = http.Client();
    final sync = _sync(database, client, baseUrl);
    final billing = BillingService(database: database);

    final first = await billing.generateBill(quantity: 2);
    final second = await billing.generateBill(quantity: 3);
    final report = await sync.syncPending();

    expect(report.apiReachable, isTrue);
    expect(report.synced, 2);
    expect(report.failed, 0);
    final rows = await database.listSales();
    expect(rows.every((sale) => sale.syncStatus == 'synced'), isTrue);
    expect(server.sales, hasLength(2));
    expect(server.sales[first.saleUuid]!['total_amount'], '200.00');
    expect(server.sales[second.saleUuid]!['total_amount'], '300.00');

    final again = await sync.syncPending();
    expect(again.synced, 0);
    expect(server.sales, hasLength(2));

    client.close();
    await database.close();
    await server.close();
    await directory.delete(recursive: true);
  });

  test(
    'an idempotent retry and a conflict do not create another server bill',
    () async {
      final server = ContractApiServer();
      final baseUrl = await server.start();
      final directory = await Directory.systemTemp.createTemp('sync-duplicate');
      final database = await SalesDatabase.open(
        filePath: '${directory.path}/sales.db',
      );
      final client = http.Client();
      final sync = _sync(database, client, baseUrl);
      final saved = await BillingService(database: database)
          .generateBill(quantity: 1);

      await sync.syncPending();
      await database.markSyncResult(
        saleUuid: saved.saleUuid,
        syncStatus: 'pending',
        lastSyncError: null,
        retryCount: 0,
        lastSyncAttemptAt: DateTime.utc(2026, 10, 21),
        permanentFailure: false,
      );
      final retry = await sync.syncPending(force: true);
      expect(retry.synced, 1);
      expect(server.sales, hasLength(1));
      expect((await database.listSales()).single.syncStatus, 'synced');

      server.sales[saved.saleUuid]!['quantity'] = 9;
      server.sales[saved.saleUuid]!['total_amount'] = '900.00';
      await database.markSyncResult(
        saleUuid: saved.saleUuid,
        syncStatus: 'pending',
        lastSyncError: null,
        retryCount: 0,
        lastSyncAttemptAt: DateTime.utc(2026, 10, 21),
        permanentFailure: false,
      );
      final conflict = await sync.syncPending(force: true);
      expect(conflict.failed, 1);
      final afterConflict = (await database.listSales()).single;
      expect(afterConflict.syncStatus, 'failed');
      expect(afterConflict.permanentFailure, isTrue);
      expect(afterConflict.quantity, 1);
      expect(server.sales, hasLength(1));
      expect(server.sales[saved.saleUuid]!['quantity'], 9);

      final noRetry = await sync.syncPending(force: true);
      expect(noRetry.synced, 0);
      expect(noRetry.failed, 0);

      client.close();
      await database.close();
      await server.close();
      await directory.delete(recursive: true);
    },
  );

  test('one rejected batch item does not mark the other bill synced', () async {
    final server = ContractApiServer();
    final baseUrl = await server.start();
    final directory = await Directory.systemTemp.createTemp('sync-batch');
    final database = await SalesDatabase.open(
      filePath: '${directory.path}/sales.db',
    );
    final client = http.Client();
    final sync = _sync(database, client, baseUrl);
    final billing = BillingService(database: database);
    final good = await billing.generateBill(quantity: 1);
    final bad = await billing.generateBill(quantity: 2);
    server.rejectUuids.add(bad.saleUuid);

    final report = await sync.syncPending();
    expect(report.synced, 1);
    expect(report.failed, 1);
    final rows = await database.listSales();
    expect(
      rows.firstWhere((sale) => sale.saleUuid == good.saleUuid).syncStatus,
      'synced',
    );
    final failed = rows.firstWhere((sale) => sale.saleUuid == bad.saleUuid);
    expect(failed.syncStatus, 'failed');
    expect(failed.permanentFailure, isTrue);
    expect(server.sales.containsKey(good.saleUuid), isTrue);
    expect(server.sales.containsKey(bad.saleUuid), isFalse);

    client.close();
    await database.close();
    await server.close();
    await directory.delete(recursive: true);
  });

  test('failed requests wait for backoff and then retry', () async {
    final server = ContractApiServer()..failuresRemaining = 1;
    final baseUrl = await server.start();
    final directory = await Directory.systemTemp.createTemp('sync-backoff');
    final database = await SalesDatabase.open(
      filePath: '${directory.path}/sales.db',
    );
    final client = http.Client();
    var clock = DateTime.utc(2026, 10, 21, 12);
    final sync = SyncService(
      database: database,
      reachability: ServerReachability(baseUrl: baseUrl, client: client),
      baseUrl: baseUrl,
      client: client,
      now: () => clock,
    );
    await BillingService(database: database).generateBill(quantity: 1);

    final first = await sync.syncPending();
    expect(first.apiReachable, isFalse);
    expect((await database.listSales()).single.syncStatus, 'pending');

    server.failuresRemaining = 0;
    server.delay = const Duration(milliseconds: 200);
    final started = sync.syncPending();
    final busy = await sync.syncPending();
    expect(busy.busy, isTrue);
    final finished = await started;
    expect(finished.synced, 1);
    expect((await database.listSales()).single.syncStatus, 'synced');

    client.close();
    await database.close();
    await server.close();
    await directory.delete(recursive: true);
  });

  test('a server error is retried only after the backoff window', () async {
    final server = ContractApiServer();
    final baseUrl = await server.start();
    final directory = await Directory.systemTemp.createTemp('sync-retry');
    final database = await SalesDatabase.open(
      filePath: '${directory.path}/sales.db',
    );
    final client = http.Client();
    var clock = DateTime.utc(2026, 10, 21, 12);
    final reachability = ServerReachability(baseUrl: baseUrl, client: client);
    final sync = SyncService(
      database: database,
      reachability: reachability,
      baseUrl: baseUrl,
      client: client,
      now: () => clock,
    );
    final saved = await BillingService(database: database)
        .generateBill(quantity: 1);
    await database.markSyncResult(
      saleUuid: saved.saleUuid,
      syncStatus: 'failed',
      lastSyncError: 'temporary',
      retryCount: 1,
      lastSyncAttemptAt: clock,
      permanentFailure: false,
    );

    final tooSoon = await sync.syncPending();
    expect(tooSoon.synced, 0);
    expect(server.sales, isEmpty);

    clock = clock.add(const Duration(seconds: 2));
    final later = await sync.syncPending();
    expect(later.synced, 1);
    expect(server.sales, hasLength(1));

    client.close();
    await database.close();
    await server.close();
    await directory.delete(recursive: true);
  });
}

SyncService _sync(SalesDatabase database, http.Client client, String baseUrl) {
  return SyncService(
    database: database,
    reachability: ServerReachability(baseUrl: baseUrl, client: client),
    baseUrl: baseUrl,
    client: client,
  );
}
