<?php
declare(strict_types=1);
// AlgoJudge API — chi dinh tuyen. Logic nam trong Controller -> Service/Repository (muc 3.1 Claude.md).
require __DIR__ . '/../src/Db.php';
require __DIR__ . '/../src/Auth.php';
require __DIR__ . '/../src/Config.php';
require __DIR__ . '/../src/Judge/Comparator.php';
require __DIR__ . '/../src/Judge/Similarity.php';
require __DIR__ . '/../src/Service/JudgeService.php';
require __DIR__ . '/../src/Middleware/RateLimit.php';
require __DIR__ . '/../src/Repository/ProblemRepository.php';
require __DIR__ . '/../src/Repository/SubmissionRepository.php';
require __DIR__ . '/../src/Repository/RunRepository.php';
require __DIR__ . '/../src/Controller/ProblemController.php';
require __DIR__ . '/../src/Controller/SubmissionController.php';
require __DIR__ . '/../src/Controller/AdminController.php';

use OJ\Db; use OJ\Auth;
use OJ\Controller\ProblemController; use OJ\Controller\SubmissionController; use OJ\Controller\AdminController;

header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Headers: Content-Type, Authorization, Idempotency-Key');
header('Access-Control-Allow-Methods: GET,POST,PUT,DELETE,OPTIONS');
if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') exit;

$method = $_SERVER['REQUEST_METHOD'];
$path = parse_url($_SERVER['REQUEST_URI'], PHP_URL_PATH);
$path = preg_replace('#^/api/v1#', '', $path) ?: '/';
$body = json_decode(file_get_contents('php://input'), true) ?? [];
$pdo = Db::pdo();

$route = fn($m, $re) => $method === $m && preg_match($re, $path, $mm) ? $mm : null;

// --- Auth ---
if ($m = $route('POST', '#^/auth/(register|login)$#')) {
  $email = trim($body['email'] ?? ''); $pass = $body['password'] ?? '';
  if ($m[1] === 'register') {
    if (!filter_var($email, FILTER_VALIDATE_EMAIL) || strlen($pass) < 6) Db::json(['error' => 'bad input'], 422);
    try {
      $pdo->prepare('INSERT INTO users(email,password_hash,role) VALUES(?,?,?)')
        ->execute([$email, password_hash($pass, PASSWORD_BCRYPT), 'student']);
      $id = (int)$pdo->lastInsertId();
    } catch (PDOException $e) { Db::json(['error' => 'email taken'], 409); }
    Db::json(['token' => Auth::issue($id, 'student')], 201);
  }
  $st = $pdo->prepare('SELECT * FROM users WHERE email=?'); $st->execute([$email]);
  $u = $st->fetch();
  if (!$u || !password_verify($pass, $u['password_hash'])) Db::json(['error' => 'bad login'], 401);
  Db::json(['token' => Auth::issue((int)$u['id'], $u['role'])]);
}
if ($route('GET', '#^/me$#')) { $u = Auth::require(); Db::json($u); }

// --- Problems (nguoi hoc) ---
if ($route('GET', '#^/problems$#')) ProblemController::list($pdo);
if ($m = $route('GET', '#^/problems/(\d+)$#')) ProblemController::get($pdo, (int)$m[1]);
if ($m = $route('PUT', '#^/problems/(\d+)/draft$#')) ProblemController::saveDraft($pdo, (int)$m[1], $body);
if ($m = $route('GET', '#^/problems/(\d+)/draft$#')) ProblemController::getDraft($pdo, (int)$m[1]);
if ($route('POST', '#^/run$#')) SubmissionController::run($pdo, $body);

// --- Submit (port SubmissionsController Ruby: create/batch/destroy) ---
if ($route('POST', '#^/submissions$#')) SubmissionController::create($pdo, $body);
if ($route('GET', '#^/submissions/batch$#')) SubmissionController::batchShow($pdo);
if ($m = $route('DELETE', '#^/submissions/(\d+)$#')) SubmissionController::destroy($pdo, (int)$m[1]);
if ($m = $route('GET', '#^/submissions/(\d+)/events$#')) SubmissionController::events($pdo, (int)$m[1]);
if ($m = $route('GET', '#^/submissions/(\d+)/code$#')) SubmissionController::code($pdo, (int)$m[1]);
if ($m = $route('GET', '#^/submissions/(\d+)$#')) SubmissionController::get($pdo, (int)$m[1]);
if ($route('GET', '#^/me/submissions$#')) SubmissionController::history($pdo);
if ($route('GET', '#^/me/progress$#')) SubmissionController::progress($pdo);

