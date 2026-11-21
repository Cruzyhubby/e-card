<?php

namespace App\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;

class StoreEventRequest extends FormRequest
{
    public function authorize(): bool
    {
        return $this->user()?->isOrganizer() ?? false;
    }

    /**
     * @return array<string, mixed>
     */
    public function rules(): array
    {
        return [
            'title' => ['required', 'string', 'max:255'],
            'category' => ['required', 'string', 'in:'.implode(',', config('eclat.categories'))],
            'host_name' => ['required', 'string', 'max:255'],
            'event_date' => ['required', 'date_format:Y-m-d'],
            'start_time' => ['required', 'date_format:H:i'],
            'venue' => ['required', 'string', 'max:255'],
            'total_seats' => ['required', 'integer', 'min:1', 'max:100000'],
            'total_tables' => ['required', 'integer', 'min:0', 'max:10000'],
            'description' => ['nullable', 'string', 'max:5000'],
            'accent_color' => ['sometimes', 'string', 'regex:/^#[0-9A-Fa-f]{6}$/'],
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
