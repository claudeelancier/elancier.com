import 'dart:io';

import 'package:sqflite_common_ffi/sqflite_ffi.dart';

/// Desktop SQLite needs the FFI implementation. Android uses the sqflite plugin.
Future<void> configureSqlite() async {
  if (Platform.isWindows || Platform.isLinux || Platform.isMacOS) {
    sqfliteFfiInit();
    // Stay on the calling isolate. The background-isolate factory can stall
    // Flutter widget tests, and this demo's writes are a single small row.
    databaseFactory = databaseFactoryFfiNoIsolate;
  }
}