// --- Giang vien ---
if ($route('POST', '#^/admin/problems$#')) AdminController::createProblem($pdo, $body);
if ($m = $route('PUT', '#^/admin/problems/(\d+)$#')) AdminController::updateProblem($pdo, (int)$m[1], $body);
if ($m = $route('POST', '#^/admin/problems/(\d+)/testsets$#')) AdminController::addTestset($pdo, (int)$m[1], $body);
if ($m = $route('POST', '#^/admin/submissions/(\d+)/rejudge$#')) AdminController::rejudge($pdo, (int)$m[1]);
if ($m = $route('GET', '#^/admin/submissions/(\d+)/compare#')) AdminController::compare($pdo, (int)$m[1]);
if ($m = $route('GET', '#^/admin/submissions/(\d+)/similarity/(\d+)$#')) SubmissionController::similarity($pdo, (int)$m[1], (int)$m[2]);
if ($route('POST', '#^/admin/classes$#')) AdminController::createClass($pdo, $body);
if ($m = $route('POST', '#^/admin/classes/(\d+)/members$#')) AdminController::addMember($pdo, (int)$m[1], $body);
if ($m = $route('GET', '#^/admin/classes/(\d+)/progress$#')) AdminController::classProgress($pdo, (int)$m[1]);

// --- Tuong thich cu: languages / statuses / about / version / statistics ---
if ($route('GET', '#^/languages$#')) {
  Auth::require();
  Db::json(['languages' => [
    ['id' => 1, 'name' => 'Python (3.12)', 'source_file' => 'main.py', 'compile_cmd' => null, 'run_cmd' => 'python3 main.py'],
    ['id' => 2, 'name' => 'C++ (GCC 13)', 'source_file' => 'main.cpp', 'compile_cmd' => 'g++ -O2 -std=c++17 -o /tmp/a main.cpp', 'run_cmd' => '/tmp/a'],
    ['id' => 3, 'name' => 'JavaScript (Node 22)', 'source_file' => 'main.js', 'compile_cmd' => null, 'run_cmd' => 'node main.js'],
  ]]);
}
if ($route('GET', '#^/statuses$#')) {
  Auth::require();
  Db::json(['statuses' => [
    ['id' => 1, 'name' => 'In Queue'], ['id' => 2, 'name' => 'Processing'],
    ['id' => 3, 'name' => 'Accepted'], ['id' => 4, 'name' => 'Wrong Answer'],
    ['id' => 5, 'name' => 'Time Limit Exceeded'], ['id' => 6, 'name' => 'Compilation Error'],
    ['id' => 7, 'name' => 'Runtime Error'], ['id' => 13, 'name' => 'Internal Error'],
  ]]);
}
if ($route('GET', '#^/about$#')) { Db::json(['name' => 'AlgoJudge', 'version' => '1.0.0', 'homepage' => 'AlgoJudge OJ']); }
if ($route('GET', '#^/version$#')) { header('Content-Type: text/plain'); echo '1.0.0'; exit; }
if ($route('GET', '#^/statistics$#')) AdminController::statistics($pdo);
// Port tu InfoController (Ruby): config_info (an toan), license, system_info don gian.
if ($route('GET', '#^/config_info$#')) Db::json(\OJ\Config::info());
if ($route('GET', '#^/license$#')) { header('Content-Type: text/plain'); echo @file_get_contents(__DIR__ . '/../../LICENSE') ?: 'MIT'; exit; }
if ($route('GET', '#^/system_info$#')) {
  $cpu = @shell_exec("nproc 2>/dev/null || grep -c ^processor /proc/cpuinfo 2>/dev/null") ?: '?';
  $mem = @shell_exec("free -h 2>/dev/null | awk 'NR==2{print $2}'") ?: '?';
  Db::json(['cpu_count' => trim((string)$cpu), 'mem_total' => trim((string)$mem), 'php' => PHP_VERSION]);
}

// --- Ops ---
if ($route('GET', '#^/ops/queue$#')) AdminController::queue($pdo);
if ($route('GET', '#^/ops/workers$#')) AdminController::workers($pdo);
if ($m = $route('POST', '#^/ops/runs/(\d+)/requeue$#')) AdminController::requeue($pdo, (int)$m[1]);

Db::json(['error' => 'not found'], 404);
