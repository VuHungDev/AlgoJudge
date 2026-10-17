<?php
declare(strict_types=1);
namespace OJ;

// Port tu app/helpers/config.rb (Judge0): gioi han doc tu ENV, co gia tri mac dinh.
// Khong bao gom secret; config_info() chi tra tap "an toan cho client".
final class Config {
  public static function str(string $k, string $d): string {
    $v = getenv($k);
    return ($v === false || $v === '') ? $d : (string)$v;
  }
  public static function int(string $k, int $d): int {
    $v = getenv($k);
    return ($v === false || $v === '') ? $d : (int)$v;
  }
  public static function boolOff(string $k): bool {
    return getenv($k) === 'true'; // mac dinh tat, bat bang "true"
  }
  public static function boolOn(string $k): bool {
    $v = getenv($k);
    return $v === false ? true : $v !== 'false'; // mac dinh bat, tat bang "false"
  }
  public static function numberOfRuns(): int {
    return max(1, min(20, self::int('NUMBER_OF_RUNS', 1)));
  }
  public static function maxQueueSize(): int { return self::int('MAX_QUEUE_SIZE', 100); }
  public static function maxBatchSize(): int { return self::int('MAX_SUBMISSION_BATCH_SIZE', 20); }
  public static function info(): array {
    return [
      'enable_wait_result' => self::boolOn('ENABLE_WAIT_RESULT'),
      'enable_compiler_options' => self::boolOn('ENABLE_COMPILER_OPTIONS'),
      'enable_command_line_arguments' => self::boolOn('ENABLE_COMMAND_LINE_ARGUMENTS'),
      'enable_submission_delete' => self::boolOff('ENABLE_SUBMISSION_DELETE'),
      'enable_callbacks' => self::boolOn('ENABLE_CALLBACKS'),
      'enable_batched_submissions' => self::boolOn('ENABLE_BATCHED_SUBMISSIONS'),
      'max_submission_batch_size' => self::maxBatchSize(),
      'max_queue_size' => self::maxQueueSize(),
      'number_of_runs' => self::numberOfRuns(),
      'max_number_of_runs' => self::int('MAX_NUMBER_OF_RUNS', 20),
    ];
  }
}
