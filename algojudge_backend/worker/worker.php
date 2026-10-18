<?php
declare(strict_types=1);
// Worker: lay job QUEUED bang SKIP LOCKED, chay sandbox, tong hop, ghi co dieu kien (chong ghi de).
require __DIR__ . '/../src/Db.php';
require __DIR__ . '/../src/Judge/Comparator.php';
require __DIR__ . '/../src/Service/JudgeService.php';
use OJ\Db; use OJ\Judge\Comparator; use OJ\Service\JudgeService;

$pdo = Db::pdo();
$maxAttempt = 3;
while (true) {
  try {
    $pdo->beginTransaction();
    $job = $pdo->query("SELECT r.*, s.language, s.source_code, s.problem_version_id, s.number_of_runs, s.compiler_options, s.command_line_arguments, s.callback_url FROM judging_runs r JOIN submissions s ON s.id=r.submission_id WHERE r.status='QUEUED' ORDER BY r.id LIMIT 1 FOR UPDATE SKIP LOCKED")->fetch();
    if (!$job) { $pdo->commit(); sleep(2); continue; }
    $lease = bin2hex(random_bytes(16));
    $pdo->prepare("UPDATE judging_runs SET status='RUNNING', lease_token=?, lease_expires_at=DATE_ADD(NOW(), INTERVAL 5 MINUTE), started_at=NOW(), attempt=attempt+1 WHERE id=?")
      ->execute([$lease, $job['id']]);
    $pdo->commit();

    $lim = $pdo->prepare('SELECT time_limit_ms, checker, checker_config FROM problem_versions WHERE id=?');
    $lim->execute([$job['problem_version_id']]);
    $pvrow = $lim->fetch() ?: [];
    $tl = (int)($pvrow['time_limit_ms'] ?: 2000);
    $checker = $pvrow['checker'] ?? 'exact';
    $checkerCfg = $pvrow['checker_config'] ?? '';
    $cases = $pdo->prepare('SELECT * FROM test_cases WHERE problem_version_id=? AND testset_version=? ORDER BY ordinal');
    $cases->execute([$job['problem_version_id'], $job['testset_version']]);
    $rows = $cases->fetchAll();
    $runs = max(1, min(20, (int)($job['number_of_runs'] ?? 1))); // port IsolateJob: chay N lan, lay trung binh
    $verdicts = [];
    $subtasks = []; // muc 17: diem theo nhom ca
    $pdo->prepare('DELETE FROM case_results WHERE judging_run_id=?')->execute([$job['id']]);
    foreach ($rows as $c) {
      $v = 'SYSTEM_ERROR'; $out = ''; $err = ''; $times = [];
      for ($n = 0; $n < $runs; $n++) { // port IsolateJob#perform: number_of_runs
        try {
          [$v1, $out1, $err1, $ms1] = JudgeService::runCase($job['language'], $job['source_code'], $c['input_data'], $tl, $job['compiler_options'] ?? '', $job['command_line_arguments'] ?? '');
        } catch (Throwable $e) {
          $v1 = 'SYSTEM_ERROR'; $out1 = ''; $err1 = 'worker exception'; $ms1 = 0;
        }
        $v = $v1; $out = $out1; $err = $err1; $times[] = $ms1;
        if ($v1 !== 'OK') break; // that bai thi dung ngay, giong break khi status != ac
      }
      $avgMs = $times ? (int)(array_sum($times) / count($times)) : 0;
      if ($v === 'SYSTEM_ERROR') { $verdicts[] = 'SYSTEM_ERROR'; break; }
      if ($v !== 'OK') { $verdicts[] = $v; $cv = $v; }
      else {
        $ok = Comparator::check($checker, $out, $c['expected_output'], $checkerCfg);
        $cv = $ok ? 'ACCEPTED' : 'WRONG_ANSWER'; $verdicts[] = $cv;
      }
      $subtasks[] = ['group' => $c['group_name'] ?? 'default', 'verdict' => $cv, 'weight' => (int)($c['weight'] ?? 1)];
      if (getenv('OJ_DEBUG_CASES')) file_put_contents('php://stderr', "CASE ord={$c['ordinal']} v=$v cv=$cv out=" . bin2hex(substr($out ?? '', 0, 64)) . " exp=" . bin2hex(substr($c['expected_output'] ?? '', 0, 64)) . " err=" . substr($err ?? '', 0, 200) . "\n");
      $pdo->prepare('INSERT INTO case_results(judging_run_id,test_case_id,verdict,time_ms,stderr_excerpt) VALUES(?,?,?,?,?)')
        ->execute([$job['id'], $c['id'], $cv, $avgMs, Comparator::filterStderr($err)]);
    }
    $final = $verdicts ? Comparator::aggregate($verdicts) : 'SYSTEM_ERROR';
    if ($final === 'SYSTEM_ERROR') {
      $att = (int)$job['attempt'] + 1;
      if ($att >= $maxAttempt) {
        $pdo->prepare("UPDATE judging_runs SET status='SYSTEM_ERROR', verdict='SYSTEM_ERROR', finished_at=NOW() WHERE id=? AND lease_token=? AND status='RUNNING'")
          ->execute([$job['id'], $lease]);
      } else {
        $pdo->prepare("UPDATE judging_runs SET status='RETRY_PENDING', verdict='RETRY_PENDING' WHERE id=? AND lease_token=?")
          ->execute([$job['id'], $lease]);
        sleep(2);
        $pdo->prepare("UPDATE judging_runs SET status='QUEUED' WHERE id=? AND status='RETRY_PENDING'")->execute([$job['id']]);
      }
    } else {
      // Muc 17: diem theo subtask thay vi 0/100 cung.
      $score = Comparator::scoreSubtasks($subtasks);
      if (!$subtasks) $score = $final === 'ACCEPTED' ? 100 : 0;
      // Ghi co dieu kien: run cu ve muon khong ghi de run moi (CLAUDE.md 9.3)
      $pdo->prepare("UPDATE judging_runs SET status='DONE', verdict=?, score=?, finished_at=NOW() WHERE id=? AND lease_token=? AND status='RUNNING' AND is_current=1")
        ->execute([$final, $score, $job['id'], $lease]);
      // Port IsolateJob#call_callback: ban ket qua ve callback_url (neu co).
      if (!empty($job['callback_url'])) {
        JudgeService::fireCallback($job['callback_url'], ['submission_id' => (int)$job['submission_id'], 'status' => 'DONE', 'verdict' => $final, 'score' => $score]);
      }
    }
  } catch (Throwable $e) {
    if ($pdo->inTransaction()) $pdo->rollBack();
    fwrite(STDERR, $e->getMessage() . PHP_EOL);
    sleep(2);
  }
}
