<?php
declare(strict_types=1);
namespace OJ\Judge;

// Nhom tu viet (muc 17): do tuong tu ma nop de ho tro chong dao van.
// Chuan hoa: bo comment/string, tach token, so sanh Jaccard shingle k=3.
final class Similarity {
  public static function tokens(string $code): array {
    $code = preg_replace('#//.*|/\*.*?\*/#s', ' ', $code) ?? ' ';
    $code = preg_replace('/#.*/', ' ', $code) ?? ' ';
    $code = preg_replace('/"(?:[^"\\\\]|\\\\.)*"|\'(?:[^\'\\\\]|\\\\.)*\'/', ' "STR" ', $code) ?? ' ';
    $code = strtolower($code);
    preg_match_all('/[a-z_][a-z0-9_]*|[0-9]+|[^\s\w]/u', $code, $m);
    return $m[0] ?: [];
  }
  public static function shingles(array $tokens, int $k = 3): array {
    $n = count($tokens);
    if ($n < $k) return [implode(' ', $tokens)];
    $out = [];
    for ($i = 0; $i <= $n - $k; $i++) $out[] = implode(' ', array_slice($tokens, $i, $k));
    return array_values(array_unique($out));
  }
  // Tra ve 0.0..1.0 — ti le shingle chung / hop (Jaccard).
  public static function score(string $a, string $b): float {
    $sa = array_flip(self::shingles(self::tokens($a)));
    $sb = array_flip(self::shingles(self::tokens($b)));
    if (!$sa && !$sb) return 1.0;
    if (!$sa || !$sb) return 0.0;
    $inter = count(array_intersect_key($sa, $sb));
    $union = count($sa + $sb);
    return $union ? $inter / $union : 0.0;
  }
}
