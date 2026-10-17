<?php
declare(strict_types=1);
namespace OJ\Repository;

use PDO;

// Truy cap DB cho bai nop, lich su, tien do, doi chieu, lop hoc.
final class SubmissionRepository {
  public static function getWithRun(PDO $pdo, int $id): ?array {
    $st = $pdo->prepare('SELECT s.*, r.status, r.verdict, r.score FROM submissions s LEFT JOIN judging_runs r ON r.submission_id=s.id AND r.is_current=1 WHERE s.id=?');
    $st->execute([$id]);
    return $st->fetch() ?: null;
  }
  public static function cases(PDO $pdo, int $sid): array {
    $c = $pdo->prepare('SELECT cr.verdict, cr.time_ms FROM case_results cr JOIN judging_runs r ON r.id=cr.judging_run_id WHERE r.submission_id=? AND r.is_current=1');
    $c->execute([$sid]);
    return $c->fetchAll();
  }
  public static function code(PDO $pdo, int $id): ?array {
    $st = $pdo->prepare('SELECT user_id, source_code FROM submissions WHERE id=?'); $st->execute([$id]);
    return $st->fetch() ?: null;
  }
  public static function history(PDO $pdo, int $uid): array {
    $st = $pdo->prepare('SELECT s.id, s.language, s.created_at, r.verdict, r.score FROM submissions s LEFT JOIN judging_runs r ON r.submission_id=s.id AND r.is_current=1 WHERE s.user_id=? ORDER BY s.id DESC LIMIT 50');
    $st->execute([$uid]);
    return $st->fetchAll();
  }
  public static function progress(PDO $pdo, int $uid): array {
    $st = $pdo->prepare("SELECT COUNT(DISTINCT s.problem_version_id) total, SUM(r.verdict='ACCEPTED') solved FROM submissions s LEFT JOIN judging_runs r ON r.submission_id=s.id AND r.is_current=1 WHERE s.user_id=?");
    $st->execute([$uid]);
    return $st->fetch() ?: [];
  }
  public static function compare(PDO $pdo, int $a, int $b): array {
    $st = $pdo->prepare('SELECT judging_run_id, test_case_id, verdict, time_ms FROM case_results WHERE judging_run_id IN (?,?) ORDER BY test_case_id');
    $st->execute([$a, $b]);
    return $st->fetchAll();
  }
  public static function sourcePair(PDO $pdo, int $a, int $b): array {
    $st = $pdo->prepare('SELECT source_code FROM submissions WHERE id IN (?,?) ORDER BY id');
    $st->execute([$a, $b]);
    return $st->fetchAll();
  }
  public static function currentRun(PDO $pdo, int $sid): ?array {
    $st = $pdo->prepare('SELECT r.status, r.verdict, r.score FROM judging_runs r WHERE r.submission_id=? AND r.is_current=1');
    $st->execute([$sid]);
    return $st->fetch() ?: null;
  }
}
