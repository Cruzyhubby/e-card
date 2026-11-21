<?php

use App\Http\Controllers\Api\Admin\AuditLogController;
use App\Http\Controllers\Api\Admin\OrganizerController;
use App\Http\Controllers\Api\Admin\PlatformController;
use App\Http\Controllers\Api\Admin\SettingsController;
use App\Http\Controllers\Api\AuthController;
use App\Http\Controllers\Api\CallingController;
use App\Http\Controllers\Api\CheckInController;
use App\Http\Controllers\Api\DashboardController;
use App\Http\Controllers\Api\DesignApprovalController;
use App\Http\Controllers\Api\DesignController;
use App\Http\Controllers\Api\EventController;
use App\Http\Controllers\Api\EventTableController;
use App\Http\Controllers\Api\EventUsherController;
use App\Http\Controllers\Api\GuestController;
use App\Http\Controllers\Api\HealthController;
use App\Http\Controllers\Api\InvitationController;
use App\Http\Controllers\Api\MetaController;
use App\Http\Controllers\Api\OrganizerPreferencesController;
use App\Http\Controllers\Api\OrganizerUsherController;
use App\Http\Controllers\Api\PasswordResetController;
use App\Http\Controllers\Api\ReportController;
use App\Http\Controllers\Api\TemplateController;
use Illuminate\Support\Facades\Route;

Route::get('/ping', HealthController::class);

Route::post('/auth/login', [AuthController::class, 'login'])->middleware('throttle:login');
Route::post('/auth/forgot-password', [PasswordResetController::class, 'request'])->middleware('throttle:6,1');
Route::post('/auth/reset-password', [PasswordResetController::class, 'reset'])->middleware('throttle:6,1');

Route::get('/invitations/{token}', [InvitationController::class, 'show'])->middleware('throttle:60,1');
Route::post('/invitations/{token}/rsvp', [InvitationController::class, 'rsvp'])->middleware('throttle:30,1');
Route::get('/invitations/{token}/ecard.svg', [InvitationController::class, 'ecardSvg'])->middleware('throttle:60,1');
Route::get('/invitations/{token}/qr.png', [InvitationController::class, 'ecardQr'])->middleware('throttle:60,1');

Route::get('/design-previews/{token}', [DesignApprovalController::class, 'show'])->middleware('throttle:60,1');
Route::post('/design-previews/{token}', [DesignApprovalController::class, 'decide'])->middleware('throttle:20,1');
Route::get('/design-previews/{token}/file', [DesignApprovalController::class, 'file'])->middleware('throttle:60,1');
Route::get('/design-files/{design}', [DesignController::class, 'file'])
    ->name('design-files.show')
    ->middleware('signed');
Route::get('/templates/{template}/file', [TemplateController::class, 'file'])
    ->name('templates.file')
    ->middleware('signed');

