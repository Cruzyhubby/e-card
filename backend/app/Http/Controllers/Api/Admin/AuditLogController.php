<?php

namespace App\Http\Controllers\Api\Admin;

use App\Http\Controllers\Controller;
use App\Models\AuditLog;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class AuditLogController extends Controller
{
    public function index(Request $request): JsonResponse
    {
        $filters = $request->validate([
            'search' => ['nullable', 'string', 'max:100'],
            'action' => ['nullable', 'string', 'max:80'],
            'limit' => ['nullable', 'integer', 'min:1', 'max:500'],
        ]);

        $query = AuditLog::query();

        $search = trim((string) ($filters['search'] ?? ''));

        if ($search !== '') {
            $like = '%'.$search.'%';

            $query->where(function ($query) use ($like): void {
                $query->whereLike('description', $like)
                    ->orWhereLike('actor_name', $like)
                    ->orWhereLike('action', $like);
            });
        }

        if (! empty($filters['action'])) {
            $query->where('action', $filters['action']);
        }

        $logs = $query
            ->orderByDesc('id')
            ->limit((int) ($filters['limit'] ?? 150))
            ->get();

        $actions = AuditLog::query()
            ->select('action')
            ->distinct()
            ->orderBy('action')
            ->pluck('action');

        return response()->json([
            'data' => $logs->map(fn (AuditLog $log): array => [
                'id' => (int) $log->id,
                'action' => $log->action,
                'description' => $log->description,
                'actor_id' => $log->actor_id !== null ? (int) $log->actor_id : null,
                'actor_name' => $log->actor_name,
                'actor_role' => $log->actor_role,
                'subject_type' => $log->subject_type,
                'subject_id' => $log->subject_id !== null ? (int) $log->subject_id : null,
                'ip_address' => $log->ip_address,
                'meta' => $log->meta,
                'created_at' => $log->created_at?->toIso8601String(),
            ]),
            'actions' => $actions,
        ]);
    }
}
