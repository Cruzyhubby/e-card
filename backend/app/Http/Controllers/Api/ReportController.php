<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Event;
use App\Services\EventReportService;
use App\Services\PlatformReportService;
use Barryvdh\DomPDF\Facade\Pdf;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Http\Response;

class ReportController extends Controller
{
    /**
     * Confirmed guests plus the general event report in one payload.
     */
    public function event(Event $event, EventReportService $reports): JsonResponse
    {
        $this->authorize('manageTeam', $event);

        return response()->json($reports->build($event));
    }

    public function eventPdf(Event $event, EventReportService $reports): Response
    {
        $this->authorize('manageTeam', $event);

        $report = $reports->build($event);
        $report['brand'] = $this->brand();

        return Pdf::loadView('reports.event', $report)
            ->setPaper('a4')
            ->download($this->filename('event-report', $event->title));
    }

    public function platform(Request $request, PlatformReportService $reports): JsonResponse
    {
        abort_unless($request->user()->isSuperAdmin(), 403);

        return response()->json($reports->build());
    }

    public function platformPdf(Request $request, PlatformReportService $reports): Response
    {
        abort_unless($request->user()->isSuperAdmin(), 403);

        $report = $reports->build();
        $report['brand'] = $this->brand();

        return Pdf::loadView('reports.platform', $report)
            ->setPaper('a4')
            ->download($this->filename('platform-report', 'all-accounts'));
    }

    /**
     * @return array<string, string>
     */
    private function brand(): array
    {
        return [
            'name' => 'Fahari',
            'tagline' => 'E-Card & Invitation Management',
            'url' => (string) config('app.url'),
        ];
    }

    private function filename(string $prefix, string $label): string
    {
        $slug = preg_replace('/[^a-z0-9]+/i', '-', $label) ?? $prefix;

        return $prefix.'-'.trim(strtolower($slug), '-').'-'.now()->format('Y-m-d').'.pdf';
    }
}
