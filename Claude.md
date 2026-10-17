# Hệ thống luyện tập và chấm bài lập trình trực tuyến

> Tài liệu thiết kế & kế hoạch triển khai. Ngôn ngữ chính: **PHP**. Cơ sở dữ liệu: **MySQL 8**. Chạy dự án: **Docker Compose**. Client: **Web** và **Android (Expo)**.

---

## 1. Tổng quan

### 1.1 Mục tiêu
Xây dựng phần mềm mã nguồn mở cho phép người học chọn bài tập, viết mã trên trình duyệt, chạy thử và nộp bài để chấm tự động. Giảng viên quản lý đề, bộ dữ liệu kiểm tra và theo dõi kết quả.

> **Lưu ý phạm vi:** hệ thống chấm bằng dữ liệu thử, **không khẳng định** chương trình đúng trong mọi trường hợp.

### 1.2 Người sử dụng

| Vai trò | Nhu cầu chính |
|---|---|
| Người học | Chọn bài, viết mã, chạy thử, nộp, xem kết quả và lịch sử |
| Giảng viên | Quản lý bài tập, bộ dữ liệu chấm, chấm lại, theo dõi tiến độ lớp |
| Quản trị viên dịch vụ thực thi | Giám sát worker/sandbox, hàng đợi, xử lý lỗi hệ thống |

### 1.3 Phạm vi hỗ trợ
- Ngôn ngữ chấm: **Python** (hoàn thiện trước), sau đó **C++**.
- Chương trình **một tệp**, đọc `stdin`, ghi `stdout`.
- Dữ liệu: chỉ dùng **dữ liệu giả**, bài có nguồn sử dụng hợp lệ, **tối thiểu 5 ca/bài**, kèm mã đúng và mã sai để đối chiếu.

---

## 2. Công cụ và công nghệ

| Thành phần | Công nghệ | Ghi chú |
|---|---|---|
| Backend API | PHP 8.2+ (Slim hoặc PHP thuần có router riêng) | Trả JSON, không render giao diện |
| Cơ sở dữ liệu | MySQL 8 | Dùng `SKIP LOCKED` cho hàng đợi |
| Hàng đợi | Bảng trong MySQL (`judging_runs`) | Không cần Redis |
| Worker chấm | PHP CLI chạy tiến trình riêng | Phần **nhóm tự viết** |
| Sandbox | Docker container tạm, cách ly | Python, C++ |
| Web FE | React/Vue + Monaco hoặc CodeMirror | Một trang web |
| Mobile | Expo (React Native) | Gọi chung REST API |
| Triển khai | **Docker Compose** | Luồng chạy duy nhất |

> **Đã bỏ XAMPP.** Toàn bộ môi trường chạy bằng Docker để tái lập dễ, demo ổn định và đảm bảo sandbox hoạt động thống nhất.

---

## 3. Kiến trúc

```
 [Web FE]        [Expo App]
        \          /
        REST API (PHP)  ───────►  MySQL
              │                     ▲
              │ tạo judging_run     │ đọc/ghi
              ▼                     │
        Hàng đợi (judging_runs) ────┤
              │                     │
              ▼                     │
        Judge Worker (PHP CLI) ─────┘
              │
              ▼
        Sandbox (container tạm: Python / C++)
```

### 3.1 Nguyên tắc
1. **API không bao giờ chạy mã nộp.** Chỉ xác thực, kiểm tra quyền, ghi DB, tạo job.
2. **Worker** lấy job, gọi sandbox, so sánh đầu ra, tổng hợp và ghi kết quả.
3. **Sandbox** mỗi lần chạy là một container tạm, xóa sau khi xong.
4. Tách lớp: `Controller` (HTTP) → `Service` (nghiệp vụ) → `Repository` (lưu trữ).

