-- Port tu Judge0: moi bai nop duoc chay number_of_runs lan, lay trung binh (xem IsolateJob).
-- compiler_options / command_line_arguments / callback_url: tinh nang chi ban Ruby co.
ALTER TABLE submissions ADD COLUMN number_of_runs INT DEFAULT 1;
ALTER TABLE submissions ADD COLUMN compiler_options VARCHAR(512) NULL;
ALTER TABLE submissions ADD COLUMN command_line_arguments VARCHAR(512) NULL;
ALTER TABLE submissions ADD COLUMN callback_url TEXT NULL;
