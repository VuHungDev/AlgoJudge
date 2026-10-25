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
            // ---- 10 bài luyện tập thêm (dùng được cho cả 6 ngôn ngữ) ----
            // Easy (4)
            ['tong-le', 'Tổng số lẻ', 'toan', 'easy', 'Cho n (n≥1), in ra tổng các số lẻ từ 1 đến n.', [['1', '1', 1], ['2', '1', 0], ['3', '4', 0], ['10', '25', 0], ['100', '2500', 0]]],
            ['dem-chu-so', 'Đếm chữ số', 'toan', 'easy', 'Cho số nguyên n (0≤n≤10^18), in ra số chữ số của n.', [['0', '1', 1], ['9', '1', 0], ['123', '3', 0], ['1000000', '7', 0], ['999999999999999999', '18', 0]]],
            ['kiem-tra-nam-nhuan', 'Năm nhuận', 'toan', 'easy', 'Cho năm y, in YES nếu nhuận, NO nếu không. Nhuận nếu chia hết 4 và không chia hết 100, hoặc chia hết 400.', [['2000', 'YES', 1], ['1900', 'NO', 0], ['2024', 'YES', 0], ['2023', 'NO', 0], ['2100', 'NO', 0]]],
            ['doi-nhiet-do', 'Đổi nhiệt độ', 'toan', 'easy', 'Cho nhiệt độ C (Celsius), in ra Fahrenheit: F = C*9/5+32 (làm tròn đến số nguyên).', [['0', '32', 1], ['100', '212', 0], ['-40', '-40', 0], ['37', '99', 0], ['25', '77', 0]]],
            // Medium (3)
            ['ucln', 'Ước chung lớn nhất', 'toan', 'medium', 'Cho a, b (a,b≥0), in ra ước chung lớn nhất của a và b.', [['12 8', '4', 1], ['7 13', '1', 0], ['100 75', '25', 0], ['0 5', '5', 0], ['1000000 500000', '500000', 0]]],
            ['fibonacci', 'Số Fibonacci', 'dequy', 'medium', 'Cho n (0≤n≤30), in ra số Fibonacci thứ n. F(0)=0, F(1)=1, F(n)=F(n-1)+F(n-2).', [['0', '0', 1], ['1', '1', 0], ['10', '55', 0], ['20', '6765', 0], ['30', '832040', 0]]],
            ['dao-nguoc-mang', 'Đảo ngược mảng', 'mang', 'medium', 'Cho n rồi n số nguyên, in ra mảng đảo ngược, các phần tử cách nhau dấu cách.', [["3\n1 2 3", '3 2 1', 1], ["1\n5", '5', 0], ["5\n1 2 3 4 5", '5 4 3 2 1', 0], ["4\n-1 0 1 2", '2 1 0 -1', 0], ["2\n10 20", '20 10', 0]]],
            // Hard (3)
            ['tim-vi-tri', 'Tìm vị trí', 'mang', 'hard', 'Cho n, n số, rồi x. In ra vị trí đầu tiên (1-based) của x trong mảng, hoặc -1 nếu không có.', [["5\n1 3 5 7 9\n3", '2', 1], ["3\n1 2 3\n4", '-1', 0], ["1\n5\n5", '1', 0], ["6\n2 2 2 2 2 2\n2", '1', 0], ["4\n10 20 30 40\n40", '4', 0]]],
            ['kiem-tra-parenthesis', 'Ngoặc cân bằng', 'nganxep', 'hard', 'Cho chuỗi gồm (,),{,},[,]. In YES nếu ngoặc cân bằng, NO nếu không. Chuỗi rỗng cân bằng.', [['()', 'YES', 1], ['([)]', 'NO', 0], ['{[()]}', 'YES', 0], ['(((', 'NO', 0], ['', 'YES', 0]]],
            ['so-thuan-nghich', 'Số thuận nghịch', 'toan', 'hard', 'Cho n (0≤n≤10^9), in YES nếu n là số thuận nghịch (đọc xuôi ngược giống nhau), NO nếu không.', [['121', 'YES', 1], ['123', 'NO', 0], ['0', 'YES', 0], ['12321', 'YES', 0], ['10', 'NO', 0]]],
            // ---- 10 bài luyện tập nâng cao (học sinh tự gõ code, không có code mẫu) ----
            // Easy (4)
            ['tong-chan', 'Tổng số chẵn', 'toan', 'easy', 'Cho n (n≥2), in ra tổng các số chẵn từ 2 đến n.', [['2', '2', 1], ['4', '6', 0], ['10', '30', 0], ['1', '0', 0], ['100', '2550', 0]]],
            ['dem-am-duong', 'Đếm âm dương', 'mang', 'easy', 'Dòng 1: n. Dòng 2: n số nguyên. In ra 2 số: số âm, số dương (cách nhau dấu cách).', [["3\n-1 0 2", '1 1', 1], ["4\n-1 -2 -3 -4", '4 0', 0], ["2\n0 0", '0 0', 0], ["5\n1 2 3 4 5", '0 5', 0], ["1\n-100", '1 0', 0]]],
            ['max-tuyet-doi', 'Giá trị tuyệt đối lớn nhất', 'toan', 'easy', 'Cho n rồi n số nguyên. In ra giá trị tuyệt đối lớn nhất trong các số.', [["3\n-5 2 -9", '9', 1], ["1\n-100", '100', 0], ["2\n5 5", '5', 0], ["4\n-1 0 1 2", '2', 0], ["1\n0", '0', 0]]],
            ['vi-tri-dau-tien', 'Vị trí số âm đầu tiên', 'mang', 'easy', 'Cho n rồi n số. In ra vị trí (1-based) của số âm đầu tiên, hoặc -1 nếu không có.', [["3\n1 -2 3", '2', 1], ["2\n1 2", '-1', 0], ["1\n-5", '1', 0], ["4\n0 0 -1 0", '3', 0], ["3\n-1 -2 -3", '1', 0]]],
            // Medium (3)
            ['chuyen-he-2', 'Chuyển sang nhị phân', 'toan', 'medium', 'Cho số nguyên không âm n (0≤n≤10^18), in ra biểu diễn nhị phân của n.', [['0', '0', 1], ['1', '1', 0], ['10', '1010', 0], ['255', '11111111', 0], ['1000000', '11110100001001000000', 0]]],
            ['kiem-tra-tam-giac', 'Kiểm tra tam giác', 'hinh', 'medium', 'Cho 3 số a b c. In RA nếu 3 cạnh lập thành tam giác (tổng 2 cạnh > cạnh còn lại), KHONG nếu không.', [['3 4 5', 'RA', 1], ['1 2 3', 'KHONG', 0], ['5 5 5', 'RA', 0], ['1 1 3', 'KHONG', 0], ['7 10 5', 'RA', 0]]],
            ['tong-cac-chu-so', 'Tổng chữ số', 'toan', 'medium', 'Cho n (0≤n≤10^18), in ra tổng các chữ số của n.', [['0', '0', 1], ['123', '6', 0], ['999', '27', 0], ['10', '1', 0], ['1000000000', '1', 0]]],
            // Hard (3)
            ['sap-xep-chon', 'Sắp xếp chọn', 'thuat-toan', 'hard', 'Cho n rồi n số. In ra mảng sau khi sắp xếp tăng dần (dùng thuật toán sắp xếp chọn).', [["5\n5 3 1 4 2", '1 2 3 4 5', 1], ["1\n5", '5', 0], ["3\n-1 -2 -3", '-3 -2 -1', 0], ["4\n0 0 0 0", '0 0 0 0', 0], ["2\n100 -100", '-100 100', 0]]],
            ['nhi-phan-tuan-tu', 'Tìm kiếm nhị phân', 'thuat-toan', 'hard', 'Dòng 1: n. Dòng 2: n số đã sắp xếp tăng. Dòng 3: x. In ra vị trí (1-based) của x, hoặc -1.', [["5\n1 3 5 7 9\n3", '2', 1], ["3\n1 2 3\n4", '-1', 0], ["1\n5\n5", '1', 0], ["6\n1 2 3 4 5 6\n1", '1', 0], ["4\n10 20 30 40\n40", '4', 0]]],
            ['dem-phan-tu-khac', 'Đếm phần tử khác nhau', 'mang', 'hard', 'Cho n rồi n số. In ra số phần tử khác nhau trong mảng.', [["5\n1 2 2 3 3", '3', 1], ["1\n5", '1', 0], ["3\n1 1 1", '1', 0], ["4\n1 2 3 4", '4', 0], ["6\n-1 0 1 0 -1 1", '3', 0]]],
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
