<?php

namespace App\Services;

// Port tu OJ\Service\JudgeService (PHP thuan): chay 1 ca trong sandbox Docker tam.
class JudgeService
{
    public static function cleanOpt(string $s): string
    {
        return preg_replace('/[$&;<>|`]/', '', trim($s)) ?? '';
    }

    public static function runCase(string $lang, string $code, string $input, int $timeLimitMs, int $memoryKb = 262144, string $compilerOptions = '', string $cmdArgs = ''): array
    {
        $codeB64 = base64_encode($code);
        $cmdArgs = self::cleanOpt($cmdArgs);
        if ($lang === 'python') {
            $img = 'oj-sandbox-python';
            $sh = 'printf "%s" "$OJ_CODE" | base64 -d > ./main.py && python3 ./main.py'.($cmdArgs !== '' ? ' '.$cmdArgs : '');
            $tmpfs = '/tmp:rw,nosuid,size=64m';
        } elseif ($lang === 'js') {
            $img = 'oj-sandbox-js';
            $sh = 'printf "%s" "$OJ_CODE" | base64 -d > ./main.js && node ./main.js'.($cmdArgs !== '' ? ' '.$cmdArgs : '');
            $tmpfs = '/tmp:rw,nosuid,size=64m';
        } elseif ($lang === 'java') {
            $img = 'oj-sandbox-java';
            $copts = self::cleanOpt($compilerOptions);
            $sh = 'printf "%s" "$OJ_CODE" | base64 -d > ./Main.java && javac '.($copts !== '' ? $copts.' ' : '').'./Main.java 2>./ce.txt && java Main'.($cmdArgs !== '' ? ' '.$cmdArgs : '').' || { cat ./ce.txt >&2; exit 99; }';
            $tmpfs = '/tmp:rw,exec,nosuid,size=128m';
        } elseif ($lang === 'go') {
            $img = 'oj-sandbox-go';
            $copts = self::cleanOpt($compilerOptions);
            $sh = 'export GOCACHE=/tmp/gocache GOFLAGS=-mod=mod GOPROXY=off GOMAXPROCS=1 && printf "%s" "$OJ_CODE" | base64 -d > ./main.go && go build -p 1 '.($copts !== '' ? $copts.' ' : '').'-o ./a ./main.go 2>./ce.txt && ./a'.($cmdArgs !== '' ? ' '.$cmdArgs : '').' || { cat ./ce.txt >&2; exit 99; }';
            $tmpfs = '/tmp:rw,exec,nosuid,size=128m';
        } elseif ($lang === 'c') {
            $img = 'oj-sandbox-c';
            $copts = self::cleanOpt($compilerOptions);
            $sh = 'printf "%s" "$OJ_CODE" | base64 -d > ./main.c && gcc -O2 -std=c17 '.($copts !== '' ? $copts.' ' : '').'-o ./a ./main.c 2>./ce.txt && ./a'.($cmdArgs !== '' ? ' '.$cmdArgs : '').' || { cat ./ce.txt >&2; exit 99; }';
            $tmpfs = '/tmp:rw,exec,nosuid,size=128m';
        } else {
            $img = 'oj-sandbox-cpp';
            $copts = self::cleanOpt($compilerOptions);
            $sh = 'printf "%s" "$OJ_CODE" | base64 -d > ./main.cpp && g++ -O2 -std=c++17 '.($copts !== '' ? $copts.' ' : '').'-o ./a ./main.cpp 2>./ce.txt && ./a'.($cmdArgs !== '' ? ' '.$cmdArgs : '').' || { cat ./ce.txt >&2; exit 99; }';
            $tmpfs = '/tmp:rw,exec,nosuid,size=128m';
        }
        // Go runtime can thread (clone) ke ca chuong trinh don gian -> pids-limit cao hon.
        // Java can nhieu tien trinh hon Python/JS luc JVM khoi dong.
        $pids = $lang === 'go' ? '128' : ($lang === 'java' ? '48' : '32');
        $memMb = max(64, min(1024, (int) ceil($memoryKb / 1024)));
        $run = ['docker', 'run', '--rm', '-i', '--init', '--network', 'none', '--cap-drop', 'ALL', '--pids-limit', $pids,
            '-m', $memMb.'m', '--cpus', '1.0', '--read-only', '--tmpfs', $tmpfs, '-w', '/tmp',
            '--user', 'nobody', '--name', '', '-e', "OJ_CODE=$codeB64", $img, 'sh', '-c', $sh];

        $cname = 'ojrun_'.bin2hex(random_bytes(6));
        $ni = array_search('--name', $run, true);
        $run[$ni + 1] = $cname;
        $timeout = max(1, (int) ceil($timeLimitMs / 1000) + 2) + (in_array($lang, ['cpp', 'java', 'go', 'c'], true) ? 60 : 0);
        $desc = [0 => ['pipe', 'r'], 1 => ['pipe', 'w'], 2 => ['pipe', 'w']];
        $p = proc_open(array_merge(['timeout', '-k', '5', (string) $timeout], $run), $desc, $pipes);
        if (! is_resource($p)) {
            return ['SYSTEM_ERROR', '', 'cannot start sandbox', 0];
        }
        fwrite($pipes[0], $input);
        fclose($pipes[0]);
        $t0 = microtime(true);
        $tmp = is_resource($pipes[1]) ? stream_get_contents($pipes[1]) : false;
        $out = $tmp === false ? '' : $tmp;
        if (is_resource($pipes[1])) {
            fclose($pipes[1]);
        }
        $tmp = is_resource($pipes[2]) ? stream_get_contents($pipes[2]) : false;
        $err = $tmp === false ? '' : $tmp;
        if (is_resource($pipes[2])) {
            fclose($pipes[2]);
        }
        $exit = proc_close($p);
        @exec('docker rm -f '.escapeshellarg($cname).' 2>/dev/null');
        $ms = (int) ((microtime(true) - $t0) * 1000);
        $out = substr($out ?? '', 0, 1 << 20);
        $err = substr($err ?? '', 0, 65536);
        if ($exit === 124) {
            return ['TIME_LIMIT_EXCEEDED', $out, '', $ms];
        }
        if ($exit === 99 && in_array($lang, ['cpp', 'java', 'go', 'c'], true)) {
            return ['COMPILE_ERROR', '', $err, $ms];
        }
        if ($exit !== 0) {
            if (str_contains($err, 'SyntaxError') || str_contains($err, 'IndentationError')) {
                return ['COMPILE_ERROR', '', $err, $ms];
            }
            if (str_contains($err, 'MemoryError') || str_contains($err, 'std::bad_alloc')) {
                return ['MEMORY_LIMIT_EXCEEDED', $out, $err, $ms];
            }

            return ['RUNTIME_ERROR', $out, $err, $ms];
        }

        return ['OK', $out, $err, $ms];
    }

    public static function fireCallback(string $url, array $payload): void
    {
        if ($url === '') {
            return;
        }
        $tries = max(1, min(5, (int) config('oj.callback_tries', 3)));
        $timeout = max(1, (int) config('oj.callback_timeout', 5));
        $ctx = stream_context_create(['http' => [
            'method' => 'PUT', 'header' => 'Content-Type: application/json',
            'content' => json_encode($payload), 'timeout' => $timeout, 'ignore_errors' => true,
        ]]);
        for ($i = 0; $i < $tries; $i++) {
            try {
                $r = @file_get_contents($url, false, $ctx);
                if ($r !== false) {
                    return;
                }
            } catch (\Throwable) {
            }
        }
    }
}
