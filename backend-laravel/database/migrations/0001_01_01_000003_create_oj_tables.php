<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

// Port tu 001_schema.sql + 002_subtask.sql + 003_ported.sql.
return new class extends Migration
{
    public function up(): void
    {
        Schema::create('problems', function (Blueprint $table) {
            $table->id();
            $table->string('slug', 100)->unique();
            $table->string('title');
            $table->string('topic', 100)->default('');
            $table->string('difficulty', 20)->default('easy');
            $table->unsignedBigInteger('created_by')->nullable();
            $table->unsignedBigInteger('current_version_id')->nullable();
            $table->timestamps();
        });

        Schema::create('problem_versions', function (Blueprint $table) {
            $table->id();
            $table->unsignedBigInteger('problem_id');
            $table->integer('version_no')->default(1);
            $table->mediumText('statement')->nullable();
            $table->text('input_spec')->nullable();
            $table->text('output_spec')->nullable();
            $table->json('public_examples')->nullable();
            $table->integer('time_limit_ms')->default(2000);
            $table->integer('memory_limit_kb')->default(262144);
            $table->string('testset_version', 32)->default('v1');
            $table->integer('score')->default(100);
            $table->string('checker', 32)->default('exact');
            $table->text('checker_config')->nullable();
            $table->timestamps();
        });

        Schema::create('test_cases', function (Blueprint $table) {
            $table->id();
            $table->unsignedBigInteger('problem_version_id');
            $table->string('testset_version', 32);
            $table->integer('ordinal');
            $table->mediumText('input_data')->nullable();
            $table->mediumText('expected_output')->nullable();
            $table->tinyInteger('is_public')->default(0);
            $table->integer('weight')->default(1);
            $table->string('group_name', 64)->default('default');
            $table->index(['problem_version_id', 'testset_version']);
            $table->timestamps();
        });

        Schema::create('submissions', function (Blueprint $table) {
            $table->id();
            $table->unsignedBigInteger('user_id');
            $table->unsignedBigInteger('problem_version_id');
            $table->enum('language', ['python', 'cpp', 'js']);
            $table->mediumText('source_code');
            $table->string('idempotency_key', 64);
            $table->integer('number_of_runs')->default(1);
            $table->string('compiler_options', 512)->nullable();
            $table->string('command_line_arguments', 512)->nullable();
            $table->text('callback_url')->nullable();
            $table->timestamps();
            $table->unique(['user_id', 'idempotency_key']);
        });

        Schema::create('judging_runs', function (Blueprint $table) {
            $table->id();
            $table->unsignedBigInteger('submission_id');
            $table->string('testset_version', 32);
            $table->enum('status', ['QUEUED', 'RUNNING', 'DONE', 'SYSTEM_ERROR', 'RETRY_PENDING'])->default('QUEUED');
            $table->string('verdict', 32)->nullable();
            $table->integer('score')->default(0);
            $table->integer('attempt')->default(0);
            $table->string('lease_token', 64)->nullable();
            $table->dateTime('lease_expires_at')->nullable();
            $table->tinyInteger('is_current')->default(1);
            $table->dateTime('started_at')->nullable();
            $table->dateTime('finished_at')->nullable();
            $table->timestamps();
        });

        Schema::create('case_results', function (Blueprint $table) {
            $table->id();
            $table->unsignedBigInteger('judging_run_id');
            $table->unsignedBigInteger('test_case_id');
            $table->string('verdict', 32)->nullable();
            $table->integer('time_ms')->default(0);
            $table->integer('memory_kb')->default(0);
            $table->string('stderr_excerpt', 2000)->nullable();
            $table->timestamps();
        });

        Schema::create('classes', function (Blueprint $table) {
            $table->id();
            $table->string('name');
            $table->timestamps();
        });

        Schema::create('class_members', function (Blueprint $table) {
            $table->unsignedBigInteger('class_id');
            $table->unsignedBigInteger('user_id');
            $table->string('role', 20)->default('student');
            $table->primary(['class_id', 'user_id']);
        });

        Schema::create('drafts', function (Blueprint $table) {
            $table->unsignedBigInteger('user_id');
            $table->string('language', 10)->default('python');
            $table->mediumText('code')->nullable();
            $table->unsignedBigInteger('problem_id');
            $table->timestamps();
            $table->primary(['user_id', 'problem_id']);
        });
    }

    public function down(): void
    {
        foreach (['drafts', 'class_members', 'classes', 'case_results', 'judging_runs', 'submissions', 'test_cases', 'problem_versions', 'problems'] as $t) {
            Schema::dropIfExists($t);
        }
    }
};
