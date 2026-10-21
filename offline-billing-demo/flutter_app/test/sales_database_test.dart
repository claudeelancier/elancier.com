import 'dart:io';

import 'package:flutter_test/flutter_test.dart';
import 'package:offline_billing_demo/database/sales_database.dart';
import 'package:offline_billing_demo/database/sqlite_setup.dart';
import 'package:offline_billing_demo/models/sale_record.dart';
import 'package:offline_billing_demo/services/billing_service.dart';
import 'package:sqflite/sqflite.dart';

void main() {
  setUpAll(configureSqlite);

  test('bills survive closing and reopening the database', () async {
    final directory = await Directory.systemTemp.createTemp('billing-db');
    final path = '${directory.path}/sales.db';
    final createdAt = DateTime.utc(2026, 10, 21, 10, 30);

    final first = await SalesDatabase.open(filePath: path);
    final billing = BillingService(database: first);
    final saved = await billing.generateBill(quantity: 2, createdAt: createdAt);

    expect(saved.localId, isNotNull);
    expect(saved.syncStatus, 'pending');
    expect(saved.totalAmount, '200.00');
    expect(saved.productId, 'DEMO-PRODUCT-001');
    await first.close();

    final reopened = await SalesDatabase.open(filePath: path);
    final rows = await reopened.listSales();
    expect(rows, hasLength(1));
    expect(rows.single.saleUuid, saved.saleUuid);
    expect(rows.single.quantity, 2);
    expect(rows.single.totalAmount, '200.00');
    expect(rows.single.syncStatus, 'pending');
    expect(rows.single.createdAt, createdAt);
    await reopened.close();
    await directory.delete(recursive: true);
  });

  test('a failed local write does not report a saved bill', () async {
    final directory = await Directory.systemTemp.createTemp('billing-db-fail');
    final database = await SalesDatabase.open(
      filePath: '${directory.path}/sales.db',
    );
    final billing = BillingService(database: database);
    final saved = await billing.generateBill(quantity: 1);

    final duplicate = SaleRecord(
      saleUuid: saved.saleUuid,
      productId: saved.productId,
      productName: saved.productName,
      unitPrice: saved.unitPrice,
      quantity: 3,
      totalAmount: '300.00',
      createdAt: saved.createdAt,
      syncStatus: 'pending',
      lastSyncError: null,
      retryCount: 0,
      lastSyncAttemptAt: null,
      permanentFailure: false,
    );

    await expectLater(
      database.insertSale(duplicate),
      throwsA(isA<DatabaseException>()),
    );
    final rows = await database.listSales();
    expect(rows, hasLength(1));
    expect(rows.single.quantity, 1);
    await database.close();
    await directory.delete(recursive: true);
  });

  test('an interrupted sync is pending again after restart', () async {
    final directory = await Directory.systemTemp.createTemp('billing-db-sync');
    final path = '${directory.path}/sales.db';
    final database = await SalesDatabase.open(filePath: path);
    final saved = await BillingService(database: database)
        .generateBill(quantity: 1);
    await database.markSyncing([saved.saleUuid], DateTime.utc(2026, 10, 21));
    await database.close();

    final reopened = await SalesDatabase.open(filePath: path);
    final rows = await reopened.listSales();
    expect(rows.single.syncStatus, 'pending');
    await reopened.close();
    await directory.delete(recursive: true);
  });
}
