<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use Illuminate\Http\JsonResponse;

class MetaController extends Controller
{
    /**
     * Reference data used by the admin UI. Values come from config so the
     * server stays the single source of truth for allowed options.
     */
    public function __invoke(): JsonResponse
    {
        $cardTypes = collect(config('eclat.card_types'))
            ->map(fn (string $type): array => [
                'value' => $type,
                'label' => config("eclat.card_type_labels.{$type}", ucfirst($type)),
                'attendees' => config("eclat.card_type_attendees.{$type}"),
            ])
            ->values();

        $outcomes = collect(config('eclat.calling_outcomes'))
            ->map(fn (string $outcome): array => [
                'value' => $outcome,
                'label' => config("eclat.calling_outcome_labels.{$outcome}", ucfirst(str_replace('_', ' ', $outcome))),
            ])
            ->values();

        return response()->json([
            'categories' => config('eclat.categories'),
            'card_types' => $cardTypes,
            'guest_statuses' => config('eclat.guest_statuses'),
            'confirmation_statuses' => config('eclat.confirmation_statuses'),
            'confirmation_sources' => config('eclat.confirmation_sources'),
            'calling_outcomes' => $outcomes,
            'design_formats' => config('eclat.design_formats'),
            'max_group_attendees' => (int) config('eclat.max_group_attendees'),
        ]);
    }
}
