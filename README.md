# AlgoJudge — Hệ thống luyện tập và chấm bài lập trình trực tuyến

> **Ngôn ngữ chính: PHP.** Toàn bộ backend (API + worker chấm bài) viết bằng PHP —
> bản PHP thuần (`algojudge_backend/`) và bản Laravel (`backend-laravel/`) chạy song
> song cùng contract `/api/v1`. Ngôn ngữ *được chấm* (bài nộp của học viên):
> Python, C++, JavaScript — thêm ngôn ngữ mới chỉ cần thêm image sandbox +
> 1 nhánh `runCase`, không đổi API. Web: HTML tĩnh + Next.js. Mobile: Expo.

Nhóm tự viết: điều phối chấm (`algojudge_backend/src/Service/JudgeService.php`), so sánh đầu ra + tổng hợp + checker float + điểm subtask (`algojudge_backend/src/Judge/Comparator.php`), đo tương tự mã (`Similarity.php`).
Tách lớp đúng mục 3.1 Claude.md: `Controller` → `Service` → `Repository`, `Middleware` rate-limit.

## Cấu trúc (FE/BE tách riêng)
- `algojudge_backend/` — API PHP thuần 8.2 + worker (JSON, MySQL 8), `sandbox/`, `data/`
- `backend-laravel/` — API Laravel 13 + Sanctum + Artisan `judge:work` (DB riêng `oj_laravel`), contest/streak/gợi ý bài
- `algojudge_ui/` — web tĩnh: `index.html` (học, SSE), `teacher.html` (GV), `ops.html` (ops), `logo.svg`
- `web-next/` — web động Next.js: `/` (học, Monaco), `/teacher`, `/ops`, `/contests`
- `mobile/` — app Expo 9 màn hình dùng chung REST API
- `docs/` — `judge-rules.md`, `acceptance-tests.md`

## Chạy (lần đầu)
```powershell
Copy-Item .env.example .env
docker build -t oj-sandbox-python ./algojudge_backend/sandbox/python
docker build -t oj-sandbox-cpp ./algojudge_backend/sandbox/cpp
docker build -t oj-sandbox-js ./algojudge_backend/sandbox/js
docker compose up -d --build
docker compose exec api php migrations/migrate.php
docker compose exec api php seeds/seed.php
```
- API PHP thuần: http://localhost:8080/api/v1 — Web tĩnh: http://localhost:3000
- API Laravel: http://localhost:8081/api/v1 — Web Next.js: http://localhost:3001
- GV: `gv@oj.local` / `gv123456` — Admin: `admin@oj.local` / `admin123456`
- Expo: `cd mobile; npx expo start`, đặt `EXPO_PUBLIC_API_URL` (emulator: `http://10.0.2.2:8081/api/v1`)

## Chạy lại / sau khi sửa code PHP
```powershell
docker compose up -d api worker
docker compose restart worker   # worker là vòng lặp PHP, PHẢI restart mới nạp code mới
docker compose logs worker --tail 20
```

## Hai luồng demo
1. Nộp bài → chấm → xem kết quả (SSE): mở http://localhost:3000, đăng nhập, chọn bài, dán code, Nộp.
2. Sửa bộ dữ liệu → chấm lại → đối chiếu: mở http://localhost:3000/teacher.html (tk GV).

## Kiểm thử
- Đơn vị: `docker run --rm -v ${PWD}/algojudge_backend:/app php:8.2-cli php /app/tests/test_comparator.php` (16 check)
- 5 phép thử bắt buộc: xem `docs/acceptance-tests.md`.

## Lưu ý an toàn (mục 5, 10 Claude.md)
- Chỉ `worker` được mount `docker.sock`, **không** mount vào `api`.
- API không bao giờ chạy mã nộp; sandbox là container tạm `--network none --cap-drop ALL --pids-limit 32`, `-m 256m`, user `nobody`, timeout cứng + `timeout -k`, dọn container mồ côi theo tên.

## Mở rộng đã làm (mục 17)
- Ngôn ngữ JavaScript (Node 22, image `oj-sandbox-js`), chọn ở UI + `POST /submissions` (`language=js`).
- Checker sai số (`checker='float'`), điểm subtask theo `group`/`weight`, SSE `GET /submissions/{id}/events` thay polling, chống đạo văn `GET /admin/submissions/{a}/similarity/{b}`.
- Contest có giờ + leaderboard realtime, streak ngày, gợi ý bài tiếp theo theo năng lực (`/contests`, `/me/streak`, `/me/recommend`) — có cả trên web-next `/contests` và app Expo.

## Expo (9 màn hình)
Login, Problems, Detail (chạy thử + nộp + polling), History, Result (chi tiết bài nộp + mã nguồn), Contests (leaderboard + streak + gợi ý), Profile (hồ sơ + đăng xuất), Teacher (chấm lại), Ops (hàng đợi + requeue). Token lưu SecureStore; React Native không có EventSource nên dùng polling 2s.
