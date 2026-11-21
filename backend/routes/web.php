<?php

use App\Http\Controllers\PublicInvitationController;
use Illuminate\Support\Facades\Route;

Route::get('/', fn () => response()->json([
    'name' => 'Éclat API',
    'status' => 'ok',
    'docs' => '/api',
]));

Route::get('/i/{token}', [PublicInvitationController::class, 'show'])->name('invitation.show');
