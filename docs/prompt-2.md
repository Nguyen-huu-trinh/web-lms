# Prompt 2 — Courses, Lesson, Progress, Menu

## Chức năng

- Courses hai cột Môn học / Giáo viên; lựa chọn active và filter nằm trong URL. “Khóa học của tôi” lấy hợp quyền môn và quyền giáo viên. Danh mục “Tất cả” không cấp thêm quyền nội dung.
- Trang giáo viên có danh sách khóa học, khóa học được chọn, chương dạng accordion, bài học có trạng thái hoàn thành. Dữ liệu sắp xếp bằng `order_index`, sau đó `id` để ổn định thứ tự.
- Trang bài học có breadcrumb đầy đủ, video YouTube/Drive, chọn video khi có nhiều video, fallback mở tab mới; panel Mục lục/Tài liệu chỉ hiện một tab, hỗ trợ phím mũi tên/Home/End.
- PDF chỉ mở Google Drive; không có upload/Storage hay loại material mới. URL iframe được parse/kiểm tra host, không nhúng URL tùy ý.
- Hoàn thành bài chỉ qua nút bấm: trạng thái đang lưu, lỗi có thể thử lại, thành công cập nhật nút/checkmark/progress ngay và revalidate các trang học tập. ID học sinh luôn lấy từ session server.
- Progress chỉ tính lesson của course hiện tại, bỏ ID ngoài course/trùng lặp, course rỗng hiển thị “Chưa có bài học”. Truy vấn phân trang và chia batch ID tránh giới hạn 1.000 dòng hoặc URL query quá dài.
- Menu độc lập, bảng tên món/giá VND. Route `/menus` cũ vẫn dùng được và chuyển sang `/menu`.
- Navigation chung Courses/Menu và menu tài khoản; giữ các control thêm/xem học sinh đã có, không bổ sung workflow CRUD của Prompt 3.
- Có loading skeleton, empty state và lỗi thân thiện; nội dung không có quyền hoặc không tồn tại dùng thông báo chung, không render dữ liệu private.

## Routes

| Route | Vai trò |
| --- | --- |
| `/courses?subject=<id>&filter=mine` | Danh mục và lựa chọn môn/filter |
| `/courses/teachers/[teacherId]` | Mới: giáo viên và khóa học đầu tiên, hoặc empty state |
| `/courses/[id]` | Giữ route cũ: khóa học được chọn và mục lục |
| `/lessons/[id]` | Giữ route cũ: bài học, player và tài liệu |
| `/menu` | Mới: tên món/giá |
| `/menus` | Tương thích URL cũ, redirect `/menu` |

Tất cả route đọc dữ liệu dùng `requireUser()` và Supabase client theo phiên người dùng. Route giáo viên kiểm tra quyền trước khi lấy khóa học. Các truy vấn course/lesson/material được RLS lọc ngay ở database. Không đưa service-role key vào client.

## Database / Auth

**Không tạo migration, không đổi index/RLS/cascade.** Hai migration cũ giữ nguyên. Không sửa service Auth, login/change-password actions hoặc session guard. Proxy chỉ thêm `/menu` vào matcher để refresh cookie như các trang cũ.

Kiểm tra chỉ đọc project thật trong lần này: migration password đã tồn tại; 1 profile / 1 Auth user; Email provider bật, Google tắt. **Signup vẫn bật trong Dashboard**, cần tắt theo hướng dẫn Auth trước đó; Prompt 2 không tự thay đổi cấu hình Auth.

## Files created

- `lib/learning.ts`: kiểm tra UUID, URL provider/embed và tính progress.
- `repositories/pagination.ts`: phân trang truy vấn.
- `components/learning/shared.tsx`: breadcrumb, empty/access-denied, progress.
- `components/learning/navigation.tsx`: navigation và menu tài khoản.
- `components/learning/chapter-list.tsx`: accordion và lesson links.
- `components/learning/course-view.tsx`: giao diện khóa học dùng chung.
- `components/learning/lesson-workspace.tsx`: tabs/player/hoàn thành bài.
- `app/(lms)/courses/teachers/[teacherId]/page.tsx`.
- `app/(lms)/menu/page.tsx`.
- `app/(lms)/loading.tsx`, `error.tsx`, `not-found.tsx`.
- `tests/learning.test.mjs`.
- `docs/prompt-2.md`.

## Files modified

- `repositories/lms.ts`: truy vấn catalog, quyền giáo viên, course/lesson/material/menu, pagination.
- `app/(lms)/layout.tsx`: khung navigation/content/footer; giữ guard.
- `app/(lms)/courses/page.tsx`: giao diện Subject/Teacher; tái sử dụng controls Admin.
- `app/(lms)/courses/[id]/page.tsx`: course view.
- `app/(lms)/lessons/[id]/page.tsx`, `actions.ts`: bài học, progress action và phản hồi UI.
- `app/(lms)/menus/page.tsx`: redirect tương thích.
- `app/globals.css`: bố cục/typography/responsive/focus states.
- `proxy.ts`: thêm matcher `/menu`.
- `package.json`: thêm `test:learning`.
- `README.md`: liên kết báo cáo Prompt 2.

## Kiểm thử

| Kiểm tra | Kết quả |
| --- | --- |
| `npm run typecheck` | PASS |
| `npm run lint` | PASS |
| `npm run build` | PASS |
| `npm run test:db` | PASS — 12 kiểm tra, gồm RLS, first-password gate, quyền teacher/subject, progress chéo tài khoản, phiên cũ |
| `npm run test:auth` | PASS — 6 kiểm tra provisioning/validation |
| `npm run test:learning` | PASS — 5 kiểm tra URL/embed, progress, pagination, UUID |
| HTTP smoke | PASS — 8 URL được bảo vệ chuyển người chưa đăng nhập về Login; hai form đăng nhập hiện có được giữ |
| Browser / responsive tại 375, 768, 1440px | CHƯA XÁC NHẬN — Browser không có phiên khả dụng |

Responsive được triển khai bằng grid `minmax(0,...)`, chiều rộng linh hoạt, wrap text và breakpoint dưới 768px: sidebar xếp trên nội dung; lesson xếp video → thông tin → tabs. Chưa đo overflow trong browser. Chưa kiểm thử tương tác đăng nhập, accordion, tabs, player nhà cung cấp và completion trên tài khoản hosted thật trong lần này. Test database chạy PostgreSQL cô lập, không thay thế kiểm thử trình duyệt/Realtime hosted.

Checklist khi Browser khả dụng: đăng nhập Student đã đổi password; chọn cả hai filter; chuyển môn/teacher/course; refresh deep-link; mở/đóng chương; chuyển tabs; chọn nhiều video; mở PDF (không tự hoàn thành); bấm hoàn thành và quay lại course; thử URL không có quyền; kiểm tra `/menu`; kiểm tra 375/768/1440px với tiêu đề dài; đăng nhập thiết bị thứ hai. Student `must_change_password=true` phải được chuyển về đổi password trước mọi trang học/menu.

Không triển khai Prompt 3; không thêm dữ liệu giả vào production UI/database.
