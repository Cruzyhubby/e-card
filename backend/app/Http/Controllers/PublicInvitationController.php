<?php

namespace App\Http\Controllers;

use App\Models\Guest;
use App\Services\EcardRendererService;
use Illuminate\Contracts\View\View;

class PublicInvitationController extends Controller
{
    public function show(string $token, EcardRendererService $renderer): View
    {
        $guest = Guest::query()->with('event')->whereQrToken($token)->firstOrFail();
        $event = $guest->event;

        return view('invitation', [
            'guest' => $guest,
            'event' => $event,
            'ecardSvg' => $renderer->render($guest, $event),
        ]);
    }
}
