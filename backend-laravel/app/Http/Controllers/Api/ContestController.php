<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\ActivityLog;
use App\Models\Contest;
use App\Models\ContestAccess;
use App\Models\ContestProblem;
use App\Models\Problem;
use App\Models\Submission;
use App\Models\JudgingRun;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;

// Phase 4: contest co gio + leaderboard realtime + streak + goi y bai.
class ContestController extends Controller
{
    public function index(Request $request)
    {
        $per  = (int) min(max((int) $request->query('per_page', 10), 1), 50);
        $user = $request->user();
        $role = $user?->role ?? 'guest';

        $q = Contest::orderByDesc('id');
        // Student chi thay contest is_public hoac co trong contest_access.
        if ($user && $role === 'student') {
            $q->where(function ($w) use ($user) {
                $w->where('is_public', true)
                  ->orWhereExists(function ($sub) use ($user) {
                      $sub->from('contest_access')
                          ->whereColumn('contest_access.contest_id', 'contests.id')
                          ->where('contest_access.user_id', $user->id);
                  });
            });
        }

        $p = $q->paginate($per);
        return response()->json([
            'contests' => $p->items(),
            'meta' => ['page' => $p->currentPage(), 'per_page' => $p->perPage(), 'total' => $p->total(), 'last_page' => $p->lastPage()],
        ]);
    }

    public function show(int $id, Request $request)
    {
        $c = Contest::with('problems')->find($id);
        if (! $c) return response()->json(['error' => 'not found'], 404);

        $user = $request->user();
        if ($user && ! $c->isAccessibleBy($user->id, $user->role)) {
            return response()->json(['error' => 'not found'], 404);
        }

        return response()->json($c);
    }

    public function store(Request $request)
    {
        $data = $request->validate([
            'title'       => 'required|string|max:255',
            'description' => 'nullable|string',
            'starts_at'   => 'required|date',
            'ends_at'     => 'required|date|after:starts_at',
            'is_public'   => 'nullable|boolean',
            'user_ids'    => 'nullable|array',   // danh sach user duoc phep (khi is_public = false)
            'user_ids.*'  => 'integer',
            'problems'    => 'required|array|min:1',
            'problems.*.problem_version_id' => 'required|integer',
            'problems.*.points'             => 'nullable|integer|min:1',
        ]);
        $c = Contest::create([
            'title'       => $data['title'],
            'description' => $data['description'] ?? '',
            'starts_at'   => $data['starts_at'],
            'ends_at'     => $data['ends_at'],
            'is_public'   => $data['is_public'] ?? false,
            'created_by'  => $request->user()->id,
        ]);
        foreach ($data['problems'] as $i => $p) {
            ContestProblem::create([
                'contest_id'         => $c->id,
                'problem_version_id' => $p['problem_version_id'],
                'points'             => $p['points'] ?? 100,
                'ordinal'            => $i + 1,
            ]);
        }
        // Them danh sach user duoc phep (khi is_public = false)
        if (! ($data['is_public'] ?? false) && ! empty($data['user_ids'])) {
            foreach (array_unique($data['user_ids']) as $uid) {
                ContestAccess::firstOrCreate(['contest_id' => $c->id, 'user_id' => (int) $uid]);
            }
        }
        ActivityLog::record('create_contest', 'contest', $c->id, $c->title);
        return response()->json(['contest_id' => $c->id], 201);
    }

    // Sua contest (tieu de, mo ta, thoi gian, is_public, danh sach user).
    public function update(Request $request, int $id)
    {
        $data = $request->validate([
            'title'       => 'nullable|string|max:255',
            'description' => 'nullable|string',
            'starts_at'   => 'nullable|date',
            'ends_at'     => 'nullable|date',
            'is_public'   => 'nullable|boolean',
            'user_ids'    => 'nullable|array',
            'user_ids.*'  => 'integer',
        ]);
        $c = Contest::findOrFail($id);
        $c->fill(array_filter($data, fn ($v) => $v !== null && ! in_array(gettype($v), ['array'])));
        if (isset($data['is_public'])) $c->is_public = $data['is_public'];
        $c->save();

        if (isset($data['user_ids'])) {
            ContestAccess::where('contest_id', $c->id)->delete();
            foreach (array_unique($data['user_ids']) as $uid) {
                ContestAccess::create(['contest_id' => $c->id, 'user_id' => (int) $uid]);
            }
        }
        ActivityLog::record('update_contest', 'contest', $c->id, $c->title);
        return response()->json(['ok' => true]);
    }

    // Xoa contest (kem bai thi va danh sach access).
    public function destroy(int $id)
    {
        $c = Contest::findOrFail($id);
        ContestProblem::where('contest_id', $c->id)->delete();
        ContestAccess::where('contest_id', $c->id)->delete();
        $c->delete();
        ActivityLog::record('delete_contest', 'contest', $id);
        return response()->json(['ok' => true]);
    }

    // Xem / thay the danh sach user duoc phep (GET/PUT /admin/contests/{id}/access).
    public function accessList(int $id)
    {
        $c = Contest::findOrFail($id);
        $users = ContestAccess::where('contest_id', $c->id)->pluck('user_id');
        return response()->json(['contest_id' => $id, 'is_public' => (bool) $c->is_public, 'user_ids' => $users]);
    }

