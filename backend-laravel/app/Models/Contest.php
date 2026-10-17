<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class Contest extends Model
{
    protected $fillable = ['title', 'description', 'starts_at', 'ends_at'];

    protected $casts = ['starts_at' => 'datetime', 'ends_at' => 'datetime'];

    public function problems()
    {
        return $this->hasMany(ContestProblem::class);
    }

    public function isRunning(): bool
    {
        $now = now();
        return $this->starts_at <= $now && $now <= $this->ends_at;
    }
}
