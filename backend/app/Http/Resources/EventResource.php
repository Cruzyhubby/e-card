<?php

namespace App\Http\Resources;

use App\Services\EcardRendererService;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

class EventResource extends JsonResource
{
    /**
     * Single resources are returned at the top level per the API contract.
     *
     * @var string|null
     */
    public static $wrap = null;

    /**
     * @return array<string, mixed>
     */
    public function toArray(Request $request): array
    {
        return [
            'id' => (int) $this->id,
            'title' => $this->title,
            'category' => $this->category,
            'host_name' => $this->host_name,
            'event_date' => $this->event_date?->format('Y-m-d'),
            'start_time' => $this->start_time,
            'venue' => $this->venue,
            'total_seats' => (int) $this->total_seats,
            'total_tables' => (int) $this->total_tables,
            'description' => $this->description ?? '',
            'accent_color' => $this->accent_color,
            'invitation_status' => $this->invitation_status,
            'ecard_config' => $this->ecard_config ?? EcardRendererService::defaultConfig($this->accent_color),
            'guest_count' => (int) $this->guest_count,
            'vip_count' => (int) $this->vip_count,
            'sent_count' => (int) $this->sent_count,
            'checked_in_count' => (int) $this->checked_in_count,
            'confirmed_count' => (int) $this->confirmed_count,
            'declined_count' => (int) $this->declined_count,
            'created_at' => $this->created_at?->toIso8601String(),
            'updated_at' => $this->updated_at?->toIso8601String(),
        ];
    }
}
