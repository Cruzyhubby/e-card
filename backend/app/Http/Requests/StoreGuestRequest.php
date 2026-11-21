<?php

namespace App\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class StoreGuestRequest extends FormRequest
{
    public function authorize(): bool
    {
        return $this->user()?->can('update', $this->route('event')) ?? false;
    }

    /**
     * @return array<string, mixed>
     */
    public function rules(): array
    {
        return [
            'name' => ['required', 'string', 'max:255'],
            'phone' => ['nullable', 'string', 'max:32'],
            'email' => ['nullable', 'email', 'max:255'],
            'table_number' => ['nullable', 'integer', 'min:1', 'max:100000'],
            'seat_number' => ['nullable', 'integer', 'min:1', 'max:100000'],
            'is_vip' => ['sometimes', 'boolean'],
            'card_type' => ['sometimes', 'string', Rule::in(config('eclat.card_types'))],
            'attendees_count' => ['sometimes', 'integer', 'min:1', 'max:'.config('eclat.max_group_attendees')],
            'confirmation_status' => ['sometimes', 'string', Rule::in(config('eclat.confirmation_statuses'))],
            'confirmation_source' => ['sometimes', 'nullable', 'string', Rule::in(config('eclat.confirmation_sources'))],
            'confirmed_at' => ['sometimes', 'nullable', 'date'],
            'notes' => ['sometimes', 'nullable', 'string', 'max:2000'],
            'status' => ['sometimes', 'string', 'in:'.implode(',', config('eclat.guest_statuses'))],
        ];
    }
}
