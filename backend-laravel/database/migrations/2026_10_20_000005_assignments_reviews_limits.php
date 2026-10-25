<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

// Giao bai (ca nhan / ca lop) + cham diem nhan xet cua giang vien
// + gioi han rieng cho bai phuc tap.
return new class extends Migration
{
    public function up(): void
    {
        if (! Schema::hasTable('assignments')) {
            Schema::create('assignments', function (Blueprint $table) {
                $table->id();
                $table->unsignedBigInteger('problem_id');
                $table->unsignedBigInteger('class_id')->nullable();
                $table->unsignedBigInteger('user_id')->nullable();
                $table->unsignedBigInteger('created_by');
                $table->timestamp('due_at')->nullable();
                $table->string('note', 500)->nullable();
                $table->timestamps();
                $table->index(['class_id', 'user_id']);
            });
        }
        if (! Schema::hasTable('reviews')) {
            Schema::create('reviews', function (Blueprint $table) {
                $table->id();
                $table->unsignedBigInteger('submission_id')->unique();
                $table->unsignedBigInteger('reviewer_id');
                $table->unsignedTinyInteger('score')->nullable();
                $table->string('comment', 2000)->nullable();
                $table->timestamps();
            });
        }
        Schema::table('problem_versions', function (Blueprint $table) {
            if (! Schema::hasColumn('problem_versions', 'memory_limit_kb')) {
                $table->integer('memory_limit_kb')->default(262144)->after('time_limit_ms');
            }
            if (! Schema::hasColumn('problem_versions', 'source_limit_kb')) {
                $table->integer('source_limit_kb')->default(100)->after('memory_limit_kb');
            }
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('reviews');
        Schema::dropIfExists('assignments');
        $drop = [];
        if (Schema::hasColumn('problem_versions', 'memory_limit_kb')) {
            $drop[] = 'memory_limit_kb';
        }
        if (Schema::hasColumn('problem_versions', 'source_limit_kb')) {
            $drop[] = 'source_limit_kb';
        }
        if ($drop !== []) {
            Schema::table('problem_versions', function (Blueprint $table) use ($drop) {
                $table->dropColumn($drop);
            });
        }
    }
};
