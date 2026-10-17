<?php
declare(strict_types=1);
namespace OJ\Middleware;

use OJ\Db;

// Rate limit don gian theo user + hanh dong (file trong tmp, cua so 60s).
final class RateLimit {
  public static function check(int $uid, string $action, int $maxPerMin): void {
    $f = sys_get_temp_dir() . "/oj_rl_{$uid}_{$action}.json";
    $now = time();
    $st = file_exists($f) ? (json_decode(@file_get_contents($f), true) ?: [0, 0]) : [0, 0];
    if ($now - $st[0] >= 60) $st = [$now, 0];
    if ($st[1] >= $maxPerMin) Db::json(['error' => 'too many requests'], 429);
    $st[1]++;
    @file_put_contents($f, json_encode($st));
  }
}
