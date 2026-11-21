<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\DesignVersion;
use App\Models\Event;
use App\Models\SharedTemplate;
use App\Services\DesignService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Http\Response;
use Illuminate\Support\Facades\Validator;
use Illuminate\Validation\ValidationException;

class DesignController extends Controller
{
    public function __construct(private readonly DesignService $designs) {}

    public function index(Event $event): JsonResponse
    {
        $this->authorize('update', $event);

        return response()->json($this->designs->overview($event));
    }

    public function fromTemplate(Request $request, Event $event): JsonResponse
    {
        $this->authorize('update', $event);

        $data = $request->validate([
            'template_id' => ['required', 'integer', 'exists:shared_templates,id'],
            'config' => ['nullable', 'array'],
        ]);

        $template = SharedTemplate::query()->findOrFail($data['template_id']);
        $design = $this->designs->createFromTemplate(
            $event,
            $request->user(),
            $template,
            $this->validateConfig($data['config'] ?? null)
        );

        return response()->json(['design' => $this->designs->payload($design)], 201);
    }

    public function fromUpload(Request $request, Event $event): JsonResponse
    {
        $this->authorize('update', $event);

        $data = $request->validate([
            'file' => ['required', 'file', 'max:'.(int) config('eclat.design_max_upload_kb'), 'mimes:svg,png,jpg,jpeg'],
            'config' => ['nullable'],
        ]);

        $config = $data['config'] ?? null;

        if (is_string($config)) {
            $config = json_decode($config, true);
        }

        if ($config !== null && ! is_array($config)) {
            throw ValidationException::withMessages(['config' => ['The design configuration must be an object.']]);
        }

        $config = $this->validateConfig($config);

        DesignService::assertSafe($data['file']);
        $design = $this->designs->createFromUpload($event, $request->user(), $data['file'], $config);

        return response()->json(['design' => $this->designs->payload($design)], 201);
    }

    public function fromConfig(Request $request, Event $event): JsonResponse
    {
        $this->authorize('update', $event);

        $data = $request->validate([
            'config' => ['required', 'array'],
        ]);

        $design = $this->designs->createFromConfig(
            $event,
            $request->user(),
            $this->validateConfig($data['config'])
        );

        return response()->json(['design' => $this->designs->payload($design)], 201);
    }

    public function submit(Request $request, Event $event, DesignVersion $design): JsonResponse
    {
        $this->authorize('update', $event);
        $this->assertBelongs($event, $design);

        if (! in_array($design->status, ['draft', 'rejected'], true)) {
            throw ValidationException::withMessages([
                'design' => ['Only draft or returned designs can be sent for approval.'],
            ]);
        }

        $design = $this->designs->submit($design, $request->user());

        return response()->json([
            'design' => $this->designs->payload($design),
            'approval_url' => rtrim((string) config('app.url'), '/').'/#/d/'.$design->approval_token,
        ]);
    }

    public function file(DesignVersion $design): Response
    {
        abort_if($design->file_data === null, 404);

        return $this->binary($design);
    }

    private function binary(DesignVersion $design): Response
    {
        $mime = DesignService::MIME[$design->format] ?? 'application/octet-stream';

        return response(base64_decode((string) $design->file_data), 200, [
            'Content-Type' => $mime,
            'Content-Disposition' => 'inline; filename="'.addslashes((string) ($design->original_name ?: 'design.'.$design->format)).'"',
            'X-Content-Type-Options' => 'nosniff',
            'Content-Security-Policy' => "default-src 'none'; style-src 'unsafe-inline'; sandbox",
            'Cache-Control' => 'private, max-age=300',
        ]);
    }

    private function assertBelongs(Event $event, DesignVersion $design): void
    {
        abort_unless((int) $design->event_id === (int) $event->id, 404);
    }

    /**
     * Design config is promoted to the public e-card on approval, so it must
     * pass the same allowlist and type rules as the event form.
     */
    private function validateConfig(?array $config): ?array
    {
        if ($config === null) {
            return null;
        }

        $validator = Validator::make(['config' => $config], [
            'config' => ['required', 'array:template,bg_color,accent_color,text_color,name_y,qr_position,qr_size'],
            'config.template' => ['sometimes', 'string', 'in:'.implode(',', config('eclat.ecard.templates'))],
            'config.bg_color' => ['sometimes', 'string', 'regex:/^#[0-9A-Fa-f]{6}$/'],
            'config.accent_color' => ['sometimes', 'string', 'regex:/^#[0-9A-Fa-f]{6}$/'],
            'config.text_color' => ['sometimes', 'string', 'regex:/^#[0-9A-Fa-f]{6}$/'],
            'config.name_y' => ['sometimes', 'integer', 'between:20,80'],
            'config.qr_position' => ['sometimes', 'string', 'in:'.implode(',', config('eclat.ecard.qr_positions'))],
            'config.qr_size' => ['sometimes', 'integer', 'between:88,180'],
        ]);

        if ($validator->fails()) {
            throw new ValidationException($validator);
        }

        return $validator->validated()['config'];
    }
}
