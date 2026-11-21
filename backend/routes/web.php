<?php

use App\Http\Controllers\PublicInvitationController;
use App\Http\Controllers\RootController;
use Illuminate\Support\Facades\Route;

Route::get('/', RootController::class);

Route::get('/i/{token}', [PublicInvitationController::class, 'show'])->name('invitation.show');
