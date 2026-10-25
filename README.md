# AlgoJudge

## Hệ thống luyện tập và chấm bài lập trình trực tuyến

AlgoJudge là hệ thống cho phép người học chọn bài, soạn mã, chạy thử, nộp bài và nhận kết quả chấm tự động. Giảng viên quản lý bài tập, phiên bản đề, testset, lớp học và chấm lại bài. Quản trị viên theo dõi hàng đợi và worker thực thi.

> **Ngôn ngữ backend chính: PHP.** Dự án kết hợp PHP/Laravel để xây dựng API và worker, đồng thời hỗ trợ nhiều ngôn ngữ bài nộp gồm Python, C++, JavaScript, Java, Go và C.

---

## 1. Thông tin đề tài

**Tên đề tài:** Xây dựng hệ thống luyện tập và chấm bài lập trình trực tuyến AlgoJudge

**Môn học:** Phát triển phần mềm mã nguồn mở

---

## 2. Phạm vi chức năng

### 2.1 Người học

- Đăng ký, đăng nhập và duy trì phiên đăng nhập.
- Xem danh sách bài tập.
- Tìm kiếm và lọc bài theo chủ đề, độ khó.
- Xem đề bài, ví dụ công khai và giới hạn chạy.
- Soạn mã bằng Monaco Editor trên Web hoặc TextInput đa dòng trên Mobile.
- Chọn ngôn ngữ: Python, C++, JavaScript, Java, Go, C.
- Lưu và tải bản nháp.
- Chạy thử với stdin tự nhập.
- Nộp bài với idempotency key chống tạo bài trùng.
- Theo dõi bài nộp bằng SSE trên Web và polling trên Mobile.
- Xem verdict, điểm, attempt, thời gian và kết quả từng ca được phép hiển thị.
- Xem lại mã nguồn đã nộp.
- Xem lịch sử bài nộp và tiến độ học tập.
- Xem streak và gợi ý bài tiếp theo.
- Tham gia contest và xem leaderboard.
- Nhận push notification khi bài được chấm xong nếu đã cấp quyền trên thiết bị.

### 2.2 Giảng viên

- Tạo bài tập.
- Tạo phiên bản đề mới.
- Cập nhật statement, input/output specification và giới hạn.
- Tạo testset tối thiểu 5 ca.
- Chọn checker:
  - `exact`
  - `float`
  - `sorted`
  - `tokens`
  - `regex`
- Đánh dấu ca công khai/kín.
- Đặt nhóm subtask và trọng số.
- Chấm lại bài.
- Đối chiếu các lần chấm.
- So sánh độ tương tự mã nguồn.
- Tạo lớp học.
- Thêm thành viên vào lớp.
- Xem tiến độ lớp.
- Tạo contest.

### 2.3 Quản trị viên

- Xem trạng thái hàng đợi.
- Xem worker đang chạy.
- Requeue run lỗi.
- Xem thống kê theo verdict.
- Xem thông tin cấu hình và hệ thống.
- Các endpoint Ops và thông tin nhạy cảm chỉ dành cho role `admin`.

### 2.4 Bảo mật và chấm bài

- API không chạy mã nộp trong tiến trình Web.
- Worker gọi Docker sandbox riêng cho từng lần chạy.
- Sandbox dùng:
  - `--network none`
  - `--cap-drop ALL`
  - `--read-only`
  - giới hạn CPU/RAM/process
  - user không đặc quyền
  - timeout cứng
- Không trả input/expected output của test case kín.
- Không trả thông tin runner nội bộ cho client.
- Kiểm tra quyền sở hữu bài nộp; user khác nhận `404` thay vì bị lộ dữ liệu.
- Lỗi hệ thống dùng `SYSTEM_ERROR` hoặc `RETRY_PENDING`, không chuyển thành `WRONG_ANSWER`.
- Worker tự thu hồi job hết lease sau crash hoặc timeout.

---

## 3. Kiến trúc và công nghệ

### Backend chính

- PHP 8.4.
- Laravel 13.
- Laravel Sanctum cho token authentication.
- Eloquent ORM.
- Artisan worker: `judge:work`.
- MySQL 8.
- REST API với tiền tố `/api/v1`.
- SSE cho theo dõi bài nộp trên Web.

Thư mục: `backend-laravel/`

### Frontend Web

- Next.js 16.
- React 19.
- TypeScript.
- Tailwind CSS.
- Monaco Editor.
- SSE và polling fallback.

