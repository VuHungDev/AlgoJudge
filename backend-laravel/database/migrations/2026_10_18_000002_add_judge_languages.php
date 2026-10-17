<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\DB;

// Mo rong enum language: python/cpp/js + java/go/c (ket hop da ngon ngu cham bai).
return new class extends Migration
{
    public function up(): void
    {
        DB::statement("ALTER TABLE submissions MODIFY language ENUM('python','cpp','js','java','go','c') NOT NULL");
    }

    public function down(): void
    {
        DB::statement("ALTER TABLE submissions MODIFY language ENUM('python','cpp','js') NOT NULL");
    }
};
