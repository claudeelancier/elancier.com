import 'package:flutter/material.dart';
import 'package:http/http.dart' as http;

import 'config/api_config.dart';
import 'database/sales_database.dart';
import 'database/sqlite_setup.dart';
import 'screens/billing_screen.dart';
import 'services/billing_service.dart';
import 'services/server_reachability.dart';
import 'services/sync_service.dart';

Future<void> main() async {
  WidgetsFlutterBinding.ensureInitialized();
  await configureSqlite();

  final database = await SalesDatabase.open();
  final client = http.Client();
  final baseUrl = ApiConfig.baseUrl;
  final reachability = ServerReachability(baseUrl: baseUrl, client: client);
  final syncService = SyncService(
    database: database,
    reachability: reachability,
    baseUrl: baseUrl,
    client: client,
  );

  runApp(
    OfflineBillingApp(
      database: database,
      billingService: BillingService(database: database),
      syncService: syncService,
      reachability: reachability,
    ),
  );
}

class OfflineBillingApp extends StatelessWidget {
  const OfflineBillingApp({
    super.key,
    required this.database,
    required this.billingService,
    required this.syncService,
    required this.reachability,
  });

  final SalesDatabase database;
  final BillingService billingService;
  final SyncService syncService;
  final ServerReachability reachability;

  @override
  Widget build(BuildContext context) {
    return MaterialApp(
      title: 'Offline Billing Demo',
      debugShowCheckedModeBanner: false,
      theme: ThemeData(
        colorScheme: ColorScheme.fromSeed(seedColor: const Color(0xFF0F6B4C)),
        useMaterial3: true,
      ),
      home: BillingScreen(
        database: database,
        billingService: billingService,
        syncService: syncService,
        reachability: reachability,
        periodicSync: const Duration(seconds: 20),
      ),
    );
  }
}
