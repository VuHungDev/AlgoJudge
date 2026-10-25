<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Judge\Comparator;
use App\Judge\Similarity;
use App\Models\ActivityLog;
use App\Models\CaseResult;
use App\Models\JudgingRun;
use App\Models\Problem;
use App\Models\ProblemVersion;
use App\Models\Submission;
use App\Services\JudgeService;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;

class SubmissionController extends Controller
{
    public function run(Request $request)
    {
        $data = $request->validate([
            'language' => 'nullable|in:python,cpp,js,java,go,c,php',
            'source_code' => 'nullable|string|max:1048576',
            'stdin' => 'nullable|string|max:65536',
            'problem_version_id' => 'nullable|integer',
        ]);
        $tl = 2000;
        if (! empty($data['problem_version_id'])) {
            $pv = ProblemVersion::find($data['problem_version_id']);
            if ($pv) {
                $tl = (int) min(max((int) ($pv->time_limit_ms ?? 2000), 500), 30000);
            }
        }
        [$v, $out, $err] = JudgeService::runCase(
            $data['language'] ?? 'python',
            substr($data['source_code'] ?? '', 0, 1048576),
            substr($data['stdin'] ?? '', 0, 65536),
            $tl
        );

        return response()->json([
            'stdout' => $out,
            'stderr' => Comparator::filterStderr($err),
            'verdict' => $v === 'OK' ? 'RUN_OK' : $v,
        ]);
    }

    public function create(Request $request)
    {
        if (config('oj.maintenance')) {
            return response()->json(['error' => config('oj.maintenance_message')], 503);
        }
        $key = $request->header('Idempotency-Key', '');
        if (! $key) {
            return response()->json(['error' => 'Idempotency-Key required'], 422);
        }
        $data = $request->validate([
            'problem_version_id' => 'required|integer',
            'language' => 'required|in:python,cpp,js,java,go,c,php',
            'source_code' => 'required|string|max:1048576',
            'number_of_runs' => 'nullable|integer|min:1|max:20',
            'compiler_options' => 'nullable|string|max:512',
            'command_line_arguments' => 'nullable|string|max:512',
            'callback_url' => 'nullable|string|max:2000',
        ]);
        if ($request->boolean('wait', false) && ! config('oj.wait_result')) {
            return response()->json(['error' => 'wait not allowed'], 422);
        }
        $queued = JudgingRun::whereIn('status', ['QUEUED', 'RUNNING'])->count();
        if ($queued + 1 > config('oj.max_queue_size')) {
            return response()->json(['error' => 'queue is full'], 503);
        }
        if (($data['compiler_options'] ?? '') !== '' && ! config('oj.compiler_options')) {
            return response()->json(['error' => 'compiler options not allowed'], 422);
        }
        if (($data['compiler_options'] ?? '') !== '' && $data['language'] === 'python') {
            return response()->json(['error' => 'compiler options only for compiled languages'], 422);
        }
        if (($data['command_line_arguments'] ?? '') !== '' && ! config('oj.cmd_args')) {
            return response()->json(['error' => 'command line arguments not allowed'], 422);
        }
        if (($data['callback_url'] ?? '') !== '' && ! config('oj.callbacks')) {
            return response()->json(['error' => 'callbacks not allowed'], 422);
        }

        $code = $data['source_code'];
        if ($request->query('base64_encoded', 'true') !== 'false' && $code !== '') {
            $dec = base64_decode($code, true);
            if ($dec !== false) {
                $code = $dec;
            }
        }

        $res = DB::transaction(function () use ($request, $data, $code, $key) {
            $ex = Submission::where('user_id', $request->user()->id)->where('idempotency_key', $key)->first();
            if ($ex) {
                return ['submission_id' => $ex->id, 'deduplicated' => true];
            }
            $pv = ProblemVersion::find($data['problem_version_id']);
            if (! $pv) {
                abort(404, 'not found');
            }
            // Gioi han source theo bai (bai phuc tap cho phep source lon hon).
            $srcKb = (int) min(max((int) ($pv->source_limit_kb ?? 100), 10), 1024);
            if (strlen($code) > $srcKb * 1024) {
                abort(422, 'source too large');
            }
            $s = Submission::create([
                'user_id' => $request->user()->id,
                'problem_version_id' => $data['problem_version_id'],
                'language' => $data['language'],
                'source_code' => $code,
                'idempotency_key' => $key,
                'number_of_runs' => max(1, min(20, (int) ($data['number_of_runs'] ?? config('oj.number_of_runs')))),
                'compiler_options' => JudgeService::cleanOpt($data['compiler_options'] ?? ''),
                'command_line_arguments' => JudgeService::cleanOpt($data['command_line_arguments'] ?? ''),
                'callback_url' => trim($data['callback_url'] ?? '') ?: null,
            ]);
            JudgingRun::create([
                'submission_id' => $s->id,
                'testset_version' => $pv->testset_version,
                'status' => 'QUEUED',
                'is_current' => 1,
            ]);

            return ['submission_id' => $s->id, 'deduplicated' => false];
        });

        if (! ($res['deduplicated'] ?? false)) {
            ActivityLog::record('submit', 'submission', $res['submission_id'],
                ['pv_id' => $data['problem_version_id'], 'lang' => $data['language']]);
        }

        if ($request->boolean('wait', false)) {
            $t0 = time();
            do {
                sleep(2);
                $jr = JudgingRun::where('submission_id', $res['submission_id'])->where('is_current', 1)->first();
                if ($jr && ! in_array($jr->status, ['QUEUED', 'RUNNING'], true)) {
                    break;
                }
            } while (time() - $t0 < 60);
            $res = array_merge($res, $jr ? $jr->toArray() : []);
        }
        if ($request->has('fields')) {
            $want = array_map('trim', explode(',', $request->query('fields')));
            $res = array_intersect_key($res, array_flip($want));
        }

        return response()->json($res, 201);
    }

