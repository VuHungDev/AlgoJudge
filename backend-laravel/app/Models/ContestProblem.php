<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class ContestProblem extends Model
{
    protected $fillable = ['contest_id', 'problem_version_id', 'points', 'ordinal'];
}