Thư mục: `web-next/`

Các route chính:

- `/` — học bài, soạn mã, chạy thử, nộp bài.
- `/progress` — tiến độ và gợi ý học tập.
- `/contests` — danh sách contest.
- `/contests/{id}` — chi tiết contest và leaderboard.
- `/submissions/{id}` — chi tiết bài nộp.
- `/teacher` — khu giảng viên.
- `/ops` — khu vận hành admin.

### Ứng dụng Mobile

- Expo 51.
- React Native 0.74.
- TypeScript.
- React Navigation.
- Expo SecureStore.
- Expo Notifications.

Thư mục: `mobile/`

Các màn hình chính:

- Login, Forgot.
- Problems.
- Detail.
- History.
- Result.
- Contests, ContestDetail.
- Profile, Progress.
- Assignments (bài được giao).
- Teacher.
- Ops.
- LanguagesStatus.
- AboutDiagnostics.

Entry point: `mobile/index.js` gọi `registerRootComponent` từ `App.tsx`.

### Lưu ý chạy Mobile trên Windows (đường dẫn có dấu)

Metro đọc header `X-React-Native-Project-Root` chỉ ở dạng Latin1 nên
project nằm trong thư mục có dấu/tiếng Việt (ví dụ `Năm 3\Kì 2\...`)
sẽ lỗi `Invalid character in header content`. Cách xử lý khi dev cục bộ:

1. Copy thư mục `mobile/` sang đường dẫn ASCII thuần, ví dụ `C:\ojexpodev`
   (bỏ qua `node_modules`, `.expo` rồi cài lại hoặc copy `node_modules`).
2. Chạy `npx expo start` từ thư mục copy đó.
3. Code chính vẫn sửa ở `mobile/`, xong đồng bộ lại sang bản copy.

### Ngôn ngữ được chấm

| Ngôn ngữ | Image sandbox | File chính | Công cụ chạy/biên dịch |
|---|---|---|---|
| Python | `oj-sandbox-python` | `main.py` | Python 3.12 |
| C++ | `oj-sandbox-cpp` | `main.cpp` | GCC 13, C++17 |
| JavaScript | `oj-sandbox-js` | `main.js` | Node.js 22 |
| Java | `oj-sandbox-java` | `Main.java` | Temurin JDK 17 |
| Go | `oj-sandbox-go` | `main.go` | Go 1.22 |
| C | `oj-sandbox-c` | `main.c` | GCC 13, C17 |

---

## 4. Cấu trúc thư mục

```text
DuAn/
├── backend-laravel/         # Backend Laravel (API, worker, sandbox, dữ liệu mẫu)
├── web-next/                # Frontend Next.js/React/TypeScript
├── mobile/                  # Ứng dụng Expo/React Native
├── docs/                    # Quy tắc chấm và acceptance tests
├── docker-compose.yml       # Các service Docker
├── .env.example             # Cấu hình
├── LICENSE                  # MIT License
└── THIRD_PARTY.md           # Tài nguyên/thư viện tái sử dụng
```

---

## 5. Yêu cầu môi trường

- Windows, Linux hoặc macOS.
- Docker Desktop (Windows/macOS) hoặc Docker Engine + Docker Compose
  (Linux). Kiểm tra: `docker compose version`.
- Git để clone dự án.
- Node.js 20+ và npm — chỉ cần nếu chạy Web Next.js hoặc Mobile
  ngoài Docker. Kiểm tra: `node --version`.
- Expo Go (trên điện thoại) hoặc Android Emulator (trên máy tính)
  — chỉ cần nếu chạy Mobile.

Docker là môi trường chạy chính để bảo đảm MySQL, PHP, worker
và sandbox đồng nhất. Người mới chỉ cần Docker là đủ để chạy
backend + web; Node.js chỉ cần thêm khi làm mobile.

---

## 6. Cài đặt và chạy bằng Docker

Bắt đầu từ thư mục gốc của dự án (nơi có file `docker-compose.yml`).

### 6.1 Clone dự án

```powershell
git clone <url-repo-cua-ban>
cd <thu-muc>
```

### 6.2 Tạo file môi trường

PowerShell:

```powershell
Copy-Item .env.example .env
```

Linux/macOS:

```bash
cp .env.example .env
```

### 6.3 Build image sandbox

