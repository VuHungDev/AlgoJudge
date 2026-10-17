# Đóng góp AlgoJudge
- Viết PHP 8.2, prepared statements cho mọi truy vấn.
- Giữ đúng tách lớp (mục 3.1 Claude.md): `Controller` (HTTP) → `Service` (nghiệp vụ) → `Repository` (DB). Logic chấm thuộc `Service`/`Judge`, không viết SQL nghiệp vụ trong Controller.
- Không trả dữ liệu kín (`input_data`, `expected_output`, stdout ca kín) và thông tin runner ra client.
- Mọi verdict lỗi hệ thống phải là `SYSTEM_ERROR`/`RETRY_PENDING`, không ghi thành lỗi người học.
- API không bao giờ chạy mã nộp; chỉ worker được gọi sandbox.
- Mỗi PR mô tả rõ luồng kiểm thử theo `docs/acceptance-tests.md`. Dùng GitHub Issues + Pull Request có review.
