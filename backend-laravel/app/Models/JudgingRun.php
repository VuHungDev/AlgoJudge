<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class JudgingRun extends Model
{
    protected $fillable = ['submission_id', 'testset_version', 'status', 'verdict', 'score', 'attempt', 'lease_token', 'lease_expires_at', 'is_current', 'started_at', 'finished_at'];

    public function submission()
    {
        return $this->belongsTo(Submission::class);
    }

    public function caseResults()
    {
        return $this->hasMany(CaseResult::class, 'judging_run_id');
    }
}
