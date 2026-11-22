<?php

namespace App\Http\Resources;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

class UserResource extends JsonResource
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
            'role' => $this->role,
            'status' => $this->status,
            'must_change_password' => (bool) $this->must_change_password,
            'two_factor_enabled' => (bool) $this->two_factor_confirmed_at,
            'event_id' => $this->event_id !== null ? (int) $this->event_id : null,
            'device_id' => $this->device_id,
            'device_label' => $this->device_label,
            'phone' => $this->phone,
            'calling_enabled' => $this->isUsher()
                ? (bool) $this->activeUsherAssignment()?->calling_enabled
                : false,
        ];
    }
}