    public function accessSet(Request $request, int $id)
    {
        $data = $request->validate(['user_ids' => 'required|array', 'user_ids.*' => 'integer']);
        $c = Contest::findOrFail($id);
        ContestAccess::where('contest_id', $c->id)->delete();
        foreach (array_unique($data['user_ids']) as $uid) {
            ContestAccess::create(['contest_id' => $c->id, 'user_id' => (int) $uid]);
        }
        ActivityLog::record('set_contest_access', 'contest', $c->id, ['count' => count($data['user_ids'])]);
        return response()->json(['ok' => true, 'count' => count($data['user_ids'])]);
    }

    // Leaderboard: tong diem (AC dau tien moi bai contest) + so bai giai + thoi gian AC cuoi.
    public function leaderboard(int $id)
    {
        $c = Contest::with('problems')->find($id);
        if (! $c) {
            return response()->json(['error' => 'not found'], 404);
        }
        $pvIds = $c->problems->pluck('problem_version_id');
        $points = $c->problems->pluck('points', 'problem_version_id');
        $rows = JudgingRun::join('submissions as s', 's.id', '=', 'judging_runs.submission_id')
            ->join('users as u', 'u.id', '=', 's.user_id')
            ->whereIn('s.problem_version_id', $pvIds)
            ->where('judging_runs.is_current', 1)
            ->where('judging_runs.verdict', 'ACCEPTED')
            ->whereBetween('judging_runs.finished_at', [$c->starts_at, $c->ends_at])
            ->selectRaw('s.user_id, u.email, s.problem_version_id, MIN(judging_runs.finished_at) as first_ac')
            ->groupBy('s.user_id', 's.problem_version_id')
            ->get();
        $board = [];
        foreach ($rows as $r) {
            $uid = $r->user_id;
            $board[$uid] ??= ['user_id' => $uid, 'email' => $r->email, 'score' => 0, 'solved' => 0, 'last_ac' => null];
            $board[$uid]['score'] += (int) ($points[$r->problem_version_id] ?? 100);
            $board[$uid]['solved']++;
            $board[$uid]['last_ac'] = max($board[$uid]['last_ac'], $r->first_ac);
        }
        $board = array_values($board);
        usort($board, fn ($a, $b) => [$b['score'], $a['last_ac']] <=> [$a['score'], $b['last_ac']]);

        return response()->json(['contest_id' => $id, 'leaderboard' => $board]);
    }

    // Streak: so ngay lien tiep co bai ACCEPTED (tinh nguoc tu hom nay).
    public function streak(Request $request)
    {
        $days = DB::table('solve_streaks')->where('user_id', $request->user()->id)
            ->orderByDesc('day')->pluck('day')->map(fn ($d) => (string) $d)->all();
        $set = array_flip($days);
        $streak = 0;
        $d = date('Y-m-d');
        if (! isset($set[$d])) {
            $d = date('Y-m-d', strtotime('-1 day'));
        }
        while (isset($set[$d])) {
            $streak++;
            $d = date('Y-m-d', strtotime($d.' -1 day'));
        }

        return response()->json(['streak' => $streak, 'total_days' => count($days)]);
    }

    // Goi y bai tiep theo: bai cung topic voi bai vua giai nhung kho hon 1 bac,
    // hoac bai de nhat trong topic chua thu. Moi so voi app hien nay (thuong chi loc tay).
    public function recommend(Request $request)
    {
        $uid = $request->user()->id;
        $done = Submission::join('judging_runs as r', function ($j) {
            $j->on('r.submission_id', '=', 'submissions.id')->where('r.is_current', 1);
        })->where('submissions.user_id', $uid)->where('r.verdict', 'ACCEPTED')
            ->pluck('submissions.problem_version_id')->unique()->all();
        $tried = Submission::where('user_id', $uid)->pluck('problem_version_id')->unique()->all();
        $level = ['easy' => 1, 'medium' => 2, 'hard' => 3];
        $q = Problem::with('currentVersion')->whereHas('currentVersion', function ($qq) use ($tried) {
            $qq->whereNotIn('problem_versions.id', $tried);
        });
        if ($done) {
            $topics = Problem::whereHas('currentVersion', fn ($qq) => $qq->whereIn('problem_versions.id', $done))
                ->pluck('topic')->unique()->all();
            $maxLv = Problem::whereIn('topic', $topics)->pluck('difficulty')
                ->map(fn ($d) => $level[$d] ?? 1)->max() ?? 0;
            $next = ['easy', 'medium', 'hard'][min($maxLv, 2)] ?? 'easy';
            $q->whereIn('topic', $topics)->where('difficulty', $next);
        } else {
            $q->where('difficulty', 'easy');
        }
        $rec = $q->first();
        if (! $rec) {
            $rec = Problem::with('currentVersion')->whereHas('currentVersion', function ($qq) use ($tried) {
                $qq->whereNotIn('problem_versions.id', $tried);
            })->first();
        }

        return response()->json(['recommend' => $rec]);
    }
}
