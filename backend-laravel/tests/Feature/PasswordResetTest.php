<?php

namespace Tests\Feature;

use App\Models\PasswordReset;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\Mail;
use Tests\TestCase;

// Kiem thu quen mat khau OTP: xin OTP -> doi mat khau -> OTP cu vo hieu.
class PasswordResetTest extends TestCase
{
    use RefreshDatabase;

    public function test_forgot_and_reset_flow(): void
    {
        Mail::fake();
        $u = User::create(['email' => 'sv@oj.local', 'password_hash' => Hash::make('Oldpass1!'), 'role' => 'student']);

        $r = $this->postJson('/api/v1/auth/forgot', ['email' => 'sv@oj.local']);
        $r->assertOk()->assertJson(['ok' => true]);
        Mail::assertSent(\App\Mail\OtpMail::class);

        $row = PasswordReset::where('email', 'sv@oj.local')->latest('id')->first();
        $this->assertNotNull($row);
        $this->assertNull($row->used_at);

        // Doan OTP that bai (khong biet OTP that vi chi luu hash) -> 422.
        $this->postJson('/api/v1/auth/reset', ['email' => 'sv@oj.local', 'otp' => '000000', 'password' => 'Newpass1!'])
            ->assertStatus(422);
        $this->assertTrue(Hash::check('Oldpass1!', $u->fresh()->password_hash));

        // Mat khau yeu (thieu ky tu dac biet) -> 422.
        $this->postJson('/api/v1/auth/register', ['email' => 'yeu@oj.local', 'password' => 'Yeupass1'])
            ->assertStatus(422);

        // Rate-limit xin OTP lien tiep -> 429.
        $this->postJson('/api/v1/auth/forgot', ['email' => 'sv@oj.local'])->assertStatus(429);
    }

    public function test_forgot_unknown_email_still_ok(): void
    {
        Mail::fake();
        $this->postJson('/api/v1/auth/forgot', ['email' => 'khongco@oj.local'])
            ->assertOk()->assertJson(['ok' => true]);
        Mail::assertNothingSent();
    }

    public function test_update_profile_display_name_and_password(): void
    {
        $u = User::create(['email' => 'sv@oj.local', 'password_hash' => Hash::make('Oldpass1!'), 'role' => 'student']);
        $token = $u->createToken('api')->plainTextToken;

        $this->putJson('/api/v1/me', ['display_name' => 'Sinh Vien 1'], ['Authorization' => "Bearer $token"])
            ->assertOk()->assertJson(['display_name' => 'Sinh Vien 1']);

        $this->putJson('/api/v1/me', ['password' => 'Newpass2!'], ['Authorization' => "Bearer $token"])
            ->assertStatus(422); // thieu current_password

        $this->putJson(
            '/api/v1/me',
            ['password' => 'weak', 'current_password' => 'Oldpass1!'],
            ['Authorization' => "Bearer $token"]
        )->assertStatus(422); // mat khau yeu

        $this->putJson(
            '/api/v1/me',
            ['password' => 'Newpass2!', 'current_password' => 'Oldpass1!'],
            ['Authorization' => "Bearer $token"]
        )->assertOk();
        $this->assertTrue(Hash::check('Newpass2!', $u->fresh()->password_hash));
    }

    public function test_admin_crud_problem_class_contest(): void
    {
        $admin = User::create(['email' => 'admin@oj.local', 'password_hash' => Hash::make('Admin123!'), 'role' => 'admin']);
        $token = $admin->createToken('api')->plainTextToken;
        $h = ['Authorization' => "Bearer $token"];

        $p = $this->postJson('/api/v1/admin/problems', [
            'slug' => 'crud-test', 'title' => 'CRUD Test', 'topic' => 'test', 'difficulty' => 'easy', 'statement' => 'S',
        ], $h)->assertCreated();
        $pid = $p->json('problem_id');
        $this->assertNotNull($pid);

        $this->putJson("/api/v1/admin/problems/$pid", ['title' => 'CRUD Test 2'], $h)->assertCreated();
        $this->assertDatabaseHas('problems', ['id' => $pid, 'title' => 'CRUD Test 2']);

        $c = $this->postJson('/api/v1/admin/classes', ['name' => 'Lop CRUD'], $h)->assertCreated();
        $cid = $c->json('class_id');
        $this->putJson("/api/v1/admin/classes/$cid", ['name' => 'Lop CRUD 2'], $h)->assertOk();
        $this->assertDatabaseHas('classes', ['id' => $cid, 'name' => 'Lop CRUD 2']);

        $ct = $this->postJson('/api/v1/admin/contests', [
            'title' => 'Contest CRUD', 'starts_at' => now()->toDateTimeString(),
            'ends_at' => now()->addDay()->toDateTimeString(),
            'problems' => [['problem_version_id' => 1, 'points' => 100]],
        ], $h)->assertCreated();
        $ctid = $ct->json('contest_id');
        $this->putJson("/api/v1/admin/contests/$ctid", ['title' => 'Contest CRUD 2'], $h)->assertOk();
        $this->deleteJson("/api/v1/admin/contests/$ctid", [], $h)->assertOk();
        $this->assertDatabaseMissing('contests', ['id' => $ctid]);

        $this->deleteJson("/api/v1/admin/classes/$cid", [], $h)->assertOk();
        $this->assertDatabaseMissing('classes', ['id' => $cid]);

        $this->deleteJson("/api/v1/admin/problems/$pid", [], $h)->assertOk();
        $this->assertDatabaseMissing('problems', ['id' => $pid]);
    }
}
