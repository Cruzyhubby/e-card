<?php

namespace App\Http\Resources;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

class UsherResource extends JsonResource
{
    /**
     * @return array<string, mixed>
     */
    public function toArray(Request $request): array
    {
        return [
            'id' => (int) $this->id,
            'name' => $this->name,
            'email' => $this->email,
            'phone' => $this->phone,
            'device_id' => $this->device_id,
            'device_label' => $this->device_label,
            'status' => $this->status,
            'event_id' => $this->event_id !== null ? (int) $this->event_id : null,
            'calling_enabled' => (bool) ($this->calling_enabled ?? false),
            'assignment_id' => $this->assignment_id ?? null,
            'assigned_at' => $this->assigned_at ?? null,
            'must_change_password' => (bool) $this->must_change_password,
            'scan_count' => isset($this->scan_count) ? (int) $this->scan_count : (int) $this->checkInLogs()->count(),
            'last_scan_at' => $this->last_scan_at ?? null,
            'created_at' => $this->created_at?->toIso8601String(),
        ];
    }
}
