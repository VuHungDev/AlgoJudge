<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

// Phase 4: contest co gio + leaderboard + streak/huy hieu + goi y bai.
return new class extends Migration
{
    public function up(): void
    {
        Schema::create('contests', function (Blueprint $table) {
            $table->id();
            $table->string('title');
            $table->text('description')->nullable();
            $table->dateTime('starts_at');
            $table->dateTime('ends_at');
            $table->timestamps();
        });

        Schema::create('contest_problems', function (Blueprint $table) {
            $table->id();
            $table->unsignedBigInteger('contest_id');
            $table->unsignedBigInteger('problem_version_id');
            $table->integer('points')->default(100);
            $table->integer('ordinal')->default(0);
            $table->timestamps();
        });

        Schema::create('contest_submissions', function (Blueprint $table) {
            $table->id();
            $table->unsignedBigInteger('contest_id');
            $table->unsignedBigInteger('submission_id');
            $table->unsignedBigInteger('user_id');
            $table->timestamps();
        });

        // Streak: 1 dong / user / ngay co bai ACCEPTED.
        Schema::create('solve_streaks', function (Blueprint $table) {
            $table->unsignedBigInteger('user_id');
            $table->date('day');
            $table->primary(['user_id', 'day']);
        });
    }

    public function down(): void
    {
        foreach (['solve_streaks', 'contest_submissions', 'contest_problems', 'contests'] as $t) {
            Schema::dropIfExists($t);
        }
    }
};
