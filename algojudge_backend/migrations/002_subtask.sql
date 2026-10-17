-- Subtask (muc 17): diem theo nhom ca. Bo sung cot group_name cho test_cases,
-- cot score, checker, checker_config cho problem_versions de sau nay gan checker tuy bien.
ALTER TABLE test_cases ADD COLUMN group_name VARCHAR(64) DEFAULT 'default';
ALTER TABLE problem_versions ADD COLUMN score INT DEFAULT 100;
ALTER TABLE problem_versions ADD COLUMN checker VARCHAR(32) DEFAULT 'exact';
ALTER TABLE problem_versions ADD COLUMN checker_config TEXT NULL;
ALTER TABLE submissions MODIFY COLUMN language ENUM('python','cpp','js') NOT NULL;
