<?php

namespace App\Services;

use App\Models\AuditLog;
use App\Models\User;
use Illuminate\Database\Eloquent\Model;

class AuditLogger
{
    /**
     * Security audit trail. Never store guest names, contacts, or QR tokens here —
     * super admins can read this log and organizer guest data stays private.
     *
     * @param  array<string, mixed>  $meta
     */
    public static function record(
        string $action,
        string $description,
        ?string $subjectType = null,
        int|string|null $subjectId = null,
        array $meta = [],
        ?User $actor = null
    ): AuditLog {
        $actor ??= auth()->user();
        $request = app()->runningInConsole() ? null : request();

        return AuditLog::create([
            'actor_id' => $actor?->id,
            'actor_name' => $actor?->name,
            'actor_role' => $actor?->role,
            'action' => $action,
            'description' => mb_substr($description, 0, 500),
            'subject_type' => $subjectType,
            'subject_id' => $subjectId,
            'ip_address' => $request?->ip(),
            'user_agent' => $request !== null ? mb_substr((string) $request->userAgent(), 0, 255) : null,
            'meta' => $meta === [] ? null : $meta,
        ]);
    }

    public static function forModel(string $action, string $description, ?Model $subject = null, array $meta = []): AuditLog
    {
        return self::record(
            $action,
            $description,
            $subject !== null ? class_basename($subject) : null,
            $subject?->getKey(),
            $meta
        );
    }
}