### 3.2 Cấu hình sandbox (mỗi lần chạy)
- `--network none`
- Giới hạn CPU, RAM, số tiến trình (`--pids-limit`)
- Hệ tệp chỉ đọc, thư mục tạm riêng
- Timeout cứng ở phía worker
- Chạy bằng user không đặc quyền, bỏ capability (`--cap-drop ALL`)
- Giới hạn kích thước `stdout`/`stderr` thu về

---

## 4. Cấu trúc thư mục đề xuất

```
oj-project/
├── README.md
├── LICENSE
├── CONTRIBUTING.md
├── THIRD_PARTY.md            # ghi nguồn mã/thư viện/tài nguyên tái sử dụng
├── docker-compose.yml
├── .env.example
├── backend/
│   ├── public/index.php
│   ├── src/
│   │   ├── Controller/
│   │   ├── Service/          # logic nghiệp vụ, điều phối chấm
│   │   ├── Repository/       # truy cập DB
│   │   ├── Judge/            # so sánh đầu ra, tổng hợp kết quả, phân loại lỗi
│   │   └── Middleware/       # auth, phân quyền, rate limit
│   ├── worker/worker.php
│   ├── migrations/
│   ├── seeds/
│   └── tests/
├── sandbox/
│   ├── python/Dockerfile
│   └── cpp/Dockerfile
├── web/                      # giao diện web
├── mobile/                   # Expo app
├── data/                     # bài mẫu, ca thử, mã đúng/sai (dữ liệu giả)
└── docs/
```

---

## 5. Docker Compose

Các dịch vụ:

| Service | Vai trò |
|---|---|
| `db` | MySQL 8 |
| `api` | PHP-FPM + Nginx (hoặc Apache) |
| `worker` | `php worker/worker.php` chạy liên tục |
| `web` | Giao diện web |
| `sandbox-*` (image) | Build sẵn image Python/C++ để worker gọi |

**Lưu ý quan trọng cho worker gọi sandbox:**
- Worker cần quyền gọi Docker (qua socket hoặc Docker host). Đây là điểm **nhạy cảm về an toàn**: chỉ `worker` được mount, **không** mount vào `api`.
- Cân nhắc dùng một dịch vụ `runner` nhỏ riêng (nhận yêu cầu chạy, trả kết quả) để worker không giữ trực tiếp quyền Docker. Địa chỉ/token runner đặt trong `.env`, **không** trả ra client.

Lệnh chạy chuẩn:

```bash
cp .env.example .env
docker compose up -d --build
docker compose exec api php migrations/migrate.php
docker compose exec api php seeds/seed.php
```

---

## 6. Thiết kế dữ liệu

Sáu bảng bắt buộc: `problems`, `problem_versions`, `test_cases`, `submissions`, `judging_runs`, `case_results`. Bổ sung `users`, `classes`, `class_members`, `drafts` cho xác thực, phân quyền, bản nháp.

### 6.1 Bảng chính

**problems**
| Cột | Mô tả |
|---|---|
| id | PK |
| slug, title | Định danh, tên bài |
| topic, difficulty | Chủ đề, mức độ |
| created_by | Giảng viên tạo |
| current_version_id | Phiên bản đề hiện hành |

**problem_versions**
| Cột | Mô tả |
|---|---|
| id | PK |
| problem_id | FK |
| version_no | Số phiên bản đề |
| statement, input_spec, output_spec | Mô tả đề |
| public_examples | Ví dụ công khai (JSON) |
| time_limit_ms, memory_limit_kb | Giới hạn chạy |
| testset_version | Phiên bản bộ dữ liệu chấm |
| created_at | |

**test_cases**
| Cột | Mô tả |
|---|---|
| id | PK |
| problem_version_id | FK (bộ dữ liệu gắn theo phiên bản) |
| testset_version | Phiên bản bộ dữ liệu |
| ordinal | Thứ tự |
| input_data, expected_output | **Dữ liệu kín**, không bao giờ trả ra client |
| is_public | Ca công khai hay kín |
| weight | Trọng số |

