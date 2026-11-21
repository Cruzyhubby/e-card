<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Http\Requests\VerifyTokenRequest;
use App\Http\Resources\CheckInLogResource;
use App\Http\Resources\EventResource;
use App\Http\Resources\GuestResource;
use App\Models\CheckInLog;
use App\Models\Event;
use App\Models\Guest;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;

class CheckInController extends Controller
{
    public function verify(VerifyTokenRequest $request): JsonResponse
    {
        $data = $request->validated();
        $token = $this->normalizeToken($data['token']);
        $user = $request->user();

        abort_if(
            $user->isSuperAdmin(),
            403,
            'Platform administrators cannot access guest-level gate data.'
        );

        $scopedEventId = $user->isUsher() ? $user->currentAssignedEventId() : null;
        $deviceId = $data['device_id'] ?? $user->device_id ?? 'USHER-APP';
        $ipAddress = $request->ip();

        $outcome = DB::transaction(function () use ($token, $user, $deviceId, $ipAddress, $scopedEventId): array {
            $guest = Guest::query()
                ->whereQrToken($token)
                ->lockForUpdate()
                ->first();

            if ($guest === null) {
                $this->writeLog(null, null, $user?->id, $deviceId, $token, 'denied', $ipAddress, $scopedEventId);

                return [
                    'status' => 'DENIED',
                    'message' => 'Invalid or cancelled pass.',
                    'guest' => null,
                    'event' => null,
                    'table_number' => null,
                    'checked_in_at' => null,
                ];
            }

            $guest->loadMissing('event');
            $event = $guest->event;

            if ($scopedEventId !== null && (int) $event->id !== $scopedEventId) {
                $this->writeLog(null, null, $user->id, $deviceId, $token, 'denied', $ipAddress, $scopedEventId);

                return [
                    'status' => 'DENIED',
                    'message' => 'This pass belongs to a different event.',
                    'guest' => null,
                    'event' => null,
                    'table_number' => null,
                    'checked_in_at' => null,
                ];
            }

            if ($user->isOrganizer() && (int) $event->user_id !== (int) $user->id) {
                // Never attach another organizer's guest event to this log row.
                $this->writeLog(null, null, $user->id, $deviceId, $token, 'denied', $ipAddress);

                return [
                    'status' => 'DENIED',
                    'message' => 'This pass does not belong to your event.',
                    'guest' => null,
                    'event' => null,
                    'table_number' => null,
                    'checked_in_at' => null,
                ];
            }

            if ($guest->status === 'cancelled') {
                $this->writeLog($guest, $event, $user?->id, $deviceId, $token, 'denied', $ipAddress);

                return [
                    'status' => 'DENIED',
                    'message' => 'Invalid or cancelled pass.',
                    'guest' => new GuestResource($guest),
                    'event' => new EventResource($event->loadGuestStats()),
                    'table_number' => $guest->table_number,
                    'checked_in_at' => null,
                ];
            }

            if ($guest->status === 'checked_in') {
                $this->writeLog($guest, $event, $user?->id, $deviceId, $token, 'already_checked_in', $ipAddress);

                $checkedInAt = $guest->checked_in_at;

                return [
                    'status' => 'ALREADY_CHECKED_IN',
                    'message' => $checkedInAt !== null
                        ? 'Already checked in at '.$checkedInAt->format('H:i').'.'
                        : 'Already checked in.',
                    'guest' => new GuestResource($guest),
                    'event' => new EventResource($event->loadGuestStats()),
                    'table_number' => $guest->table_number,
                    'checked_in_at' => $checkedInAt?->toIso8601String(),
                ];
            }

            $checkedInAt = now();

            $guest->update([
                'status' => 'checked_in',
                'checked_in_at' => $checkedInAt,
            ]);

            $this->writeLog($guest, $event, $user?->id, $deviceId, $token, 'valid', $ipAddress);

            $message = 'Welcome, '.$guest->name.'.';

            if ($guest->table_number !== null) {
                $message .= ' Table '.$guest->table_number.'.';
            }

            return [
                'status' => 'VALID',
                'message' => $message,
                'guest' => new GuestResource($guest),
                'event' => new EventResource($event->loadGuestStats()),
                'table_number' => $guest->table_number,
                'checked_in_at' => $checkedInAt->toIso8601String(),
            ];
        });

        return response()->json($outcome);
    }

