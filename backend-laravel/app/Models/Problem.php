<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class Problem extends Model
{
    protected $fillable = ['slug', 'title', 'topic', 'difficulty', 'created_by', 'current_version_id'];

    public function versions()
    {
        return $this->hasMany(ProblemVersion::class);
    }

    public function currentVersion()
    {
        return $this->belongsTo(ProblemVersion::class, 'current_version_id');
    }
}
