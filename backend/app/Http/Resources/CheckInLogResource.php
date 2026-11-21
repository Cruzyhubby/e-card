<?php

namespace App\Http\Resources;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

class CheckInLogResource extends JsonResource
{
    /**
     * @return array<string, mixed>
     */
    public function toArray(Request $request): array
    {
        return [
            'id' => (int) $this->id,
            'event_id' => $this->event_id !== null ? (int) $this->event_id : null,
            'guest_id' => $this->guest_id !== null ? (int) $this->guest_id : null,
            'guest_name' => $this->guest?->name,
            'table_number' => $this->guest?->table_number,
            'usher_id' => $this->usher_id !== null ? (int) $this->usher_id : null,
            'usher_name' => $this->usher?->name,
            'device_id' => $this->device_id,
            'validation_status' => $this->validation_status,
            'token_attempted' => $this->token_attempted,
            'scanned_at' => $this->scanned_at?->toIso8601String(),
        ];
    }
}