Route::middleware(['auth:sanctum', 'account.active'])->group(function (): void {
    Route::get('/auth/me', [AuthController::class, 'me']);
    Route::post('/auth/logout', [AuthController::class, 'logout']);
    Route::post('/auth/profile', [AuthController::class, 'updateProfile'])->middleware('throttle:12,1');
    Route::patch('/auth/account', [AuthController::class, 'updateAccount'])->middleware('throttle:12,1');
    Route::post('/auth/password', [AuthController::class, 'changePassword']);

    Route::middleware('password.changed')->group(function (): void {
        Route::get('/dashboard', DashboardController::class);
        Route::get('/meta', MetaController::class);

        Route::get('/preferences', [OrganizerPreferencesController::class, 'show']);
        Route::put('/preferences', [OrganizerPreferencesController::class, 'update']);

        Route::get('/events', [EventController::class, 'index']);
        Route::post('/events', [EventController::class, 'store']);
        Route::get('/events/{event}', [EventController::class, 'show']);
        Route::match(['put', 'patch'], '/events/{event}', [EventController::class, 'update']);
        Route::delete('/events/{event}', [EventController::class, 'destroy']);
        Route::get('/events/{event}/stats', [EventController::class, 'stats']);
        Route::post('/events/{event}/send', [EventController::class, 'send']);

        Route::get('/events/{event}/ushers', [EventUsherController::class, 'index']);
        Route::post('/events/{event}/ushers', [EventUsherController::class, 'store']);
        Route::patch('/events/{event}/ushers/{usher}', [EventUsherController::class, 'update']);
        Route::post('/events/{event}/ushers/assign', [EventUsherController::class, 'assign']);
        Route::patch('/events/{event}/ushers/{usher}/status', [EventUsherController::class, 'status']);
        Route::patch('/events/{event}/ushers/{usher}/calling', [EventUsherController::class, 'calling']);
        Route::delete('/events/{event}/ushers/{usher}', [EventUsherController::class, 'destroy']);
        Route::delete('/events/{event}/ushers/{usher}/account', [EventUsherController::class, 'destroyAccount']);

        Route::get('/ushers', [OrganizerUsherController::class, 'index']);
        Route::post('/ushers', [OrganizerUsherController::class, 'store']);
        Route::patch('/ushers/{usher}', [OrganizerUsherController::class, 'update']);
        Route::patch('/ushers/{usher}/status', [OrganizerUsherController::class, 'status']);
        Route::delete('/ushers/{usher}', [OrganizerUsherController::class, 'destroy']);

        Route::get('/events/{event}/calling', [CallingController::class, 'show']);
        Route::post('/events/{event}/calling/opt-in', [CallingController::class, 'optIn']);
        Route::post('/events/{event}/calling/allocate', [CallingController::class, 'allocate']);
        Route::patch('/events/{event}/calling/allocations/{allocation}', [CallingController::class, 'reassign']);
        Route::post('/events/{event}/calling/allocations/{allocation}/attempt', [CallingController::class, 'recordAttempt']);
        Route::get('/calling/mine', [CallingController::class, 'mine']);
        Route::post('/calling/allocations/{allocation}/attempt', [CallingController::class, 'recordMyAttempt']);

        Route::get('/events/{event}/tables', [EventTableController::class, 'index']);
        Route::post('/events/{event}/tables', [EventTableController::class, 'store']);
        Route::match(['put', 'patch'], '/events/{event}/tables/{table}', [EventTableController::class, 'update']);
        Route::delete('/events/{event}/tables/{table}', [EventTableController::class, 'destroy']);

        Route::get('/events/{event}/guests', [GuestController::class, 'index']);
        Route::post('/events/{event}/guests', [GuestController::class, 'store']);
        Route::post('/events/{event}/guests/import/analyze', [GuestController::class, 'analyzeImport']);
        Route::post('/events/{event}/guests/import/apply', [GuestController::class, 'applyImport']);
        Route::get('/events/{event}/guests/export', [GuestController::class, 'export']);
        Route::get('/guests/import/template', [GuestController::class, 'exportTemplate']);

        Route::match(['put', 'patch'], '/guests/{guest}', [GuestController::class, 'update']);
        Route::delete('/guests/{guest}', [GuestController::class, 'destroy']);
        Route::post('/guests/{guest}/send', [GuestController::class, 'send']);

        Route::post('/check-in/verify', [CheckInController::class, 'verify'])->middleware('throttle:120,1');
        Route::get('/gate/stats', [CheckInController::class, 'gateStats']);
        Route::get('/events/{event}/check-ins', [CheckInController::class, 'index']);

        Route::get('/events/{event}/reports', [ReportController::class, 'event']);
        Route::get('/events/{event}/reports/pdf', [ReportController::class, 'eventPdf']);

        Route::get('/templates', [TemplateController::class, 'index']);
        Route::post('/templates', [TemplateController::class, 'store']);
        Route::match(['post', 'put', 'patch'], '/templates/{template}', [TemplateController::class, 'update']);
        Route::delete('/templates/{template}', [TemplateController::class, 'destroy']);

        Route::get('/events/{event}/designs', [DesignController::class, 'index']);
        Route::post('/events/{event}/designs/template', [DesignController::class, 'fromTemplate']);
        Route::post('/events/{event}/designs/upload', [DesignController::class, 'fromUpload']);
        Route::post('/events/{event}/designs/config', [DesignController::class, 'fromConfig']);
        Route::post('/events/{event}/designs/{design}/submit', [DesignController::class, 'submit']);

        Route::middleware('super-admin')->prefix('admin')->group(function (): void {
            Route::get('/reports', [ReportController::class, 'platform']);
            Route::get('/reports/pdf', [ReportController::class, 'platformPdf']);
            Route::get('/overview', PlatformController::class);
            Route::get('/organizers', [OrganizerController::class, 'index']);
            Route::post('/organizers', [OrganizerController::class, 'store']);
            Route::patch('/organizers/{organizer}', [OrganizerController::class, 'update']);
            Route::patch('/organizers/{organizer}/status', [OrganizerController::class, 'status']);
            Route::delete('/organizers/{organizer}', [OrganizerController::class, 'destroy']);
            Route::get('/audit-logs', [AuditLogController::class, 'index']);
            Route::get('/settings', [SettingsController::class, 'index']);
            Route::put('/settings', [SettingsController::class, 'update']);
        });
    });
});
