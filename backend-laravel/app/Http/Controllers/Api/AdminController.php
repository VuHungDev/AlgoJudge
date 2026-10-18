<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\CaseResult;
use App\Models\Clazz;
use App\Models\JudgingRun;
use App\Models\Problem;
use App\Models\ProblemVersion;
use App\Models\Submission;
use App\Models\TestCase;
use App\Models\User;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;

class AdminController extends Controller
{
    public function createProblem(Request $request)
    {
        $data = $request->validate([
            'slug' => 'required|string|max:100|unique:problems,slug',
            'title' => 'required|string|max:255',
            'topic' => 'nullable|string|max:100',
            'difficulty' => 'nullable|string|max:20',
            'statement' => 'nullable|string',
        ]);
        $p = Problem::create([
            'slug' => $data['slug'], 'title' => $data['title'],
            'topic' => $data['topic'] ?? '', 'difficulty' => $data['difficulty'] ?? 'easy',
            'created_by' => $request->user()->id,
        ]);
        $v = ProblemVersion::create(['problem_id' => $p->id, 'version_no' => 1, 'statement' => $data['statement'] ?? '', 'testset_version' => 'v1']);
        $p->update(['current_version_id' => $v->id]);

        return response()->json(['problem_id' => $p->id, 'version_id' => $v->id], 201);
    }

    public function updateProblem(Request $request, int $id)
    {
        $data = $request->validate(['statement' => 'nullable|string', 'input_spec' => 'nullable|string', 'output_spec' => 'nullable|string']);
        $p = Problem::findOrFail($id);
        $no = (int) ProblemVersion::where('problem_id', $id)->max('version_no') + 1;
        $old = $p->currentVersion;
        $v = ProblemVersion::create([
            'problem_id' => $id, 'version_no' => $no,
            'statement' => $data['statement'] ?? '', 'input_spec' => $data['input_spec'] ?? '',
            'output_spec' => $data['output_spec'] ?? '',
            'time_limit_ms' => $old->time_limit_ms ?? 2000,
            'testset_version' => $old->testset_version ?? 'v1',
        ]);
        $p->update(['current_version_id' => $v->id]);

        return response()->json(['version_id' => $v->id, 'version_no' => $no], 201);
    }

    public function addTestset(Request $request, int $id)
    {
        $data = $request->validate([
            'cases' => 'required|array|min:5',
            'checker' => 'nullable|in:exact,float,sorted,tokens,regex',
            'checker_config' => 'nullable|string|max:500',
        ]);
        if (($data['checker'] ?? null) === 'regex' && trim($data['checker_config'] ?? '') === '') {
            return response()->json(['error' => 'checker_config required for regex'], 422);
        }
        $p = Problem::findOrFail($id);
        $vid = $p->current_version_id;
        $ver = 'v'.time();
        $ord = 0;
        foreach ($data['cases'] as $c) {
            TestCase::create([
                'problem_version_id' => $vid, 'testset_version' => $ver, 'ordinal' => ++$ord,
                'input_data' => $c['input'] ?? '', 'expected_output' => $c['expected'] ?? '',
                'is_public' => $c['is_public'] ?? 0, 'weight' => $c['weight'] ?? 1,
                'group_name' => $c['group'] ?? 'default',
            ]);
        }
        $upd = ['testset_version' => $ver];
        if (isset($data['checker'])) {
            $upd['checker'] = $data['checker'];
            $upd['checker_config'] = $data['checker'] === 'regex' ? trim($data['checker_config'] ?? '') : null;
            if ($data['checker'] === 'regex' && $upd['checker_config'] === '') {
                return response()->json(['error' => 'checker_config required for regex'], 422);
            }
        }
        ProblemVersion::where('id', $vid)->update($upd);

        return response()->json(['testset_version' => $ver], 201);
    }

    public function rejudge(Request $request, int $sid)
    {
        $s = Submission::with('currentRun')->find($sid);
        if (! $s) {
            return response()->json(['error' => 'not found'], 404);
        }
        $pv = ProblemVersion::find($s->problem_version_id);
        JudgingRun::where('submission_id', $sid)->update(['is_current' => 0]);
        $r = JudgingRun::create(['submission_id' => $sid, 'testset_version' => $pv->testset_version, 'status' => 'QUEUED', 'is_current' => 1]);

        return response()->json(['run_id' => $r->id], 201);
    }

    public function compare(Request $request, int $sid)
    {
        $rows = CaseResult::whereIn('judging_run_id', [(int) $request->query('a', 0), (int) $request->query('b', 0)])
            ->orderBy('test_case_id')->get();

        return response()->json(['rows' => $rows]);
    }

    public function createClass(Request $request)
    {
        $data = $request->validate(['name' => 'required|string|max:255']);
        $c = Clazz::create(['name' => $data['name']]);

        return response()->json(['class_id' => $c->id], 201);
    }

    public function addMember(Request $request, int $cid)
    {
        $data = $request->validate(['email' => 'required|email', 'role' => 'nullable|string']);
        $u = User::where('email', $data['email'])->first();
        if (! $u) {
            return response()->json(['error' => 'user not found'], 404);
        }
        DB::table('class_members')->updateOrInsert(
            ['class_id' => $cid, 'user_id' => $u->id],
            ['role' => $data['role'] ?? 'student']
        );

        return response()->json(['ok' => true]);
    }

    public function classProgress(int $cid)
    {
        $rows = DB::table('class_members as m')->join('users as u', 'u.id', '=', 'm.user_id')
            ->leftJoin('submissions as s', 's.user_id', '=', 'm.user_id')
            ->leftJoin('judging_runs as r', fn ($j) => $j->on('r.submission_id', '=', 's.id')->where('r.is_current', 1))
            ->where('m.class_id', $cid)->groupBy('m.user_id')
            ->selectRaw('m.user_id, u.email, COUNT(DISTINCT s.id) as subs, SUM(r.verdict = "ACCEPTED") as solved')
            ->get();

        return response()->json(['rows' => $rows]);
    }

    public function queue()
    {
        return response()->json(JudgingRun::selectRaw('status, COUNT(*) as c')->groupBy('status')->get());
    }

    public function workers()
    {
        $running = JudgingRun::where('status', 'RUNNING')->select('id', 'status', 'lease_expires_at', 'attempt')->get();

        return response()->json(['running' => $running, 'lease_minutes' => 5]);
    }

    public function requeue(int $id)
    {
        JudgingRun::where('id', $id)->update(['status' => 'QUEUED', 'attempt' => DB::raw('attempt+1')]);

        return response()->json(['ok' => true]);
    }

    public function statistics()
    {
        return response()->json([
            'total_submissions' => Submission::count(),
            'by_verdict' => JudgingRun::whereNotNull('verdict')->selectRaw('verdict, COUNT(*) as c')->groupBy('verdict')->get(),
        ]);
    }
}
