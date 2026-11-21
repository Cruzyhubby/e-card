<?php

namespace App\Services;

use App\Models\DesignApproval;
use App\Models\DesignVersion;
use App\Models\Event;
use App\Models\SharedTemplate;
use App\Models\User;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\URL;
use Illuminate\Support\Str;

class DesignService
{
    public const MIME = [
        'svg' => 'image/svg+xml',
        'png' => 'image/png',
        'jpg' => 'image/jpeg',
        'jpeg' => 'image/jpeg',
    ];

    public static function formatOf(UploadedFile $file): string
    {
        $extension = strtolower($file->getClientOriginalExtension());

        return $extension === 'jpeg' ? 'jpg' : $extension;
    }

    public static function encode(UploadedFile $file): string
    {
        return base64_encode((string) file_get_contents($file->getRealPath()));
    }

    /**
     * Uploaded SVGs are served inline, so reject active content.
     */
    public static function assertSafe(UploadedFile $file): void
    {
        if (self::formatOf($file) !== 'svg') {
            return;
        }

        SvgSanitizer::assertSafe((string) file_get_contents($file->getRealPath()));
    }

    public function dataUri(?string $data, ?string $format): ?string
    {
        if ($data === null || $data === '') {
            return null;
        }

        $mime = self::MIME[$format ?? 'svg'] ?? 'application/octet-stream';

        return 'data:'.$mime.';base64,'.$data;
    }

    public function createFromTemplate(Event $event, User $user, SharedTemplate $template, ?array $config = null): DesignVersion
    {
        return $this->createVersion($event, $user, [
            'template_id' => $template->id,
            'format' => $template->format,
            'file_data' => $template->file_data,
            'original_name' => $template->original_name,
            'config' => $config ?? $this->configFor($event),
        ]);
    }

    public function createFromUpload(Event $event, User $user, UploadedFile $file, ?array $config = null): DesignVersion
    {
        return $this->createVersion($event, $user, [
            'template_id' => null,
            'format' => self::formatOf($file),
            'file_data' => self::encode($file),
            'original_name' => $file->getClientOriginalName(),
            'config' => $config ?? $this->configFor($event),
        ]);
    }

    public function createFromConfig(Event $event, User $user, ?array $config = null): DesignVersion
    {
        return $this->createVersion($event, $user, [
            'template_id' => null,
            'format' => 'svg',
            'file_data' => null,
            'original_name' => null,
            'config' => $config ?? $this->configFor($event),
        ]);
    }

    /**
     * @param  array<string, mixed>  $attributes
     */
    private function createVersion(Event $event, User $user, array $attributes): DesignVersion
    {
        $version = ((int) $event->designVersions()->max('version')) + 1;

        $design = DesignVersion::query()->create([
            'event_id' => $event->id,
            'template_id' => $attributes['template_id'],
            'version' => $version,
            'kind' => 'working',
            'format' => $attributes['format'],
            'status' => 'draft',
            'file_data' => $attributes['file_data'],
            'original_name' => $attributes['original_name'],
            'config' => $attributes['config'],
            'created_by' => $user->id,
        ]);

        $this->log($design, 'created', $user->name, null, $user->id);

        return $design;
    }

    public function submit(DesignVersion $design, User $user): DesignVersion
    {
        DB::transaction(function () use ($design, $user): void {
            DesignVersion::query()
                ->where('event_id', $design->event_id)
                ->where('id', '!=', $design->id)
                ->where('status', 'pending_approval')
                ->update(['status' => 'superseded', 'approval_token' => null]);

            $design->forceFill([
                'status' => 'pending_approval',
                'approval_token' => Str::random(64),
                'approved_at' => null,
                'approved_by_name' => null,
                'feedback' => null,
            ])->save();

            $this->log($design, 'submitted', $user->name, null, $user->id);
        });

        return $design->refresh();
    }

    public function approve(DesignVersion $design, ?string $customerName, ?string $comment, ?int $actorId = null): DesignVersion
    {
        return DB::transaction(function () use ($design, $customerName, $comment, $actorId): DesignVersion {
            $event = Event::query()->findOrFail($design->event_id);

            DesignVersion::query()
                ->where('event_id', $design->event_id)
                ->where('id', '!=', $design->id)
                ->where('status', 'approved')
                ->update(['status' => 'superseded']);

            $design->forceFill([
                'status' => 'approved',
                'approved_at' => now(),
                'approved_by_name' => $customerName ?: $event->host_name,
                'feedback' => $comment,
            ])->save();

            $config = is_array($design->config) ? $design->config : null;

            if ($config !== null) {
                $event->update(['ecard_config' => $config]);
            }

            $this->log($design, 'approved', $design->approved_by_name, $comment, $actorId);

            return $design->refresh();
        });
    }

