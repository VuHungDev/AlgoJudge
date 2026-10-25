<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class Assignment extends Model
{
    protected $fillable = ['problem_id', 'class_id', 'user_id', 'created_by', 'due_at', 'note'];

    protected $casts = ['due_at' => 'datetime'];
}
