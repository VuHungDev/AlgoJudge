<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class TestCase extends Model
{
    protected $fillable = ['problem_version_id', 'testset_version', 'ordinal', 'input_data', 'expected_output', 'is_public', 'weight', 'group_name'];

    protected $hidden = ['input_data', 'expected_output'];
}
