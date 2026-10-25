# Phép thử bắt buộc (Acceptance Tests)

Backend chính: **Laravel** (`:8081`, contract `/api/v1`). Dưới đây là minh chứng đã chạy thật (2026-10-17).

## 1. Năm verdict khác nhau

Dữ liệu: 5 bài × 5 solutions (`ok`, `wrong_algo`, `syntax_err`, `runtime_err`,
`infinite`) trong `backend-laravel/data/`.

| Mã nộp | Verdict mong đợi | Kết quả |
|---|---|---|
| `ok.py` | `ACCEPTED` | PASS |
| `wrong_algo.py` | `WRONG_ANSWER` | PASS |
| `syntax_err.py` | `COMPILE_ERROR` | PASS |
| `runtime_err.py` | `RUNTIME_ERROR` | PASS |
| `infinite.py` | `TIME_LIMIT_EXCEEDED` | PASS |

Mở rộng: bài float riêng → `ACCEPTED` qua `matchFloat` (eps 1e-6); bài JS và C++
→ `ACCEPTED`. File float dùng testset riêng (không ghi đè testset exact).

## 1b. Ngôn ngữ kết hợp Java/Go/C (mới)

Bài `tong-hai-so`, version 1, nộp qua Laravel, worker chấm thật:

| Ngôn ngữ | Submission | Run | Verdict |
|---|---|---|---|
| Java (`Main.java`, Temurin 17) | #14 | run 16 (sau rejudge nạp code worker mới) | `ACCEPTED` 100 |
| Go (`main.go`, 1.22) | #15 | run 21 (sau fix `GOCACHE=/tmp` + `go build -p 1` + pids 128) | `ACCEPTED` 100 |
| C (`main.c`, GCC 13) | #16 | run hiện hành | `ACCEPTED` 100 |

Sự cố gặp và cách sửa: (1) cột `language` ENUM chưa có java/go/c → migration
`004_languages.sql` (PHP thuần) + `2026_10_18_000002_add_judge_languages.php`
(Laravel); (2) worker cũ không biết nhánh mới → restart worker + rejudge;
(3) `go build` lỗi `GOCACHE` read-only → `export GOCACHE=/tmp/gocache`;
(4) Go fork nhiều tiến trình → pids-limit 128 + `GOMAXPROCS=1 GOPROXY=off`.

## 1c. Checker tùy biến

Đã bổ sung và unit-test 5 checker dùng chung cho PHP thuần và Laravel:

| Checker | Mục đích |
|---|---|
| `exact` | So khớp dòng sau normalize |
| `float` | Token số với epsilon 1e-6 |
| `sorted` | Nhiều đáp án đúng, không phụ thuộc thứ tự dòng |
| `tokens` | Nhiều đáp án đúng, không phụ thuộc thứ tự token |
| `regex` | Output khớp `checker_config` do giảng viên đặt |

`test_comparator.php`: **24/24 PASS**. Web `/teacher` và Expo Teacher đều cho
chọn checker; regex yêu cầu mẫu và giới hạn 500 ký tự. API end-to-end cần chạy
khi stack đã khởi động và quyền ghi database được cấp.
## 1d. Lease recovery, API JSON và push notification

- Worker PHP thuần và Laravel đều quét `RUNNING` quá hạn lease trong transaction;
  còn attempt thì đưa về `QUEUED`, hết attempt thì `SYSTEM_ERROR`, xóa lease token.
- Laravel có test tự động `JudgeLeaseRecoveryTest`: **5 tests / 7 assertions PASS**,
  gồm requeue, SYSTEM_ERROR sau 3 attempt và API chưa đăng nhập trả JSON 401.
- Expo token được đăng ký qua `POST /api/v1/me/device-token`, lưu trong `device_tokens`;
  Laravel worker gọi Expo Push API khi bài chấm xong. Push là tùy chọn: lỗi Expo không
  làm hỏng kết quả chấm.

`QUEUED` (`RETRY_PENDING`, tăng `attempt`); vượt số lần thử → `SYSTEM_ERROR`
để admin requeue (`POST /ops/runs/{id}/requeue`). Không có verdict nào quy lỗi
cho người học. Kết quả: PASS.

## 3. Idempotency

Gửi lại `POST /submissions` cùng `Idempotency-Key` → trả cùng `submission_id`
(không tạo bài mới); key mới → bài mới. Ràng buộc `UNIQUE(user_id,
idempotency_key)`. Kết quả: PASS.

## 4. Run cũ về muộn không ghi đè

Worker ghi kết quả có điều kiện:

```sql
UPDATE judging_runs SET status='DONE', verdict=?, score=?, finished_at=NOW()
WHERE id=? AND lease_token=? AND status='RUNNING' AND is_current=1;
```

`affected_rows = 0` → bỏ kết quả. Rejudge tạo run mới (`is_current=1`, run cũ
về 0); lịch sử giữ đủ; compare `GET /admin/submissions/{id}/compare?a=&b=`
đối chiếu từng ca. Kết quả: PASS.

## 5. Phân quyền + không lộ dữ liệu kín

Người A đọc mã của B → `404` (không lộ sự tồn tại). Response ca kín không bao
gồm `input_data`/`expected_output`, không có stdout thực, `stderr` đã lọc,
không có thông tin runner (địa chỉ/token/đường dẫn nội bộ). SSE
`/submissions/{id}/events?token=` chỉ lộ `(id,status,verdict,score,attempt)`.
Kết quả: PASS (404/404 cross-user).

## Phụ lục: Ruby đã port sang PHP

Toàn bộ logic Ruby cũ đã port: `Config`, migration `003` (runs/copts/cargs/
callback), batch create/show, soft-delete, queue-size, `?wait=true` (~60s poll),
maintenance mode, info routes (`/languages /statuses /about /version
/statistics /ops`), worker multi-run + callback. File Ruby trùng lặp đã xóa.
