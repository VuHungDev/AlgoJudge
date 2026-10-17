<?php
// Seed 5 bai, moi bai >= 5 ca (gom ca bien). Du lieu gia, tu bien soan.
require __DIR__ . '/../src/Db.php';
use OJ\Db;
$pdo = Db::pdo();
$pdo->exec("INSERT IGNORE INTO users(email,password_hash,role) VALUES('gv@oj.local','" . password_hash('gv123456', PASSWORD_BCRYPT) . "','teacher')");
$pdo->exec("INSERT IGNORE INTO users(email,password_hash,role) VALUES('admin@oj.local','" . password_hash('admin123456', PASSWORD_BCRYPT) . "','admin')");
$gv = $pdo->query("SELECT id FROM users WHERE email='gv@oj.local'")->fetchColumn();

$problems = [
  ['tong-hai-so', 'Tổng hai số', 'co-ban', 'easy', 'Cho a b, in ra a+b', [['2 3', '5', 1], ['0 0', '0', 0], ['-1 1', '0', 0], ['1000000 1000000', '2000000', 0], ['-5 -7', '-12', 0]]],
  ['giai-thua', 'Giai thừa', 'co-ban', 'easy', 'Cho n, in ra n!', [['0', '1', 1], ['1', '1', 0], ['5', '120', 0], ['10', '3628800', 0], ['20', '2432902008176640000', 0]]],
  ['dao-chuoi', 'Đảo chuỗi', 'chuoi', 'easy', 'Cho chuỗi s, in ra chuỗi đảo ngược', [["abc", "cba", 1], ["a", "a", 0], ["hello", "olleh", 0], ["abccba", "abccba", 0], ["xyz", "zyx", 0]]],
  ['so-lon-nhat', 'Số lớn nhất', 'mang', 'medium', 'Cho n rồi n số, in ra số lớn nhất', [["3\n1 5 3", "5", 1], ["1\n-9", "-9", 0], ["5\n-1 -2 -3 -4 -5", "-1", 0], ["4\n7 7 7 7", "7", 0], ["2\n-1000000 1000000", "1000000", 0]]],
  ['so-nguyen-to', 'Số nguyên tố', 'toan', 'medium', 'Cho n>=2, in YES nếu nguyên tố, ngược lại NO', [["2", "YES", 1], ["1", "NO", 0], ["4", "NO", 0], ["17", "YES", 0], ["100", "NO", 0]]],
];
foreach ($problems as [$slug, $title, $topic, $diff, $stmt, $cases]) {
  $pdo->prepare('INSERT IGNORE INTO problems(slug,title,topic,difficulty,created_by) VALUES(?,?,?,?,?)')
    ->execute([$slug, $title, $topic, $diff, $gv]);
  $pid = $pdo->query("SELECT id FROM problems WHERE slug='$slug'")->fetchColumn();
  $pdo->prepare('INSERT INTO problem_versions(problem_id,version_no,statement,testset_version) VALUES(?,1,?,?)')
    ->execute([$pid, $stmt, 'v1']);
  $vid = (int)$pdo->lastInsertId();
  $pdo->prepare('UPDATE problems SET current_version_id=? WHERE id=?')->execute([$vid, $pid]);
  foreach ($cases as $i => $c) {
    $pdo->prepare('INSERT INTO test_cases(problem_version_id,testset_version,ordinal,input_data,expected_output,is_public) VALUES(?,"v1",?,?,?,?)')
      ->execute([$vid, $i + 1, $c[0], $c[1], $c[2]]);
  }
  echo "seeded $slug ($pid/$vid)\n";
}
