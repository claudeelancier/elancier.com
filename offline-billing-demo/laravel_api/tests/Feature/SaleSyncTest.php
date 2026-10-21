<?php

namespace Tests\Feature;

use App\Models\Sale;
use App\Support\DemoProduct;
use App\Support\Money;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Str;
use Tests\TestCase;

class SaleSyncTest extends TestCase
{
    use RefreshDatabase;

    public function test_health_reports_the_api_is_reachable(): void
    {
        $this->getJson('/api/health')
            ->assertOk()
            ->assertJson([
                'success' => true,
                'status' => 'ok',
            ]);
    }

    public function test_sync_saves_a_bill_using_the_server_total(): void
    {
        $payload = $this->payload([
            'quantity' => 3,
            'created_at' => '2020-01-02T03:04:05Z',
        ]);

        $response = $this->postJson('/api/sales/sync', $payload);

        $response->assertCreated()
            ->assertJsonPath('success', true)
            ->assertJsonPath('sale_uuid', $payload['sale_uuid'])
            ->assertJsonPath('sync_status', 'synced')
            ->assertJsonPath('total_amount', '300.00');

        $sale = Sale::query()->where('sale_uuid', $payload['sale_uuid'])->firstOrFail();

        $this->assertSame(DemoProduct::ID, $sale->product_id);
        $this->assertSame(DemoProduct::NAME, $sale->product_name);
        $this->assertSame('100.00', Money::normalize((string) $sale->unit_price));
        $this->assertSame(3, $sale->quantity);
        $this->assertSame('300.00', Money::normalize((string) $sale->total_amount));
        $this->assertSame('2020-01-02 03:04:05', $sale->sold_at->utc()->format('Y-m-d H:i:s'));
        $this->assertTrue($sale->created_at->greaterThan($sale->sold_at));
        $this->assertSame(1, Sale::query()->count());
    }

    public function test_mismatched_total_is_rejected_and_not_stored(): void
    {
        $payload = $this->payload([
            'quantity' => 2,
            'total_amount' => '999.00',
        ]);

        $this->postJson('/api/sales/sync', $payload)
            ->assertStatus(422)
            ->assertJsonPath('success', false)
            ->assertJsonPath('sync_status', 'rejected')
            ->assertJsonPath('total_amount', '200.00');

        $this->assertSame(0, Sale::query()->count());
    }

    public function test_invalid_product_quantity_and_price_are_rejected(): void
    {
        $this->postJson('/api/sales/sync', $this->payload([
            'product_id' => 'OTHER-PRODUCT',
        ]))->assertStatus(422)->assertJsonPath('sync_status', 'rejected');

        $this->postJson('/api/sales/sync', $this->payload([
            'product_name' => 'Other Rice',
        ]))->assertStatus(422)->assertJsonPath('sync_status', 'rejected');

        $this->postJson('/api/sales/sync', $this->payload([
            'unit_price' => '100.01',
        ]))->assertStatus(422)->assertJsonPath('sync_status', 'rejected');

        $this->postJson('/api/sales/sync', $this->payload([
            'quantity' => 0,
            'total_amount' => '0.00',
        ]))->assertStatus(422)->assertJsonPath('sync_status', 'rejected');

        $this->assertSame(0, Sale::query()->count());
    }

    public function test_repeating_the_same_sale_uuid_does_not_create_a_second_row(): void
    {
        $payload = $this->payload(['quantity' => 4]);

        $this->postJson('/api/sales/sync', $payload)->assertCreated();

        $this->postJson('/api/sales/sync', $payload)
            ->assertOk()
            ->assertJsonPath('success', true)
            ->assertJsonPath('sync_status', 'already_synced')
            ->assertJsonPath('total_amount', '400.00');

        $this->postJson('/api/sales/sync', $payload)->assertOk();

        $this->assertSame(1, Sale::query()->where('sale_uuid', $payload['sale_uuid'])->count());
        $this->assertSame(4, Sale::query()->firstOrFail()->quantity);
    }

