<?php
declare(strict_types=1);
namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class ContestAccess extends Model
{
    public $timestamps = false;
    protected $fillable = ['contest_id', 'user_id'];

    public function contest() { return $this->belongsTo(Contest::class); }
    public function user()    { return $this->belongsTo(User::class); }
}
