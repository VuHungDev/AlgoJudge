<?php

namespace App\Console\Commands;

use App\Judge\Comparator;
use App\Models\CaseResult;
use App\Models\JudgingRun;
use App\Models\ProblemVersion;
use App\Models\TestCase;
use App\Services\JudgeService;
use App\Services\PushNotifier;
use Illuminate\Console\Command;
use Illuminate\Support\Facades\DB;

// Port tu worker/worker.php (PHP thuan): SKIP LOCKED + lease + retry + ghi dieu kien.
class JudgeWorker extends Command
{
    protected $signature = 'judge:work {--once : chay 1 job roi thoat}';

    private function reapExpiredLeases(int $maxAttempt): void
    {
        DB::transaction(function () use ($maxAttempt) {
            $expired = JudgingRun::where('status', 'RUNNING')
                ->where('lease_expires_at', '<', now())
                ->when(DB::getDriverName() === 'mysql', fn ($q) => $q->lock('for update skip locked'))
                ->get();
            foreach ($expired as $run) {
                if ($run->attempt >= $maxAttempt) {
                    $run->update(['status' => 'SYSTEM_ERROR', 'verdict' => 'SYSTEM_ERROR', 'finished_at' => now(), 'lease_token' => null, 'lease_expires_at' => null]);
                } else {
                    $run->update(['status' => 'QUEUED', 'verdict' => null, 'lease_token' => null, 'lease_expires_at' => null]);
                }
            }
        });
    }

    private function finishSystemError(object $job, int $maxAttempt, ?int $attempt = null): void
    {
        $attempt = $attempt ?? (int) $job->attempt;
        $status = $attempt >= $maxAttempt ? 'SYSTEM_ERROR' : 'RETRY_PENDING';
        if ($status === 'SYSTEM_ERROR') {
            DB::update("UPDATE judging_runs SET status=?, verdict=?, finished_at=? WHERE id=? AND lease_token=? AND status='RUNNING'", [$status, $status, now()->toDateTimeString(), $job->id, $job->lease]);
        } else {
            DB::update("UPDATE judging_runs SET status=?, verdict=? WHERE id=? AND lease_token=? AND status='RUNNING'", [$status, $status, $job->id, $job->lease]);
        }
        if ($status === 'RETRY_PENDING') {
            DB::update("UPDATE judging_runs SET status='QUEUED', verdict=NULL, lease_token=NULL, lease_expires_at=NULL WHERE id=? AND status='RETRY_PENDING' AND lease_token=?", [$job->id, $job->lease]);
        }
        if ($status === 'SYSTEM_ERROR' && ! empty($job->callback_url)) {
            JudgeService::fireCallback($job->callback_url, ['submission_id' => (int) $job->submission_id, 'status' => 'SYSTEM_ERROR', 'verdict' => 'SYSTEM_ERROR']);
        }
    }

    protected $description = 'Lay job QUEUED, chay sandbox, tong hop ket qua';

