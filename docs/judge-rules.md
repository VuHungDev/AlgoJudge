# Quy tắc chấm bài (Judge Rules)

Ngôn ngữ chính của hệ thống: **PHP** (backend API + worker). Ngôn ngữ **được chấm**
(ngôn ngữ của bài nộp): Python, C++, JavaScript — xem bảng tương thích bên dưới.
Kết hợp thêm ngôn ngữ mới = thêm image sandbox + 1 nhánh trong `JudgeService::runCase`,
không đổi API.

## 1. Verdict

| Verdict | Điều kiện | Lỗi của ai |
|---|---|---|
| `ACCEPTED` | Đúng tất cả ca | Người học |
| `WRONG_ANSWER` | Đầu ra khác kỳ vọng (gồm sai biên) | Người học |
| `COMPILE_ERROR` | Lỗi cú pháp / biên dịch | Người học |
| `RUNTIME_ERROR` | Thoát mã khác 0, exception | Người học |
| `TIME_LIMIT_EXCEEDED` | Quá thời gian (vd. lặp vô hạn) | Người học |
| `MEMORY_LIMIT_EXCEEDED` | Quá bộ nhớ | Người học |
| `SYSTEM_ERROR` | Sandbox/worker lỗi, mất kết nối | **Hệ thống** |
| `RETRY_PENDING` | Chờ thử lại sau lỗi hệ thống | **Hệ thống** |

**Quy tắc cứng:** lỗi hệ thống **không bao giờ** được ghi thành `WRONG_ANSWER`
hay bất kỳ verdict nào quy lỗi cho người học.

## 2. So sánh đầu ra (`Judge/Comparator.php`)

1. Chuẩn hóa CRLF → LF.
2. `rtrim` từng dòng (bỏ khoảng trắng cuối dòng).
3. Bỏ các dòng trống ở cuối output.
4. Checker `exact`: so khớp từng dòng.
5. Checker `float`: so sánh token số với epsilon `1e-6`.
6. Checker `sorted`: chuẩn hóa và sắp xếp các dòng, dùng cho nhiều đáp án khác thứ tự.
7. Checker `tokens`: chuẩn hóa, sắp xếp toàn bộ token, dùng khi thứ tự từ không quan trọng.
8. Checker `regex`: khớp output đã chuẩn hóa với `checker_config` do giảng viên đặt (tối đa 500 ký tự).
9. `stderr` chỉ giữ bản đã lọc: tối đa 500 ký tự / 20 dòng / 2KB — không lộ dữ liệu kín.

## 3. Tổng hợp verdict

Ưu tiên: `SYSTEM_ERROR` > `COMPILE_ERROR` > `RUNTIME_ERROR` > `TIME_LIMIT_EXCEEDED` >
`MEMORY_LIMIT_EXCEEDED` > `WRONG_ANSWER` > `ACCEPTED`.
Điểm subtask: nhóm ca theo `group_name`, tính theo trọng số `weight`
(`scoreSubtasks`), tổng hợp có trọng số.

## 4. Ngôn ngữ được chấm (kết hợp đa ngôn ngữ)

| Ngôn ngữ | Sandbox | Chạy |
|---|---|---|
| Python | `sandbox/python` | `python3 main.py`, stdin pipe, pids 32 |
| C++ | `sandbox/cpp` | `g++ -O2 -std=c++17` (+60s compile), pids 32 |
| JavaScript | `sandbox/js` | `node main.js`, pids 32 |
| Java | `sandbox/java` (Temurin 17) | `javac` (+60s) rồi `java Main`, pids 48 (JVM cần nhiều tiến trình) |
| Go | `sandbox/go` (1.22) | `go build -p 1` với `GOCACHE=/tmp GOMAXPROCS=1 GOPROXY=off` (+60s), pids 128 (toolchain fork nhiều) |
| C | `sandbox/c` (GCC 13) | `gcc -O2 -std=c17` (+60s), pids 32 |

Mã nộp gửi kèm `OJ_CODE` base64 qua biến môi trường, `stdout` giới hạn 1MB,
`stderr` 64KB. Muốn thêm Java: thêm image + nhánh `runCase`, không đổi API/DB.

## 5. Sandbox (mỗi lần chạy)

`--network none --cap-drop ALL --pids-limit 32 -m 256m --cpus 1 --read-only
--tmpfs --user nobody --init`, container tạm `ojrun_*`, xóa sau khi xong
(+ `rm -f` dọn orphan), `timeout -k 5` cứng ở worker.

## 6. Chống đạo văn (`Judge/Similarity.php`)

Jaccard trên shingle k=3 của token mã nguồn. Ngưỡng gợi ý: ≥ 0.8 xem xét thủ công.
