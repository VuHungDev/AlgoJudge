<?php
declare(strict_types=1);
namespace OJ\Service;

use OJ\Config;
use OJ\Db;

// Nhom tu viet: dieu phoi cham — tao submission + judging_run (idempotency), chay sandbox, tong hop.
final class JudgeService {
  public static function submit(int $uid, int $pvId, string $lang, string $code, string $idemKey, array $extra = []): array {
    if (!in_array($lang, ['python', 'cpp', 'js', 'java', 'go', 'c'], true)) Db::json(['error' => 'language must be python|cpp|js|java|go|c'], 422);
    if (strlen($code) < 1 || strlen($code) > 100000) Db::json(['error' => 'bad code size'], 422);
    // Port tu Submission model (Ruby): validate gioi han tuy chinh tung lan nop.
    $runs = max(1, min(20, (int)($extra['number_of_runs'] ?? Config::numberOfRuns())));
    $copts = self::cleanOpt($extra['compiler_options'] ?? '');
    $cargs = self::cleanOpt($extra['command_line_arguments'] ?? '');
    if ($copts !== '' && !Config::boolOn('ENABLE_COMPILER_OPTIONS')) Db::json(['error' => 'compiler options not allowed'], 422);
    if ($copts !== '' && $lang === 'python') Db::json(['error' => 'compiler options only for compiled languages'], 422);
    if ($cargs !== '' && !Config::boolOn('ENABLE_COMMAND_LINE_ARGUMENTS')) Db::json(['error' => 'command line arguments not allowed'], 422);
    $cb = trim($extra['callback_url'] ?? '');
    if ($cb !== '' && !Config::boolOn('ENABLE_CALLBACKS')) Db::json(['error' => 'callbacks not allowed'], 422);
    if (strlen($copts) > 512 || strlen($cargs) > 512) Db::json(['error' => 'options too long'], 422);
    $pdo = Db::pdo();
    $pdo->beginTransaction();
    $row = $pdo->prepare('SELECT id FROM submissions WHERE user_id=? AND idempotency_key=?');
    $row->execute([$uid, $idemKey]);
    if ($ex = $row->fetch()) { $pdo->commit(); return ['submission_id' => (int)$ex['id'], 'deduplicated' => true]; }
    $ts = $pdo->prepare('SELECT testset_version FROM problem_versions WHERE id=?');
    $ts->execute([$pvId]);
    $pv = $ts->fetch();
    if (!$pv) { $pdo->rollBack(); Db::json(['error' => 'not found'], 404); }
    $pdo->prepare('INSERT INTO submissions(user_id,problem_version_id,language,source_code,idempotency_key,number_of_runs,compiler_options,command_line_arguments,callback_url) VALUES(?,?,?,?,?,?,?,?,?)')
      ->execute([$uid, $pvId, $lang, $code, $idemKey, $runs, $copts ?: null, $cargs ?: null, $cb ?: null]);
    $sid = (int)$pdo->lastInsertId();
    $pdo->prepare("INSERT INTO judging_runs(submission_id,testset_version,status,is_current) VALUES(?,'{$pv['testset_version']}', 'QUEUED',1)")
      ->execute([$sid]);
    $pdo->commit();
    return ['submission_id' => $sid, 'deduplicated' => false];
  }

  // Port tu IsolateJob#compile/run: loc ky tu shell nguy hiem trong tuy chon tuy chinh.
  public static function cleanOpt(string $s): string {
    return preg_replace('/[$&;<>|`]/', '', trim($s)) ?? '';
  }

