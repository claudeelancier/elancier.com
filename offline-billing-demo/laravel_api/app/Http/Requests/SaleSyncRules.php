<?php

declare(strict_types=1);

namespace App\Http\Requests;

use App\Support\DemoProduct;

final class SaleSyncRules
{
    /**
     * @return array<string, mixed>
     */
    public static function rules(): array
    {
        return [
            'sale_uuid' => ['required', 'uuid'],
            'product_id' => ['required', 'string', 'in:'.DemoProduct::ID],
            'product_name' => ['required', 'string', 'in:'.DemoProduct::NAME],
            'unit_price' => ['required', 'string', 'in:'.DemoProduct::UNIT_PRICE],
            'quantity' => ['required', 'integer', 'min:1', 'max:100000'],
            'total_amount' => ['required', 'regex:/^\d+\.\d{2}$/'],
            'created_at' => ['required', 'date'],
        ];
    }
}
