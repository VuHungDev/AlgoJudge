<?php
declare(strict_types=1);
namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class ActivityLog extends Model
{
    public $timestamps = false;
    protected $fillable = [
        'user_id', 'actor_role', 'action',
        'resource_type', 'resource_id', 'detail', 'ip',
    ];

    // Ghi 1 dong log; bat ky loi nao deu bo qua de khong lam hong request chinh.
    public static function record(
        string $action,
        ?string $resourceType = null,
        int|null $resourceId = null,
        string|array|null $detail = null,
        ?int $userId = null,
        ?string $role = null,
        ?string $ip = null
    ): void {
        try {
            $user = $userId ?? (auth('sanctum')->id());
            $r    = $role ?? (auth('sanctum')->user()?->role);
            static::create([
                'user_id'       => $user,
                'actor_role'    => $r,
                'action'        => $action,
                'resource_type' => $resourceType,
                'resource_id'   => $resourceId,
                'detail'        => is_array($detail) ? json_encode($detail, JSON_UNESCAPED_UNICODE) : $detail,
                'ip'            => $ip ?? request()?->ip(),
            ]);
        } catch (\Throwable) {
            // nhat ky loi khong duoc lam hong response
        }
    }
}
