<?php

namespace App\Http\Resources;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

class GuestResource extends JsonResource
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
            'event_id' => (int) $this->event_id,
            'name' => $this->name,
            'phone' => $this->phone,
            'email' => $this->email,
            'table_number' => $this->table_number,
            'seat_number' => $this->seat_number,
            'is_vip' => (bool) $this->is_vip,
            'card_type' => $this->card_type,
            'attendees_count' => (int) $this->attendees_count,
            'confirmation_status' => $this->confirmation_status,
            'confirmation_source' => $this->confirmation_source,
            'confirmed_at' => $this->confirmed_at?->toIso8601String(),
            'notes' => $this->notes,
            'status' => $this->status,
            'qr_token' => $this->qr_token,
            'invitation_url' => $this->invitation_url,
            'checked_in_at' => $this->checked_in_at?->toIso8601String(),
            'created_at' => $this->created_at?->toIso8601String(),
        ];
    }
}
