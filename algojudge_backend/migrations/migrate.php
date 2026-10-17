#!/usr/bin/env php
<?php
// Chay: docker compose exec api php migrations/migrate.php
require __DIR__ . '/../src/Db.php';
use OJ\Db;
$pdo = Db::pdo();
// Luu vet migration da chay de chay lai an toan (idempotent).
$pdo->exec('CREATE TABLE IF NOT EXISTS schema_migrations (name VARCHAR(255) PRIMARY KEY, applied_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP)');
$files = glob(__DIR__ . '/*.sql') ?: [];
sort($files);
$done = $pdo->query('SELECT name FROM schema_migrations')->fetchAll(PDO::FETCH_COLUMN) ?: [];
foreach ($files as $f) {
  $name = basename($f);
  if (in_array($name, $done, true)) { echo "skip $name\n"; continue; }
  try {
    $pdo->exec(file_get_contents($f));
  } catch (PDOException $e) {
    // MySQL 8 khong co IF NOT EXISTS cho ADD COLUMN: bo qua loi trung cot (1060).
    if ((int)$e->errorInfo[1] !== 1060) throw $e;
    echo "note $name: column exists, skip part\n";
  }
  $pdo->prepare('INSERT IGNORE INTO schema_migrations(name) VALUES(?)')->execute([$name]);
  echo "applied $name\n";
}
echo "migrated\n";
