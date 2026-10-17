<?php
declare(strict_types=1);
namespace OJ\Judge;

// Quy tac so sanh cong bo trong docs/judge-rules.md:
// bo khoang trang cuoi dong, bo dong trang cuoi, so sanh theo dong.
final class Comparator {
  public static function normalize(string $s): string {
    $s = str_replace(["\r\n", "\r"], "\n", $s);
    $lines = explode("\n", $s);
    $lines = array_map('rtrim', $lines);
    while ($lines && end($lines) === '') array_pop($lines);
    return implode("\n", $lines);
  }
  public static function match(string $actual, string $expected): bool {
    return self::normalize($actual) === self::normalize($expected);
  }
  // Loc stderr truoc khi luu: cat bo moi dong > 500 ky tu, toi da 2KB, khong kem du lieu test.
  public static function filterStderr(string $s): string {
    $lines = explode("\n", substr($s, 0, 8192));
    $lines = array_map(fn($l) => mb_substr($l, 0, 500), $lines);
    return mb_substr(implode("\n", array_slice($lines, 0, 20)), 0, 2000);
  }
  public static function aggregate(array $caseVerdicts): string {
    foreach ($caseVerdicts as $v) {
      if (in_array($v, ['SYSTEM_ERROR'], true)) return 'SYSTEM_ERROR';
    }
    foreach (['COMPILE_ERROR','RUNTIME_ERROR','TIME_LIMIT_EXCEEDED','MEMORY_LIMIT_EXCEEDED','WRONG_ANSWER'] as $v) {
      if (in_array($v, $caseVerdicts, true)) return $v;
    }
    return 'ACCEPTED';
  }
  // Checker tuy bien dang sai so (muc 17): dung cho bai so thuc co nhieu dap an gan dung.
  // So sanh theo token so: moi token so lech nhau trong eps thi coi nhu khong khac.
  public static function matchFloat(string $actual, string $expected, float $eps = 1e-6): bool {
    $tok = fn(string $s): array => preg_split('/\s+/', trim(self::normalize($s))) ?: [];
    $a = $tok($actual); $b = $tok($expected);
    if (count($a) !== count($b)) return false;
    foreach ($a as $i => $ta) {
      $tb = $b[$i];
      if (is_numeric($ta) && is_numeric($tb)) {
        if (abs((float)$ta - (float)$tb) > $eps) return false;
      } elseif ($ta !== $tb) return false;
    }
    return true;
  }
  // Cham theo subtask (muc 17): $cases = [['group'=>'default','verdict'=>'ACCEPTED','weight'=>1], ...].
  // Diem = tong weight nhom AC / tong weight, lam tron 0..100.
  public static function scoreSubtasks(array $cases): int {
    $byGroup = [];
    foreach ($cases as $c) {
      $g = $c['group'] ?? 'default';
      $w = (int)($c['weight'] ?? 1);
      $byGroup[$g]['w'] = max($w, $byGroup[$g]['w'] ?? 0);
      $byGroup[$g]['ok'] = ($byGroup[$g]['ok'] ?? true) && (($c['verdict'] ?? '') === 'ACCEPTED');
    }
    $tot = 0; $got = 0;
    foreach ($byGroup as $g) { $tot += $g['w']; if ($g['ok']) $got += $g['w']; }
    return $tot ? (int)round(100 * $got / $tot) : 0;
  }
}
