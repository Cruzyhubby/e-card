<?php

namespace App\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;

class SendInvitationRequest extends FormRequest
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
            'channel' => ['required', 'string', 'in:whatsapp,sms,email'],
            'guest_ids' => ['sometimes', 'array', 'max:500'],
            'guest_ids.*' => ['integer', 'distinct'],
            'message_template' => ['sometimes', 'nullable', 'string', 'max:2000'],
        ];
    }
}
