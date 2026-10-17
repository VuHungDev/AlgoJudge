<?php

namespace App\Http\Middleware;

use Closure;
use Illuminate\Http\Request;

class RequireRole
{
    public function handle(Request $request, Closure $next, string $role)
    {
        $user = $request->user();
        if (! $user) {
            return response()->json(['error' => 'unauthorized'], 401);
        }
        if ($role === 'admin' && ! $user->isAdmin()) {
            return response()->json(['error' => 'forbidden'], 403);
        }
        if ($role === 'teacher' && ! $user->isTeacher()) {
            return response()->json(['error' => 'forbidden'], 403);
        }

        return $next($request);
    }
}