    public function batchCreate(Request $request)
    {
        if (! config('oj.batched')) {
            return response()->json(['error' => 'batched submissions are not allowed'], 422);
        }
        $items = $request->input('submissions', []);
        if (count($items) === 0) {
            return response()->json(['error' => 'there should be at least one submission in a batch'], 422);
        }
        if (count($items) > config('oj.max_batch')) {
            return response()->json(['error' => 'batch too large'], 422);
        }
        $resp = [];
        $anyOk = false;
        foreach ($items as $i => $it) {
            $sub = new Request($it + ['wait' => false]);
            $sub->setUserResolver(fn () => $request->user());
            $sub->headers->set('Idempotency-Key', 'batch:'.date('Ymd').':'.$i.':'.bin2hex(random_bytes(4)));
            try {
                $r = $this->create($sub);
                $resp[] = json_decode($r->getContent(), true);
                $anyOk = true;
            } catch (\Throwable $e) {
                $resp[] = ['error' => $e->getMessage()];
            }
        }

        return response()->json($resp, $anyOk ? 201 : 422);
    }

    public function batchShow(Request $request)
    {
        $ids = array_filter(array_map('intval', explode(',', (string) $request->query('ids', ''))));
        if (count($ids) === 0 || count($ids) > config('oj.max_batch')) {
            return response()->json(['error' => 'bad batch'], 422);
        }
        $out = [];
        foreach ($ids as $id) {
            $r = $this->fetchVisible($request, $id);
            $out[] = $r;
        }

        return response()->json(['submissions' => $out]);
    }

    public function show(Request $request, int $id)
    {
        $r = $this->fetchVisible($request, $id);
        if (! $r) {
            return response()->json(['error' => 'not found'], 404);
        }
        unset($r['source_code']);
        $r['cases'] = CaseResult::query()
            ->join('judging_runs as r', 'r.id', '=', 'case_results.judging_run_id')
            ->where('r.submission_id', $id)->where('r.is_current', 1)
            ->select('case_results.verdict', 'case_results.time_ms')->get();

        return response()->json($r);
    }

    public function code(Request $request, int $id)
    {
        $s = Submission::find($id);
        if (! $s) return response()->json(['error' => 'not found'], 404);
        $user = $request->user();
        // Student chi xem code cua chinh minh.
        // Teacher/admin co the xem code hoc sinh trong lop minh phu trach.
        if ((int) $s->user_id !== (int) $user->id) {
            if ($user->role === 'student') {
                return response()->json(['error' => 'not found'], 404);
            }
            if ($user->role === 'teacher') {
                $ok = DB::table('class_members as t')
                    ->join('class_members as st', 'st.class_id', '=', 't.class_id')
                    ->where('t.user_id', $user->id)
                    ->whereIn('t.role', ['teacher', 'assistant'])
                    ->where('st.user_id', $s->user_id)
                    ->exists();
                if (! $ok) return response()->json(['error' => 'not found'], 404);
            }
        }

        return response()->json(['source_code' => $s->source_code, 'language' => $s->language]);
    }

