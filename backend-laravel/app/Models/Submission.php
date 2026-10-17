<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class Submission extends Model
{
    protected $fillable = ['user_id', 'problem_version_id', 'language', 'source_code', 'idempotency_key', 'number_of_runs', 'compiler_options', 'command_line_arguments', 'callback_url'];

    public function runs()
    {
        return $this->hasMany(JudgingRun::class);
    }

    public function currentRun()
    {
        return $this->hasOne(JudgingRun::class)->where('is_current', 1);
    }
}
