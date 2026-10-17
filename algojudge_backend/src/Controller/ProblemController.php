<?php
declare(strict_types=1);
namespace OJ\Controller;

use OJ\Auth;
use OJ\Db;
use OJ\Repository\ProblemRepository;
use PDO;

// Bai tap nguoi hoc: danh sach, chi tiet, nhap, chay thu.
final class ProblemController {
  public static function list(PDO $pdo): void {
    Auth::require();
    Db::json(['problems' => ProblemRepository::list($pdo, $_GET['topic'] ?? null, $_GET['difficulty'] ?? null)]);
  }
  public static function get(PDO $pdo, int $id): void {
    Auth::require();
    $r = ProblemRepository::get($pdo, $id);
    if (!$r) Db::json(['error' => 'not found'], 404);
    Db::json($r); // khong bao gom test_cases kin
  }
  public static function saveDraft(PDO $pdo, int $id, array $body): void {
    $u = Auth::require();
    ProblemRepository::saveDraft($pdo, (int)$u['uid'], $id, $body['language'] ?? 'python', $body['code'] ?? '');
    Db::json(['ok' => true]);
  }
  public static function getDraft(PDO $pdo, int $id): void {
    $u = Auth::require();
    Db::json(ProblemRepository::getDraft($pdo, (int)$u['uid'], $id) ?: new \stdClass());
  }
}