**submissions**
| Cột | Mô tả |
|---|---|
| id | PK (mã bài nộp) |
| user_id | Người nộp |
| problem_version_id | **Gắn đúng phiên bản đề** |
| language | `python` / `cpp` |
| source_code | Mã nộp (bất biến, không sửa) |
| idempotency_key | Khóa chống nộp trùng |
| created_at | |
| **UNIQUE** | `(user_id, idempotency_key)` |

**judging_runs**
| Cột | Mô tả |
|---|---|
| id | PK |
| submission_id | FK |
| testset_version | **Gắn đúng phiên bản bộ dữ liệu** |
| status | `QUEUED`, `RUNNING`, `DONE`, `SYSTEM_ERROR`, `RETRY_PENDING` |
| verdict | Kết quả tổng hợp |
| score | Điểm |
| attempt | Số lần thử lại |
| lease_token, lease_expires_at | Token thuê job của worker |
| is_current | Lần chấm hiện hành của bài nộp |
| created_at, started_at, finished_at | |

**case_results**
| Cột | Mô tả |
|---|---|
| id | PK |
| judging_run_id | FK |
| test_case_id | FK |
| verdict | Kết quả từng ca |
| time_ms, memory_kb | Tài nguyên dùng |
| stderr_excerpt | Chỉ giữ phần đã lọc, không lộ dữ liệu kín |

### 6.2 Bảng hỗ trợ
`users(id, email, password_hash, role)`, `classes`, `class_members(class_id, user_id, role)`, `drafts(user_id, problem_id, language, code, updated_at)`.

### 6.3 Quy tắc dữ liệu
- `submissions` và `judging_runs` cũ **không bị sửa/xóa** khi chấm lại.
- Chấm lại = tạo `judging_run` mới (cùng `submission_id`, `testset_version` mới), đặt `is_current` cho run mới.
- Thay đổi bộ dữ liệu = tạo `testset_version` mới, **không ghi đè** ca cũ.

---

## 7. Quy tắc kết quả đã công bố

| Verdict | Điều kiện | Lỗi của ai |
|---|---|---|
| `ACCEPTED` | Đúng tất cả ca | Người học |
| `WRONG_ANSWER` | Đầu ra khác kỳ vọng (gồm sai dữ liệu biên) | Người học |
| `COMPILE_ERROR` | Lỗi cú pháp/biên dịch | Người học |
| `RUNTIME_ERROR` | Thoát mã khác 0, exception | Người học |
| `TIME_LIMIT_EXCEEDED` | Quá thời gian (vd. lặp vô hạn) | Người học |
| `MEMORY_LIMIT_EXCEEDED` | Quá bộ nhớ | Người học |
| `SYSTEM_ERROR` | Sandbox/worker lỗi, mất kết nối | **Hệ thống** |
| `RETRY_PENDING` | Chờ thử lại sau lỗi hệ thống | **Hệ thống** |

**Quy tắc cứng:** lỗi hệ thống **không bao giờ** được ghi thành `WRONG_ANSWER` hay bất kỳ verdict nào quy lỗi cho người học.

### So sánh đầu ra
Nhóm tự viết, công bố rõ quy tắc, ví dụ: bỏ khoảng trắng cuối dòng, bỏ dòng trống cuối, so sánh theo token hoặc theo dòng. Ghi trong `docs/`.

---

## 8. Thiết kế API

Xác thực bằng token (JWT hoặc token lưu DB). Tiền tố `/api/v1`.

### 8.1 Xác thực
| Method | Endpoint | Mô tả |
|---|---|---|
| POST | `/auth/register`, `/auth/login` | Đăng ký, đăng nhập |
| GET | `/me` | Thông tin tài khoản |

