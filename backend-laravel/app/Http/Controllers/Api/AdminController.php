<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\ActivityLog;
use App\Models\Assignment;
use App\Models\CaseResult;
use App\Models\Clazz;
use App\Models\JudgingRun;
use App\Models\Problem;
use App\Models\ProblemVersion;
use App\Models\Review;
use App\Models\Submission;
use App\Models\TestCase;
use App\Models\User;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Hash;

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
            'time_limit_ms' => 'nullable|integer|min:500|max:30000',
            'memory_limit_kb' => 'nullable|integer|min:65536|max:1048576',
            'source_limit_kb' => 'nullable|integer|min:10|max:1024',
        ]);
        $p = Problem::create([
            'slug' => $data['slug'], 'title' => $data['title'],
            'topic' => $data['topic'] ?? '', 'difficulty' => $data['difficulty'] ?? 'easy',
            'created_by' => $request->user()->id,
        ]);
        $v = ProblemVersion::create([
            'problem_id' => $p->id, 'version_no' => 1, 'statement' => $data['statement'] ?? '', 'testset_version' => 'v1',
            'time_limit_ms' => $data['time_limit_ms'] ?? 2000,
            'memory_limit_kb' => $data['memory_limit_kb'] ?? 262144,
            'source_limit_kb' => $data['source_limit_kb'] ?? 100,
        ]);
        $p->update(['current_version_id' => $v->id]);
        ActivityLog::record('create_problem', 'problem', $p->id, ['slug' => $p->slug, 'title' => $p->title]);
        return response()->json(['problem_id' => $p->id, 'version_id' => $v->id], 201);
    }

    public function updateProblem(Request $request, int $id)
    {
        $data = $request->validate([
            'title' => 'nullable|string|max:255',
            'topic' => 'nullable|string|max:100',
            'difficulty' => 'nullable|string|max:20',
            'statement' => 'nullable|string', 'input_spec' => 'nullable|string', 'output_spec' => 'nullable|string',
            'time_limit_ms' => 'nullable|integer|min:500|max:30000',
            'memory_limit_kb' => 'nullable|integer|min:65536|max:1048576',
            'source_limit_kb' => 'nullable|integer|min:10|max:1024',
        ]);
        $p = Problem::findOrFail($id);
        $p->fill(array_filter([
            'title' => $data['title'] ?? null,
            'topic' => $data['topic'] ?? null,
            'difficulty' => $data['difficulty'] ?? null,
        ], fn ($v) => $v !== null));
        $p->save();
        $no = (int) ProblemVersion::where('problem_id', $id)->max('version_no') + 1;
        $old = $p->currentVersion;
        $v = ProblemVersion::create([
            'problem_id' => $id, 'version_no' => $no,
            'statement' => $data['statement'] ?? $old->statement ?? '',
            'input_spec' => $data['input_spec'] ?? $old->input_spec ?? '',
            'output_spec' => $data['output_spec'] ?? $old->output_spec ?? '',
            'time_limit_ms' => $data['time_limit_ms'] ?? $old->time_limit_ms ?? 2000,
            'memory_limit_kb' => $data['memory_limit_kb'] ?? $old->memory_limit_kb ?? 262144,
            'source_limit_kb' => $data['source_limit_kb'] ?? $old->source_limit_kb ?? 100,
            'testset_version' => $old->testset_version ?? 'v1',
        ]);
        $p->update(['current_version_id' => $v->id]);
        ActivityLog::record('update_problem', 'problem', $id, ['version_no' => $no, 'title' => $p->title]);
        return response()->json(['version_id' => $v->id, 'version_no' => $no], 201);
    }

    // Xoa bai tap (kem version, testset, bai nop lien quan).
    public function deleteProblem(int $id)
    {
        $p = Problem::findOrFail($id);
        $vids = ProblemVersion::where('problem_id', $id)->pluck('id');
        $sids = Submission::whereIn('problem_version_id', $vids)->pluck('id');
        if ($sids->isNotEmpty()) {
            $runIds = JudgingRun::whereIn('submission_id', $sids)->pluck('id');
            if ($runIds->isNotEmpty()) {
                CaseResult::whereIn('judging_run_id', $runIds)->delete();
            }
            JudgingRun::whereIn('submission_id', $sids)->delete();
            Submission::whereIn('id', $sids)->delete();
        }
        TestCase::whereIn('problem_version_id', $vids)->delete();
        ProblemVersion::where('problem_id', $id)->delete();
        $p->delete();

        return response()->json(['ok' => true]);
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
        ActivityLog::record('rejudge', 'submission', $sid);
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
        $c = Clazz::create(['name' => $data['name'], 'created_by' => $request->user()->id]);
        // Tu dong them nguoi tao vao lop voi role teacher (de GV co the quan ly lop do).
        DB::table('class_members')->updateOrInsert(
            ['class_id' => $c->id, 'user_id' => $request->user()->id],
            ['role' => $request->user()->role === 'admin' ? 'teacher' : 'teacher']
        );
        ActivityLog::record('create_class', 'class', $c->id, $c->name);

        return response()->json(['class_id' => $c->id], 201);
    }

    // Danh sach lop kem si so (teacher/admin).
    public function listClasses(Request $request)
    {
        $per = (int) min(max((int) $request->query('per_page', 10), 1), 50);
        $p = Clazz::leftJoin('class_members as m', 'm.class_id', '=', 'classes.id')
            ->groupBy('classes.id')
            ->selectRaw('classes.*, COUNT(m.user_id) as members_count')
            ->orderByDesc('classes.id')->paginate($per);

        return response()->json([
            'classes' => $p->items(),
            'meta' => ['page' => $p->currentPage(), 'per_page' => $p->perPage(), 'total' => $p->total(), 'last_page' => $p->lastPage()],
        ]);
    }

    public function addMember(Request $request, int $cid)
    {
        if ($deny = $this->denyUnlessManages($cid)) return $deny;
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

    // Sua ten lop.
    public function updateClass(Request $request, int $cid)
    {
        if ($deny = $this->denyUnlessManages($cid)) return $deny;
        $data = $request->validate(['name' => 'required|string|max:255']);
        $c = Clazz::findOrFail($cid);
        $c->name = $data['name'];
        $c->save();

        return response()->json(['ok' => true]);
    }

    // Xoa lop (kem thanh vien).
    public function deleteClass(int $cid)
    {
        if ($deny = $this->denyUnlessManages($cid)) return $deny;
        Clazz::findOrFail($cid);
        DB::table('class_members')->where('class_id', $cid)->delete();
        Clazz::where('id', $cid)->delete();

        return response()->json(['ok' => true]);
    }

    public function classProgress(Request $request, int $cid)
    {
        if ($deny = $this->denyUnlessManages($cid)) return $deny;
        $per = (int) min(max((int) $request->query('per_page', 10), 1), 50);
        $page = (int) max((int) $request->query('page', 1), 1);
        $makeBase = fn () => DB::table('class_members as m')->join('users as u', 'u.id', '=', 'm.user_id')
            ->leftJoin('submissions as s', 's.user_id', '=', 'm.user_id')
            ->leftJoin('judging_runs as r', fn ($j) => $j->on('r.submission_id', '=', 's.id')->where('r.is_current', 1))
            ->where('m.class_id', $cid)->groupBy('m.user_id', 'u.email', 'u.display_name', 'm.role')
            ->selectRaw('m.user_id, u.email, u.display_name, m.role, COUNT(DISTINCT s.id) as subs, COALESCE(SUM(r.verdict = "ACCEPTED"),0) as solved, MAX(s.created_at) as last_submit');
        $total = (int) DB::table('class_members')->where('class_id', $cid)->count();
        $rows = $makeBase()->orderByDesc('solved')->orderBy('u.email')
            ->offset(($page - 1) * $per)->limit($per)->get();

        return response()->json([
            'rows' => $rows,
            'meta' => ['page' => $page, 'per_page' => $per, 'total' => $total, 'last_page' => max(1, (int) ceil($total / $per))],
        ]);
    }

    // Danh sach thanh vien 1 lop (phan trang).
    public function listMembers(Request $request, int $cid)
    {
        if ($deny = $this->denyUnlessManages($cid)) return $deny;
        $per = (int) min(max((int) $request->query('per_page', 10), 1), 50);
        $p = DB::table('class_members as m')->join('users as u', 'u.id', '=', 'm.user_id')
            ->where('m.class_id', $cid)
            ->select('m.user_id', 'u.email', 'u.display_name', 'm.role')
            ->orderBy('u.email')->paginate($per);

        return response()->json([
            'members' => $p->items(),
            'meta' => ['page' => $p->currentPage(), 'per_page' => $p->perPage(), 'total' => $p->total(), 'last_page' => $p->lastPage()],
        ]);
    }

    // Xoa hoc sinh khoi lop.
    public function removeMember(int $cid, int $uid)
    {
        if ($deny = $this->denyUnlessManages($cid)) return $deny;
        DB::table('class_members')->where('class_id', $cid)->where('user_id', $uid)->delete();

        return response()->json(['ok' => true]);
    }

    // Giao bai: ca nhan (user_id) hoac ca lop (class_id). Han nop tuy chon.
    public function assign(Request $request)
    {
        $data = $request->validate([
            'problem_id' => 'required|integer|exists:problems,id',
            'class_id' => 'nullable|integer|exists:classes,id',
            'user_id' => 'nullable|integer|exists:users,id',
            'due_at' => 'nullable|date',
            'note' => 'nullable|string|max:500',
        ]);
        if (empty($data['class_id']) && empty($data['user_id'])) {
            return response()->json(['error' => 'class_id or user_id required'], 422);
        }
        $a = Assignment::create([
            'problem_id' => $data['problem_id'],
            'class_id' => $data['class_id'] ?? null,
            'user_id' => $data['user_id'] ?? null,
            'created_by' => $request->user()->id,
            'due_at' => $data['due_at'] ?? null,
            'note' => $data['note'] ?? null,
        ]);
        ActivityLog::record('assign_problem', 'assignment', $a->id,
            ['problem_id' => $data['problem_id'], 'class_id' => $data['class_id'] ?? null, 'user_id' => $data['user_id'] ?? null]);
        return response()->json(['assignment_id' => $a->id], 201);
    }

    // Danh sach giao bai cua 1 lop (GV theo doi).
    public function classAssignments(Request $request, int $cid)
    {
        if ($deny = $this->denyUnlessManages($cid)) return $deny;
        $per = (int) min(max((int) $request->query('per_page', 10), 1), 50);
        $p = Assignment::where('class_id', $cid)->orderByDesc('id')->paginate($per);

        return response()->json([
            'assignments' => $p->items(),
            'meta' => ['page' => $p->currentPage(), 'per_page' => $p->perPage(), 'total' => $p->total(), 'last_page' => $p->lastPage()],
        ]);
    }

    // Danh sach TAT CA giao bai (admin/GV quan li): loc class_id / user_id / problem_id.
    public function allAssignments(Request $request)
    {
        $q = Assignment::query();
        if ($request->query('class_id')) {
            $q->where('class_id', (int) $request->query('class_id'));
        }
        if ($request->query('user_id')) {
            $q->where('user_id', (int) $request->query('user_id'));
        }
        if ($request->query('problem_id')) {
            $q->where('problem_id', (int) $request->query('problem_id'));
        }
        // GV chi thay bai thuoc lop minh day (tru admin thay tat ca).
        if (! $request->user()->isAdmin()) {
            $uid = $request->user()->id;
            $myClassIds = DB::table('class_members')->where('user_id', $uid)
                ->whereIn('role', ['teacher', 'assistant'])->pluck('class_id')->all();
            $q->where(function ($w) use ($uid, $myClassIds) {
                $w->where('user_id', $uid);
                if ($myClassIds) {
                    $w->orWhereIn('class_id', $myClassIds);
                }
            });
        }
        $per = (int) min(max((int) $request->query('per_page', 10), 1), 50);
        $p = $q->orderByDesc('id')->paginate($per);

        return response()->json([
            'assignments' => $p->items(),
            'meta' => ['page' => $p->currentPage(), 'per_page' => $p->perPage(), 'total' => $p->total(), 'last_page' => $p->lastPage()],
        ]);
    }

    // Lop cua toi (GV): cac lop minh phu trach (teacher/assistant) kem si so.
    public function myTeachingClasses(Request $request)
    {
        $uid = $request->user()->id;
        $rows = DB::table('class_members as m')->join('classes as c', 'c.id', '=', 'm.class_id')
            ->leftJoin('class_members as mm', 'mm.class_id', '=', 'c.id')
            ->where('m.user_id', $uid)->whereIn('m.role', ['teacher', 'assistant'])
            ->groupBy('c.id', 'c.name', 'm.role')
            ->selectRaw('c.id, c.name, m.role as my_role, COUNT(mm.user_id) as members_count')
            ->orderBy('c.name')->get();
        $aCount = Assignment::whereIn('class_id', $rows->pluck('id')->all())
            ->selectRaw('class_id as cid, COUNT(*) as c')->groupBy('cid')->pluck('c', 'cid');

        return response()->json(['classes' => $rows->map(fn ($r) => array_merge((array) $r, [
            'assignments_count' => (int) ($aCount[$r->id] ?? 0),
        ]))]);
    }

    // Tong quan drill-down cho GV: lop → bai → lop → sinh vien.
    public function teacherOverview(Request $request)
    {
        $uid = $request->user()->id;
        $classIds = DB::table('class_members')->where('user_id', $uid)
            ->whereIn('role', ['teacher', 'assistant'])->pluck('class_id')->all();
        if (! $classIds) {
            return response()->json(['classes' => []]);
        }
        $classes = DB::table('classes as c')
            ->leftJoin('class_members as m', 'm.class_id', '=', 'c.id')
            ->leftJoin('assignments as a', 'a.class_id', '=', 'c.id')
            ->whereIn('c.id', $classIds)
            ->groupBy('c.id', 'c.name')
            ->selectRaw('c.id, c.name, COUNT(DISTINCT m.user_id) as members_count, COUNT(DISTINCT a.id) as assignments_count')
            ->orderBy('c.name')->get();
        $problems = Assignment::whereIn('class_id', $classIds)
            ->join('problems as p', 'p.id', '=', 'assignments.problem_id')
            ->selectRaw('DISTINCT p.id, p.slug, p.title, p.topic, p.difficulty')
            ->orderBy('p.id')->get();

        return response()->json(['classes' => $classes, 'problems' => $problems]);
    }

    public function deleteAssignment(int $id)
    {
        Assignment::findOrFail($id)->delete();

        return response()->json(['ok' => true]);
    }

    // Bai duoc giao cho toi (ca nhan + cac lop cua toi).
    public function myAssignments(Request $request)
    {
        $uid = $request->user()->id;
        $classIds = DB::table('class_members')->where('user_id', $uid)->pluck('class_id');
        $rows = Assignment::where('user_id', $uid)
            ->orWhereIn('class_id', $classIds->all())
            ->orderByDesc('id')->get();

        return response()->json(['assignments' => $rows]);
    }

    // Cham diem + nhan xet cua GV tren 1 bai nop.
    public function review(Request $request, int $sid)
    {
        if ($deny = $this->denyUnlessGrades($sid)) return $deny;
        $data = $request->validate([
            'score' => 'nullable|integer|min:0|max:100',
            'comment' => 'nullable|string|max:2000',
        ]);
        Submission::findOrFail($sid);
        $r = Review::updateOrCreate(
            ['submission_id' => $sid],
            ['reviewer_id' => $request->user()->id, 'score' => $data['score'] ?? null, 'comment' => $data['comment'] ?? null]
        );
        ActivityLog::record('grade_submission', 'submission', $sid,
            ['score' => $data['score'] ?? null, 'has_comment' => ! empty($data['comment'])]);
        return response()->json($r);
    }

    public function getReview(int $sid)
    {
        if ($deny = $this->denyUnlessGrades($sid)) return $deny;
        return response()->json(Review::where('submission_id', $sid)->first() ?? (object) []);
    }

    // GV: bai nop cua hoc sinh trong 1 lop GV phu trach (kem diem/nhan xet da cham).
    // Admin xem duoc moi lop; GV chi xem lop minh la teacher/assistant -> 404 neu khong.
    public function teacherClassSubmissions(Request $request, int $cid)
    {
        $user = $request->user();
        if ($user->role !== 'admin') {
            $ok = DB::table('class_members')->where('class_id', $cid)->where('user_id', $user->id)
                ->whereIn('role', ['teacher', 'assistant'])->exists();
            if (! $ok) {
                return response()->json(['error' => 'not found'], 404);
            }
        }
        $studentIds = DB::table('class_members')->where('class_id', $cid)->where('role', 'student')->pluck('user_id');
        $q = DB::table('submissions as s')
            ->join('users as u', 'u.id', '=', 's.user_id')
            ->leftJoin('problem_versions as v', 'v.id', '=', 's.problem_version_id')
            ->leftJoin('problems as p', 'p.id', '=', 'v.problem_id')
            ->leftJoin('judging_runs as r', fn ($j) => $j->on('r.submission_id', '=', 's.id')->where('r.is_current', 1))
            ->leftJoin('reviews as rv', 'rv.submission_id', '=', 's.id')
            ->whereIn('s.user_id', $studentIds)
            ->when($request->query('user_id'), fn ($w, $v) => $w->where('s.user_id', (int) $v))
            ->when($request->query('problem_id'), fn ($w, $v) => $w->where('p.id', (int) $v))
            ->when($request->query('ungraded'), fn ($w) => $w->whereNull('rv.id'))
            ->select('s.id', 's.language', 's.created_at', 'u.id as user_id', 'u.email', 'u.display_name',
                'p.id as problem_id', 'p.title as problem_title', 'r.status', 'r.verdict', 'r.score',
                'rv.score as review_score', 'rv.comment as review_comment')
            ->orderByDesc('s.id');
        $p = $q->paginate(self::perPage($request));

        return response()->json(['submissions' => $p->items(), 'meta' => self::meta($p)]);
    }

    // Quan tri nguoi dung: liet ke (phan trang) + doi vai tro.
    // Danh sach giao vien / hoc sinh nam o day, khong phai trang teacher.

    // Admin tao tai khoan (mac dinh student, co the chon teacher).
    public function createUser(Request $request)
    {
        $data = $request->validate([
            'email' => 'required|email|unique:users,email',
            'password' => 'required|string|min:8|max:255',
            'role' => 'required|in:student,teacher,admin',
            'display_name' => 'nullable|string|max:100',
        ]);
        if (! AuthController::strongPassword($data['password'])) {
            return response()->json(['error' => 'weak password'], 422);
        }
        $u = User::create([
            'email' => $data['email'],
            'password_hash' => \Illuminate\Support\Facades\Hash::make($data['password']),
            'role' => $data['role'],
            'display_name' => $data['display_name'] ?? null,
        ]);

        return response()->json(['user_id' => $u->id], 201);
    }

    // Admin xoa tai khoan (khong tu xoa chinh minh).
    public function deleteUser(Request $request, int $id)
    {
        $u = User::findOrFail($id);
        if ($u->id === $request->user()->id) {
            return response()->json(['error' => 'cannot delete yourself'], 422);
        }
        if ($u->role === 'admin' && User::where('role', 'admin')->count() <= 1) {
            return response()->json(['error' => 'cannot delete last admin'], 422);
        }
        $sids = Submission::where('user_id', $id)->pluck('id');
        if ($sids->isNotEmpty()) {
            $runIds = JudgingRun::whereIn('submission_id', $sids)->pluck('id');
            if ($runIds->isNotEmpty()) {
                CaseResult::whereIn('judging_run_id', $runIds)->delete();
            }
            JudgingRun::whereIn('submission_id', $sids)->delete();
            Submission::whereIn('id', $sids)->delete();
        }
        DB::table('class_members')->where('user_id', $id)->delete();
        \App\Models\DeviceToken::where('user_id', $id)->delete();
        $u->delete();

        return response()->json(['ok' => true]);
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
        ActivityLog::record('requeue_run', 'judging_run', $id);
        return response()->json(['ok' => true]);
    }

    public function statistics()
    {
        return response()->json([
            'total_submissions' => Submission::count(),
            'by_verdict' => JudgingRun::whereNotNull('verdict')->selectRaw('verdict, COUNT(*) as c')->groupBy('verdict')->get(),
        ]);
    }

    // Lop cua toi (hoc sinh / GV): ten lop, vai tro, si so, bai duoc giao, han gan nhat.
    public function myClasses(Request $request)
    {
        $uid = $request->user()->id;
        $rows = DB::table('class_members as m')->join('classes as c', 'c.id', '=', 'm.class_id')
            ->leftJoin('class_members as mm', 'mm.class_id', '=', 'c.id')
            ->where('m.user_id', $uid)
            ->groupBy('c.id', 'c.name', 'm.role')
            ->selectRaw('c.id, c.name, m.role as my_role, COUNT(mm.user_id) as members_count')
            ->orderBy('c.name')->get();
        $classIds = $rows->pluck('id')->all();
        $aCount = $classIds
            ? Assignment::where('user_id', $uid)->orWhereIn('class_id', $classIds)
                ->selectRaw('COALESCE(class_id, 0) as cid, COUNT(*) as c')->groupBy('cid')->pluck('c', 'cid')
            : collect();
        $rows = $rows->map(function ($r) use ($uid, $classIds, $aCount) {
            $due = Assignment::where('user_id', $uid)->orWhere('class_id', $r->id)
                ->whereNotNull('due_at')->min('due_at');
            $r->assignments_count = (int) ($aCount[$r->id] ?? 0) + (int) ($aCount[0] ?? 0);
            $r->next_due_at = $due;
            return $r;
        });

        return response()->json(['classes' => $rows]);
    }

    // Chi tiet 1 lop cho thanh vien: thong tin lop, GV, si so, ban cung lop, bai duoc giao.
    public function classDetail(Request $request, int $cid)
    {
        $uid = $request->user()->id;
        $isMember = DB::table('class_members')->where('class_id', $cid)->where('user_id', $uid)->exists();
        if (! $isMember && ! $request->user()->isTeacher()) {
            return response()->json(['error' => 'forbidden'], 403);
        }
        $c = Clazz::findOrFail($cid);
        $teachers = DB::table('class_members as m')->join('users as u', 'u.id', '=', 'm.user_id')
            ->where('m.class_id', $cid)->whereIn('m.role', ['teacher', 'assistant'])
            ->select('m.user_id', 'u.email', 'u.display_name', 'm.role')->orderBy('u.email')->get();
        $mates = DB::table('class_members as m')->join('users as u', 'u.id', '=', 'm.user_id')
            ->where('m.class_id', $cid)
            ->select('m.user_id', 'u.email', 'u.display_name', 'm.role')->orderBy('u.email')->limit(50)->get();
        $total = (int) DB::table('class_members')->where('class_id', $cid)->count();
        $assignments = Assignment::where('class_id', $cid)->orderByDesc('id')->limit(20)->get();

        return response()->json([
            'class' => ['id' => $c->id, 'name' => $c->name],
            'teachers' => $teachers,
            'mates' => $mates,
            'members_total' => $total,
            'assignments' => $assignments,
        ]);
    }

    // GV sua vai tro hoc sinh trong lop (student <-> assistant).
    public function updateMember(Request $request, int $cid, int $uid)
    {
        if ($deny = $this->denyUnlessManages($cid)) return $deny;
        $data = $request->validate(['role' => 'required|in:student,assistant']);
        $n = DB::table('class_members')->where('class_id', $cid)->where('user_id', $uid)->update(['role' => $data['role']]);
        if (! $n) {
            return response()->json(['error' => 'member not found'], 404);
        }

        return response()->json(['ok' => true]);
    }

    // Admin xem chi tiet 1 user (khong tra password_hash).
    public function showUser(int $id)
    {
        $u = User::findOrFail($id);
        $stats = [
            'submissions' => Submission::where('user_id', $id)->count(),
            'classes' => DB::table('class_members')->where('user_id', $id)->count(),
        ];

        return response()->json(array_merge(
            $u->only(['id', 'email', 'role', 'display_name', 'created_at']),
            ['stats' => $stats]
        ));
    }

    // Admin sua user: email, ten hien thi, vai tro, dat lai mat khau.
    public function updateUser(Request $request, int $id)
    {
        $data = $request->validate([
            'email' => 'nullable|email|unique:users,email,'.$id,
            'display_name' => 'nullable|string|max:100',
            'role' => 'nullable|in:student,teacher,admin',
            'password' => 'nullable|string|min:8|max:255',
        ]);
        $u = User::findOrFail($id);
        if (isset($data['email'])) {
            $u->email = strtolower(trim($data['email']));
        }
        if (array_key_exists('display_name', $data)) {
            $u->display_name = $data['display_name'];
        }
        if (isset($data['role'])) {
            if ($u->id === $request->user()->id && $data['role'] !== 'admin') {
                return response()->json(['error' => 'cannot demote yourself'], 422);
            }
            $u->role = $data['role'];
        }
        if (! empty($data['password'])) {
            // Tai khoan admin co dinh: khong doi mat khau qua giao dien.
            if ($u->role === 'admin') {
                return response()->json(['error' => 'not allowed for admin'], 403);
            }
            if (! AuthController::strongPassword($data['password'])) {
                return response()->json(['error' => 'weak password'], 422);
            }
            $u->password_hash = Hash::make($data['password']);
        }
        $u->save();

        return response()->json($u->only(['id', 'email', 'role', 'display_name']));
    }

    // Admin: danh sach bai tap GV da dang len (ten nguoi dang, so ca cham, luot nop).
    public function adminProblems(Request $request)
    {
        $per = (int) min(max((int) $request->query('per_page', 10), 1), 50);
        $p = Problem::leftJoin('users as u', 'u.id', '=', 'problems.created_by')
            ->leftJoin('problem_versions as v', 'v.id', '=', 'problems.current_version_id')
            ->leftJoin('test_cases as t', 't.problem_version_id', '=', 'v.id')
            ->when($request->query('mine'), fn ($q) => $q->where('problems.created_by', $request->user()->id))
            ->groupBy('problems.id', 'problems.slug', 'problems.title', 'problems.topic', 'problems.difficulty', 'problems.created_by', 'problems.created_at', 'u.email', 'u.display_name', 'v.testset_version')
            ->selectRaw('problems.id, problems.slug, problems.title, problems.topic, problems.difficulty, problems.created_by, problems.created_at, u.email as author_email, u.display_name as author_name, v.testset_version, COUNT(DISTINCT t.id) as cases_count')
            ->orderByDesc('problems.id')->paginate($per);
        $ids = collect($p->items())->pluck('id')->all();
        $subCounts = $ids
            ? Submission::join('problem_versions as pv', 'pv.id', '=', 'submissions.problem_version_id')
                ->whereIn('pv.problem_id', $ids)
                ->selectRaw('pv.problem_id as pid, COUNT(*) as c')->groupBy('pid')->pluck('c', 'pid')
            : collect();

        return response()->json([
            'problems' => array_map(fn ($row) => array_merge((array) $row, [
                'submissions_count' => (int) ($subCounts[$row->id] ?? 0),
            ]), $p->items()),
            'meta' => ['page' => $p->currentPage(), 'per_page' => $p->perPage(), 'total' => $p->total(), 'last_page' => $p->lastPage()],
        ]);
    }

    // Admin dashboard: tong quan user / lop / bai / submission theo verdict.
    public function dashboard()
    {
        $runs = JudgingRun::where('is_current', 1)->whereNotNull('verdict')
            ->selectRaw('verdict, COUNT(*) as c')->groupBy('verdict')->pluck('c', 'verdict');

        return response()->json([
            'users_total' => User::count(),
            'users_by_role' => User::selectRaw('role, COUNT(*) as c')->groupBy('role')->pluck('c', 'role'),
            'classes_total' => Clazz::count(),
            'problems_total' => Problem::count(),
            'submissions_total' => Submission::count(),
            'queue' => JudgingRun::selectRaw('status, COUNT(*) as c')->groupBy('status')->get(),
            'by_verdict' => $runs,
        ]);
    }

    // Tra 1 user theo email (GV giao bai ca nhan).
    public function lookupUser(Request $request)
    {
        $data = $request->validate(['email' => 'required|email']);
        $u = User::where('email', $data['email'])->first(['id', 'email', 'display_name', 'role']);
        if (! $u) {
            return response()->json(['error' => 'user not found'], 404);
        }

        return response()->json($u);
    }
    public function listUsers(Request $request)
    {
        $q = User::query();
        if ($request->role) {
            $q->where('role', $request->role);
        }
        if ($request->query('q')) {
            $s = '%'.$request->query('q').'%';
            $q->where(fn ($w) => $w->where('email', 'like', $s)->orWhere('display_name', 'like', $s));
        }
        $per = (int) min(max((int) $request->query('per_page', 10), 1), 50);
        $p = $q->orderBy('id')->paginate($per);

        return response()->json([
            'users' => $p->items(),
            'meta' => ['page' => $p->currentPage(), 'per_page' => $p->perPage(), 'total' => $p->total(), 'last_page' => $p->lastPage()],
        ]);
    }

    public function setUserRole(Request $request, int $id)
    {
        $data = $request->validate(['role' => 'required|in:student,teacher,admin']);
        $u = User::findOrFail($id);
        // Khong tu ha cap chinh minh keo mat quyen admin cuoi cung.
        if ($u->id === $request->user()->id && $data['role'] !== 'admin') {
            return response()->json(['error' => 'cannot demote yourself'], 422);
        }
        if ($u->role === 'admin' && $data['role'] !== 'admin' && User::where('role', 'admin')->count() <= 1) {
            return response()->json(['error' => 'cannot demote last admin'], 422);
        }
        $u->role = $data['role'];
        $u->save();

        return response()->json(['ok' => true, 'role' => $u->role]);
    }

    // GV chi quan ly lop minh phu trach (role teacher/assistant trong class_members). Admin luon duoc.
    // Tra 404 de khong lo su ton tai cua lop (muc 8.6 CLAUDE.md).
    private function denyUnlessManages(int $cid)
    {
        $u = request()->user();
        if ($u->role === 'admin') return null;
        $ok = DB::table('class_members')->where('class_id', $cid)->where('user_id', $u->id)
            ->whereIn('role', ['teacher', 'assistant'])->exists();
        return $ok ? null : response()->json(['error' => 'not found'], 404);
    }

    // GV chi cham bai nop cua hoc sinh thuoc lop minh phu trach.
    private function denyUnlessGrades(int $sid)
    {
        $u = request()->user();
        $s = Submission::find($sid);
        if (! $s) return response()->json(['error' => 'not found'], 404);
        if ($u->role === 'admin') return null;
        $ok = DB::table('class_members as t')
            ->join('class_members as st', 'st.class_id', '=', 't.class_id')
            ->where('t.user_id', $u->id)->whereIn('t.role', ['teacher', 'assistant'])
            ->where('st.user_id', $s->user_id)->exists();
        return $ok ? null : response()->json(['error' => 'not found'], 404);
    }

    private static function meta($p): array
    {
        return ['page' => $p->currentPage(), 'per_page' => $p->perPage(), 'total' => $p->total(), 'last_page' => $p->lastPage()];
    }

    private static function perPage(Request $request): int
    {
        return (int) min(max((int) $request->query('per_page', 20), 1), 50);
    }

    // Admin: tat ca lop + giao vien phu trach + si so + so bai giao (loc theo ten).
    public function adminClasses(Request $request)
    {
        $q = DB::table('classes as c')
            ->leftJoin('class_members as m', 'm.class_id', '=', 'c.id')
            ->leftJoin('assignments as a', 'a.class_id', '=', 'c.id')
            ->when($request->query('q'), fn ($w, $v) => $w->where('c.name', 'like', '%'.$v.'%'))
            ->groupBy('c.id', 'c.name', 'c.created_at')
            ->selectRaw("c.id, c.name, c.created_at,
                COUNT(DISTINCT CASE WHEN m.role = 'student' THEN m.user_id END) as students_count,
                COUNT(DISTINCT a.id) as assignments_count")
            ->orderByDesc('c.id');
        $p = $q->paginate(self::perPage($request));
        $ids = collect($p->items())->pluck('id')->all();
        $teachers = $ids
            ? DB::table('class_members as m')->join('users as u', 'u.id', '=', 'm.user_id')
                ->whereIn('m.class_id', $ids)->whereIn('m.role', ['teacher', 'assistant'])
                ->select('m.class_id', 'u.id', 'u.email', 'u.display_name', 'm.role')->get()->groupBy('class_id')
            : collect();

        return response()->json([
            'classes' => array_map(fn ($c) => array_merge((array) $c, [
                'teachers' => array_values(($teachers[$c->id] ?? collect())->map(fn ($t) => [
                    'id' => $t->id, 'email' => $t->email, 'display_name' => $t->display_name, 'role' => $t->role,
                ])->all()),
            ]), $p->items()),
            'meta' => self::meta($p),
        ]);
    }

    // Admin: gan / doi giao vien phu trach lop (user phai co role teacher).
    public function setClassTeacher(Request $request, int $cid)
    {
        $data = $request->validate(['user_id' => 'required|integer|exists:users,id']);
        $c = Clazz::findOrFail($cid);
        $u = User::findOrFail($data['user_id']);
        if ($u->role !== 'teacher') {
            return response()->json(['error' => 'user is not a teacher'], 422);
        }
        DB::table('class_members')->updateOrInsert(['class_id' => $cid, 'user_id' => $u->id], ['role' => 'teacher']);
        // Ghi created_by cho lop de biet GV phu trach.
        $c->created_by = $u->id;
        $c->save();
        ActivityLog::record('set_class_teacher', 'class', $cid, ['teacher_id' => $u->id, 'email' => $u->email]);
        return response()->json(['ok' => true]);
    }

    // Admin: tat ca giao bai kem ten bai, ten lop/hoc sinh, nguoi giao.
    public function adminAssignments(Request $request)
    {
        $q = DB::table('assignments as a')
            ->leftJoin('problems as p', 'p.id', '=', 'a.problem_id')
            ->leftJoin('classes as c', 'c.id', '=', 'a.class_id')
            ->leftJoin('users as su', 'su.id', '=', 'a.user_id')
            ->leftJoin('users as cu', 'cu.id', '=', 'a.created_by')
            ->when($request->query('class_id'), fn ($w, $v) => $w->where('a.class_id', (int) $v))
            ->when($request->query('problem_id'), fn ($w, $v) => $w->where('a.problem_id', (int) $v))
            ->when($request->query('teacher_id'), fn ($w, $v) => $w->where('a.created_by', (int) $v))
            ->select('a.id', 'a.problem_id', 'a.class_id', 'a.user_id', 'a.due_at', 'a.note', 'a.created_at',
                'p.title as problem_title', 'c.name as class_name', 'su.email as student_email',
                'cu.email as teacher_email', 'cu.display_name as teacher_name')
            ->orderByDesc('a.id');
        $p = $q->paginate(self::perPage($request));

        return response()->json(['assignments' => $p->items(), 'meta' => self::meta($p)]);
    }

    // Admin: tat ca bai nop (loc verdict / email / bai) - giam sat chat luong cham.
    public function adminSubmissions(Request $request)
    {
        $q = DB::table('submissions as s')
            ->join('users as u', 'u.id', '=', 's.user_id')
            ->leftJoin('problem_versions as v', 'v.id', '=', 's.problem_version_id')
            ->leftJoin('problems as p', 'p.id', '=', 'v.problem_id')
            ->leftJoin('judging_runs as r', fn ($j) => $j->on('r.submission_id', '=', 's.id')->where('r.is_current', 1))
            ->when($request->query('verdict'), fn ($w, $v) => $w->where('r.verdict', $v))
            ->when($request->query('status'), fn ($w, $v) => $w->where('r.status', $v))
            ->when($request->query('q'), fn ($w, $v) => $w->where('u.email', 'like', '%'.$v.'%'))
            ->when($request->query('problem_id'), fn ($w, $v) => $w->where('p.id', (int) $v))
            ->when($request->query('user_id'), fn ($w, $v) => $w->where('s.user_id', (int) $v))
            // Loc theo lop: lay cac submission cua hoc sinh trong lop.
            ->when($request->query('class_id'), fn ($w, $v) => $w->whereIn('s.user_id',
                DB::table('class_members')->where('class_id', (int) $v)->pluck('user_id')
            ))
            ->select('s.id', 's.language', 's.created_at', 'u.id as user_id', 'u.email', 'u.display_name',
                'p.id as problem_id', 'p.title as problem_title', 'r.id as run_id', 'r.status', 'r.verdict', 'r.score', 'r.attempt')
            ->orderByDesc('s.id');
        $p = $q->paginate(self::perPage($request));

        return response()->json(['submissions' => $p->items(), 'meta' => self::meta($p)]);
    }

    // Admin: chi tiet 1 bai tap (de, gioi han, so ca, so lan giao, ty le AC).
    public function adminProblemDetail(int $id)
    {
        $p = Problem::with('currentVersion')->findOrFail($id);
        $author = $p->created_by ? User::find($p->created_by, ['id', 'email', 'display_name']) : null;
        $vids = ProblemVersion::where('problem_id', $id)->pluck('id');
        $subs = Submission::whereIn('problem_version_id', $vids)->count();
        $ac = JudgingRun::join('submissions as s', 's.id', '=', 'judging_runs.submission_id')
            ->whereIn('s.problem_version_id', $vids)->where('judging_runs.is_current', 1)
            ->where('judging_runs.verdict', 'ACCEPTED')->count();
        $cases = $p->current_version_id ? TestCase::where('problem_version_id', $p->current_version_id)->count() : 0;
        $assigned = DB::table('assignments as a')->leftJoin('classes as c', 'c.id', '=', 'a.class_id')
            ->where('a.problem_id', $id)->select('a.id', 'a.class_id', 'c.name as class_name', 'a.user_id', 'a.due_at')
            ->orderByDesc('a.id')->limit(20)->get();

        return response()->json([
            'problem' => $p->only(['id', 'slug', 'title', 'topic', 'difficulty', 'created_at']),
            'version' => $p->currentVersion?->only(['id', 'version_no', 'statement', 'time_limit_ms', 'memory_limit_kb', 'testset_version', 'score', 'checker']),
            'author' => $author,
            'stats' => ['submissions' => $subs, 'accepted' => $ac, 'cases' => $cases, 'versions' => $vids->count()],
            'assignments' => $assigned,
        ]);
    }

    // Admin: danh sach ky thi kem trang thai + so bai + so thi sinh co bai AC.
    public function adminContests(Request $request)
    {
        $p = \App\Models\Contest::withCount('problems')->orderByDesc('id')->paginate(self::perPage($request));
        $now = now();

        return response()->json([
            'contests' => array_map(fn ($c) => array_merge($c->only(['id', 'title', 'description', 'starts_at', 'ends_at', 'problems_count']), [
                'state' => $c->starts_at > $now ? 'upcoming' : ($c->ends_at < $now ? 'ended' : 'running'),
            ]), $p->items()),
            'meta' => self::meta($p),
        ]);
    }

    // Admin: lich su bai nop + lop + nhat ky hoat dong cua 1 user.
    public function userActivity(Request $request, int $id)
    {
        User::findOrFail($id);
        $subs = DB::table('submissions as s')
            ->leftJoin('problem_versions as v', 'v.id', '=', 's.problem_version_id')
            ->leftJoin('problems as p', 'p.id', '=', 'v.problem_id')
            ->leftJoin('judging_runs as r', fn ($j) => $j->on('r.submission_id', '=', 's.id')->where('r.is_current', 1))
            ->where('s.user_id', $id)
            ->select('s.id', 's.language', 's.created_at', 'p.title as problem_title', 'r.verdict', 'r.score')
            ->orderByDesc('s.id')->paginate(self::perPage($request));
        $classes = DB::table('class_members as m')->join('classes as c', 'c.id', '=', 'm.class_id')
            ->where('m.user_id', $id)->select('c.id', 'c.name', 'm.role')->orderBy('c.name')->get();
        $logs = DB::table('activity_logs')
            ->where('user_id', $id)
            ->orderByDesc('created_at')
            ->limit(100)
            ->select('id', 'action', 'resource_type', 'resource_id', 'detail', 'ip', 'created_at')
            ->get();

        return response()->json([
            'submissions' => $subs->items(),
            'meta'        => self::meta($subs),
            'classes'     => $classes,
            'activity_logs' => $logs,
        ]);
    }

    // Admin: nhat ky hoat dong toan he thong (tat ca user).
    public function activityLogs(Request $request)
    {
        $q = DB::table('activity_logs as l')
            ->leftJoin('users as u', 'u.id', '=', 'l.user_id')
            ->select('l.id', 'l.user_id', 'u.email', 'l.actor_role', 'l.action',
                     'l.resource_type', 'l.resource_id', 'l.detail', 'l.ip', 'l.created_at')
            ->orderByDesc('l.id');
        if ($request->query('action')) {
            $q->where('l.action', $request->query('action'));
        }
        if ($request->query('role')) {
            $q->where('l.actor_role', $request->query('role'));
        }
        if ($request->query('user_id')) {
            $q->where('l.user_id', (int) $request->query('user_id'));
        }
        $p = $q->paginate(self::perPage($request));
        return response()->json(['logs' => $p->items(), 'meta' => self::meta($p)]);
    }
}
