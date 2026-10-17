<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class CaseResult extends Model
{
    protected $fillable = ['judging_run_id', 'test_case_id', 'verdict', 'time_ms', 'memory_kb', 'stderr_excerpt'];
}