    public function handle(): int
    {
        $maxAttempt = 3;
        do {
            $this->reapExpiredLeases($maxAttempt);
            $job = DB::transaction(function () {
                $lock = DB::getDriverName() === 'mysql' ? ' FOR UPDATE SKIP LOCKED' : '';
                $row = DB::selectOne(
                    "SELECT r.*, s.language, s.source_code, s.problem_version_id, s.number_of_runs, s.compiler_options, s.command_line_arguments, s.callback_url
                     FROM judging_runs r JOIN submissions s ON s.id = r.submission_id
                     WHERE r.status = 'QUEUED' ORDER BY r.id LIMIT 1{$lock}"
                );
                if (! $row) {
                    return null;
                }
                $lease = bin2hex(random_bytes(16));
                if (DB::getDriverName() === 'mysql') {
                    DB::update(
                        "UPDATE judging_runs SET status='RUNNING', lease_token=?, lease_expires_at=DATE_ADD(NOW(), INTERVAL 5 MINUTE), started_at=NOW(), attempt=attempt+1 WHERE id=?",
                        [$lease, $row->id]
                    );
                } else {
                    DB::update(
                        "UPDATE judging_runs SET status='RUNNING', lease_token=?, lease_expires_at=?, started_at=?, attempt=attempt+1 WHERE id=?",
                        [$lease, now()->addMinutes(5)->toDateTimeString(), now()->toDateTimeString(), $row->id]
                    );
                }
                $row->lease = $lease;

                return $row;
            });
            if (! $job) {
                if ($this->option('once')) {
                    return 0;
                }
                sleep(2);
                continue;
            }

            $pv = ProblemVersion::find($job->problem_version_id);
            $tl = (int) ($pv->time_limit_ms ?? 2000);
            $checker = $pv->checker ?? 'exact';
            $checkerCfg = $pv->checker_config ?? '';
            $rows = TestCase::where('problem_version_id', $job->problem_version_id)
                ->where('testset_version', $job->testset_version)->orderBy('ordinal')->get();
            $runs = max(1, min(20, (int) ($job->number_of_runs ?? 1)));
            $verdicts = [];
            $subtasks = [];
            CaseResult::where('judging_run_id', $job->id)->delete();
            foreach ($rows as $c) {
                $v = 'SYSTEM_ERROR';
                $out = '';
                $err = '';
                $times = [];
                for ($n = 0; $n < $runs; $n++) {
                    try {
                        [$v1, $out1, $err1, $ms1] = JudgeService::runCase(
                            $job->language, $job->source_code, $c->input_data, $tl,
                            $job->compiler_options ?? '', $job->command_line_arguments ?? ''
                        );
                    } catch (\Throwable) {
                        $v1 = 'SYSTEM_ERROR';
                        $out1 = '';
                        $err1 = 'worker exception';
                        $ms1 = 0;
                    }
                    $v = $v1;
                    $out = $out1;
                    $err = $err1;
                    $times[] = $ms1;
                    if ($v1 !== 'OK') {
                        break;
                    }
                }
                $avgMs = $times ? (int) (array_sum($times) / count($times)) : 0;
                if ($v === 'SYSTEM_ERROR') {
                    $verdicts[] = 'SYSTEM_ERROR';
                    break;
                }
                if ($v !== 'OK') {
                    $verdicts[] = $v;
                    $cv = $v;
                } else {
                    $ok = Comparator::check($checker, $out, $c->expected_output, $checkerCfg);
                    $cv = $ok ? 'ACCEPTED' : 'WRONG_ANSWER';
                    $verdicts[] = $cv;
                }
                $subtasks[] = ['group' => $c->group_name ?? 'default', 'verdict' => $cv, 'weight' => (int) ($c->weight ?? 1)];
                CaseResult::create([
                    'judging_run_id' => $job->id, 'test_case_id' => $c->id,
                    'verdict' => $cv, 'time_ms' => $avgMs, 'stderr_excerpt' => Comparator::filterStderr($err),
                ]);
            }
            $final = $verdicts ? Comparator::aggregate($verdicts) : 'SYSTEM_ERROR';
            if ($final === 'SYSTEM_ERROR') {
                $attempt = (int) $job->attempt;
                $this->finishSystemError($job, $maxAttempt, $attempt);
            } else {
                $score = $subtasks ? Comparator::scoreSubtasks($subtasks) : ($final === 'ACCEPTED' ? 100 : 0);
                DB::update(
                    "UPDATE judging_runs SET status='DONE', verdict=?, score=?, finished_at=NOW(), lease_token=NULL, lease_expires_at=NULL WHERE id=? AND lease_token=? AND status='RUNNING' AND is_current=1",
                    [$final, $score, $job->id, $job->lease]
                );
                // Phase 4: ghi streak khi co bai ACCEPTED.
                if ($final === 'ACCEPTED') {
                    $uid = DB::table('submissions')->where('id', $job->submission_id)->value('user_id');
                    if ($uid) {
                        DB::table('solve_streaks')->updateOrInsert(['user_id' => $uid, 'day' => date('Y-m-d')]);
                    }
                }
                if (! empty($job->callback_url)) {
                    JudgeService::fireCallback($job->callback_url, ['submission_id' => (int) $job->submission_id, 'status' => 'DONE', 'verdict' => $final, 'score' => $score]);
                }
                $uid = DB::table('submissions')->where('id', $job->submission_id)->value('user_id');
                if ($uid) {
                    PushNotifier::notifySubmissionDone((int) $uid, (int) $job->submission_id, $final, (int) $score);
                }
            }
        } while (! $this->option('once'));

        return 0;
    }
}
