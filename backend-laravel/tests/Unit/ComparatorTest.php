<?php
declare(strict_types=1);
namespace Tests\Unit;
use Tests\TestCase;
use App\Judge\Comparator;
use App\Judge\Similarity;

// Port tu algojudge_backend/tests/test_comparator.php
class ComparatorTest extends TestCase {
  public function test_bo_dong_trang_cuoi() {
    $this->assertTrue(Comparator::match("5\n", "5"));
  }
  public function test_bo_space_cuoi_dong() {
    $this->assertTrue(Comparator::match("5   \n", "5"));
  }
  public function test_sai_bien_khac() {
    $this->assertFalse(Comparator::match("6\n", "5"));
  }
  public function test_chuan_hoa_crlf() {
    $this->assertTrue(Comparator::match("a\r\nb\r\n", "a\nb"));
  }
  public function test_loc_stderr_khong_rong() {
    $this->assertNotEmpty(Comparator::filterStderr(str_repeat('x', 5000)));
  }
  public function test_loc_stderr_gioi_han() {
    $this->assertLessThanOrEqual(2000, strlen(Comparator::filterStderr(str_repeat('y', 9000))));
  }
  public function test_tong_hop_ac() {
    $this->assertEquals('ACCEPTED', Comparator::aggregate(['ACCEPTED', 'ACCEPTED']));
  }
  public function test_tong_hop_wa() {
    $this->assertEquals('WRONG_ANSWER', Comparator::aggregate(['ACCEPTED', 'WRONG_ANSWER']));
  }
  public function test_loi_he_thong_uu_tien() {
    $this->assertEquals('SYSTEM_ERROR', Comparator::aggregate(['WRONG_ANSWER', 'SYSTEM_ERROR']));
  }
  public function test_uu_tien_tle_truoc_wa() {
    $this->assertEquals('TIME_LIMIT_EXCEEDED', Comparator::aggregate(['TIME_LIMIT_EXCEEDED', 'WRONG_ANSWER']));
  }
  public function test_checker_float_sai_so() {
    $this->assertTrue(Comparator::matchFloat("3.14159\n", "3.1416", 1e-3));
  }
  public function test_checker_float_khac() {
    $this->assertFalse(Comparator::matchFloat("1.0\n", "2.0", 1e-6));
  }
  public function test_checker_sorted_khac_thu_tu() {
    $this->assertTrue(Comparator::matchSorted("3\n1\n2\n", "1\n2\n3"));
  }
  public function test_checker_sorted_thieu_dong() {
    $this->assertFalse(Comparator::matchSorted("3\n1\n", "1\n2\n3"));
  }
  public function test_checker_tokens_bo_qua_thu_tu() {
    $this->assertTrue(Comparator::matchTokens("1  2\n3", "3 2 1"));
  }
  public function test_checker_tokens_khac_so_luong() {
    $this->assertFalse(Comparator::matchTokens("1 2", "1 2 2"));
  }
  public function test_checker_regex_khop_mau() {
    $this->assertTrue(Comparator::matchRegex("12 34\n", '/^\d+ \d+$/'));
  }
  public function test_checker_regex_khong_khop() {
    $this->assertFalse(Comparator::matchRegex("abc\n", '/^\d+ \d+$/'));
  }
  public function test_checker_regex_rong() {
    $this->assertFalse(Comparator::matchRegex("x", ''));
  }
  public function test_subtask_25_diem() {
    $this->assertEquals(25, Comparator::scoreSubtasks([
      ['group' => 'a', 'verdict' => 'ACCEPTED', 'weight' => 1],
      ['group' => 'b', 'verdict' => 'WRONG_ANSWER', 'weight' => 3]
    ]));
  }
  public function test_check_chon_dung_sorted() {
    $this->assertTrue(Comparator::check('sorted', "b\na\n", "a\nb"));
  }
  public function test_subtask_phai_ac_het_nhom() {
    $this->assertEquals(0, Comparator::scoreSubtasks([
      ['group' => 'a', 'verdict' => 'ACCEPTED', 'weight' => 2],
      ['group' => 'a', 'verdict' => 'WRONG_ANSWER', 'weight' => 2]
    ]));
  }
  public function test_similarity_giong_nhau() {
    $this->assertGreaterThan(0.9, Similarity::score('print(a+b)', 'print(a+b)'));
  }
  public function test_similarity_khac_nhau() {
    $this->assertLessThan(0.3, Similarity::score('print(a+b)', 'while True: pass'));
  }
}
