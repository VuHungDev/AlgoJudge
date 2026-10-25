<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class Clazz extends Model
{
    protected $table = 'classes';

    protected $fillable = ['name', 'created_by'];
}
