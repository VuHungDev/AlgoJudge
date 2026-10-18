<?php

namespace App\Services;

use App\Models\DeviceToken;

// Gui thong bao day qua Expo Push API khi bai nop cham xong.
// Khong nem loi ra ngoai: thong bao that bai khong duoc lam hong ket qua cham.
class PushNotifier
{
    public static function notifySubmissionDone(int $userId, int $submissionId, ?string $verdict, ?int $score): void
    {
        $tokens = DeviceToken::where('user_id', $userId)->pluck('expo_token')->all();
        if (! $tokens) {
            return;
        }
        $title = $verdict === 'ACCEPTED' ? 'Bài được chấp nhận' : 'Đã chấm xong';
        $body = "#{$submissionId}: ".($verdict ?? 'UNKNOWN').($score !== null ? " ({$score} điểm)" : '');
        $messages = array_map(fn ($t) => [
            'to' => $t,
            'title' => $title,
            'body' => $body,
            'data' => ['submission_id' => $submissionId, 'verdict' => $verdict],
        ], $tokens);

        $ctx = stream_context_create(['http' => [
            'method' => 'POST',
            'header' => "Content-Type: application/json\r\nAccept: application/json",
            'content' => json_encode($messages),
            'timeout' => 5,
            'ignore_errors' => true,
        ]]);
        try {
            @file_get_contents('https://exp.host/--/api/v2/push/send', false, $ctx);
        } catch (\Throwable) {
            // Bo qua: thong bao khong phai nghiep vu bat buoc.
        }
    }
}
