import 'package:flutter_test/flutter_test.dart';
import 'package:offline_billing_demo/config/api_config.dart';
import 'package:offline_billing_demo/data/demo_product.dart';

void main() {
  test('demo product total uses integer paise', () {
    expect(DemoProduct.id, 'DEMO-PRODUCT-001');
    expect(DemoProduct.name, 'Demo Rice Bag');
    expect(DemoProduct.unitPrice, '100.00');
    expect(DemoProduct.initialStock, 100);
    expect(DemoProduct.totalAmount(1), '100.00');
    expect(DemoProduct.totalAmount(2), '200.00');
    expect(DemoProduct.totalAmount(100), '10000.00');
    expect(DemoProduct.formatRupees('100.00'), '₹100.00');
    expect(() => DemoProduct.totalAmount(0), throwsArgumentError);
  });

  test('api base url depends on the platform when it is not configured', () {
    expect(
      ApiConfig.resolve(configured: '', android: false),
      'http://127.0.0.1:8000/api',
    );
    expect(
      ApiConfig.resolve(configured: '  ', android: true),
      'http://10.0.2.2:8000/api',
    );
    expect(
      ApiConfig.resolve(
        configured: 'http://192.168.1.20:8000/api/',
        android: true,
      ),
      'http://192.168.1.20:8000/api',
    );
  });
}