    public function requestChanges(DesignVersion $design, ?string $customerName, ?string $comment): DesignVersion
    {
        return DB::transaction(function () use ($design, $customerName, $comment): DesignVersion {
            $design->forceFill([
                'status' => 'rejected',
                'feedback' => $comment,
            ])->save();

            $this->log($design, 'changes_requested', $customerName, $comment, null);

            return $design->refresh();
        });
    }

    /**
     * Editing an approved design opens a fresh draft so sending pauses until the
     * customer approves the new artwork.
     */
    public function syncWorkingCopy(Event $event, User $user, array $config): void
    {
        $approved = $event->designVersions()
            ->where('status', 'approved')
            ->orderByDesc('version')
            ->first();

        if ($approved === null || $approved->config == $config) {
            return;
        }

        $latest = $event->designVersions()->orderByDesc('version')->first();

        if ($latest !== null && $latest->status === 'draft' && $latest->file_data === null) {
            $latest->update(['config' => $config]);

            return;
        }

        $this->createVersion($event, $user, [
            'template_id' => null,
            'format' => 'svg',
            'file_data' => null,
            'original_name' => null,
            'config' => $config,
        ]);
    }

    public function availableForSending(Event $event): bool
    {
        $latest = $event->designVersions()->orderByDesc('version')->first();

        return $latest === null || $latest->status === 'approved';
    }

    /**
     * @return array<string, mixed>
     */
    public function payload(DesignVersion $design, bool $public = false): array
    {
        $design->loadMissing(['template:id,name', 'creator:id,name']);

        $fileUrl = null;

        if ($design->file_data !== null) {
            $fileUrl = $public
                ? url('/api/design-previews/'.$design->approval_token.'/file')
                : URL::temporarySignedRoute('design-files.show', now()->addHours(12), ['design' => $design->id]);
        }

        return [
            'id' => (int) $design->id,
            'version' => (int) $design->version,
            'status' => $design->status,
            'format' => $design->format,
            'original_name' => $design->original_name,
            'template' => $design->template?->name,
            'config' => $design->config,
            'file_url' => $fileUrl,
            'approved_at' => $design->approved_at?->toIso8601String(),
            'approved_by_name' => $design->approved_by_name,
            'feedback' => $design->feedback,
            'created_by' => $design->creator?->name,
            'created_at' => $design->created_at?->toIso8601String(),
            'can_edit' => in_array($design->status, ['draft', 'rejected'], true),
            'needs_resubmit' => $design->status === 'rejected',
        ];
    }

    /**
     * @return array<string, mixed>
     */
    public function overview(Event $event): array
    {
        $versions = $event->designVersions()
            ->with(['template:id,name', 'creator:id,name'])
            ->orderByDesc('version')
            ->get();

        $approved = $versions->firstWhere('status', 'approved');
        $pending = $versions->firstWhere('status', 'pending_approval');
        $latest = $versions->first();
        $token = $pending?->approval_token;

        return [
            'event' => [
                'id' => (int) $event->id,
                'title' => $event->title,
                'host_name' => $event->host_name,
                'event_date' => $event->event_date?->format('Y-m-d'),
                'start_time' => (string) $event->start_time,
                'venue' => $event->venue,
                'accent_color' => $event->accent_color,
                'ecard_config' => $event->ecard_config,
            ],
            'has_workflow' => $versions->isNotEmpty(),
            'sending_allowed' => $this->availableForSending($event),
            'latest' => $latest !== null ? $this->payload($latest) : null,
            'approved' => $approved !== null ? $this->payload($approved) : null,
            'pending' => $pending !== null ? $this->payload($pending) : null,
            'approval_url' => $token !== null
                ? rtrim((string) config('app.url'), '/').'/#/d/'.$token
                : null,
            'versions' => $versions
                ->map(fn (DesignVersion $design): array => $this->payload($design))
                ->values()
                ->all(),
        ];
    }

    private function log(DesignVersion $design, string $action, ?string $actorName, ?string $comment, ?int $actorId): void
    {
        DesignApproval::query()->create([
            'design_version_id' => $design->id,
            'action' => $action,
            'actor_name' => $actorName,
            'actor_id' => $actorId,
            'comment' => $comment,
            'acted_at' => now(),
        ]);
    }

    /**
     * @return array<string, mixed>
     */
    private function configFor(Event $event): array
    {
        return is_array($event->ecard_config) ? $event->ecard_config : [];
    }
}
