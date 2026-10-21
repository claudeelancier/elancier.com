/// The only product in this demo. It is intentionally hardcoded.
class DemoProduct {
  const DemoProduct._();

  static const id = 'DEMO-PRODUCT-001';
  static const name = 'Demo Rice Bag';
  static const unitPrice = '100.00';
  static const initialStock = 100;

  /// ₹100.00 is 10000 paise. Integer paise avoids floating-point money.
  static const unitPricePaise = 10000;

  static String totalAmount(int quantity) {
    if (quantity < 1) {
      throw ArgumentError.value(
        quantity,
        'quantity',
        'Quantity must be at least 1.',
      );
    }
    final paise = quantity * unitPricePaise;
    final rupees = paise ~/ 100;
    final fraction = (paise % 100).toString().padLeft(2, '0');
    return '$rupees.$fraction';
  }

  static String formatRupees(String amount) => '₹$amount';
}
