<?php

namespace App\Http\Controllers\Api\Admin;

use App\Http\Controllers\Controller;
use App\Services\AuditLogger;
use App\Services\PlatformSettings;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class SettingsController extends Controller
{
    public function index(PlatformSettings $settings): JsonResponse
    {
        return response()->json([
            'settings' => $settings->forApi(),
        ]);
    }

    public function update(Request $request, PlatformSettings $settings): JsonResponse
    {
        $data = $request->validate([
            'settings' => ['required', 'array'],
            'settings.*' => ['nullable', 'string', 'max:2000'],
        ]);

        $updated = $settings->update($data['settings'], $request->user());

        if ($updated !== []) {
            AuditLogger::record(
                'settings.updated',
                'Global delivery settings were updated: '.implode(', ', $updated).'.',
                'PlatformSettings',
                null,
                ['keys' => $updated]
            );
        }

        return response()->json([
            'settings' => $settings->forApi(),
            'updated' => $updated,
        ]);
    }
}
