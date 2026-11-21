<?php

namespace App\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;

class VerifyTokenRequest extends FormRequest
{
    public function authorize(): bool
    {
        return $this->user() !== null;
    }

    /**
     * @return array<string, mixed>
     */
    public function rules(): array
    {
        return [
            'token' => ['required', 'string', 'max:255'],
            'device_id' => ['sometimes', 'nullable', 'string', 'max:100'],
            'event_id' => ['sometimes', 'nullable', 'integer', 'exists:events,id'],
        ];
    }
}