### 8.2 Bài tập (người học)
| Method | Endpoint | Mô tả |
|---|---|---|
| GET | `/problems` | Danh sách, lọc theo chủ đề/mức độ |
| GET | `/problems/{id}` | Đề + ví dụ công khai (**không** có ca kín) |
| PUT | `/problems/{id}/draft` | Lưu bản nháp |
| GET | `/problems/{id}/draft` | Lấy bản nháp |
| POST | `/run` | Chạy thử với dữ liệu tự nhập |

### 8.3 Nộp bài
| Method | Endpoint | Mô tả |
|---|---|---|
| POST | `/submissions` | Nộp bài. Header `Idempotency-Key` |
| GET | `/submissions/{id}` | Trạng thái + kết quả |
| GET | `/submissions/{id}/code` | Xem mã (kiểm tra quyền) |
| GET | `/me/submissions` | Lịch sử |
| GET | `/me/progress` | Tiến độ |

### 8.4 Giảng viên
| Method | Endpoint | Mô tả |
|---|---|---|
| POST/PUT | `/admin/problems` | Tạo/sửa bài (tạo phiên bản đề mới) |
| POST | `/admin/problems/{id}/testsets` | Tạo phiên bản bộ dữ liệu mới |
| POST | `/admin/submissions/{id}/rejudge` | Chấm lại |
| GET | `/admin/submissions/{id}/compare?a=&b=` | Đối chiếu hai lần chấm |
| GET | `/admin/classes/{id}/progress` | Theo dõi lớp |

### 8.5 Quản trị dịch vụ thực thi
| Method | Endpoint | Mô tả |
|---|---|---|
| GET | `/ops/queue` | Tình trạng hàng đợi |
| GET | `/ops/workers` | Tình trạng worker |
| POST | `/ops/runs/{id}/requeue` | Đưa job lỗi hệ thống vào lại hàng đợi |

### 8.6 Mã lỗi HTTP chính
`401` chưa đăng nhập, `403/404` không có quyền (dùng 404 để không lộ sự tồn tại), `409` xung đột, `422` dữ liệu sai, `429` quá tần suất.

---

## 9. Luồng xử lý

### 9.1 Nộp bài (Tình huống 1)
1. Client gửi `POST /submissions` kèm `Idempotency-Key`.
2. API kiểm tra quyền, kích thước mã, ngôn ngữ hợp lệ.
3. Trong một transaction: tìm theo `(user_id, idempotency_key)`; nếu có → trả lại `submission_id` cũ; nếu chưa → tạo `submission` + `judging_run` (`QUEUED`, `is_current = 1`).
4. Worker lấy job: `SELECT ... WHERE status='QUEUED' ... FOR UPDATE SKIP LOCKED`, đặt `RUNNING`, cấp `lease_token`.
5. Worker chạy từng ca trong sandbox, so sánh đầu ra, ghi `case_results`.
6. Tổng hợp verdict, cập nhật `judging_runs` **có điều kiện** (xem 9.3).
7. Client polling `GET /submissions/{id}` để xem kết quả.

### 9.2 Chấm lại (Tình huống 2)
1. Giảng viên tạo `testset_version` mới.
2. Gọi rejudge → tạo `judging_run` mới (testset mới), đặt run cũ `is_current = 0`.
3. Mã nguồn và kết quả các lần chấm trước giữ nguyên.
4. Đối chiếu hai run theo từng ca (verdict, thời gian, bộ nhớ).

### 9.3 Chống ghi đè kết quả cũ
Khi worker ghi kết quả:

```sql
UPDATE judging_runs
SET status='DONE', verdict=?, score=?, finished_at=NOW()
WHERE id=? AND lease_token=? AND status='RUNNING' AND is_current=1;
```

Nếu `affected_rows = 0` → bỏ kết quả (run đã bị thay thế hoặc lease hết hạn). Run cũ về muộn **không** ghi đè run mới.

