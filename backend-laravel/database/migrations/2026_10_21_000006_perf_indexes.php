<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

// Index cho cac truy van nong: lich su nop bai, hang doi worker, tien do lop.
return new class extends Migration
{
    public function up(): void
    {
        if (Schema::hasTable('submissions')) {
            Schema::table('submissions', function (Blueprint $table) {
                if (! $this->hasIndex('submissions', 'submissions_user_id_index')) {
                    $table->index('user_id');
                }
                if (! $this->hasIndex('submissions', 'submissions_problem_version_id_index')) {
                    $table->index('problem_version_id');
                }
            });
        }
        if (Schema::hasTable('judging_runs')) {
            Schema::table('judging_runs', function (Blueprint $table) {
                if (! $this->hasIndex('judging_runs', 'judging_runs_submission_id_is_current_index')) {
                    $table->index(['submission_id', 'is_current']);
                }
                if (! $this->hasIndex('judging_runs', 'judging_runs_status_index')) {
                    $table->index('status');
                }
            });
        }
        if (Schema::hasTable('case_results')) {
            Schema::table('case_results', function (Blueprint $table) {
                if (! $this->hasIndex('case_results', 'case_results_judging_run_id_index')) {
                    $table->index('judging_run_id');
                }
                if (! $this->hasIndex('case_results', 'case_results_test_case_id_index')) {
                    $table->index('test_case_id');
                }
            });
        }
        if (Schema::hasTable('assignments')) {
            Schema::table('assignments', function (Blueprint $table) {
                if (! $this->hasIndex('assignments', 'assignments_class_id_index')) {
                    $table->index('class_id');
                }
                if (! $this->hasIndex('assignments', 'assignments_user_id_index')) {
                    $table->index('user_id');
                }
            });
        }
        if (Schema::hasTable('class_members')) {
            Schema::table('class_members', function (Blueprint $table) {
                if (! $this->hasIndex('class_members', 'class_members_user_id_index')) {
                    $table->index('user_id');
                }
            });
        }
        if (Schema::hasTable('reviews')) {
            Schema::table('reviews', function (Blueprint $table) {
                if (! $this->hasIndex('reviews', 'reviews_submission_id_index')) {
                    $table->index('submission_id');
                }
            });
        }
    }

    public function down(): void
    {
        foreach ([
            ['submissions', 'submissions_user_id_index'],
            ['submissions', 'submissions_problem_version_id_index'],
            ['judging_runs', 'judging_runs_submission_id_is_current_index'],
            ['judging_runs', 'judging_runs_status_index'],
            ['case_results', 'case_results_judging_run_id_index'],
            ['case_results', 'case_results_test_case_id_index'],
            ['assignments', 'assignments_class_id_index'],
            ['assignments', 'assignments_user_id_index'],
            ['class_members', 'class_members_user_id_index'],
            ['reviews', 'reviews_submission_id_index'],
        ] as [$table, $index]) {
            if (Schema::hasTable($table) && $this->hasIndex($table, $index)) {
                Schema::table($table, fn (Blueprint $t) => $t->dropIndex($index));
            }
        }
    }

    private function hasIndex(string $table, string $name): bool
    {
        try {
            foreach (Schema::getIndexes($table) as $idx) {
                if (($idx['name'] ?? '') === $name) {
                    return true;
                }
            }
        } catch (\Throwable) {
            return false;
        }

        return false;
    }
};
