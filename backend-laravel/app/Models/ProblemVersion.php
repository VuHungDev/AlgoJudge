<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class ProblemVersion extends Model
{
    protected $fillable = ['problem_id', 'version_no', 'statement', 'input_spec', 'output_spec', 'public_examples', 'time_limit_ms', 'memory_limit_kb', 'testset_version', 'score', 'checker', 'checker_config'];

    protected $casts = ['public_examples' => 'array'];

    public function problem()
    {
        return $this->belongsTo(Problem::class);
    }

    public function testCases()
    {
        return $this->hasMany(TestCase::class);
    }
}