  // Chay 1 ca trong sandbox Docker tam, cach ly theo CLAUDE.md 3.2. Tra [verdict, stdout, stderr, time_ms].
  // Ma nguon + stdin duoc truyen qua base64 trong lenh sh (base64 an toan voi shell),
  // khong bind-mount (bind tu worker container se tro nham sang filesystem cua host).
  public static function runCase(string $lang, string $code, string $input, int $timeLimitMs, string $compilerOptions = '', string $cmdArgs = ''): array {
    $codeB64 = base64_encode($code);
    $cmdArgs = self::cleanOpt($cmdArgs);
    // Code qua bien moi truong base64; stdin qua pipe -i doc truc tiep (khong qua base64 OJ_IN).
    if ($lang === 'python') {
      $img = 'oj-sandbox-python';
      $sh = 'printf "%s" "$OJ_CODE" | base64 -d > ./main.py && python3 ./main.py' . ($cmdArgs !== '' ? ' ' . $cmdArgs : '');
      $run = ['docker', 'run', '--rm', '-i', '--init', '--network', 'none', '--cap-drop', 'ALL', '--pids-limit', '32',
        '-m', '256m', '--cpus', '1.0', '--read-only', '--tmpfs', '/tmp:rw,nosuid,size=64m', '-w', '/tmp',
        '--user', 'nobody', '--name', '', '-e', "OJ_CODE=$codeB64", $img, 'sh', '-c', $sh];
    } elseif ($lang === 'js') {
      $img = 'oj-sandbox-js';
      $sh = 'printf "%s" "$OJ_CODE" | base64 -d > ./main.js && node ./main.js' . ($cmdArgs !== '' ? ' ' . $cmdArgs : '');
      $run = ['docker', 'run', '--rm', '-i', '--init', '--network', 'none', '--cap-drop', 'ALL', '--pids-limit', '32',
        '-m', '256m', '--cpus', '1.0', '--read-only', '--tmpfs', '/tmp:rw,nosuid,size=64m', '-w', '/tmp',
        '--user', 'nobody', '--name', '', '-e', "OJ_CODE=$codeB64", $img, 'sh', '-c', $sh];
    } elseif ($lang === 'java') {
      $img = 'oj-sandbox-java';
      $copts = self::cleanOpt($compilerOptions);
      $sh = 'printf "%s" "$OJ_CODE" | base64 -d > ./Main.java && javac ' . ($copts !== '' ? $copts . ' ' : '') . './Main.java 2>./ce.txt && java Main' . ($cmdArgs !== '' ? ' ' . $cmdArgs : '') . ' || { cat ./ce.txt >&2; exit 99; }';
      $run = ['docker', 'run', '--rm', '-i', '--init', '--network', 'none', '--cap-drop', 'ALL', '--pids-limit', '32',
        '-m', '256m', '--cpus', '1.0', '--read-only', '--tmpfs', '/tmp:rw,exec,nosuid,size=128m', '-w', '/tmp',
        '--user', 'nobody', '--name', '', '-e', "OJ_CODE=$codeB64", $img, 'sh', '-c', $sh];
    } elseif ($lang === 'go') {
      $img = 'oj-sandbox-go';
      $copts = self::cleanOpt($compilerOptions);
      $sh = 'export GOCACHE=/tmp/gocache GOFLAGS=-mod=mod GOPROXY=off GOMAXPROCS=1 && printf "%s" "$OJ_CODE" | base64 -d > ./main.go && go build -p 1 ' . ($copts !== '' ? $copts . ' ' : '') . '-o ./a ./main.go 2>./ce.txt && ./a' . ($cmdArgs !== '' ? ' ' . $cmdArgs : '') . ' || { cat ./ce.txt >&2; exit 99; }';
      $run = ['docker', 'run', '--rm', '-i', '--init', '--network', 'none', '--cap-drop', 'ALL', '--pids-limit', '32',
        '-m', '256m', '--cpus', '1.0', '--read-only', '--tmpfs', '/tmp:rw,exec,nosuid,size=128m', '-w', '/tmp',
        '--user', 'nobody', '--name', '', '-e', "OJ_CODE=$codeB64", $img, 'sh', '-c', $sh];
    } elseif ($lang === 'c') {
      $img = 'oj-sandbox-c';
      $copts = self::cleanOpt($compilerOptions);
      $sh = 'printf "%s" "$OJ_CODE" | base64 -d > ./main.c && gcc -O2 -std=c17 ' . ($copts !== '' ? $copts . ' ' : '') . '-o ./a ./main.c 2>./ce.txt && ./a' . ($cmdArgs !== '' ? ' ' . $cmdArgs : '') . ' || { cat ./ce.txt >&2; exit 99; }';
      $run = ['docker', 'run', '--rm', '-i', '--init', '--network', 'none', '--cap-drop', 'ALL', '--pids-limit', '32',
        '-m', '256m', '--cpus', '1.0', '--read-only', '--tmpfs', '/tmp:rw,exec,nosuid,size=128m', '-w', '/tmp',
        '--user', 'nobody', '--name', '', '-e', "OJ_CODE=$codeB64", $img, 'sh', '-c', $sh];
    } else {
      $img = 'oj-sandbox-cpp';
      $copts = self::cleanOpt($compilerOptions);
      $sh = 'printf "%s" "$OJ_CODE" | base64 -d > ./main.cpp && g++ -O2 -std=c++17 ' . ($copts !== '' ? $copts . ' ' : '') . '-o ./a ./main.cpp 2>./ce.txt && ./a' . ($cmdArgs !== '' ? ' ' . $cmdArgs : '') . ' || { cat ./ce.txt >&2; exit 99; }';
      $run = ['docker', 'run', '--rm', '-i', '--init', '--network', 'none', '--cap-drop', 'ALL', '--pids-limit', '32',
        '-m', '256m', '--cpus', '1.0', '--read-only', '--tmpfs', '/tmp:rw,exec,nosuid,size=128m', '-w', '/tmp',
        '--user', 'nobody', '--name', '', '-e', "OJ_CODE=$codeB64", $img, 'sh', '-c', $sh];
    }
    {
      // Dat ten container de don dep khi timeout: docker CLI co the khong chet theo SIGTERM
      // cua lenh timeout, container moi chay se thanh mo coi va an CPU mai.
      // Go runtime can thread (clone) ke ca chuong trinh don gian -> pids-limit cao hon.
      $pids = $lang === 'go' ? '128' : ($lang === 'java' ? '48' : '32');
      $runPids = array_search('--pids-limit', $run, true);
      $run[$runPids + 1] = $pids;
      $cname = 'ojrun_' . bin2hex(random_bytes(6));
      $ni = array_search('--name', $run, true);
      $run[$ni + 1] = $cname;
      // C++/Java/Go/C duoc cong them ngan sach bien dich (toi da 60s), khong tinh vao time limit cua bai.
      $timeout = max(1, (int)ceil($timeLimitMs / 1000) + 2) + (in_array($lang, ['cpp', 'java', 'go', 'c'], true) ? 60 : 0);
      $desc = [0 => ['pipe', 'r'], 1 => ['pipe', 'w'], 2 => ['pipe', 'w']];
      // -k: TERM khong chet thi KILL sau 5s.
      $p = proc_open(array_merge(['timeout', '-k', '5', (string)$timeout], $run), $desc, $pipes);
      if (!is_resource($p)) return ['SYSTEM_ERROR', '', 'cannot start sandbox', 0];
      fwrite($pipes[0], $input);
      fclose($pipes[0]);
      $t0 = microtime(true);
      // Chu y: output "0" la falsy trong PHP — khong dung ?: ma kiem tra === false.
      $tmp = is_resource($pipes[1]) ? stream_get_contents($pipes[1]) : false;
      $out = $tmp === false ? '' : $tmp;
      if (is_resource($pipes[1])) fclose($pipes[1]);
      $tmp = is_resource($pipes[2]) ? stream_get_contents($pipes[2]) : false;
      $err = $tmp === false ? '' : $tmp;
      if (is_resource($pipes[2])) fclose($pipes[2]);
      $code_exit = proc_close($p);
      // Don container mo coi (neu timeout ma docker CLI khong chet theo).
      @exec('docker rm -f ' . escapeshellarg($cname) . ' 2>/dev/null');
      $ms = (int)((microtime(true) - $t0) * 1000);
      $out = substr($out ?? '', 0, 1 << 20); $err = substr($err ?? '', 0, 65536);
      if ($code_exit === 124) return ['TIME_LIMIT_EXCEEDED', $out, '', $ms];
      if ($code_exit === 99 && in_array($lang, ['cpp', 'java', 'go', 'c'], true)) return ['COMPILE_ERROR', '', $err, $ms];
      if ($code_exit !== 0) {
        if (str_contains($err, 'SyntaxError') || str_contains($err, 'IndentationError')) return ['COMPILE_ERROR', '', $err, $ms];
        if (str_contains($err, 'MemoryError') || str_contains($err, 'std::bad_alloc')) return ['MEMORY_LIMIT_EXCEEDED', $out, $err, $ms];
        return ['RUNTIME_ERROR', $out, $err, $ms];
      }
      return ['OK', $out, $err, $ms];
    }
  }

  // Port tu IsolateJob#call_callback: PUT ket qua (default fields) ve callback_url, thu toi da 3 lan.
  public static function fireCallback(string $url, array $payload): void {
    if ($url === '') return;
    $tries = max(1, min(5, Config::int('CALLBACKS_MAX_TRIES', 3)));
    $timeout = max(1, Config::int('CALLBACKS_TIMEOUT', 5));
    $ctx = stream_context_create(['http' => [
      'method' => 'PUT', 'header' => 'Content-Type: application/json',
      'content' => json_encode($payload), 'timeout' => $timeout, 'ignore_errors' => true,
    ]]);
    for ($i = 0; $i < $tries; $i++) {
      try {
        $r = @file_get_contents($url, false, $ctx);
        if ($r !== false) return;
      } catch (\Throwable) { /* thu lai */ }
    }
  }
}
