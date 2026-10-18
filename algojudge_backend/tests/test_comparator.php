<?php
declare(strict_types=1);
// Kiem thu don vi cho Comparator (khong can DB). Chay: php tests/test_comparator.php
require __DIR__ . '/../src/Judge/Comparator.php';
require __DIR__ . '/../src/Judge/Similarity.php';
use OJ\Judge\Comparator; use OJ\Judge\Similarity;
$fail = 0;
$check = function (bool $ok, string $name) use (&$fail) {
  echo ($ok ? "PASS" : "FAIL") . " $name\n";
  if (!$ok) $fail++;
};
$check(Comparator::match("5\n", "5"), 'bo dong trang cuoi');
$check(Comparator::match("5   \n", "5"), 'bo space cuoi dong');
$check(!Comparator::match("6\n", "5"), 'sai bien -> khac');
$check(Comparator::match("a\r\nb\r\n", "a\nb"), 'chuan hoa CRLF');
$check(Comparator::filterStderr(str_repeat('x', 5000)) !== '', 'loc stderr khong rong');
$check(strlen(Comparator::filterStderr(str_repeat('y', 9000))) <= 2000, 'loc stderr <= 2KB');
$check(Comparator::aggregate(['ACCEPTED', 'ACCEPTED']) === 'ACCEPTED', 'tong hop AC');
$check(Comparator::aggregate(['ACCEPTED', 'WRONG_ANSWER']) === 'WRONG_ANSWER', 'tong hop WA');
$check(Comparator::aggregate(['WRONG_ANSWER', 'SYSTEM_ERROR']) === 'SYSTEM_ERROR', 'loi he thong uu tien');
$check(Comparator::aggregate(['TIME_LIMIT_EXCEEDED', 'WRONG_ANSWER']) === 'TIME_LIMIT_EXCEEDED', 'uu tien TLE truoc WA');
$check(Comparator::matchFloat("3.14159\n", "3.1416", 1e-3), 'checker float sai so');
$check(!Comparator::matchFloat("1.0\n", "2.0", 1e-6), 'checker float khac');
$check(Comparator::matchSorted("3\n1\n2\n", "1\n2\n3"), 'checker sorted khac thu tu');
$check(!Comparator::matchSorted("3\n1\n", "1\n2\n3"), 'checker sorted thieu dong');
$check(Comparator::matchTokens("1  2\n3", "3 2 1"), 'checker tokens bo qua thu tu/xuong dong');
$check(!Comparator::matchTokens("1 2", "1 2 2"), 'checker tokens khac so luong');
$check(Comparator::matchRegex("12 34\n", '/^\d+ \d+$/'), 'checker regex khop mau');
$check(!Comparator::matchRegex("abc\n", '/^\d+ \d+$/'), 'checker regex khong khop');
$check(!Comparator::matchRegex("x", ''), 'checker regex rong -> false');
$check(Comparator::scoreSubtasks([['group' => 'a', 'verdict' => 'ACCEPTED', 'weight' => 1], ['group' => 'b', 'verdict' => 'WRONG_ANSWER', 'weight' => 3]]) === 25, 'subtask 25 diem');
$check(Comparator::check('sorted', "b\na\n", "a\nb"), 'check chon dung sorted');
$check(Comparator::scoreSubtasks([['group' => 'a', 'verdict' => 'ACCEPTED', 'weight' => 2], ['group' => 'a', 'verdict' => 'WRONG_ANSWER', 'weight' => 2]]) === 0, 'subtask phai AC het nhom');
$check(Similarity::score('print(a+b)', 'print(a+b)') > 0.9, 'giong nhau ~1');
$check(Similarity::score('print(a+b)', 'while True: pass') < 0.3, 'khac nhau ~0');
exit($fail ? 1 : 0);