    public function index(Request $request, Event $event): JsonResponse
    {
        $this->authorize('manageGuests', $event);

        $filters = $request->validate([
            'status' => ['nullable', 'string', 'in:valid,already_checked_in,denied'],
            'limit' => ['nullable', 'integer', 'min:1', 'max:500'],
        ]);

        $query = $event->checkInLogs()->with(['guest', 'usher']);

        if (isset($filters['status'])) {
            $query->where('validation_status', $filters['status']);
        }

        $logs = $query
            ->orderByDesc('scanned_at')
            ->orderByDesc('id')
            ->limit((int) ($filters['limit'] ?? 100))
            ->get();

        return response()->json([
            'data' => CheckInLogResource::collection($logs),
            'stats' => [
                'valid' => $event->checkInLogs()->where('validation_status', 'valid')->count(),
                'denied' => $event->checkInLogs()->where('validation_status', 'denied')->count(),
                'duplicate' => $event->checkInLogs()->where('validation_status', 'already_checked_in')->count(),
            ],
        ]);
    }

    public function gateStats(Request $request): JsonResponse
    {
        $user = $request->user();

        abort_unless(
            $user->isUsher() && $user->currentAssignedEventId() !== null,
            403,
            'Gate statistics are available to usher accounts only.'
        );

        $event = Event::query()->withStats()->findOrFail($user->currentAssignedEventId());
        $logs = $event->checkInLogs()->where('usher_id', $user->id);

        $valid = (clone $logs)->where('validation_status', 'valid')->count();
        $duplicate = (clone $logs)->where('validation_status', 'already_checked_in')->count();
        $denied = (clone $logs)->where('validation_status', 'denied')->count();

        $recent = (clone $logs)
            ->with('guest')
            ->orderByDesc('scanned_at')
            ->orderByDesc('id')
            ->limit(10)
            ->get();

        return response()->json([
            'event' => new EventResource($event),
            'stats' => [
                'valid' => $valid,
                'duplicate' => $duplicate,
                'denied' => $denied,
                'scans' => $valid + $duplicate + $denied,
                'checked_in' => $event->checked_in_count,
                'guests' => $event->guest_count,
            ],
            'recent' => CheckInLogResource::collection($recent),
        ]);
    }

    private function writeLog(
        ?Guest $guest,
        ?Event $event,
        ?int $usherId,
        ?string $deviceId,
        string $token,
        string $validationStatus,
        ?string $ipAddress,
        ?int $fallbackEventId = null
    ): void {
        CheckInLog::create([
            'event_id' => $event?->id ?? $guest?->event_id ?? $fallbackEventId,
            'guest_id' => $guest?->id,
            'usher_id' => $usherId,
            'device_id' => $deviceId,
            // A scanned token is a guest credential: keep the guest link, never the raw secret.
            'token_attempted' => $guest !== null ? null : $this->maskToken($token),
            'validation_status' => $validationStatus,
            'scanned_at' => now(),
            'ip_address' => $ipAddress,
        ]);
    }

    private function maskToken(string $token): string
    {
        return mb_strlen($token) > 8 ? mb_substr($token, 0, 8).'…' : $token;
    }

    private function normalizeToken(string $rawToken): string
    {
        $token = trim($rawToken);

        // Accept every invitation link shape: /i/{token}, /#/i/{token} and bare tokens.
        if (preg_match('~/i/([^/?#\s]+)~i', $token, $matches) === 1) {
            return rawurldecode($matches[1]);
        }

        // Distribution QR codes point at /api/invitations/{token}/ecard.svg?download=1.
        if (preg_match('~/invitations/([^/?#\s]+)~i', $token, $matches) === 1) {
            return rawurldecode($matches[1]);
        }

        if (str_contains($token, '/')) {
            $path = parse_url($token, PHP_URL_PATH);

            if (is_string($path)) {
                $token = basename($path);
            }
        }

        return $token;
    }
}
