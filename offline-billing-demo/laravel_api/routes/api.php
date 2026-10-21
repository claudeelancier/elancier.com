<?php

use App\Http\Controllers\Api\SaleController;
use Illuminate\Support\Facades\Route;

Route::get('/health', [SaleController::class, 'health']);
Route::get('/sales', [SaleController::class, 'index']);
Route::post('/sales/sync', [SaleController::class, 'sync']);
Route::post('/sales/sync-batch', [SaleController::class, 'syncBatch']);
