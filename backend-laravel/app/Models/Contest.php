<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class Contest extends Model
{
    protected $fillable = ['title', 'description', 'starts_at', 'ends_at', 'is_public', 'created_by'];

    protected $casts = ['starts_at' => 'datetime', 'ends_at' => 'datetime'];

    public function problems()
    {
        return $this->hasMany(ContestProblem::class);
    }

    public function accessList()
    {
        return $this->hasMany(ContestAccess::class);
    }

    // Kiem tra user co quyen xem/tham gia contest nay khong.
    public function isAccessibleBy(int $userId, string $role): bool
    {
        if ($this->is_public) return true;
        if (in_array($role, ['teacher', 'admin'])) return true;
        return $this->accessList()->where('user_id', $userId)->exists();
    }

    public function isRunning(): bool
    {
        $now = now();
        return $this->starts_at <= $now && $now <= $this->ends_at;
    }
}
