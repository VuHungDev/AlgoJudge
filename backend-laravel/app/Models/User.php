<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Attributes\Hidden;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Foundation\Auth\User as Authenticatable;
use Laravel\Sanctum\HasApiTokens;

#[Hidden(['password_hash'])]
class User extends Authenticatable
{
    use HasApiTokens, HasFactory;

    protected $fillable = ['email', 'password_hash', 'role'];

    public function isTeacher(): bool
    {
        return in_array($this->role, ['teacher', 'admin'], true);
    }

    public function isAdmin(): bool
    {
        return $this->role === 'admin';
    }
}
