<?php
declare(strict_types=1);
namespace OJ\Controller;

use OJ\Auth;
use OJ\Config;
use OJ\Db;
use OJ\Judge\Comparator;
use OJ\Judge\Similarity;
use OJ\Middleware\RateLimit;
use OJ\Repository\SubmissionRepository;
use OJ\Service\JudgeService;
use PDO;

// Nop bai, chay thu, lich su, tien do, SSE.
final class SubmissionController {
  // Port tu SubmissionsController#create + check_queue_size/check_wait (Ruby).
  public static function create(PDO $pdo, array $body): void {
    if (Config::boolOff('MAINTENANCE_MODE')) Db::json(['error' => Config::str('MAINTENANCE_MESSAGE', 'maintenance')], 503);
    $b64 = ($_GET['base64_encoded'] ?? '') !== 'false';
    $decode = fn($v) => $b64 && is_string($v) && $v !== '' ? (base64_decode($v, true) ?: $v) : $v;
    $body['source_code'] = $decode($body['source_code'] ?? '');
    $body['stdin'] = $decode($body['stdin'] ?? '');
    $body['expected_output'] = $decode($body['expected_output'] ?? '');
    if (!Config::boolOn('ENABLE_WAIT_RESULT') && ($_GET['wait'] ?? '') === 'true') Db::json(['error' => 'wait not allowed'], 422);
    // Gioi han hang doi (check_queue_size).
    $q = (int)$pdo->query("SELECT COUNT(*) FROM judging_runs WHERE status IN ('QUEUED','RUNNING')")->fetchColumn();
    $batch = self::batchPayload($body);
    if ($batch === null && $q + 1 > Config::maxQueueSize()) Db::json(['error' => 'queue is full'], 503);
    if ($batch !== null) self::batchCreate($pdo, $batch, $q);
    self::submit($pdo, $body);
  }
  // Port tu batch_create (Ruby): khong ho tro wait; gioi han kich thuoc batch.
  private static function batchPayload(array $body): ?array {
    if (!isset($body['submissions']) || !is_array($body['submissions'])) return null;
    if (!Config::boolOn('ENABLE_BATCHED_SUBMISSIONS')) Db::json(['error' => 'batched submissions are not allowed'], 422);
    return $body['submissions'];
  }
  private static function batchCreate(PDO $pdo, array $items, int $queued): void {
    if (count($items) === 0) Db::json(['error' => 'there should be at least one submission in a batch'], 422);
    if (count($items) > Config::maxBatchSize()) Db::json(['error' => 'number of submissions in a batch should be less than or equal to ' . Config::maxBatchSize()], 422);
    if ($queued + count($items) > Config::maxQueueSize()) Db::json(['error' => 'queue is full'], 503);
    $u = Auth::require();
    $resp = [];
    $anyOk = false;
    foreach ($items as $i => $it) {
      if (!is_array($it)) { $resp[] = ['error' => 'bad item']; continue; }
      try {
        $r = JudgeService::submit((int)$u['uid'], (int)($it['problem_version_id'] ?? 0), $it['language'] ?? 'python', $it['source_code'] ?? '', 'batch:' . date('Ymd') . ':' . $i . ':' . bin2hex(random_bytes(4)), [
          'number_of_runs' => $it['number_of_runs'] ?? null,
          'compiler_options' => $it['compiler_options'] ?? '',
          'command_line_arguments' => $it['command_line_arguments'] ?? '',
          'callback_url' => $it['callback_url'] ?? '',
        ]);
        $resp[] = ['submission_id' => $r['submission_id']];
        $anyOk = true;
      } catch (\Throwable $e) { $resp[] = ['error' => $e->getMessage()]; }
    }
    Db::json($resp, $anyOk ? 201 : 422);
  }
  // Port tu batch_show (Ruby): tra nhieu bai theo danh sach id, thieu -> null.
  public static function batchShow(PDO $pdo): void {
    $u = Auth::require();
    $ids = array_filter(array_map('intval', explode(',', (string)($_GET['ids'] ?? ''))));
    if (count($ids) === 0) Db::json(['error' => 'there should be at least one submission in a batch'], 422);
    if (count($ids) > Config::maxBatchSize()) Db::json(['error' => 'number of submissions in a batch should be less than or equal to ' . Config::maxBatchSize()], 422);
    $out = [];
    foreach ($ids as $id) {
      $r = SubmissionRepository::getWithRun($pdo, $id);
      $out[] = ($r && ((int)$r['user_id'] === (int)$u['uid'] || $u['role'] !== 'student')) ? $r : null;
    }
    Db::json(['submissions' => $out]);
  }
  // Port tu SubmissionsController#destroy (Ruby): chi xoa khi khong con QUEUED/RUNNING.
  public static function destroy(PDO $pdo, int $id): void {
    $u = Auth::require();
    if (!Config::boolOff('ENABLE_SUBMISSION_DELETE')) Db::json(['error' => 'delete not allowed'], 422);
    $r = SubmissionRepository::getWithRun($pdo, $id);
    if (!$r || ((int)$r['user_id'] !== (int)$u['uid'] && $u['role'] === 'student')) Db::json(['error' => 'not found'], 404);
    if (in_array($r['status'] ?? '', ['QUEUED', 'RUNNING'], true)) Db::json(['error' => 'submission cannot be deleted because its status is ' . $r['status']], 422);
    $pdo->prepare('DELETE FROM case_results WHERE judging_run_id IN (SELECT id FROM judging_runs WHERE submission_id=?)')->execute([$id]);
    $pdo->prepare('DELETE FROM judging_runs WHERE submission_id=?')->execute([$id]);
    $pdo->prepare('DELETE FROM submissions WHERE id=?')->execute([$id]);
    Db::json(['submission_id' => $id, 'deleted' => true]);
  }
  public static function run(PDO $pdo, array $body): void {
    $u = Auth::require();
    RateLimit::check((int)$u['uid'], 'run', (int)(getenv('RATE_RUN_PER_MIN') ?: 20));
    // API chi goi sandbox voi du lieu nguoi dung nhap, khong dung ca kin.
    [$v, $out, $err] = JudgeService::runCase($body['language'] ?? 'python', substr($body['source_code'] ?? '', 0, 100000), substr($body['stdin'] ?? '', 0, 65536), 2000);
    Db::json(['stdout' => $out, 'stderr' => Comparator::filterStderr($err), 'verdict' => $v === 'OK' ? 'RUN_OK' : $v]);
  }
  public static function submit(PDO $pdo, array $body): void {
    $u = Auth::require();
    RateLimit::check((int)$u['uid'], 'submit', (int)(getenv('RATE_SUBMIT_PER_MIN') ?: 10));
    $key = $_SERVER['HTTP_IDEMPOTENCY_KEY'] ?? '';
    if (!$key) Db::json(['error' => 'Idempotency-Key required'], 422);
    $code = $body['source_code'] ?? '';
    // Tuong thich cu: ?base64_encoded= mac dinh true.
    if (($_GET['base64_encoded'] ?? '') !== 'false' && $code !== '') {
      $dec = base64_decode($code, true);
      if ($dec !== false) $code = $dec;
    }
    $res = JudgeService::submit((int)$u['uid'], (int)($body['problem_version_id'] ?? 0), $body['language'] ?? 'python', $code, $key, [
      'number_of_runs' => $body['number_of_runs'] ?? null,
      'compiler_options' => $body['compiler_options'] ?? '',
      'command_line_arguments' => $body['command_line_arguments'] ?? '',
      'callback_url' => $body['callback_url'] ?? '',
    ]);
    // ?wait=true: poll toi da ~60s nhu IsolateRunner cu.
    if (($_GET['wait'] ?? '') === 'true') {
      $t0 = time();
      do {
        sleep(2);
        $jr = SubmissionRepository::currentRun($pdo, $res['submission_id']);
        if ($jr && !in_array($jr['status'], ['QUEUED', 'RUNNING'], true)) break;
      } while (time() - $t0 < 60);
      $res = array_merge($res, $jr ?: []);
    }
    // ?fields=a,b: loc field nhu Fields::Submission cu.
    if (isset($_GET['fields'])) {
      $want = array_map('trim', explode(',', $_GET['fields']));
      $res = array_intersect_key($res, array_flip($want));
    }
    Db::json($res, 201);
  }
  public static function get(PDO $pdo, int $id): void {
    $u = Auth::require();
    $r = SubmissionRepository::getWithRun($pdo, $id);
    if (!$r) Db::json(['error' => 'not found'], 404);
    if ((int)$r['user_id'] !== (int)$u['uid'] && $u['role'] === 'student') Db::json(['error' => 'not found'], 404);
    unset($r['source_code']);
    $r['cases'] = SubmissionRepository::cases($pdo, $id); // khong tra stdout ca kin
    Db::json($r);
  }
  public static function code(PDO $pdo, int $id): void {
    $u = Auth::require();
    $r = SubmissionRepository::code($pdo, $id);
    if (!$r || ((int)$r['user_id'] !== (int)$u['uid'] && $u['role'] === 'student')) Db::json(['error' => 'not found'], 404);
    Db::json(['source_code' => $r['source_code']]);
  }
  public static function history(PDO $pdo): void {
    $u = Auth::require();
    Db::json(['submissions' => SubmissionRepository::history($pdo, (int)$u['uid'])]);
  }
  public static function progress(PDO $pdo): void {
    $u = Auth::require();
    Db::json(SubmissionRepository::progress($pdo, (int)$u['uid']));
  }
  // Muc 17: SSE thay polling.
  public static function events(PDO $pdo, int $id): void {
    $u = Auth::require();
    $r = SubmissionRepository::code($pdo, $id);
    if (!$r || ((int)$r['user_id'] !== (int)$u['uid'] && $u['role'] === 'student')) Db::json(['error' => 'not found'], 404);
    header('Content-Type: text/event-stream; charset=utf-8');
    header('Cache-Control: no-cache');
    header('X-Accel-Buffering: no');
    $t0 = time();
    while (time() - $t0 < 60) {
      $jr = SubmissionRepository::currentRun($pdo, $id);
      echo 'data: ' . json_encode($jr ?: ['status' => 'UNKNOWN']) . "\n\n";
      if (ob_get_level()) ob_flush();
      flush();
      if ($jr && !in_array($jr['status'], ['QUEUED', 'RUNNING'], true)) break;
      sleep(2);
    }
    exit;
  }
  // Muc 17: diem tuong tu 2 bai nop (khong tra ma nguon).
  public static function similarity(PDO $pdo, int $a, int $b): void {
    Auth::require('teacher');
    $rows = SubmissionRepository::sourcePair($pdo, $a, $b);
    if (count($rows) < 2) Db::json(['error' => 'not found'], 404);
    Db::json(['similarity' => round(Similarity::score($rows[0]['source_code'], $rows[1]['source_code']), 4)]);
  }
}
