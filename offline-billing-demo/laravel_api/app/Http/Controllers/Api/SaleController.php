<?php

declare(strict_types=1);

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Http\Requests\SaleSyncRules;
use App\Models\Sale;
use App\Services\SaleSyncService;
use App\Support\Money;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Validator;

class SaleController extends Controller
{
    public function __construct(private readonly SaleSyncService $sales) {}

    public function health(): JsonResponse
    {
        return response()->json([
            'success' => true,
            'status' => 'ok',
        ]);
    }

    public function index(): JsonResponse
    {
        $sales = Sale::query()
            ->orderByDesc('sold_at')
            ->orderByDesc('id')
            ->get()
            ->map(function (Sale $sale): array {
                return [
                    'sale_uuid' => $sale->sale_uuid,
                    'product_id' => $sale->product_id,
                    'product_name' => $sale->product_name,
                    'unit_price' => Money::normalize((string) $sale->unit_price),
                    'quantity' => $sale->quantity,
                    'total_amount' => Money::normalize((string) $sale->total_amount),
                    'created_at' => $sale->sold_at->utc()->toIso8601String(),
                    'synced_at' => $sale->created_at?->utc()->toIso8601String(),
                ];
            })
            ->values();

        return response()->json([
            'success' => true,
            'sales' => $sales,
        ]);
    }

    public function sync(Request $request): JsonResponse
    {
        $validator = Validator::make($request->all(), SaleSyncRules::rules());

        if ($validator->fails()) {
            return response()->json([
                'success' => false,
                'sale_uuid' => $request->input('sale_uuid'),
                'sync_status' => 'rejected',
                'message' => $validator->errors()->first(),
                'errors' => $validator->errors(),
            ], 422);
        }

        $result = $this->sales->sync($validator->validated());

        return response()->json($result, $this->statusFor($result));
    }

    public function syncBatch(Request $request): JsonResponse
    {
        $envelope = Validator::make($request->all(), [
            'sales' => ['required', 'array', 'min:1', 'max:50'],
        ]);

        if ($envelope->fails()) {
            return response()->json([
                'success' => false,
                'sync_status' => 'rejected',
                'message' => $envelope->errors()->first(),
                'results' => [],
            ], 422);
        }

        $results = [];

        foreach ($request->input('sales', []) as $sale) {
            if (! is_array($sale)) {
                $results[] = [
                    'success' => false,
                    'sale_uuid' => null,
                    'sync_status' => 'rejected',
                    'message' => 'Each sale must be a JSON object.',
                ];

                continue;
            }

            $validator = Validator::make($sale, SaleSyncRules::rules());

            if ($validator->fails()) {
                $results[] = [
                    'success' => false,
                    'sale_uuid' => $sale['sale_uuid'] ?? null,
                    'sync_status' => 'rejected',
                    'message' => $validator->errors()->first(),
                    'errors' => $validator->errors(),
                ];

                continue;
            }

            $results[] = $this->sales->sync($validator->validated());
        }

        return response()->json([
            'success' => true,
            'results' => $results,
        ]);
    }

    /**
     * @param  array<string, mixed>  $result
     */
    private function statusFor(array $result): int
    {
        return match ($result['sync_status'] ?? null) {
            'synced' => 201,
            'already_synced' => 200,
            'conflict' => 409,
            'rejected' => 422,
            default => 500,
        };
    }
}
