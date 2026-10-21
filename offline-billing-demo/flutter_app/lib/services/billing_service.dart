import 'package:uuid/uuid.dart';

import '../data/demo_product.dart';
import '../database/sales_database.dart';
import '../models/sale_record.dart';

class BillingService {
  BillingService({required this.database, Uuid? uuid})
    : uuid = uuid ?? const Uuid();

  final SalesDatabase database;
  final Uuid uuid;

  /// Saves one bill in SQLite and returns the stored row.
  /// Throws if the local write fails. The bill is pending until the API confirms it.
  Future<SaleRecord> generateBill({
    required int quantity,
    DateTime? createdAt,
  }) async {
    if (quantity < 1) {
      throw ArgumentError.value(
        quantity,
        'quantity',
        'Quantity must be at least 1.',
      );
    }

    final sale = SaleRecord(
      saleUuid: uuid.v4(),
      productId: DemoProduct.id,
      productName: DemoProduct.name,
      unitPrice: DemoProduct.unitPrice,
      quantity: quantity,
      totalAmount: DemoProduct.totalAmount(quantity),
      createdAt: (createdAt ?? DateTime.now()).toUtc(),
      syncStatus: 'pending',
      lastSyncError: null,
      retryCount: 0,
      lastSyncAttemptAt: null,
      permanentFailure: false,
    );

    return database.insertSale(sale);
  }
}
