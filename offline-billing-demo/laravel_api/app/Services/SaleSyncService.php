<?php

declare(strict_types=1);

namespace App\Services;

use App\Models\Sale;
use App\Support\DemoProduct;
use App\Support\Money;
use Carbon\Carbon;
use Illuminate\Database\UniqueConstraintViolationException;
use Illuminate\Support\Facades\DB;

final class SaleSyncService
{
    /**
     * Persist one offline bill. The server total is authoritative.
     * An identical retry is successful and does not insert a second row.
     * The same UUID with different sale data is a conflict and is not overwritten.
     *
     * @param  array<string, mixed>  $data
     * @return array<string, mixed>
     */
    public function sync(array $data): array
    {
        $saleUuid = (string) $data['sale_uuid'];

        if (
            $data['product_id'] !== DemoProduct::ID
            || $data['product_name'] !== DemoProduct::NAME
            || ! Money::equals((string) $data['unit_price'], DemoProduct::UNIT_PRICE)
        ) {
            return $this->rejected($saleUuid, 'The bill does not match the demo product.');
        }

        $quantity = (int) $data['quantity'];
        $serverTotal = Money::multiply(DemoProduct::UNIT_PRICE, $quantity);

        if (! Money::equals((string) $data['total_amount'], $serverTotal)) {
            return $this->rejected(
                $saleUuid,
                'Total amount does not match the server calculation of '.$serverTotal.'.',
                $serverTotal,
            );
        }

        $soldAt = Carbon::parse((string) $data['created_at'])->utc();

        try {
            return DB::transaction(function () use ($data, $saleUuid, $quantity, $serverTotal, $soldAt): array {
                $existing = Sale::query()
                    ->where('sale_uuid', $saleUuid)
                    ->lockForUpdate()
                    ->first();

                if ($existing instanceof Sale) {
                    return $this->existingResult($existing, $quantity, $serverTotal, $soldAt);
                }

                Sale::query()->create([
                    'sale_uuid' => $saleUuid,
                    'product_id' => DemoProduct::ID,
                    'product_name' => DemoProduct::NAME,
                    'unit_price' => DemoProduct::UNIT_PRICE,
                    'quantity' => $quantity,
                    'total_amount' => $serverTotal,
                    'sold_at' => $soldAt,
                ]);

                return [
                    'success' => true,
                    'sale_uuid' => $saleUuid,
                    'sync_status' => 'synced',
                    'total_amount' => $serverTotal,
                ];
            });
        } catch (UniqueConstraintViolationException) {
            $existing = Sale::query()->where('sale_uuid', $saleUuid)->first();

            if ($existing instanceof Sale) {
                return $this->existingResult($existing, $quantity, $serverTotal, $soldAt);
            }

            return [
                'success' => false,
                'sale_uuid' => $saleUuid,
                'sync_status' => 'conflict',
                'message' => 'This sale_uuid already exists and was not overwritten.',
            ];
        }
    }

    /**
     * @return array<string, mixed>
     */
    private function existingResult(Sale $existing, int $quantity, string $serverTotal, Carbon $soldAt): array
    {
        if ($this->matches($existing, $quantity, $serverTotal, $soldAt)) {
            return [
                'success' => true,
                'sale_uuid' => $existing->sale_uuid,
                'sync_status' => 'already_synced',
                'total_amount' => Money::normalize((string) $existing->total_amount),
            ];
        }

        return [
            'success' => false,
            'sale_uuid' => $existing->sale_uuid,
            'sync_status' => 'conflict',
            'message' => 'This sale_uuid already exists with different sale data and was not overwritten.',
        ];
    }

    private function matches(Sale $existing, int $quantity, string $serverTotal, Carbon $soldAt): bool
    {
        return $existing->product_id === DemoProduct::ID
            && $existing->product_name === DemoProduct::NAME
            && Money::equals((string) $existing->unit_price, DemoProduct::UNIT_PRICE)
            && (int) $existing->quantity === $quantity
            && Money::equals((string) $existing->total_amount, $serverTotal)
            && $existing->sold_at->utc()->format('Y-m-d H:i:s') === $soldAt->format('Y-m-d H:i:s');
    }

    /**
     * @return array<string, mixed>
     */
    /**
     * @return array<string, mixed>
     */
    private function rejected(string $saleUuid, string $message, ?string $serverTotal = null): array
    {
        $result = [
            'success' => false,
            'sale_uuid' => $saleUuid,
            'sync_status' => 'rejected',
            'message' => $message,
        ];

        if ($serverTotal !== null) {
            $result['total_amount'] = $serverTotal;
        }

        return $result;
    }
}
