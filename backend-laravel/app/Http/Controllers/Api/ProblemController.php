<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Draft;
use App\Models\Problem;
use Illuminate\Http\Request;

class ProblemController extends Controller
{
    public function index(Request $request)
    {
        $q = Problem::with('currentVersion');
        if ($request->topic) {
            $q->where('topic', $request->topic);
        }
        if ($request->difficulty) {
            $q->where('difficulty', $request->difficulty);
        }
        $per = (int) min(max((int) $request->query('per_page', 10), 1), 50);
        $p = $q->orderBy('id')->paginate($per);

        return response()->json([
            'problems' => $p->items(),
            'meta' => ['page' => $p->currentPage(), 'per_page' => $p->perPage(), 'total' => $p->total(), 'last_page' => $p->lastPage()],
        ]);
    }

    public function show(int $id)
    {
        $p = Problem::with('currentVersion')->find($id);
        if (! $p) {
            return response()->json(['error' => 'not found'], 404);
        }

        return response()->json($p);
    }

    public function saveDraft(Request $request, int $id)
    {
        $data = $request->validate([
            'language' => 'nullable|string|max:10',
            'code' => 'nullable|string|max:100000',
        ]);
        Draft::updateOrCreate(
            ['user_id' => $request->user()->id, 'problem_id' => $id],
            ['language' => $data['language'] ?? 'python', 'code' => $data['code'] ?? '']
        );

        return response()->json(['ok' => true]);
    }

    public function getDraft(Request $request, int $id)
    {
        $d = Draft::where('user_id', $request->user()->id)->where('problem_id', $id)->first();

        return response()->json($d ?? ['code' => '']);
    }
}