Worker gọi sandbox qua Docker, nên phải build 6 image này trước
(nếu thiếu, bài nộp sẽ lỗi hệ thống thay vì được chấm):

```powershell
docker build -t oj-sandbox-python ./backend-laravel/sandbox/python
docker build -t oj-sandbox-cpp ./backend-laravel/sandbox/cpp
docker build -t oj-sandbox-js ./backend-laravel/sandbox/js
docker build -t oj-sandbox-java ./backend-laravel/sandbox/java
docker build -t oj-sandbox-go ./backend-laravel/sandbox/go
docker build -t oj-sandbox-c ./backend-laravel/sandbox/c
```

### 6.4 Khởi động hệ thống

```powershell
docker compose up -d --build
```

Lần đầu mất vài phút để tải image và build. Kiểm tra service:

```powershell
docker compose ps
```

Tất cả phải ở trạng thái `running` (riêng worker hiện `running`
là được, không có port public). Nếu service nào `exited` thì xem
log: `docker compose logs <ten-service> --tail 50`.

Các service chính:

| Service | Vai trò | Địa chỉ |
|---|---|---|
| `db` | MySQL 8 | `localhost:3306` |
| `api` | Laravel backend | `http://localhost:8081/api/v1` |
| `worker` | Worker chấm bài | Không public |
| `web` | Web Next.js | `http://localhost:3001` |

Port có thể đổi qua biến môi trường `LARAVEL_PORT`, `WEB_NEXT_PORT` trong `.env`.

### 6.5 Migration và seed Laravel

```powershell
docker compose exec api php artisan migrate --force
docker compose exec api php artisan db:seed --class=OjSeeder --force
```

Seed tạo sẵn tài khoản teacher/admin mẫu và dữ liệu bài tập.

### 6.6 Mở web và đăng nhập thử

1. Mở `http://localhost:3001` trên trình duyệt.
2. Đăng ký tài khoản student mới, hoặc đăng nhập bằng tài khoản
   mẫu ở mục 7.
3. Chọn một bài, viết code, bấm **Chạy thử** rồi **Nộp bài**
   để kiểm tra cả luồng chấm.

---

## 7. Phân quyền

Seed tạo sẵn 2 tài khoản mẫu (mật khẩu xem trong file seeder):

| Vai trò | Email |
|---|---|
| Teacher | `gv@oj.local` |
| Admin | `admin@oj.local` |

Student không có sẵn — người mới tự đăng ký trên web hoặc mobile.

### Quyền theo vai trò

- Student: học bài, nộp bài, xem kết quả của mình, contest và tiến độ.
- Teacher: thêm quyền quản lý bài, testset, lớp, rejudge, compare và similarity.
- Admin: thêm quyền queue, worker, requeue, statistics và system diagnostics.

Backend luôn kiểm tra role; việc ẩn menu trên giao diện không phải lớp bảo mật duy nhất.

---

## 8. Hướng dẫn sử dụng

### 8.1 Người học trên Web

1. Mở `http://localhost:3001`.
2. Đăng nhập hoặc đăng ký.
3. Tìm bài theo tên, chủ đề hoặc độ khó.
4. Chọn bài và chọn ngôn ngữ.
5. Viết mã bằng Monaco Editor.
6. Nhập stdin nếu muốn chạy thử.
7. Bấm **Chạy thử** để xem stdout/stderr.
8. Bấm **Lưu nháp** để lưu code.
9. Bấm **Nộp bài** để đưa vào hàng đợi.
10. Theo dõi trạng thái qua SSE/polling.
11. Mở submission detail để xem verdict, điểm, từng ca và mã nguồn.
12. Mở **Tiến độ** để xem streak và gợi ý bài tiếp theo.

### 8.2 Người học trên Mobile

Chuẩn bị: Docker đã chạy ở mục 6, máy đã cài Node.js 20+,
Android Emulator đã tạo **hoặc** điện thoại đã cài app Expo Go
(điện thoại phải cùng WiFi với máy tính).

Bước 1 — mở PowerShell tại thư mục `mobile/`
(trong thư mục gốc dự án vừa clone):

```powershell
cd mobile
```

Bước 2 — cài dependencies (chỉ lần đầu, mất vài phút):

```powershell
npm install --legacy-peer-deps
```

Flag `--legacy-peer-deps` là bắt buộc vì `native-stack`
đòi peer `screens` mới hơn bản Expo 51 dùng; bỏ flag sẽ lỗi
`ERESOLVE` và không cài được.

