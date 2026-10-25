# Tài nguyên tái sử dụng

Toàn bộ mã PHP trong `backend-laravel/`, `mobile/` là nhóm viết mới
(điều phối chấm, so sánh đầu ra, sandbox Docker, API, giao diện).

- Ý tưởng API tương thích (base64, `?wait=true`, `?fields=`, `/languages`, `/statuses`,
  thống kê, hàng đợi worker, batch, callback) tham khảo tài liệu Judge0 (AGPL).
- Đề bài trong `backend-laravel/data/` là dữ liệu giả do nhóm tự soạn, nguồn hợp lệ sử dụng.
- Image Docker sử dụng theo giấy phép gốc của từng image:
  `python:3.12-slim`, `gcc:13-bookworm`, `node:22-slim`, `mysql:8.0`,
  `php:8.4-apache`.
