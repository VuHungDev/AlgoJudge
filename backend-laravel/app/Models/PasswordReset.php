<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class PasswordReset extends Model
{
    protected $fillable = ['email', 'otp_hash', 'expires_at', 'attempts', 'used_at'];

    protected $casts = ['expires_at' => 'datetime', 'used_at' => 'datetime'];

    public function isExpired(): bool
    {
        return $this->used_at !== null || $this->expires_at->isPast();
    }
}
