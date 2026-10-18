<?php
declare(strict_types=1);
namespace OJ\Controller;

use OJ\Auth;
use OJ\Db;
use OJ\Repository\ProblemRepository;
use OJ\Repository\RunRepository;
use OJ\Repository\SubmissionRepository;
use PDO;

// Giang vien: bai tap, bo du lieu, cham lai, doi chieu, lop hoc. Ops: hang doi, worker.
final class AdminController {
  public static function createProblem(PDO $pdo, array $body): void {
    $u = Auth::require('teacher');
    Db::json(ProblemRepository::create($pdo, (int)$u['uid'], $body), 201);
  }
  public static function updateProblem(PDO $pdo, int $id, array $body): void {
    Auth::require('teacher');
    Db::json(ProblemRepository::newVersion($pdo, $id, $body), 201);
  }
  public static function addTestset(PDO $pdo, int $id, array $body): void {
    Auth::require('teacher');
    $cases = $body['cases'] ?? [];
    if (count($cases) < 5) Db::json(['error' => 'need >=5 cases'], 422);
    $ver = ProblemRepository::addTestset($pdo, $id, $cases);
    if (isset($body['checker'])) ProblemRepository::setChecker($pdo, $id, $body['checker'], $body['checker_config'] ?? '');
    Db::json(['testset_version' => $ver], 201);
  }
  public static function rejudge(PDO $pdo, int $sid): void {
    Auth::require('teacher');
    $rid = RunRepository::rejudgeId($pdo, $sid);
    if ($rid === null) Db::json(['error' => 'not found'], 404);
    Db::json(['run_id' => $rid], 201);
  }
  public static function compare(PDO $pdo, int $sid): void {
    Auth::require('teacher');
    Db::json(['rows' => SubmissionRepository::compare($pdo, (int)($_GET['a'] ?? 0), (int)($_GET['b'] ?? 0))]);
  }
  public static function createClass(PDO $pdo, array $body): void {
    Auth::require('teacher');
    Db::json(['class_id' => RunRepository::createClass($pdo, $body['name'] ?? 'Lớp mới')], 201);
  }
  public static function addMember(PDO $pdo, int $cid, array $body): void {
    Auth::require('teacher');
    $uid = RunRepository::findUserId($pdo, $body['email'] ?? '');
    if ($uid === null) Db::json(['error' => 'user not found'], 404);
    RunRepository::addMember($pdo, $cid, $uid, $body['role'] ?? 'student');
    Db::json(['ok' => true]);
  }
  public static function classProgress(PDO $pdo, int $cid): void {
    Auth::require('teacher');
    Db::json(['rows' => RunRepository::classProgress($pdo, $cid)]);
  }
  // --- Ops ---
  public static function queue(PDO $pdo): void {
    Auth::require('admin');
    Db::json(RunRepository::queueStats($pdo));
  }
  public static function workers(PDO $pdo): void {
    Auth::require('admin');
    Db::json(['running' => RunRepository::running($pdo), 'lease_minutes' => 5]);
  }
  public static function requeue(PDO $pdo, int $id): void {
    Auth::require('admin');
    RunRepository::requeue($pdo, $id);
    Db::json(['ok' => true]);
  }
  public static function statistics(PDO $pdo): void {
    Auth::require('admin');
    Db::json(['total_submissions' => RunRepository::totalSubmissions($pdo), 'by_verdict' => RunRepository::statsByVerdict($pdo)]);
  }
}
