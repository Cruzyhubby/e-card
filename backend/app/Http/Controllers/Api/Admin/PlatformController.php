<?php

namespace App\Http\Controllers\Api\Admin;

use App\Http\Controllers\Controller;
use App\Models\AuditLog;
use App\Models\CheckInLog;
use App\Models\Event;
use App\Models\MessageDispatch;
use App\Models\User;
use App\Services\PlatformSettings;
use Illuminate\Http\JsonResponse;
use Illuminate\Support\Carbon;

class PlatformController extends Controller
{
    public function __invoke(PlatformSettings $settings): JsonResponse
    {
        $today = Carbon::today()->toDateString();

        $organizerQuery = User::query()->where('role', 'organizer');

        $recentEvents = Event::query()
            ->with('owner:id,name,email')
            ->orderByDesc('created_at')
            ->limit(6)
            ->get(['id', 'user_id', 'title', 'host_name', 'event_date', 'invitation_status', 'accent_color', 'created_at'])
            ->map(fn (Event $event): array => [
                'id' => (int) $event->id,
                'title' => $event->title,
                'host_name' => $event->host_name,
                'event_date' => $event->event_date?->format('Y-m-d'),
                'invitation_status' => $event->invitation_status,
                'accent_color' => $event->accent_color,
                'created_at' => $event->created_at?->toIso8601String(),
                'organizer' => $event->owner !== null
                    ? ['id' => (int) $event->owner->id, 'name' => $event->owner->name, 'email' => $event->owner->email]
                    : null,
            ]);

        $recentAudit = AuditLog::query()
            ->orderByDesc('id')
            ->limit(6)
            ->get()
            ->map(fn (AuditLog $log): array => [
                'id' => (int) $log->id,
                'action' => $log->action,
                'description' => $log->description,
                'actor_name' => $log->actor_name,
                'actor_role' => $log->actor_role,
                'created_at' => $log->created_at?->toIso8601String(),
            ]);

        return response()->json([
            'metrics' => [
                'organizers' => (clone $organizerQuery)->count(),
                'organizers_active' => (clone $organizerQuery)->where('status', 'active')->count(),
                'organizers_suspended' => (clone $organizerQuery)->where('status', 'suspended')->count(),
                'events' => Event::query()->count(),
                'events_live' => Event::query()->where('invitation_status', 'live')->count(),
                'events_draft' => Event::query()->where('invitation_status', 'draft')->count(),
                'events_upcoming' => Event::query()->where('event_date', '>=', $today)->count(),
                'ushers' => User::query()->where('role', 'usher')->count(),
                'dispatches' => MessageDispatch::query()->count(),
                'dispatches_sent' => MessageDispatch::query()->where('status', 'sent')->count(),
                'dispatches_failed' => MessageDispatch::query()->where('status', 'failed')->count(),
                'check_ins_valid' => CheckInLog::query()->where('validation_status', 'valid')->count(),
                'check_ins_duplicate' => CheckInLog::query()->where('validation_status', 'already_checked_in')->count(),
                'check_ins_denied' => CheckInLog::query()->where('validation_status', 'denied')->count(),
            ],
            'delivery' => [
                'driver' => $settings->get('messaging.driver'),
                'whatsapp_configured' => $settings->get('whatsapp.token') !== ''
                    && $settings->get('whatsapp.phone_number_id') !== '',
                'smtp_configured' => $settings->get('mail.host') !== '',
            ],
            'recent_events' => $recentEvents,
            'recent_audit' => $recentAudit,
        ]);
    }
}
