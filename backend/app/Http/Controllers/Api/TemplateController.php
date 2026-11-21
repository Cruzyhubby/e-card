<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\SharedTemplate;
use App\Services\DesignService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Http\Response;
use Illuminate\Support\Facades\URL;
use Illuminate\Validation\Rule;

class TemplateController extends Controller
{
    public function index(Request $request): JsonResponse
    {
        $this->authorizeStaff($request);

        $query = SharedTemplate::query()->with('owner:id,name')->orderByDesc('id');

        if ($request->filled('category') && $request->input('category') !== 'all') {
            $query->where('category', $request->input('category'));
        }

        if ($request->filled('search')) {
            $term = '%'.trim((string) $request->input('search')).'%';
            $query->whereLike('name', $term);
        }

        $templates = $query->get();

        return response()->json([
            'data' => $templates
                ->map(fn (SharedTemplate $template): array => $this->payload($template, $request->user()->id))
                ->values(),
            'categories' => config('eclat.categories'),
        ]);
    }

    public function store(Request $request): JsonResponse
    {
        $this->authorizeStaff($request);

        $data = $this->validated($request);
        DesignService::assertSafe($data['file']);

        $template = SharedTemplate::query()->create([
            'user_id' => $request->user()->id,
            'name' => $data['name'],
            'category' => $data['category'],
            'format' => DesignService::formatOf($data['file']),
            'file_path' => '',
            'file_data' => DesignService::encode($data['file']),
            'original_name' => $data['file']->getClientOriginalName(),
        ]);

        return response()->json([
            'template' => $this->payload($template, $request->user()->id),
        ], 201);
    }

    public function update(Request $request, SharedTemplate $template): JsonResponse
    {
        $this->authorizeStaff($request);
        $this->authorizeOwner($request, $template);

        $data = $request->validate([
            'name' => ['sometimes', 'string', 'max:120'],
            'category' => ['sometimes', 'string', Rule::in(config('eclat.categories'))],
            'file' => ['sometimes', 'file', 'max:'.(int) config('eclat.design_max_upload_kb'), 'mimes:svg,png,jpg,jpeg'],
        ]);

        if (isset($data['file'])) {
            DesignService::assertSafe($data['file']);
            $data['format'] = DesignService::formatOf($data['file']);
            $data['file_data'] = DesignService::encode($data['file']);
            $data['original_name'] = $data['file']->getClientOriginalName();
            unset($data['file']);
        }

        $template->update($data);

        return response()->json([
            'template' => $this->payload($template->refresh(), $request->user()->id),
        ]);
    }

    public function destroy(Request $request, SharedTemplate $template): JsonResponse
    {
        $this->authorizeStaff($request);
        $this->authorizeOwner($request, $template);
        $template->delete();

        return response()->json(null, 204);
    }

    public function file(SharedTemplate $template): Response
    {
        abort_if($template->file_data === null, 404);

        $mime = DesignService::MIME[$template->format] ?? 'application/octet-stream';

        return response(base64_decode($template->file_data), 200, [
            'Content-Type' => $mime,
            'Content-Disposition' => 'inline; filename="'.addslashes((string) ($template->original_name ?: 'template.'.$template->format)).'"',
            'X-Content-Type-Options' => 'nosniff',
            'Content-Security-Policy' => "default-src 'none'; style-src 'unsafe-inline'; sandbox",
            'Cache-Control' => 'private, max-age=3600',
        ]);
    }

    /**
     * @return array<string, mixed>
     */
    private function payload(SharedTemplate $template, int $userId): array
    {
        return [
            'id' => (int) $template->id,
            'name' => $template->name,
            'category' => $template->category,
            'format' => $template->format,
            'original_name' => $template->original_name,
            'owner' => $template->owner?->name,
            'owned' => (int) $template->user_id === $userId,
            'file_url' => URL::temporarySignedRoute('templates.file', now()->addHours(12), ['template' => $template->id]),
            'created_at' => $template->created_at?->toIso8601String(),
        ];
    }

    /**
     * @return array<string, mixed>
     */
    private function validated(Request $request): array
    {
        return $request->validate([
            'name' => ['required', 'string', 'max:120'],
            'category' => ['required', 'string', Rule::in(config('eclat.categories'))],
            'file' => ['required', 'file', 'max:'.(int) config('eclat.design_max_upload_kb'), 'mimes:svg,png,jpg,jpeg'],
        ]);
    }

    private function authorizeStaff(Request $request): void
    {
        $user = $request->user();

        abort_unless($user->isOrganizer() || $user->isSuperAdmin(), 403, 'Only organizers can manage the template library.');
    }

    private function authorizeOwner(Request $request, SharedTemplate $template): void
    {
        abort_unless((int) $template->user_id === (int) $request->user()->id, 403, 'You can only manage templates you uploaded.');
    }
}
