<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Services\AuditLogger;
use App\Services\OrganizerSettings;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Validation\ValidationException;

class OrganizerPreferencesController extends Controller
{
    public function show(Request $request, OrganizerSettings $settings): JsonResponse
    {
        $this->authorizeOrganizer($request);

        return response()->json($settings->forApi($request->user()));
    }

    public function update(Request $request, OrganizerSettings $settings): JsonResponse
    {
        $this->authorizeOrganizer($request);

        $data = $request->validate([
            'settings' => ['required', 'array'],
            'settings.*' => ['nullable'],
        ]);

        $unknown = array_diff(array_keys($data['settings']), array_keys(OrganizerSettings::DEFINITIONS));

        if ($unknown !== []) {
            throw ValidationException::withMessages([
                'settings' => ['Unknown preference(s): '.implode(', ', $unknown).'.'],
            ]);
        }

        $updated = $settings->update($request->user(), $data['settings']);

        AuditLogger::record(
            'settings.preferences_updated',
            'Organizer preferences were updated: '.implode(', ', $updated).'.',
            'User',
            $request->user()->id
        );

        return response()->json($settings->forApi($request->user()));
    }

    private function authorizeOrganizer(Request $request): void
    {
        abort_unless(
            $request->user()?->isOrganizer() || $request->user()?->isSuperAdmin(),
            403,
            'Organizer preferences are available to organizer accounts.'
        );
    }
}
