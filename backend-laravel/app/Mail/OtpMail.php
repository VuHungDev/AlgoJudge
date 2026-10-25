<?php

namespace App\Mail;

use Illuminate\Bus\Queueable;
use Illuminate\Mail\Mailable;
use Illuminate\Mail\Mailables\Content;
use Illuminate\Mail\Mailables\Envelope;
use Illuminate\Queue\SerializesModels;

class OtpMail extends Mailable
{
    use Queueable, SerializesModels;

    public function __construct(public string $otp, public int $ttlMinutes = 10) {}

    public function envelope(): Envelope
    {
        return new Envelope(subject: '[AlgoJudge] Mã OTP đặt lại mật khẩu');
    }

    public function content(): Content
    {
        return new Content(text: 'emails.otp_plain');
    }
}
