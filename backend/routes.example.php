<?php
/**
 * Luckyverse Laravel route map (Sanctum).
 * Implement these in routes/api.php. The React client already calls the same paths.
 *
 * Middleware:
 * - auth:sanctum for player routes
 * - auth:sanctum + role:admin for admin routes
 * - throttle:spins for POST /spin (e.g. 1 per 6 seconds)
 */

use Illuminate\Support\Facades\Route;

Route::post('/register', [AuthController::class, 'register']);
Route::post('/login', [AuthController::class, 'login']);
Route::post('/verify-otp', [AuthController::class, 'verifyOtp']);

Route::middleware('auth:sanctum')->group(function () {
    Route::post('/logout', [AuthController::class, 'logout']);
    Route::get('/profile', [ProfileController::class, 'show']);
    Route::get('/dashboard', [DashboardController::class, 'show']);
    Route::post('/spin', [SpinController::class, 'store'])->middleware('throttle:spins');
    Route::get('/spins/history', [SpinController::class, 'history']);
    Route::get('/rewards', [RewardController::class, 'index']);
    Route::post('/rewards/{id}/claim', [RewardController::class, 'claim']);
});

Route::get('/winners', [WinnerController::class, 'index']);
Route::get('/lucky-draws', [LuckyDrawController::class, 'index']);
Route::get('/lucky-draws/{id}', [LuckyDrawController::class, 'show']);

Route::prefix('admin')->middleware(['auth:sanctum', 'admin'])->group(function () {
    Route::get('/dashboard', [AdminDashboardController::class, 'show']);
    Route::get('/participants', [ParticipantController::class, 'index']);
    Route::post('/prizes', [PrizeController::class, 'store']);
    Route::put('/prizes/{id}', [PrizeController::class, 'update']);
    Route::post('/lucky-draws', [AdminLuckyDrawController::class, 'store']);
    Route::post('/lucky-draws/{id}/start', [AdminLuckyDrawController::class, 'start']);
    Route::get('/winners', [AdminWinnerController::class, 'index']);
    Route::put('/rewards/{id}', [AdminRewardController::class, 'update']);
});
