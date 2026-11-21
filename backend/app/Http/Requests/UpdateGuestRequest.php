<?php

namespace App\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class UpdateGuestRequest extends FormRequest
{
    public function authorize(): bool
    {
        $guest = $this->route('guest');

        return $guest !== null
            && $guest->event !== null
            && ($this->user()?->can('update', $guest->event) ?? false);
    }

    /**
     * @return array<string, mixed>
     */
    public function rules(): array
    {
        return [
            'name' => ['sometimes', 'string', 'max:255'],
            'phone' => ['sometimes', 'nullable', 'string', 'max:32'],
            'email' => ['sometimes', 'nullable', 'email', 'max:255'],
            'table_number' => ['sometimes', 'nullable', 'integer', 'min:1', 'max:100000'],
            'seat_number' => ['sometimes', 'nullable', 'integer', 'min:1', 'max:100000'],
            'is_vip' => ['sometimes', 'boolean'],
            'card_type' => ['sometimes', 'string', Rule::in(config('eclat.card_types'))],
            'attendees_count' => ['sometimes', 'integer', 'min:1', 'max:'.config('eclat.max_group_attendees')],
            'confirmation_status' => ['sometimes', 'string', Rule::in(config('eclat.confirmation_statuses'))],
            'confirmation_source' => ['sometimes', 'nullable', 'string', Rule::in(config('eclat.confirmation_sources'))],
            'confirmed_at' => ['sometimes', 'nullable', 'date'],
            'notes' => ['sometimes', 'nullable', 'string', 'max:2000'],
            'status' => ['sometimes', 'string', 'in:'.implode(',', config('eclat.guest_statuses'))],
            'event_id' => ['prohibited'],
            'qr_token' => ['prohibited'],
        ];
    }
}