Bước 3 — đặt địa chỉ backend **trong cùng cửa sổ PowerShell**
(mở cửa sổ mới là phải đặt lại; lệnh này không in gì là bình thường):

```powershell
# Android Emulator:
$env:EXPO_PUBLIC_API_URL="http://10.0.2.2:8081/api/v1"
```

Dùng điện thoại thật thì thay bằng IP LAN của máy chạy Docker:

```powershell
$env:EXPO_PUBLIC_API_URL="http://192.168.x.x:8081/api/v1"
```

Muốn biết IP LAN: chạy `ipconfig`, lấy dòng IPv4 Address
của card WiFi (ví dụ `192.168.1.50`).

Bước 4 — chạy Metro (nếu port 8081 bận thì đổi số khác, ví dụ 8086):

```powershell
npx expo start --port 8086
```

Đợi đến khi hiện `Waiting on http://localhost:8086` và mã QR.

Bước 5 — mở app:

- Nhấn `a` để mở trên Android Emulator (phải bật emulator trước).
- Nhấn `w` để mở bản web trên trình duyệt máy tính.
- Quét mã QR bằng Expo Go trên điện thoại thật.

Xử lý sự cố thường gặp:

- `ERESOLVE` khi `npm install`: chạy lại kèm `--legacy-peer-deps`.
- `Invalid character in header ["X-React-Native-Project-Root"]`:
  do đường dẫn project có dấu tiếng Việt; copy thư mục `mobile/`
  sang đường dẫn ASCII thuần (ví dụ `C:\ojexpodev`, bỏ qua
  `node_modules`/`.expo`) rồi chạy Metro từ bản copy đó.
- `JavaScript heap out of memory` khi bundle (máy yếu RAM):
  tắt bớt app nặng/Docker không cần thiết rồi chạy
  `npx expo start --port 8086 --max-workers 1 -c`.
- `"main" has not been registered`: chắc chắn `mobile/index.js`
  tồn tại và `package.json` có `"main": "index.js"`, rồi
  restart Metro (`Ctrl+C` rồi start lại, không chỉ nhấn `r`).
- Nhấn `a` báo `ANDROID_HOME`/thiếu `adb`: sửa biến môi trường
  trỏ đúng SDK (mặc định
  `C:\Users\<ten-user>\AppData\Local\Android\Sdk`),
  mở terminal mới, kiểm tra `adb --version` rồi bật emulator trước.

Ghi chú:

- Token được lưu bằng SecureStore.
- Mobile dùng polling vì React Native không có EventSource mặc định.
- Push notification yêu cầu cấp quyền trên thiết bị.

### 8.3 Giảng viên

1. Đăng nhập bằng tài khoản teacher.
2. Mở `/teacher` trên Web hoặc màn hình Teacher trên Mobile.
3. Tạo bài hoặc tạo version đề.
4. Tạo testset tối thiểu 5 ca.
5. Chọn checker phù hợp.
6. Chấm lại bài nếu cần.
7. Đối chiếu các lần chấm.
8. Kiểm tra similarity.
9. Tạo lớp, thêm thành viên và xem tiến độ.
10. Tạo contest nếu cần.

### 8.4 Admin vận hành

1. Đăng nhập bằng tài khoản admin.
2. Mở `/ops` trên Web hoặc màn hình Ops trên Mobile.
3. Kiểm tra queue.
4. Kiểm tra worker và lease.
5. Requeue run lỗi sau khi xác định nguyên nhân.
6. Không tự ý xóa database hoặc container đang chấm bài.

---

## 9. Hướng dẫn kiểm thử

### 9.1 Unit test Comparator

PowerShell:

```powershell
docker compose exec api php artisan test --filter ComparatorTest
```

Bộ test bao gồm:

- Normalize CRLF.
- Khoảng trắng cuối dòng.
- Exact checker.
- Float checker.
- Sorted checker.
- Tokens checker.
- Regex checker.
- Tổng hợp verdict.
- Subtask score.
- Similarity.

### 9.2 Laravel test suite

```powershell
docker compose exec api php artisan test
```

Các nhóm test gồm:

- Laravel smoke test.
- Lease recovery.
- Retry và `SYSTEM_ERROR`.
- API chưa đăng nhập trả `401`.
- Student không truy cập được admin route, trả `403`.

### 9.3 Kiểm tra syntax PHP

