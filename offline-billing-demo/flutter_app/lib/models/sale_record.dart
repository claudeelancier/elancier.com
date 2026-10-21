import 'dart:math' as math;

class SaleRecord {
  const SaleRecord({
    this.localId,
    required this.saleUuid,
    required this.productId,
    required this.productName,
    required this.unitPrice,
    required this.quantity,
    required this.totalAmount,
    required this.createdAt,
    required this.syncStatus,
    required this.lastSyncError,
    required this.retryCount,
    required this.lastSyncAttemptAt,
    required this.permanentFailure,
  });

  final int? localId;
  final String saleUuid;
  final String productId;
  final String productName;
  final String unitPrice;
  final int quantity;
  final String totalAmount;
  final DateTime createdAt;
  final String syncStatus;
  final String? lastSyncError;
  final int retryCount;
  final DateTime? lastSyncAttemptAt;
  final bool permanentFailure;

  bool get isSynced => syncStatus == 'synced';

  bool isDue(DateTime now, {required bool force}) {
    if (syncStatus == 'synced' || syncStatus == 'syncing') {
      return false;
    }
    if (permanentFailure) {
      return false;
    }
    if (syncStatus != 'pending' && syncStatus != 'failed') {
      return false;
    }
    if (force || lastSyncAttemptAt == null) {
      return true;
    }
    final shift = retryCount.clamp(0, 6);
    final waitSeconds = math.min(60, 1 << shift);
    return !now.isBefore(
      lastSyncAttemptAt!.add(Duration(seconds: waitSeconds)),
    );
  }

  Map<String, Object?> toRow() {
    return {
      if (localId != null) 'local_id': localId,
      'sale_uuid': saleUuid,
      'product_id': productId,
      'product_name': productName,
      'unit_price': unitPrice,
      'quantity': quantity,
      'total_amount': totalAmount,
      'created_at': createdAt.toUtc().toIso8601String(),
      'sync_status': syncStatus,
      'last_sync_error': lastSyncError,
      'retry_count': retryCount,
      'last_sync_attempt_at': lastSyncAttemptAt?.toUtc().toIso8601String(),
      'permanent_failure': permanentFailure ? 1 : 0,
    };
  }

  Map<String, Object?> toApiJson() {
    return {
      'sale_uuid': saleUuid,
      'product_id': productId,
      'product_name': productName,
      'unit_price': unitPrice,
      'quantity': quantity,
      'total_amount': totalAmount,
      'created_at': createdAt.toUtc().toIso8601String(),
    };
  }

  factory SaleRecord.fromRow(Map<String, Object?> row) {
    return SaleRecord(
      localId: row['local_id'] as int?,
      saleUuid: row['sale_uuid']! as String,
      productId: row['product_id']! as String,
      productName: row['product_name']! as String,
      unitPrice: row['unit_price']! as String,
      quantity: row['quantity']! as int,
      totalAmount: row['total_amount']! as String,
      createdAt: DateTime.parse(row['created_at']! as String).toUtc(),
      syncStatus: row['sync_status']! as String,
      lastSyncError: row['last_sync_error'] as String?,
      retryCount: row['retry_count']! as int,
      lastSyncAttemptAt: row['last_sync_attempt_at'] == null
          ? null
          : DateTime.parse(row['last_sync_attempt_at']! as String).toUtc(),
      permanentFailure: (row['permanent_failure'] as int? ?? 0) == 1,
    );
  }
}
