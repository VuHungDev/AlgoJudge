<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

// Mo rong language: MySQL dung ENUM; SQLite test dung string de migration portable.
return new class extends Migration
{
    public function up(): void
    {
        if (DB::getDriverName() === 'mysql') {
            DB::statement("ALTER TABLE submissions MODIFY language ENUM('python','cpp','js','java','go','c') NOT NULL");
            return;
        }
        Schema::table('submissions', function (Blueprint $table) {
            $table->string('language', 10)->change();
        });
    }

    public function down(): void
    {
        if (DB::getDriverName() === 'mysql') {
            DB::statement("ALTER TABLE submissions MODIFY language ENUM('python','cpp','js') NOT NULL");
        }
    }
};
