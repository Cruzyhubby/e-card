<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\DesignVersion;
use App\Services\DesignService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Http\Response;
use Illuminate\Validation\Rule;
use Illuminate\Validation\ValidationException;

class DesignApprovalController extends Controller
{
    public function __construct(private readonly DesignService $designs) {}

    public function show(string $token): JsonResponse
    {
        $design = $this->resolve($token);

        return response()->json([
            'design' => $this->designs->payload($design, true),
            'event' => $this->eventPayload($design),
            'can_decide' => $design->status === 'pending_approval',
        ]);
    }

    public function decide(Request $request, string $token): JsonResponse
    {
        $design = $this->resolve($token);

        if ($design->status !== 'pending_approval') {
            throw ValidationException::withMessages([
                'design' => ['This design is no longer awaiting approval.'],
            ]);
        }

        $data = $request->validate([
            'action' => ['required', Rule::in(['approve', 'changes'])],
            'name' => ['nullable', 'string', 'max:120'],
            'comment' => ['nullable', 'string', 'max:2000', Rule::requiredIf($request->input('action') === 'changes')],
        ]);

        $name = trim((string) ($data['name'] ?? ''));
        $comment = trim((string) ($data['comment'] ?? ''));

        if ($data['action'] === 'approve') {
            $design = $this->designs->approve($design, $name !== '' ? $name : null, $comment !== '' ? $comment : null);
        } else {
            $design = $this->designs->requestChanges($design, $name !== '' ? $name : null, $comment);
        }

        return response()->json([
            'design' => $this->designs->payload($design, true),
            'event' => $this->eventPayload($design),
            'can_decide' => false,
        ]);
    }

    public function file(string $token): Response
    {
        $design = $this->resolve($token);
        abort_if($design->file_data === null, 404);

        $mime = DesignService::MIME[$design->format] ?? 'application/octet-stream';

        return response(base64_decode((string) $design->file_data), 200, [
            'Content-Type' => $mime,
            'Content-Disposition' => 'inline; filename="'.addslashes((string) ($design->original_name ?: 'design.'.$design->format)).'"',
            'X-Content-Type-Options' => 'nosniff',
            'Content-Security-Policy' => "default-src 'none'; style-src 'unsafe-inline'; sandbox",
            'Cache-Control' => 'private, max-age=300',
        ]);
    }

    private function resolve(string $token): DesignVersion
    {
        abort_unless(strlen($token) === 64, 404);

        return DesignVersion::query()
            ->with('event')
            ->where('approval_token', $token)
            ->firstOrFail();
    }

    /**
     * @return array<string, mixed>
     */
    private function eventPayload(DesignVersion $design): array
    {
        $event = $design->event;

        return [
            'id' => (int) $event->id,
            'title' => $event->title,
            'host_name' => $event->host_name,
            'event_date' => $event->event_date?->format('Y-m-d'),
            'start_time' => (string) $event->start_time,
            'venue' => $event->venue,
            'accent_color' => $event->accent_color,
            'ecard_config' => $event->ecard_config,
        ];
    }
}