### 9.4 Xử lý lỗi hệ thống
- Sandbox không phản hồi / ngắt kết nối → đặt `RETRY_PENDING`, tăng `attempt`.
- Vượt số lần thử tối đa → `SYSTEM_ERROR` để quản trị viên xử lý.
- Job `RUNNING` quá hạn lease → worker khác đưa lại `QUEUED`.

---

## 10. An toàn và phân quyền

| Rủi ro | Biện pháp |
|---|---|
| Chạy mã độc | Sandbox cách ly, không mạng, giới hạn tài nguyên, không chạy trong tiến trình web |
| Lộ dữ liệu chấm kín | API không trả `input_data`/`expected_output` của ca kín; không trả stdout thực của ca kín; lọc `stderr` |
| Lộ thông tin runner | Không đưa địa chỉ/token/đường dẫn nội bộ vào response, log trả client, thông báo lỗi |
| Đọc mã người khác | Kiểm tra `owner/class/role` ở mọi endpoint; trả 403/404 |
| Đường dẫn/đầu vào | Kiểm tra độ dài, ký tự, không ghép đường dẫn từ dữ liệu người dùng |
| Mật khẩu | Băm `password_hash` (bcrypt/argon2); không lưu mật khẩu/dữ liệu thật trong bài nộp |
| Lạm dụng | Rate limit nộp bài và chạy thử |
| SQL injection | Prepared statements toàn bộ |

---

## 11. Phép thử bắt buộc

| # | Phép thử | Kết quả mong đợi |
|---|---|---|
| 1 | Bài đúng, sai biên, lỗi cú pháp, lỗi chạy, lặp vô hạn | 5 verdict khác nhau theo quy tắc mục 7 |
| 2 | Ngắt bộ thực thi giữa chừng | `SYSTEM_ERROR`/`RETRY_PENDING`, không chấm người học sai |
| 3 | Gửi lại cùng `Idempotency-Key` | Trả cùng `submission_id`; key mới → bài mới |
| 4 | Kết quả run cũ về muộn sau khi đã chấm lại | Không ghi đè run mới; lịch sử đủ |
| 5 | Người A đọc mã của B; kiểm tra response | 403/404; không lộ dữ liệu kín, thông tin runner |

Mỗi phép thử cần: kịch bản, dữ liệu, lệnh chạy, kết quả mong đợi, minh chứng (log/ảnh).

---

## 12. Dữ liệu mẫu

- Tối thiểu **5 bài**, mỗi bài **≥ 5 ca** (gồm ca biên).
- Mỗi bài có: mã đúng, và các mã sai đại diện (sai thuật toán, sai biên, lỗi cú pháp, lỗi runtime, lặp vô hạn).
- Ghi nguồn bài tập, bảo đảm hợp lệ sử dụng.
- Cấu trúc gợi ý: `data/<problem_slug>/{statement.md, cases/, solutions/ok.py, solutions/wrong_*.py}`.

---

## 13. Giao diện

### 13.1 Web
- Danh sách bài (lọc chủ đề, mức độ)
- Trang bài: đề, ví dụ, trình soạn mã, ô nhập dữ liệu thử, nút **Chạy thử** / **Nộp**
- Trang kết quả: trạng thái từng ca (không lộ dữ liệu kín), mã đã nộp
- Lịch sử, tiến độ
- Khu giảng viên: quản lý bài, bộ dữ liệu, chấm lại, đối chiếu
- Khu quản trị: hàng đợi, worker

### 13.2 Expo (Android)
- Dùng chung REST API.
- Base URL đặt trong `EXPO_PUBLIC_API_URL`.
- Android emulator dùng `http://10.0.2.2:<port>`; điện thoại thật dùng IP LAN của máy chạy Docker.
- Soạn mã: `TextInput` đa dòng, hoặc WebView nhúng CodeMirror.
- Backend cấu hình CORS cho origin của web; app native không bị CORS nhưng cần cho phép HTTP khi dev.

---

## 14. Yêu cầu mã nguồn mở và bàn giao

