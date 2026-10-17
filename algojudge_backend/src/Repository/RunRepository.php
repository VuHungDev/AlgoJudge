<?php
declare(strict_types=1);
namespace OJ\Repository;

use PDO;

// Truy cap DB cho hang doi, worker, cham lai, lop hoc, thong ke.
final class RunRepository {
  public static function rejudgeId(PDO $pdo, int $sid): ?int {
    $st = $pdo->prepare('SELECT pv.testset_version FROM submissions s JOIN problem_versions pv ON pv.id=s.problem_version_id WHERE s.id=?');
    $st->execute([$sid]); $r = $st->fetch();
    if (!$r) return null;
    $pdo->prepare('UPDATE judging_runs SET is_current=0 WHERE submission_id=?')->execute([$sid]);
    $pdo->prepare('INSERT INTO judging_runs(submission_id,testset_version,status,is_current) VALUES(?,?,?,?)')
      ->execute([$sid, $r['testset_version'], 'QUEUED', 1]);
    return (int)$pdo->lastInsertId();
  }
  public static function queueStats(PDO $pdo): array {
    return $pdo->query('SELECT status, COUNT(*) c FROM judging_runs GROUP BY status')->fetchAll();
  }
  public static function running(PDO $pdo): array {
    return $pdo->query("SELECT id, status, lease_expires_at, attempt FROM judging_runs WHERE status='RUNNING'")->fetchAll();
  }
  public static function requeue(PDO $pdo, int $id): void {
    $pdo->prepare('UPDATE judging_runs SET status=?, attempt=attempt+1 WHERE id=?')->execute(['QUEUED', $id]);
  }
  public static function statsByVerdict(PDO $pdo): array {
    return $pdo->query('SELECT verdict, COUNT(*) c FROM judging_runs WHERE verdict IS NOT NULL GROUP BY verdict')->fetchAll();
  }
  public static function totalSubmissions(PDO $pdo): int {
    return (int)$pdo->query('SELECT COUNT(*) FROM submissions')->fetchColumn();
  }
  public static function createClass(PDO $pdo, string $name): int {
    $pdo->prepare('INSERT INTO classes(name) VALUES(?)')->execute([$name]);
    return (int)$pdo->lastInsertId();
  }
  public static function addMember(PDO $pdo, int $cid, int $uid, string $role): void {
    $pdo->prepare('INSERT IGNORE INTO class_members(class_id,user_id,role) VALUES(?,?,?)')->execute([$cid, $uid, $role]);
  }
  public static function findUserId(PDO $pdo, string $email): ?int {
    $st = $pdo->prepare('SELECT id FROM users WHERE email=?'); $st->execute([$email]);
    $v = $st->fetchColumn();
    return $v === false ? null : (int)$v;
  }
  public static function classProgress(PDO $pdo, int $cid): array {
    $st = $pdo->prepare("SELECT m.user_id, u.email, COUNT(DISTINCT s.id) subs, SUM(r.verdict='ACCEPTED') solved FROM class_members m JOIN users u ON u.id=m.user_id LEFT JOIN submissions s ON s.user_id=m.user_id LEFT JOIN judging_runs r ON r.submission_id=s.id AND r.is_current=1 WHERE m.class_id=? GROUP BY m.user_id");
    $st->execute([$cid]);
    return $st->fetchAll();
  }
}
