<?php

namespace App\Http\Controllers;

use Illuminate\Http\JsonResponse;

class RootController extends Controller
{
    public function __invoke(): JsonResponse
    {
        return response()->json([
            'name' => 'Fahari API',
            'status' => 'ok',
            'docs' => '/api',
        ]);
    }
}
