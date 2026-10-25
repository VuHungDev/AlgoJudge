<?php

namespace Tests\Feature;

use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\DB;
use Tests\TestCase;

// Kiem thu lease recovery: job RUNNING qua han phai duoc thu hoi, khong treo vinh vien.
class JudgeLeaseRecoveryTest extends TestCase
{
    use RefreshDatabase;

    private function seedRun(string $status, string $expiresAt, int $attempt): int
    {
        DB::table('users')->insert(['id' => 1, 'email' => 'sv@oj.local', 'password_hash' => 'x', 'role' => 'student']);
        DB::table('problems')->insert(['id' => 1, 'slug' => 'p1', 'title' => 'P1', 'topic' => 't', 'difficulty' => 'easy', 'current_version_id' => 1]);
        DB::table('problem_versions')->insert(['id' => 1, 'problem_id' => 1, 'version_no' => 1, 'testset_version' => 'v1', 'time_limit_ms' => 2000, 'checker' => 'exact']);
        DB::table('submissions')->insert([
            'id' => 1, 'user_id' => 1, 'problem_version_id' => 1, 'language' => 'python',
            'source_code' => 'print(1)', 'idempotency_key' => 'k1', 'number_of_runs' => 1,
        ]);
        DB::table('judging_runs')->insert([
            'id' => 1, 'submission_id' => 1, 'testset_version' => 'v1', 'status' => $status,
            'attempt' => $attempt, 'lease_token' => 'stale', 'lease_expires_at' => $expiresAt, 'is_current' => 1,
        ]);

        return 1;
    }

    public function test_expired_lease_is_requeued_when_attempts_remain(): void
    {
        $this->seedRun('RUNNING', now()->subMinutes(10)->toDateTimeString(), 1);

        $this->artisan('judge:work', ['--once' => true]);

        $run = DB::table('judging_runs')->where('id', 1)->first();
        $this->assertNotSame('RUNNING', $run->status);
        $this->assertNull($run->lease_token);
    }

    public function test_expired_lease_becomes_system_error_after_max_attempts(): void
    {
        $this->seedRun('RUNNING', now()->subMinutes(10)->toDateTimeString(), 3);

        $this->artisan('judge:work', ['--once' => true]);

        $run = DB::table('judging_runs')->where('id', 1)->first();
        $this->assertSame('SYSTEM_ERROR', $run->status);
        $this->assertNull($run->lease_token);
    }

    public function test_unauthenticated_api_returns_json_401(): void
    {
        $this->getJson('/api/v1/me')->assertStatus(401);
    }

    public function test_student_cannot_access_admin_routes(): void
    {
        $user = \App\Models\User::create([
            'email' => 'student-role-test@example.test',
            'password_hash' => bcrypt('password'),
            'role' => 'student',
        ]);
        $token = $user->createToken('test')->plainTextToken;
        $headers = ['Authorization' => 'Bearer '.$token];

        $this->getJson('/api/v1/ops/queue', $headers)->assertStatus(403);
        $this->getJson('/api/v1/statistics', $headers)->assertStatus(403);
        $this->getJson('/api/v1/config_info', $headers)->assertStatus(403);
        $this->postJson('/api/v1/admin/problems', [
            'slug' => 'role-test', 'title' => 'Role test',
        ], $headers)->assertStatus(403);
    }
}