    public function destroy(Request $request, int $id)
    {
        if (! config('oj.submission_delete')) {
            return response()->json(['error' => 'delete not allowed'], 422);
        }
        $s = Submission::find($id);
        if (! $s || ((int) $s->user_id !== (int) $request->user()->id && $request->user()->role === 'student')) {
            return response()->json(['error' => 'not found'], 404);
        }
        $cur = $s->currentRun;
        if ($cur && in_array($cur->status, ['QUEUED', 'RUNNING'], true)) {
            return response()->json(['error' => 'submission cannot be deleted because its status is '.$cur->status], 422);
        }
        $runIds = $s->runs()->pluck('id');
        CaseResult::whereIn('judging_run_id', $runIds)->delete();
        JudgingRun::where('submission_id', $id)->delete();
        $s->delete();

        return response()->json(['submission_id' => $id, 'deleted' => true]);
    }

    public function history(Request $request)
    {
        $per = (int) min(max((int) $request->query('per_page', 10), 1), 50);
        $p = Submission::with('currentRun')
            ->where('user_id', $request->user()->id)
            ->orderByDesc('id')->paginate($per);

        return response()->json([
            'submissions' => $p->items(),
            'meta' => ['page' => $p->currentPage(), 'per_page' => $p->perPage(), 'total' => $p->total(), 'last_page' => $p->lastPage()],
        ]);
    }

    public function progress(Request $request)
    {
        $uid = $request->user()->id;
        $total = Problem::count();
        $solved = JudgingRun::join('submissions as s', 's.id', '=', 'judging_runs.submission_id')
            ->join('problems as p', 'p.current_version_id', '=', 's.problem_version_id')
            ->where('s.user_id', $uid)->where('judging_runs.is_current', 1)
            ->where('judging_runs.verdict', 'ACCEPTED')
            ->distinct('p.id')->count('p.id');

        return response()->json(['total' => $total, 'solved' => $solved]);
    }

    public function events(Request $request, int $id)
    {
        // EventSource khong gui header: cho phep ?token= nhu BE cu.
        if (! $request->user() && $request->query('token')) {
            $token = \Laravel\Sanctum\PersonalAccessToken::findToken($request->query('token'));
            if ($token) {
                $request->setUserResolver(fn () => $token->tokenable);
            }
        }
        $user = $request->user();
        if (! $user) {
            return response()->json(['error' => 'unauthorized'], 401);
        }
        $s = Submission::find($id);
        if (! $s || ((int) $s->user_id !== (int) $user->id && $user->role === 'student')) {
            return response()->json(['error' => 'not found'], 404);
        }

        // SSE giu toi da 20s moi ket noi: client tu mo lai (watchSubmission fallback
        // polling 1.5s). Giu ngan de khong doi het tien trinh Apache prefork khi mo nhieu tab.
        return response()->stream(function () use ($id) {
            $t0 = time();
            while (time() - $t0 < 20) {
                $jr = JudgingRun::where('submission_id', $id)->where('is_current', 1)->first();
                $safe = $jr ? $jr->only(['id', 'status', 'verdict', 'score', 'attempt']) : ['status' => 'UNKNOWN'];
                echo 'data: '.json_encode($safe)."\n\n";
                if (ob_get_level()) {
                    ob_flush();
                }
                flush();
                if ($jr && ! in_array($jr->status, ['QUEUED', 'RUNNING'], true)) {
                    break;
                }
                sleep(2);
            }
        }, 200, ['Content-Type' => 'text/event-stream', 'Cache-Control' => 'no-cache', 'Connection' => 'keep-alive', 'X-Accel-Buffering' => 'no']);
    }

    public function similarity(Request $request, int $a, int $b)
    {
        if (! $request->user()->isTeacher()) {
            return response()->json(['error' => 'forbidden'], 403);
        }
        $rows = Submission::whereIn('id', [$a, $b])->orderBy('id')->pluck('source_code');
        if (count($rows) < 2) {
            return response()->json(['error' => 'not found'], 404);
        }

        return response()->json(['similarity' => round(Similarity::score($rows[0], $rows[1]), 4)]);
    }

    private function fetchVisible(Request $request, int $id): ?array
    {
        $s = Submission::with('currentRun')->find($id);
        if (! $s) {
            return null;
        }
        if ((int) $s->user_id !== (int) $request->user()->id && $request->user()->role === 'student') {
            return null;
        }
        $r = $s->toArray();
        if ($s->currentRun) {
            $r = array_merge($r, $s->currentRun->toArray());
        }

        return $r;
    }
}
