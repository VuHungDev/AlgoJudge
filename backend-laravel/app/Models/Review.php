<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class Review extends Model
{
    protected $fillable = ['submission_id', 'reviewer_id', 'score', 'comment'];
}
