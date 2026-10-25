<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Mail\OtpMail;
use App\Models\ActivityLog;
use App\Models\PasswordReset;
use App\Models\User;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\Mail;

class AuthController extends Controller
{
    // Mat khau manh: >=8 ky tu, co hoa, thuong, so, ky tu dac biet.
    public static function strongPassword(string $pw): bool
    {
        return strlen($pw) >= 8
            && preg_match('/[A-Z]/', $pw)
            && preg_match('/[a-z]/', $pw)
            && preg_match('/[0-9]/', $pw)
            && preg_match('/[^A-Za-z0-9]/', $pw);
    }

    public function register(Request $request)
    {
        $data = $request->validate([
            'email' => 'required|email|unique:users,email',
            'password' => 'required|string|min:8|max:255',
            'display_name' => 'nullable|string|max:100',
        ]);
        if (! self::strongPassword($data['password'])) {
            return response()->json(['error' => 'weak password'], 422);
        }
        $user = User::create([
            'email' => $data['email'],
            'password_hash' => Hash::make($data['password']),
            'role' => 'student',
            'display_name' => $data['display_name'] ?? null,
        ]);

        return response()->json(['token' => $user->createToken('api')->plainTextToken]);
    }

    public function login(Request $request)
    {
        $data = $request->validate(['email' => 'required|email', 'password' => 'required']);
        $user = User::where('email', $data['email'])->first();
        if (! $user || ! Hash::check($data['password'], $user->password_hash)) {
            ActivityLog::record('login_failed', 'user', null, $data['email'], null, null, $request->ip());
            return response()->json(['error' => 'bad login'], 401);
        }
        ActivityLog::record('login', 'user', $user->id, null, $user->id, $user->role, $request->ip());
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
        return response()->json($request->user()->only(['id', 'email', 'role', 'display_name', 'created_at']));
    }

    public function updateProfile(Request $request)
    {
        $data = $request->validate([
            'display_name' => 'nullable|string|max:100',
            'password' => 'nullable|string|min:8|max:255',
            'current_password' => 'nullable|string',
        ]);
        $u = $request->user();
        if (isset($data['display_name'])) {
            $u->display_name = $data['display_name'];
        }
        if (! empty($data['password'])) {
            // Admin la tai khoan van hanh he thong: khong doi mat khau qua API.
            if ($u->role === 'admin') {
                return response()->json(['error' => 'not allowed for admin'], 403);
            }
            if (empty($data['current_password']) || ! Hash::check($data['current_password'], $u->password_hash)) {
                return response()->json(['error' => 'current password incorrect'], 422);
            }
            if (! self::strongPassword($data['password'])) {
                return response()->json(['error' => 'weak password'], 422);
            }
            $u->password_hash = Hash::make($data['password']);
        }
        $u->save();

        return response()->json($u->only(['id', 'email', 'role', 'display_name']));
    }

    // Quen mat khau: tao OTP 6 so, luu hash, gui mail. Rate-limit 60s/email.
    // Tra loi chung chung de khong lo email co ton tai hay khong.
    public function forgot(Request $request)
    {
        $data = $request->validate(['email' => 'required|email']);
        $email = strtolower(trim($data['email']));
        $recent = PasswordReset::where('email', $email)
            ->where('created_at', '>', now()->subMinute())->exists();
        if ($recent) {
            return response()->json(['error' => 'please wait 60s before requesting again'], 429);
        }
        if (User::where('email', $email)->exists()) {
            $otp = (string) random_int(100000, 999999);
            PasswordReset::create([
                'email' => $email,
                'otp_hash' => Hash::make($otp),
                'expires_at' => now()->addMinutes(10),
            ]);
            try {
                Mail::to($email)->send(new OtpMail($otp, 10));
            } catch (\Throwable $e) {
                report($e);
            }
        }

        return response()->json(['ok' => true, 'message' => 'if the email exists, an OTP was sent']);
    }

    // Dat lai mat khau bang OTP (toi da 5 lan thu sai).
    public function reset(Request $request)
    {
        $data = $request->validate([
            'email' => 'required|email',
            'otp' => 'required|string|max:10',
            'password' => 'required|string|min:8|max:255',
        ]);
        if (! self::strongPassword($data['password'])) {
            return response()->json(['error' => 'weak password'], 422);
        }
        $email = strtolower(trim($data['email']));
        $row = PasswordReset::where('email', $email)
            ->whereNull('used_at')
            ->orderByDesc('id')->first();
        if (! $row || $row->isExpired()) {
            return response()->json(['error' => 'otp expired or not found'], 422);
        }
        if ($row->attempts >= 5) {
            return response()->json(['error' => 'too many attempts'], 429);
        }
        if (! Hash::check(trim($data['otp']), $row->otp_hash)) {
            $row->increment('attempts');

            return response()->json(['error' => 'invalid otp'], 422);
        }
        $user = User::where('email', $email)->first();
        if (! $user) {
            return response()->json(['error' => 'otp expired or not found'], 422);
        }
        // Admin khong dat lai mat khau qua OTP.
        if ($user->role === 'admin') {
            return response()->json(['error' => 'not allowed for admin'], 403);
        }
        $user->password_hash = Hash::make($data['password']);
        $user->save();
        $row->used_at = now();
        $row->save();

        return response()->json(['ok' => true]);
    }
}
