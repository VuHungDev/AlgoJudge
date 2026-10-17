<?php

namespace Database\Seeders;

use App\Models\Problem;
use App\Models\ProblemVersion;
use App\Models\TestCase;
use App\Models\User;
use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\Hash;

// Port tu algojudge_backend/seeds/seed.php.
class OjSeeder extends Seeder
{
    public function run(): void
    {
        $gv = User::firstOrCreate(
            ['email' => 'gv@oj.local'],
            ['password_hash' => Hash::make('gv123456'), 'role' => 'teacher']
        );
        User::firstOrCreate(
            ['email' => 'admin@oj.local'],
            ['password_hash' => Hash::make('admin123456'), 'role' => 'admin']
        );

        $problems = [
            ['tong-hai-so', 'Tổng hai số', 'co-ban', 'easy', 'Cho a b, in ra a+b', [['2 3', '5', 1], ['0 0', '0', 0], ['-1 1', '0', 0], ['1000000 1000000', '2000000', 0], ['-5 -7', '-12', 0]]],
            ['giai-thua', 'Giai thừa', 'co-ban', 'easy', 'Cho n, in ra n!', [['0', '1', 1], ['1', '1', 0], ['5', '120', 0], ['10', '3628800', 0], ['20', '2432902008176640000', 0]]],
            ['dao-chuoi', 'Đảo chuỗi', 'chuoi', 'easy', 'Cho chuỗi s, in ra chuỗi đảo ngược', [['abc', 'cba', 1], ['a', 'a', 0], ['hello', 'olleh', 0], ['abccba', 'abccba', 0], ['xyz', 'zyx', 0]]],
            ['so-lon-nhat', 'Số lớn nhất', 'mang', 'medium', 'Cho n rồi n số, in ra số lớn nhất', [["3\n1 5 3", '5', 1], ["1\n-9", '-9', 0], ["5\n-1 -2 -3 -4 -5", '-1', 0], ["4\n7 7 7 7", '7', 0], ["2\n-1000000 1000000", '1000000', 0]]],
            ['so-nguyen-to', 'Số nguyên tố', 'toan', 'medium', 'Cho n>=2, in YES nếu nguyên tố, ngược lại NO', [['2', 'YES', 1], ['1', 'NO', 0], ['4', 'NO', 0], ['17', 'YES', 0], ['100', 'NO', 0]]],
        ];
        foreach ($problems as [$slug, $title, $topic, $diff, $stmt, $cases]) {
            $p = Problem::firstOrCreate(['slug' => $slug], [
                'title' => $title, 'topic' => $topic, 'difficulty' => $diff, 'created_by' => $gv->id,
            ]);
            if ($p->current_version_id) {
                continue;
            }
            $v = ProblemVersion::create(['problem_id' => $p->id, 'version_no' => 1, 'statement' => $stmt, 'testset_version' => 'v1']);
            $p->update(['current_version_id' => $v->id]);
            foreach ($cases as $i => $c) {
                TestCase::create([
                    'problem_version_id' => $v->id, 'testset_version' => 'v1', 'ordinal' => $i + 1,
                    'input_data' => $c[0], 'expected_output' => $c[1], 'is_public' => $c[2],
                ]);
            }
            $this->command->info("seeded $slug");
        }
    }
}
