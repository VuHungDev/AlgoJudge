# Làm rõ Admin — Tính năng và vai trò

## Hiện trạng code admin

### Backend (đã đúng, không cần sửa)

**Endpoints admin có:**
1. `GET /admin/dashboard` — tổng quan hệ thống
2. `GET /users` + `GET /users/{id}` — danh sách + chi tiết user
3. `POST /users` — tạo tài khoản mới (teacher/student/admin)
4. `PUT /users/{id}` — sửa thông tin user (email, tên, mật khẩu)
5. `PUT /users/{id}/role` — phân quyền user
6. `DELETE /users/{id}` — xóa user
7. `GET /admin/problems` — danh sách bài tập GV đã đăng
8. `GET /admin/problems/{id}/detail` — chi tiết 1 bài
9. `DELETE /admin/problems/{id}` — xóa bài
10. `GET /admin/all-classes` — danh sách lớp (chỉ xem)
11. `PUT /admin/classes/{id}/teacher` — gán GV cho lớp
12. `GET /admin/classes/{id}/progress` — tiến độ lớp
13. `GET /admin/all-assignments` — danh sách bài giao (chỉ xem)
14. `DELETE /admin/assignments/{id}` — xóa giao bài
15. `GET /admin/submissions` — danh sách bài nộp
16. `GET /admin/contests` — danh sách contest
17. `GET /users/{id}/activity` — hoạt động của user
18. `GET /ops/queue` + `/ops/workers` + `POST /ops/runs/{id}/requeue` — vận hành

### Frontend web `/ops` (đã đúng)

Trang admin web hiện tại **ĐÃ GỌI ĐÚNG** các endpoint trên và có đầy đủ 6 mục:

1. **Tổng quan** — dashboard với số liệu + quick link
2. **Người dùng** — danh sách + chi tiết + tạo/sửa/xóa/phân quyền
3. **Bài tập + Được giao** — 2 bảng: bài tập (chỉ xem + xóa) và bài giao (chỉ xem + xóa)
4. **Tiến độ** — nhập class_id xem bảng tiến độ (chỉ xem)
5. **Kỳ thi** — danh sách contest + leaderboard (chỉ xem)
6. **Vận hành** — queue, workers, requeue

## Vai trò admin (theo yêu cầu)

**Admin KHÔNG làm thay giáo viên:**
- KHÔNG tạo bài tập (do GV làm ở `/teacher`)
- KHÔNG giao bài (do GV làm)
- KHÔNG chấm điểm/nhận xét (do GV làm)
- KHÔNG tạo lớp mới (có thể để GV tự tạo, hoặc admin tạo rồi gán GV)

**Admin CHỈ quản trị hệ thống:**
- Quản lý tài khoản (tạo/sửa/xóa/phân quyền)
- Xem danh sách bài tập/lớp/giao bài/contest (chỉ xem + xóa nếu cần dọn dẹp)
- Xem tiến độ lớp (không chấm)
- Vận hành hệ thống (queue, requeue lỗi)

## Những gì cần làm tiếp

Nếu bạn thấy **"giao diện không đúng"**, hãy cho tôi biết **cụ thể mục nào sai**:

1. **Ảnh chụp màn hình** mục đó
2. **URL** (ví dụ `/ops`, đang ở mục nào)
3. **Mô tả lỗi** (ví dụ: "mục Bài tập hiện nút Tạo bài mới, không nên có")

---

## Checklist đầy đủ admin

- [x] Backend: endpoint quản lý user đầy đủ
- [x] Backend: endpoint xem bài tập (chỉ xem + xóa)
- [x] Backend: endpoint xem lớp/giao bài/contest (chỉ xem)
- [x] Backend: endpoint vận hành (queue/workers/requeue)
- [x] Web: trang `/ops` gọi đúng endpoint
- [x] Web: 6 mục admin (tổng quan, user, bài tập+giao bài, tiến độ, kỳ thi, vận hành)
- [ ] Mobile: cập nhật `OpsScreen.tsx` gọi endpoint mới (chưa làm)
- [ ] Kiểm tra lại giao diện web admin với ảnh chụp cụ thể

---

**Kết luận:**

Code backend + web admin **ĐÃ ĐÚNG**. Nếu bạn vẫn thấy sai, hãy **chụp màn hình + cho biết URL cụ thể** để tôi sửa đúng chỗ.
