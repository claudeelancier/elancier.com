import 'dart:io';

import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:offline_billing_demo/database/sales_database.dart';
import 'package:offline_billing_demo/database/sqlite_setup.dart';
import 'package:offline_billing_demo/screens/billing_screen.dart';
import 'package:offline_billing_demo/services/billing_service.dart';
import 'package:offline_billing_demo/services/server_reachability.dart';
import 'package:offline_billing_demo/services/sync_service.dart';

class _OfflineReachability extends ServerReachability {
  _OfflineReachability() : super(baseUrl: 'http://127.0.0.1:9/api');

  @override
  Future<bool> isApiReachable() async => false;
}

void main() {
  testWidgets(
    'generate bill stores a local pending bill while the API is down',
    (tester) async {
      await configureSqlite();
      final directory = await tester.runAsync(
        () => Directory.systemTemp.createTemp('billing-ui'),
      );
      final database = await tester.runAsync(
        () => SalesDatabase.open(filePath: '${directory!.path}/sales.db'),
      );
      final reachability = _OfflineReachability();
      final sync = SyncService(
        database: database!,
        reachability: reachability,
        baseUrl: reachability.baseUrl,
      );
      addTearDown(() async {
        await database.close();
        await directory!.delete(recursive: true);
      });

      await tester.pumpWidget(
        MaterialApp(
          home: BillingScreen(
            database: database,
            billingService: BillingService(database: database),
            syncService: sync,
            reachability: reachability,
            watchConnectivity: false,
          ),
        ),
      );
      await tester.runAsync(
        () => Future<void>.delayed(const Duration(milliseconds: 50)),
      );
      await tester.pump();

      expect(find.text('Offline Billing Demo'), findsOneWidget);
      expect(find.text('Demo Rice Bag'), findsOneWidget);
      expect(find.text('Price ₹100.00'), findsOneWidget);
      expect(find.text('Initial stock: 100'), findsOneWidget);
      expect(find.text('Offline — API unreachable'), findsOneWidget);
      expect(find.text('Total ₹100.00'), findsOneWidget);

      await tester.tap(find.byKey(const Key('quantity-minus')));
      await tester.pump();
      expect(find.byKey(const Key('quantity-value')), findsOneWidget);
      expect(
        tester.widget<Text>(find.byKey(const Key('quantity-value'))).data,
        '1',
      );
      expect(find.text('Total ₹100.00'), findsOneWidget);

      await tester.ensureVisible(find.byKey(const Key('quantity-plus')));
      await tester.tap(find.byKey(const Key('quantity-plus')));
      await tester.pump();
      expect(
        tester.widget<Text>(find.byKey(const Key('quantity-value'))).data,
        '2',
      );
      expect(find.text('Total ₹200.00'), findsOneWidget);

      await tester.ensureVisible(find.byKey(const Key('generate-bill')));
      await tester.tap(find.byKey(const Key('generate-bill')));
      await tester.pump();
      await tester.runAsync(
        () => Future<void>.delayed(const Duration(milliseconds: 100)),
      );
      await tester.pump();

      expect(find.text('Bill saved locally — waiting to sync'), findsOneWidget);
      expect(find.text('Pending sync: 1'), findsOneWidget);
      expect(find.text('Pending Sync'), findsOneWidget);
      expect(find.textContaining('Qty 2'), findsOneWidget);
      expect(find.text('Pending'), findsWidgets);

      final saved = await tester.runAsync(() => database.listSales());
      expect(saved, hasLength(1));
      expect(saved!.single.syncStatus, 'pending');
      expect(saved.single.totalAmount, '200.00');
      expect(saved.single.quantity, 2);
    },
  );
}
