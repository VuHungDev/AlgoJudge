<?php

// Port tu src/Config.php (PHP thuan): gioi han doc tu ENV.
return [
    'maintenance' => env('MAINTENANCE_MODE', false),
    'maintenance_message' => env('MAINTENANCE_MESSAGE', 'He thong dang bao tri'),
    'wait_result' => env('ENABLE_WAIT_RESULT', true),
    'batched' => env('ENABLE_BATCHED_SUBMISSIONS', true),
    'max_batch' => (int) env('MAX_SUBMISSION_BATCH_SIZE', 20),
    'max_queue_size' => (int) env('MAX_QUEUE_SIZE', 100),
    'number_of_runs' => (int) env('NUMBER_OF_RUNS', 1),
    'compiler_options' => env('ENABLE_COMPILER_OPTIONS', true),
    'cmd_args' => env('ENABLE_COMMAND_LINE_ARGUMENTS', true),
    'callbacks' => env('ENABLE_CALLBACKS', true),
    'callback_tries' => (int) env('CALLBACKS_MAX_TRIES', 3),
    'callback_timeout' => (int) env('CALLBACKS_TIMEOUT', 5),
    'submission_delete' => env('ENABLE_SUBMISSION_DELETE', false),
];
