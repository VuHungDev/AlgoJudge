<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

// Phase redesign:
// - Contest access control: is_public + bang contest_access (per-user).
// - Classes: them created_by (admin gan teacher tao lop).
// - Activity log: bang activity_logs theo doi tat ca hanh dong cua user/teacher/admin.
return new class extends Migration
{
    public function up(): void
    {
        // Contest: public (ai cung tham gia duoc) hay access-controlled (chi danh sach).
        Schema::table('contests', function (Blueprint $table) {
            $table->boolean('is_public')->default(false)->after('ends_at');
            $table->unsignedBigInteger('created_by')->nullable()->after('is_public');
        });

        // Danh sach user duoc phep tham gia contest khi is_public = false.
        Schema::create('contest_access', function (Blueprint $table) {
            $table->unsignedBigInteger('contest_id');
            $table->unsignedBigInteger('user_id');
            $table->primary(['contest_id', 'user_id']);
            $table->timestamp('granted_at')->useCurrent();
        });

        // Lop hoc: ghi nguoi tao (teacher do admin gan, hoac admin tu tao).
        Schema::table('classes', function (Blueprint $table) {
            $table->unsignedBigInteger('created_by')->nullable()->after('name');
        });

        // Nhat ky hoat dong cua tat ca user (dung cho Admin profile = activity log).
        Schema::create('activity_logs', function (Blueprint $table) {
            $table->id();
            $table->unsignedBigInteger('user_id')->nullable();
            $table->string('actor_role', 20)->nullable();   // student | teacher | admin
            $table->string('action', 64);                    // vd: login, submit, create_problem, grade...
            $table->string('resource_type', 64)->nullable(); // problem | class | contest | submission...
            $table->unsignedBigInteger('resource_id')->nullable();
            $table->text('detail')->nullable();             // mo ta them, JSON nho
            $table->string('ip', 45)->nullable();
            $table->timestamp('created_at')->useCurrent();

            $table->index(['user_id', 'created_at']);
            $table->index(['action', 'created_at']);
            $table->index('created_at');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('activity_logs');
        Schema::table('classes', function (Blueprint $table) {
            $table->dropColumn('created_by');
        });
        Schema::dropIfExists('contest_access');
        Schema::table('contests', function (Blueprint $table) {
            $table->dropColumn(['is_public', 'created_by']);
        });
    }
};