    public function test_reusing_a_sale_uuid_with_different_data_is_a_conflict(): void
    {
        $uuid = (string) Str::uuid();
        $original = $this->payload([
            'sale_uuid' => $uuid,
            'quantity' => 1,
            'created_at' => '2026-10-21T10:30:00Z',
        ]);

        $this->postJson('/api/sales/sync', $original)->assertCreated();

        $differentQuantity = $this->payload([
            'sale_uuid' => $uuid,
            'quantity' => 2,
            'created_at' => '2026-10-21T10:30:00Z',
        ]);

        $this->postJson('/api/sales/sync', $differentQuantity)
            ->assertStatus(409)
            ->assertJsonPath('success', false)
            ->assertJsonPath('sync_status', 'conflict');

        $differentTime = $this->payload([
            'sale_uuid' => $uuid,
            'quantity' => 1,
            'created_at' => '2026-10-21T11:00:00Z',
        ]);

        $this->postJson('/api/sales/sync', $differentTime)->assertStatus(409);

        $sale = Sale::query()->where('sale_uuid', $uuid)->firstOrFail();
        $this->assertSame(1, Sale::query()->count());
        $this->assertSame(1, $sale->quantity);
        $this->assertSame('100.00', Money::normalize((string) $sale->total_amount));
        $this->assertSame('2026-10-21 10:30:00', $sale->sold_at->utc()->format('Y-m-d H:i:s'));
    }

    public function test_batch_keeps_valid_bills_when_one_bill_is_invalid(): void
    {
        $valid = $this->payload(['quantity' => 1]);
        $invalid = $this->payload([
            'quantity' => 2,
            'total_amount' => '1.00',
        ]);
        $alsoValid = $this->payload(['quantity' => 5]);

        $response = $this->postJson('/api/sales/sync-batch', [
            'sales' => [$valid, $invalid, $alsoValid],
        ]);

        $response->assertOk()->assertJsonPath('success', true);

        $results = $response->json('results');
        $this->assertCount(3, $results);
        $this->assertTrue($results[0]['success']);
        $this->assertSame('synced', $results[0]['sync_status']);
        $this->assertFalse($results[1]['success']);
        $this->assertSame('rejected', $results[1]['sync_status']);
        $this->assertTrue($results[2]['success']);
        $this->assertSame('synced', $results[2]['sync_status']);
        $this->assertSame('500.00', $results[2]['total_amount']);

        $this->assertSame(2, Sale::query()->count());
        $this->assertTrue(Sale::query()->where('sale_uuid', $valid['sale_uuid'])->exists());
        $this->assertFalse(Sale::query()->where('sale_uuid', $invalid['sale_uuid'])->exists());
        $this->assertSame(5, Sale::query()->where('sale_uuid', $alsoValid['sale_uuid'])->firstOrFail()->quantity);
    }

    public function test_sales_index_returns_synchronized_bills(): void
    {
        $payload = $this->payload(['quantity' => 2]);
        $this->postJson('/api/sales/sync', $payload)->assertCreated();

        $this->getJson('/api/sales')
            ->assertOk()
            ->assertJsonPath('success', true)
            ->assertJsonPath('sales.0.sale_uuid', $payload['sale_uuid'])
            ->assertJsonPath('sales.0.product_id', DemoProduct::ID)
            ->assertJsonPath('sales.0.quantity', 2)
            ->assertJsonPath('sales.0.total_amount', '200.00')
            ->assertJsonPath('sales.0.unit_price', '100.00');
    }

    /**
     * @param  array<string, mixed>  $overrides
     * @return array<string, mixed>
     */
    private function payload(array $overrides = []): array
    {
        $quantity = array_key_exists('quantity', $overrides) ? (int) $overrides['quantity'] : 2;
        $total = Money::multiply(DemoProduct::UNIT_PRICE, max($quantity, 0));

        return array_merge([
            'sale_uuid' => (string) Str::uuid(),
            'product_id' => DemoProduct::ID,
            'product_name' => DemoProduct::NAME,
            'unit_price' => DemoProduct::UNIT_PRICE,
            'quantity' => $quantity,
            'total_amount' => $total,
            'created_at' => '2026-10-21T10:30:00Z',
        ], $overrides);
    }
}
