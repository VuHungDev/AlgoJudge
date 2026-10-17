<?php
declare(strict_types=1);
namespace OJ;

use PDO;

final class Db {
  private static ?PDO $pdo = null;
  public static function pdo(): PDO {
    if (self::$pdo) return self::$pdo;
    $dsn = sprintf('mysql:host=%s;port=%s;dbname=%s;charset=utf8mb4',
      getenv('DB_HOST') ?: 'db', getenv('DB_PORT') ?: '3306', getenv('DB_NAME') ?: 'oj');
    // Retry cho worker/api khoi dong truoc khi MySQL san sang.
    $last = null;
    for ($i = 0; $i < 30; $i++) {
      try {
        self::$pdo = new PDO($dsn, getenv('DB_USER') ?: 'oj', getenv('DB_PASS') ?: 'oj_secret',
          [PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION, PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC]);
        return self::$pdo;
      } catch (\PDOException $e) { $last = $e; sleep(2); }
    }
    throw $last;
  }
  public static function json(mixed $data, int $code = 200): void {
    http_response_code($code);
    header('Content-Type: application/json; charset=utf-8');
    echo json_encode($data, JSON_UNESCAPED_UNICODE);
    exit;
  }
}
