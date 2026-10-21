<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('sales', function (Blueprint $table) {
            $table->id();
            $table->uuid('sale_uuid')->unique();
            $table->string('product_id');
            $table->string('product_name');
            $table->decimal('unit_price', 10, 2);
            $table->unsignedInteger('quantity');
            $table->decimal('total_amount', 12, 2);
            // Sale time recorded by the billing device. This is not the sync time.
            $table->timestampTz('sold_at');
            // created_at is when PostgreSQL accepted the synchronized sale.
            $table->timestampsTz();

            $table->index('sold_at');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('sales');
    }
};
