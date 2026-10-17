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
Route::post('/auth/register', [AuthController::class, 'register']);
Route::post('/auth/login', [AuthController::class, 'login']);

Route::middleware('auth:sanctum')->group(function () {
    Route::get('/me', [AuthController::class, 'me']);

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
    Route::get('/me/progress', [SubmissionController::class, 'progress']);
    Route::get('/me/streak', [ContestController::class, 'streak']);
    Route::get('/me/recommend', [ContestController::class, 'recommend']);
    Route::get('/contests', [ContestController::class, 'index']);
    Route::get('/contests/{id}', [ContestController::class, 'show']);
    Route::get('/contests/{id}/leaderboard', [ContestController::class, 'leaderboard']);

    Route::middleware('role:teacher')->group(function () {
        Route::post('/admin/problems', [AdminController::class, 'createProblem']);
        Route::put('/admin/problems/{id}', [AdminController::class, 'updateProblem']);
        Route::post('/admin/problems/{id}/testsets', [AdminController::class, 'addTestset']);
        Route::post('/admin/submissions/{id}/rejudge', [AdminController::class, 'rejudge']);
        Route::get('/admin/submissions/{id}/compare', [AdminController::class, 'compare']);
        Route::get('/admin/submissions/{a}/similarity/{b}', [SubmissionController::class, 'similarity']);
        Route::post('/admin/classes', [AdminController::class, 'createClass']);
        Route::post('/admin/classes/{id}/members', [AdminController::class, 'addMember']);
        Route::get('/admin/classes/{id}/progress', [AdminController::class, 'classProgress']);
        Route::post('/admin/contests', [ContestController::class, 'store']);
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
    Route::get('/statistics', [AdminController::class, 'statistics']);
    Route::get('/config_info', fn () => response()->json(config('oj')));
    Route::get('/system_info', function () {
        return response()->json([
            'cpu_count' => trim((string) (@shell_exec('nproc 2>/dev/null') ?: '?')),
            'php' => PHP_VERSION,
        ]);
    });

    Route::middleware('role:admin')->group(function () {
        Route::get('/ops/queue', [AdminController::class, 'queue']);
        Route::get('/ops/workers', [AdminController::class, 'workers']);
        Route::post('/ops/runs/{id}/requeue', [AdminController::class, 'requeue']);
    });
});
Route::get('/submissions/{id}/events', [SubmissionController::class, 'events']);
});
