<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\User;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Hash;

class AuthController extends Controller
{
    public function register(Request $request)
    {
        $data = $request->validate([
            'email' => 'required|email|unique:users,email',
            'password' => 'required|min:6',
        ]);
        $user = User::create([
            'email' => $data['email'],
            'password_hash' => Hash::make($data['password']),
            'role' => 'student',
        ]);

        return response()->json(['token' => $user->createToken('api')->plainTextToken], 201);
    }

    public function login(Request $request)
    {
        $data = $request->validate(['email' => 'required|email', 'password' => 'required']);
        $user = User::where('email', $data['email'])->first();
        if (! $user || ! Hash::check($data['password'], $user->password_hash)) {
            return response()->json(['error' => 'bad login'], 401);
        }

        return response()->json(['token' => $user->createToken('api')->plainTextToken]);
    }

    public function registerDevice(Request $request)
    {
        $data = $request->validate([
            'expo_token' => 'required|string|max:255',
            'platform' => 'nullable|in:android,ios',
        ]);
        \App\Models\DeviceToken::updateOrCreate(
            ['expo_token' => $data['expo_token']],
            ['user_id' => $request->user()->id, 'platform' => $data['platform'] ?? 'android']
        );

        return response()->json(['registered' => true]);
    }

    public function unregisterDevice(Request $request)
    {
        $data = $request->validate(['expo_token' => 'required|string|max:255']);
        \App\Models\DeviceToken::where('user_id', $request->user()->id)
            ->where('expo_token', $data['expo_token'])->delete();

        return response()->json(['unregistered' => true]);
    }

    public function me(Request $request)
    {
        return response()->json($request->user()->only(['id', 'email', 'role']));
    }
}
