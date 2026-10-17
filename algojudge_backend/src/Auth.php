<?php
declare(strict_types=1);
namespace OJ;

final class Auth {
  public static function secret(): string { return getenv('JWT_SECRET') ?: 'change_me'; }
  public static function issue(int $uid, string $role): string {
    $h = rtrim(strtr(base64_encode(json_encode(['alg' => 'HS256', 'typ' => 'JWT'])), '+/', '-_'), '=');
    $p = rtrim(strtr(base64_encode(json_encode(['uid' => $uid, 'role' => $role, 'exp' => time() + 86400])), '+/', '-_'), '=');
    $s = rtrim(strtr(base64_encode(hash_hmac('sha256', "$h.$p", self::secret(), true)), '+/', '-_'), '=');
    return "$h.$p.$s";
  }
  public static function user(): ?array {
    // Apache co the khong dua Authorization vao $_SERVER — doc them cac nguon du phong.
    // EventSource khong gui duoc header: cho phep ?token= cho endpoint SSE.
    $h = $_SERVER['HTTP_AUTHORIZATION'] ?? $_SERVER['REDIRECT_HTTP_AUTHORIZATION'] ?? '';
    if ($h === '' && function_exists('getallheaders')) {
      $all = getallheaders();
      foreach ($all as $k => $v) { if (strtolower($k) === 'authorization') { $h = $v; break; } }
    }
    if ($h === '' && isset($_GET['token'])) $h = 'Bearer ' . $_GET['token'];
    if (!str_starts_with($h, 'Bearer ')) return null;
    $parts = explode('.', substr($h, 7));
    if (count($parts) !== 3) return null;
    [$h64, $p64, $sig] = $parts;
    $expect = rtrim(strtr(base64_encode(hash_hmac('sha256', "$h64.$p64", self::secret(), true)), '+/', '-_'), '=');
    if (!hash_equals($expect, $sig)) return null;
    $p = json_decode(base64_decode(strtr($p64, '-_', '+/')), true);
    if (!$p || ($p['exp'] ?? 0) < time()) return null;
    return $p;
  }
  public static function require(?string $role = null): array {
    $u = self::user();
    if (!$u) Db::json(['error' => 'unauthorized'], 401);
    if ($role && $u['role'] !== $role && $u['role'] !== 'admin') Db::json(['error' => 'not found'], 404);
    return $u;
  }
}
