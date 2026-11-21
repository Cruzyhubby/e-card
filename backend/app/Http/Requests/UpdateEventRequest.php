<?php

namespace App\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;

class UpdateEventRequest extends FormRequest
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
            'title' => ['sometimes', 'string', 'max:255'],
            'category' => ['sometimes', 'string', 'in:'.implode(',', config('eclat.categories'))],
            'host_name' => ['sometimes', 'string', 'max:255'],
            'event_date' => ['sometimes', 'date_format:Y-m-d'],
            'start_time' => ['sometimes', 'date_format:H:i'],
            'venue' => ['sometimes', 'string', 'max:255'],
            'total_seats' => ['sometimes', 'integer', 'min:1', 'max:100000'],
            'total_tables' => ['sometimes', 'integer', 'min:0', 'max:10000'],
            'description' => ['sometimes', 'nullable', 'string', 'max:5000'],
            'accent_color' => ['sometimes', 'string', 'regex:/^#[0-9A-Fa-f]{6}$/'],
            'invitation_status' => ['sometimes', 'string', 'in:'.implode(',', config('eclat.invitation_statuses'))],
            'ecard_config' => ['sometimes', 'array:template,bg_color,accent_color,text_color,name_y,qr_position,qr_size'],
            'ecard_config.template' => ['sometimes', 'string', 'in:'.implode(',', config('eclat.ecard.templates'))],
            'ecard_config.bg_color' => ['sometimes', 'string', 'regex:/^#[0-9A-Fa-f]{6}$/'],
            'ecard_config.accent_color' => ['sometimes', 'string', 'regex:/^#[0-9A-Fa-f]{6}$/'],
            'ecard_config.text_color' => ['sometimes', 'string', 'regex:/^#[0-9A-Fa-f]{6}$/'],
            'ecard_config.name_y' => ['sometimes', 'integer', 'between:20,80'],
            'ecard_config.qr_position' => ['sometimes', 'string', 'in:'.implode(',', config('eclat.ecard.qr_positions'))],
            'ecard_config.qr_size' => ['sometimes', 'integer', 'between:88,180'],
        ];
    }
}
