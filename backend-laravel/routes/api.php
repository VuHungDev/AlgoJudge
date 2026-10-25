<?php

use App\Http\Controllers\Api\AdminController;
use App\Http\Controllers\Api\AuthController;
use App\Http\Controllers\Api\ContestController;
use App\Http\Controllers\Api\ProblemController;
use App\Http\Controllers\Api\SubmissionController;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Route;

// Contract giu tuong thich voi PHP thuan: prefix /api/v1.
Route::prefix('v1')->group(function () {
// Route 'login' cho middleware auth:sanctum: API khong redirect,
// tra 401 JSON thay vi 500 RouteNotFoundException.
Route::get('/login', fn () => response()->json(['error' => 'unauthorized'], 401))->name('login');
Route::post('/auth/register', [AuthController::class, 'register']);
Route::post('/auth/login', [AuthController::class, 'login']);
Route::post('/auth/forgot', [AuthController::class, 'forgot']);
Route::post('/auth/reset', [AuthController::class, 'reset']);

Route::middleware('auth:sanctum')->group(function () {
    Route::get('/me', [AuthController::class, 'me']);
    Route::put('/me', [AuthController::class, 'updateProfile']);
    Route::post('/me/device-token', [AuthController::class, 'registerDevice']);
    Route::delete('/me/device-token', [AuthController::class, 'unregisterDevice']);

    Route::get('/problems', [ProblemController::class, 'index']);
    Route::get('/problems/{id}', [ProblemController::class, 'show']);
    Route::put('/problems/{id}/draft', [ProblemController::class, 'saveDraft']);
    Route::get('/problems/{id}/draft', [ProblemController::class, 'getDraft']);
    Route::post('/run', [SubmissionController::class, 'run']);

    Route::post('/submissions', [SubmissionController::class, 'create']);
    Route::post('/submissions/batch', [SubmissionController::class, 'batchCreate']);
    Route::get('/submissions/batch', [SubmissionController::class, 'batchShow']);
    // events nam ngoai auth:sanctum de ho tro ?token= (EventSource khong gui header).
    Route::get('/submissions/{id}/code', [SubmissionController::class, 'code']);
    Route::get('/submissions/{id}', [SubmissionController::class, 'show']);
    Route::delete('/submissions/{id}', [SubmissionController::class, 'destroy']);
    Route::get('/me/submissions', [SubmissionController::class, 'history']);
    Route::get('/me/assignments', [AdminController::class, 'myAssignments']);
    Route::get('/me/classes', [AdminController::class, 'myClasses']);
    Route::get('/classes/{id}', [AdminController::class, 'classDetail']);
    Route::get('/submissions/{id}/review', [AdminController::class, 'getReview']);
    Route::get('/me/progress', [SubmissionController::class, 'progress']);
    Route::get('/me/streak', [ContestController::class, 'streak']);
    Route::get('/me/recommend', [ContestController::class, 'recommend']);
    Route::get('/contests', [ContestController::class, 'index']);
    Route::get('/contests/{id}', [ContestController::class, 'show']);
    Route::get('/contests/{id}/leaderboard', [ContestController::class, 'leaderboard']);

    Route::middleware('role:teacher')->group(function () {
        Route::post('/admin/problems', [AdminController::class, 'createProblem']);
        Route::put('/admin/problems/{id}', [AdminController::class, 'updateProblem']);
        Route::delete('/admin/problems/{id}', [AdminController::class, 'deleteProblem']);
        Route::post('/admin/problems/{id}/testsets', [AdminController::class, 'addTestset']);
        Route::post('/admin/submissions/{id}/rejudge', [AdminController::class, 'rejudge']);
        Route::get('/admin/submissions/{id}/compare', [AdminController::class, 'compare']);
        Route::get('/admin/submissions/{a}/similarity/{b}', [SubmissionController::class, 'similarity']);
        Route::post('/admin/classes', [AdminController::class, 'createClass']);
        Route::get('/admin/classes', [AdminController::class, 'listClasses']);
        Route::put('/admin/classes/{id}', [AdminController::class, 'updateClass']);
        Route::delete('/admin/classes/{id}', [AdminController::class, 'deleteClass']);
        Route::post('/admin/classes/{id}/members', [AdminController::class, 'addMember']);
        Route::get('/admin/classes/{id}/members', [AdminController::class, 'listMembers']);
        Route::delete('/admin/classes/{id}/members/{uid}', [AdminController::class, 'removeMember']);
        Route::put('/admin/classes/{id}/members/{uid}', [AdminController::class, 'updateMember']);
        Route::get('/admin/classes/{id}/progress', [AdminController::class, 'classProgress']);
        Route::get('/admin/classes/{id}/assignments', [AdminController::class, 'classAssignments']);
        Route::post('/admin/assignments', [AdminController::class, 'assign']);
        Route::get('/admin/assignments', [AdminController::class, 'allAssignments']);
        Route::delete('/admin/assignments/{id}', [AdminController::class, 'deleteAssignment']);
        Route::get('/teacher/classes', [AdminController::class, 'myTeachingClasses']);
        Route::get('/teacher/overview', [AdminController::class, 'teacherOverview']);
        Route::get('/users/lookup', [AdminController::class, 'lookupUser']);
        Route::post('/admin/submissions/{id}/review', [AdminController::class, 'review']);
        Route::get('/admin/submissions/{id}/review', [AdminController::class, 'getReview']);
        Route::post('/admin/contests', [ContestController::class, 'store']);
        Route::put('/admin/contests/{id}', [ContestController::class, 'update']);
        Route::delete('/admin/contests/{id}', [ContestController::class, 'destroy']);
        Route::get('/admin/contests/{id}/access', [ContestController::class, 'accessList']);
        Route::put('/admin/contests/{id}/access', [ContestController::class, 'accessSet']);
    });

    Route::get('/languages', function () {
        return response()->json(['languages' => [
            ['id' => 1, 'name' => 'Python (3.12)', 'source_file' => 'main.py', 'compile_cmd' => null, 'run_cmd' => 'python3 main.py'],
            ['id' => 2, 'name' => 'C++ (GCC 13)', 'source_file' => 'main.cpp', 'compile_cmd' => 'g++ -O2 -std=c++17 -o /tmp/a main.cpp', 'run_cmd' => '/tmp/a'],
            ['id' => 3, 'name' => 'JavaScript (Node 22)', 'source_file' => 'main.js', 'compile_cmd' => null, 'run_cmd' => 'node main.js'],
            ['id' => 4, 'name' => 'Java (Temurin 17)', 'source_file' => 'Main.java', 'compile_cmd' => 'javac Main.java', 'run_cmd' => 'java Main'],
            ['id' => 5, 'name' => 'Go (1.22)', 'source_file' => 'main.go', 'compile_cmd' => 'go build -o /tmp/a main.go', 'run_cmd' => '/tmp/a'],
            ['id' => 6, 'name' => 'C (GCC 13)', 'source_file' => 'main.c', 'compile_cmd' => 'gcc -O2 -std=c17 -o /tmp/a main.c', 'run_cmd' => '/tmp/a'],
        ]]);
    });
    Route::get('/statuses', function () {
        return response()->json(['statuses' => [
            ['id' => 1, 'name' => 'In Queue'], ['id' => 2, 'name' => 'Processing'],
            ['id' => 3, 'name' => 'Accepted'], ['id' => 4, 'name' => 'Wrong Answer'],
            ['id' => 5, 'name' => 'Time Limit Exceeded'], ['id' => 6, 'name' => 'Compilation Error'],
            ['id' => 7, 'name' => 'Runtime Error'], ['id' => 13, 'name' => 'Internal Error'],
        ]]);
    });
    Route::get('/about', fn () => response()->json(['name' => 'AlgoJudge', 'version' => '1.0.0']));
    Route::get('/version', fn () => response('1.0.0')->header('Content-Type', 'text/plain'));

    Route::middleware('role:admin')->group(function () {
        Route::get('/admin/dashboard', [AdminController::class, 'dashboard']);
        Route::get('/admin/problems', [AdminController::class, 'adminProblems']);
        Route::get('/admin/problems/{id}/detail', [AdminController::class, 'adminProblemDetail']);
        Route::get('/admin/all-classes', [AdminController::class, 'adminClasses']);
        Route::put('/admin/classes/{id}/teacher', [AdminController::class, 'setClassTeacher']);
        Route::get('/admin/all-assignments', [AdminController::class, 'adminAssignments']);
        Route::get('/admin/submissions', [AdminController::class, 'adminSubmissions']);
        Route::get('/admin/contests', [AdminController::class, 'adminContests']);
        Route::get('/admin/activity-logs', [AdminController::class, 'activityLogs']);
        Route::get('/users/{id}/activity', [AdminController::class, 'userActivity']);
        Route::get('/users/{id}', [AdminController::class, 'showUser']);
        Route::put('/users/{id}', [AdminController::class, 'updateUser']);
        Route::get('/statistics', [AdminController::class, 'statistics']);
        Route::get('/config_info', fn () => response()->json(config('oj')));
        Route::get('/system_info', function () {
            return response()->json([
                'cpu_count' => trim((string) (@shell_exec('nproc 2>/dev/null') ?: '?')),
                'php' => PHP_VERSION,
            ]);
        });
        Route::get('/ops/queue', [AdminController::class, 'queue']);
        Route::get('/ops/workers', [AdminController::class, 'workers']);
        Route::post('/ops/runs/{id}/requeue', [AdminController::class, 'requeue']);
        Route::get('/users', [AdminController::class, 'listUsers']);
        Route::post('/users', [AdminController::class, 'createUser']);
        Route::put('/users/{id}/role', [AdminController::class, 'setUserRole']);
        Route::delete('/users/{id}', [AdminController::class, 'deleteUser']);
    });
});
Route::get('/submissions/{id}/events', [SubmissionController::class, 'events']);
});
