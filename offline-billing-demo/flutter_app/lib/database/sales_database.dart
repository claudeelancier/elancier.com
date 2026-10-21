import 'dart:io';

import 'package:path_provider/path_provider.dart';
import 'package:sqflite/sqflite.dart';

import '../models/sale_record.dart';

class SalesDatabase {
  SalesDatabase._(this._database);

  final Database _database;

  static Future<SalesDatabase> open({String? filePath}) async {
    final path = filePath ?? await _defaultPath();
    final database = await openDatabase(
      path,
      version: 1,
      onConfigure: (db) async {
        await db.execute('PRAGMA foreign_keys = ON');
      },
      onCreate: (db, version) async {
        await db.execute('''
          CREATE TABLE sales (
            local_id INTEGER PRIMARY KEY AUTOINCREMENT,
            sale_uuid TEXT NOT NULL UNIQUE,
            product_id TEXT NOT NULL,
            product_name TEXT NOT NULL,
            unit_price TEXT NOT NULL,
            quantity INTEGER NOT NULL,
            total_amount TEXT NOT NULL,
            created_at TEXT NOT NULL,
            sync_status TEXT NOT NULL,
            last_sync_error TEXT,
            retry_count INTEGER NOT NULL DEFAULT 0,
            last_sync_attempt_at TEXT,
            permanent_failure INTEGER NOT NULL DEFAULT 0
          )
        ''');
      },
      onOpen: (db) async {
        await db.update(
          'sales',
          {'sync_status': 'pending'},
          where: 'sync_status = ?',
          whereArgs: ['syncing'],
        );
      },
    );
    return SalesDatabase._(database);
  }

  static Future<String> _defaultPath() async {
    final directory = await getApplicationDocumentsDirectory();
    final folder = Directory(
      '${directory.path}${Platform.pathSeparator}offline_billing',
    );
    if (!await folder.exists()) {
      await folder.create(recursive: true);
    }
    return '${folder.path}${Platform.pathSeparator}sales.db';
  }

  Future<SaleRecord> insertSale(SaleRecord sale) {
    return _database.transaction((txn) async {
      final id = await txn.insert(
        'sales',
        sale.toRow(),
        conflictAlgorithm: ConflictAlgorithm.abort,
      );
      final rows = await txn.query(
        'sales',
        where: 'local_id = ?',
        whereArgs: [id],
        limit: 1,
      );
      if (rows.isEmpty) {
        throw StateError('The local bill insert did not persist.');
      }
      return SaleRecord.fromRow(rows.first);
    });
  }

  Future<List<SaleRecord>> listSales() async {
    final rows = await _database.query(
      'sales',
      orderBy: 'created_at DESC, local_id DESC',
    );
    return rows.map(SaleRecord.fromRow).toList();
  }

  Future<void> recoverInterruptedSyncs() {
    return _database.update(
      'sales',
      {'sync_status': 'pending'},
      where: 'sync_status = ?',
      whereArgs: ['syncing'],
    );
  }

  Future<List<SaleRecord>> salesDueForSync(
    DateTime now, {
    required bool force,
  }) async {
    final rows = await _database.query(
      'sales',
      orderBy: 'created_at ASC, local_id ASC',
    );
    return rows
        .map(SaleRecord.fromRow)
        .where((sale) => sale.isDue(now, force: force))
        .toList();
  }

  Future<void> markSyncing(List<String> saleUuids, DateTime attemptAt) {
    return _database.transaction((txn) async {
      for (final saleUuid in saleUuids) {
        await txn.update(
          'sales',
          {
            'sync_status': 'syncing',
            'last_sync_attempt_at': attemptAt.toUtc().toIso8601String(),
          },
          where: 'sale_uuid = ? AND sync_status != ?',
          whereArgs: [saleUuid, 'synced'],
        );
      }
    });
  }

  Future<void> markSyncResult({
    required String saleUuid,
    required String syncStatus,
    required String? lastSyncError,
    required int retryCount,
    required DateTime? lastSyncAttemptAt,
    required bool permanentFailure,
  }) {
    return _database.transaction((txn) async {
      final updated = await txn.update(
        'sales',
        {
          'sync_status': syncStatus,
          'last_sync_error': lastSyncError,
          'retry_count': retryCount,
          'last_sync_attempt_at': lastSyncAttemptAt?.toUtc().toIso8601String(),
          'permanent_failure': permanentFailure ? 1 : 0,
        },
        where: 'sale_uuid = ?',
        whereArgs: [saleUuid],
      );
      if (updated != 1) {
        throw StateError('Could not update local bill $saleUuid.');
      }
    });
  }

  Future<void> close() => _database.close();
}