| Hạng mục | Nội dung |
|---|---|
| `README.md` | Giới thiệu, hướng dẫn cài, chạy, kiểm thử |
| `LICENSE` | Chọn giấy phép (MIT/Apache-2.0/GPL) |
| `CONTRIBUTING.md` | Quy trình đóng góp, quy ước code, review |
| `THIRD_PARTY.md` | Liệt kê mã/thư viện/tài nguyên dùng lại, nguồn, giấy phép |
| Mã nhóm tự viết | Ghi rõ: điều phối chấm, so sánh đầu ra, tổng hợp kết quả |
| Issue & review | Dùng GitHub Issues, Pull Request có review |
| Bản phát hành | Tag/release (vd. `v1.0.0`) |
| Demo | **Hai luồng**: (1) nộp bài → chấm → xem kết quả; (2) sửa bộ dữ liệu → chấm lại → đối chiếu |
| Giải thích | Mỗi thành viên giải thích phần mình làm |

---

## 15. Lộ trình thực hiện

| Giai đoạn | Nội dung | Kết quả |
|---|---|---|
| 1 | Docker Compose, schema 6 bảng, migration, seed | Môi trường chạy được |
| 2 | API: auth, bài tập, nộp bài (idempotency), phân quyền | Nộp bài tạo job |
| 3 | Worker + sandbox **Python**, so sánh đầu ra, tổng hợp | Chấm được Python |
| 4 | Web: soạn mã, chạy thử, nộp, xem kết quả | Tình huống 1 |
| 5 | Phiên bản bộ dữ liệu, chấm lại, đối chiếu | Tình huống 2 |
| 6 | Xử lý lỗi hệ thống, retry, lease, chống ghi đè | Phép thử 2, 4 |
| 7 | Thêm **C++** | Hỗ trợ 2 ngôn ngữ |
| 8 | Expo app | Client Android |
| 9 | Bộ test 5 phép thử, tài liệu, release, demo | Nghiệm thu |

---

## 16. Danh sách kiểm tra nghiệm thu

- [ ] Quản lý bài tập, chủ đề, mức độ, ví dụ, giới hạn, phiên bản bộ dữ liệu
- [ ] Soạn mã, lưu nháp, chạy thử với dữ liệu tự nhập
- [ ] Nộp bài → hàng đợi → theo dõi từng lần chạy → tổng hợp kết quả
- [ ] Tra cứu mã đã nộp, lịch sử, tiến độ; kiểm tra quyền theo tài khoản/lớp
- [ ] Tạo bộ dữ liệu mới, chấm lại, đối chiếu, giữ lịch sử
- [ ] Phân biệt sai bài và lỗi hệ thống
- [ ] Idempotency: gửi lại không tạo bài trùng
- [ ] Kết quả cũ về muộn không ghi đè lần chấm mới
- [ ] Bài nộp gắn đúng phiên bản đề, bộ dữ liệu, ngôn ngữ
- [ ] Không lộ dữ liệu kín, đáp án, thông tin runner
- [ ] Không chạy mã nộp trong tiến trình web
- [ ] 5 phép thử bắt buộc có minh chứng
- [ ] ≥ 5 bài, ≥ 5 ca/bài, có mã đúng và sai
- [ ] README, LICENSE, CONTRIBUTING, ghi nguồn tái sử dụng
- [ ] Hướng dẫn cài/chạy/kiểm thử, dữ liệu mẫu, bản phát hành, hai luồng demo

---

## 17. Phát triển mở rộng
- Thêm ngôn ngữ khác (Java, JavaScript).
- Chấm theo điểm từng nhóm ca (subtask).
- Checker tùy biến cho bài có nhiều đáp án.
- WebSocket/SSE thay cho polling.
- Nhiều worker song song, giám sát bằng dashboard.
- Chống đạo văn (so sánh độ tương tự mã nộp).
