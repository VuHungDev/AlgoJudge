<?php
declare(strict_types=1);
namespace OJ\Repository;

use PDO;

// Truy cap DB cho bai tap, ban nhap, phien ban de, bo du lieu.
final class ProblemRepository {
  public static function list(PDO $pdo, ?string $topic, ?string $diff): array {
    $sql = 'SELECT p.*, pv.statement, pv.public_examples, pv.time_limit_ms FROM problems p JOIN problem_versions pv ON pv.id=p.current_version_id WHERE 1=1';
    $args = [];
    if ($topic) { $sql .= ' AND topic=?'; $args[] = $topic; }
    if ($diff) { $sql .= ' AND difficulty=?'; $args[] = $diff; }
    $st = $pdo->prepare($sql); $st->execute($args);
    return $st->fetchAll();
  }
  public static function get(PDO $pdo, int $id): ?array {
    $st = $pdo->prepare('SELECT p.*, pv.* FROM problems p JOIN problem_versions pv ON pv.id=p.current_version_id WHERE p.id=?');
    $st->execute([$id]);
    return $st->fetch() ?: null;
  }
  public static function saveDraft(PDO $pdo, int $uid, int $pid, string $lang, string $code): void {
    $pdo->prepare('INSERT INTO drafts(user_id,problem_id,language,code) VALUES(?,?,?,?) ON DUPLICATE KEY UPDATE code=VALUES(code)')
      ->execute([$uid, $pid, $lang, $code]);
  }
  public static function getDraft(PDO $pdo, int $uid, int $pid): ?array {
    $st = $pdo->prepare('SELECT * FROM drafts WHERE user_id=? AND problem_id=?');
    $st->execute([$uid, $pid]);
    return $st->fetch() ?: null;
  }
  public static function create(PDO $pdo, int $uid, array $b): array {
    $pdo->prepare('INSERT INTO problems(slug,title,topic,difficulty,created_by) VALUES(?,?,?,?,?)')
      ->execute([$b['slug'], $b['title'], $b['topic'] ?? '', $b['difficulty'] ?? 'easy', $uid]);
    $pid = (int)$pdo->lastInsertId();
    $pdo->prepare('INSERT INTO problem_versions(problem_id,version_no,statement,testset_version) VALUES(?,1,?,?)')
      ->execute([$pid, $b['statement'] ?? '', 'v1']);
    $vid = (int)$pdo->lastInsertId();
    $pdo->prepare('UPDATE problems SET current_version_id=? WHERE id=?')->execute([$vid, $pid]);
    return ['problem_id' => $pid, 'version_id' => $vid];
  }
  public static function newVersion(PDO $pdo, int $pid, array $b): array {
    $st = $pdo->prepare('SELECT MAX(version_no) FROM problem_versions WHERE problem_id=?'); $st->execute([$pid]);
    $no = (int)$st->fetchColumn() + 1;
    $old = $pdo->prepare('SELECT testset_version FROM problem_versions WHERE id=(SELECT current_version_id FROM problems WHERE id=?)');
    $old->execute([$pid]); $ts = $old->fetchColumn() ?: 'v1';
    $pdo->prepare('INSERT INTO problem_versions(problem_id,version_no,statement,input_spec,output_spec,public_examples,time_limit_ms,memory_limit_kb,testset_version) VALUES(?,?,?,?,?,?,?,?,?)')
      ->execute([$pid, $no, $b['statement'] ?? '', $b['input_spec'] ?? '', $b['output_spec'] ?? '', json_encode($b['public_examples'] ?? []), $b['time_limit_ms'] ?? 2000, $b['memory_limit_kb'] ?? 262144, $ts]);
    $vid = (int)$pdo->lastInsertId();
    $pdo->prepare('UPDATE problems SET current_version_id=? WHERE id=?')->execute([$vid, $pid]);
    return ['version_id' => $vid, 'version_no' => $no];
  }
  public static function addTestset(PDO $pdo, int $pid, array $cases): string {
    $st = $pdo->prepare('SELECT current_version_id FROM problems WHERE id=?'); $st->execute([$pid]);
    $vid = $st->fetchColumn();
    $ver = 'v' . time();
    $ord = 0;
    foreach ($cases as $c) {
      $pdo->prepare('INSERT INTO test_cases(problem_version_id,testset_version,ordinal,input_data,expected_output,is_public,weight,`group_name`) VALUES(?,?,?,?,?,?,?,?)')
        ->execute([$vid, $ver, ++$ord, $c['input'] ?? '', $c['expected'] ?? '', $c['is_public'] ?? 0, $c['weight'] ?? 1, $c['group'] ?? 'default']);
    }
    $pdo->prepare('UPDATE problem_versions SET testset_version=? WHERE id=?')->execute([$ver, $vid]);
    return $ver;
  }
  public static function setChecker(PDO $pdo, int $pid, string $checker, string $config = ''): void {
    if (!in_array($checker, ['exact', 'float', 'sorted', 'tokens', 'regex'], true)) return;
    if ($checker === 'regex') {
      $config = trim($config);
      if ($config === '' || strlen($config) > 500) return;
    } else {
      $config = '';
    }
    $pdo->prepare('UPDATE problem_versions SET checker=?, checker_config=? WHERE id=(SELECT current_version_id FROM problems WHERE id=?)')
      ->execute([$checker, $config ?: null, $pid]);
  }
}