```powershell
docker run --rm -v "${PWD}\backend-laravel:/app" php:8.4-cli php -l /app/routes/api.php
docker run --rm -v "${PWD}\backend-laravel:/app" php:8.4-cli php -l /app/app/Console/Commands/JudgeWorker.php
```

### 9.4 Kiểm tra Web

```powershell
npm --prefix web-next run build
```

Kiểm tra thủ công:

1. Đăng nhập và khôi phục session.
2. Student không mở được `/teacher` và `/ops`.
3. Teacher mở được `/teacher` nhưng không truy cập Ops.
4. Admin mở được `/ops`.
5. Lọc bài, lưu draft, chạy thử, nộp bài.
6. Mở `/submissions/{id}` xem kết quả.
7. Mở `/progress` và `/contests/{id}`.

### 9.5 Kiểm tra Expo TypeScript

```powershell
cd mobile
.\node_modules\.bin\tsc --noEmit
```

Lệnh đọc `tsconfig.json` có sẵn trong `mobile/` (kế thừa
`expo/tsconfig.base`), không cần truyền thêm flag hay liệt kê file.

### 9.6 Năm verdict cơ bản

Dữ liệu mẫu nằm trong `backend-laravel/data/`, gồm các chương trình:

- `ok.py` → `ACCEPTED`.
- `wrong_algo.py` → `WRONG_ANSWER`.
- `syntax_err.py` → `COMPILE_ERROR`.
- `runtime_err.py` → `RUNTIME_ERROR`.
- `infinite.py` → `TIME_LIMIT_EXCEEDED`.

Chi tiết lệnh và minh chứng xem tại [docs/acceptance-tests.md](docs/acceptance-tests.md).

---

## 10. Hai luồng demo nghiệm thu

### Luồng 1: Nộp bài → chấm → xem kết quả

1. Đăng nhập student.
2. Chọn bài Tổng hai số.
3. Chọn Python hoặc Java.
4. Nhập code đúng.
5. Chạy thử.
6. Nộp bài.
7. Theo dõi queue và trạng thái.
8. Xem `ACCEPTED`, điểm và từng test case.

### Luồng 2: Sửa testset → chấm lại → đối chiếu

1. Đăng nhập teacher.
2. Mở `/teacher`.
3. Tạo testset mới tối thiểu 5 ca.
4. Chọn checker.
5. Rejudge submission cũ.
6. Lấy hai run cần so sánh.
7. Dùng chức năng compare.
8. Kiểm tra lịch sử vẫn giữ run cũ và run mới.

---

## 11. Hàng đợi và worker

Worker là thành phần duy nhất được mount Docker socket để gọi sandbox. API không được mount socket.

Xem log Laravel worker:

```powershell
docker compose logs worker --tail 50
```

Khởi động lại worker sau khi sửa code worker:

```powershell
docker compose restart worker
```

Worker hỗ trợ:

- `QUEUED`.
- `RUNNING`.
- Lease 5 phút.
- Retry tối đa 3 attempt.
- `RETRY_PENDING`.
- `SYSTEM_ERROR`.
- Thu hồi job quá hạn lease.
- Ghi kết quả có điều kiện để chống run cũ ghi đè run mới.

---

## 12. An toàn dữ liệu và mã nguồn

- Không commit `.env`.
- Không đưa password thật vào bài tập hoặc test case.
- Không trả test case kín cho client.
- Không mount Docker socket vào API Web.
- Không chạy mã nộp trong PHP request.
- Không dùng `innerHTML` cho dữ liệu người dùng trong Web.
- Dùng prepared statements/PDO hoặc Eloquent.
- Không push remote hoặc tạo Pull Request nếu chưa được chủ dự án yêu cầu.

---

## 13. Tài liệu liên quan

- [Claude.md](Claude.md) — đặc tả và checklist dự án.
- [docs/judge-rules.md](docs/judge-rules.md) — quy tắc so sánh và verdict.
- [docs/acceptance-tests.md](docs/acceptance-tests.md) — phép thử nghiệm thu.
- [CONTRIBUTING.md](CONTRIBUTING.md) — quy tắc đóng góp.
- [THIRD_PARTY.md](THIRD_PARTY.md) — thư viện và tài nguyên tái sử dụng.

---

## 14. Giấy phép

Dự án sử dụng giấy phép MIT. Xem [LICENSE](LICENSE).
