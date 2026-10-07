# Redesign LMS — Modern Education SaaS

Ngày triển khai: 06/10/2026. Thay đổi thuộc lớp giao diện và tương tác trình bày; không sửa services, repositories, server actions, schema/migrations, RLS, SessionGuard hoặc công thức progress. Không cài dependency mới, không thêm dữ liệu giả vào giao diện.

## Design system

Định nghĩa trong `app/globals.css`:

| Thành phần | Thiết kế |
| --- | --- |
| Primary / hover | `#2563EB` / `#1D4ED8` |
| Primary light | `#EFF6FF` |
| Nền / surface | `#F4F7FB` / trắng |
| Text / secondary | `#0F172A` / `#64748B` |
| Silver / border | `#E2E8F0` / `#DCE4EE` |
| Accent progress | Cyan `#06B6D4`, gradient tiết chế trên thanh tiến độ |
| Status | Success `#15803D`, warning `#B45309`, error `#B91C1C` |
| Font | Giữ Geist và cấu hình font hiện có; fallback Arial/sans-serif |
| Typography | Page title 28–36px, section 20–26px, body 14–15px, caption 11–13px |
| Buttons | Primary, secondary, ghost, destructive, completed; hover/focus/disabled/pending |
| Shape | Card 16px, input/button 9px, dialog 18px; viền bạc, shadow nhẹ |
| Layout | Container 1320px; menu 1040px; form password 480px; dialog tối đa 560px |
| Motion | Transition 180–220ms, dialog xuất hiện nhẹ, spinner chỉ khi chờ; tôn trọng reduced motion |

## Pages redesigned

- **Login:** desktop hai vùng giới thiệu/đăng nhập; mobile một cột. Tabs Học sinh/Quản trị viên hỗ trợ phím mũi tên, Home/End. Giữ email/password và username/password; hướng dẫn rõ Admin dùng username. Submit có trạng thái đang đăng nhập.
- **Change password:** card bảo mật đồng bộ, thông báo bắt buộc đổi mật khẩu, focus/error/pending rõ ràng; giữ action và SessionGuard.
- **Courses:** title/toolbar gọn, segmented filter, subject sidebar nền nhẹ, active xanh dương; teacher rows có avatar chữ cái và chevron. Quản trị nhóm thành toolbar phụ, giữ toàn bộ role gates.
- **Teacher / Course:** thông tin giáo viên, count thật, CTA và danh sách khóa học; không ép chiều cao khung trống. Progress và accordion theo cùng thiết kế.
- **Chapter / Lesson list:** số chương, chevron, expanded/hover/selected; icon trạng thái hoàn thành, thứ tự hiện có được giữ.
- **Lesson workspace:** video 16:9, empty player nền navy, nút hoàn thành có trạng thái; desktop video/sidebar, tablet/mobile xếp dọc. Panel có scroll riêng, tabs và lesson active rõ ràng. Giữ URL và cách mở Drive/YouTube.
- **Materials:** icon file/video nét thống nhất, provider, link mở tài liệu và controls quản trị gọn.
- **Menu:** bảng trắng header bạc, tên món và giá căn rõ, hover rows; controls Admin và empty state cùng hệ thống.
- **Admin:** tất cả dialog create/edit/delete/revoke, danh sách học sinh và form cấp quyền được đồng bộ. Chọn loại quyền dùng radio cards. Không đổi validation nghiệp vụ/API; giữ HTML validation hiện có, thông báo lỗi/thành công và pending.
- **Loading/error/not-found:** dùng skeleton, empty state, CTA thử lại và surface thống nhất qua shared CSS/components.

## Shared components

Cập nhật Navigation (sticky header, dropdown đóng khi click ngoài/Escape/chọn link), Breadcrumb, EmptyState, CourseProgress, ChapterList, CourseView, LessonWorkspace, Dialog, CurriculumEditor, các form quản trị và thêm học sinh.

Thêm `components/ui/icon.tsx` (SVG nét đơn giản, không thư viện ngoài), `components/ui/submit-button.tsx` (useFormStatus), `components/login-forms.tsx` (tabs trình bày, gọi nguyên action đăng nhập).

Dialog tiếp tục dùng native `showModal()` để quản lý focus và Escape. Role label hiển thị tên vai trò, không hiển thị UUID. SVG trang trí ẩn khỏi screen reader; trạng thái lesson có accessible label.

## Responsive

Rà soát **code/CSS** cho 375, 430, 768, 1024, 1440px:

| Kích thước | Quy tắc đã triển khai |
| --- | --- |
| 375 / 430 | Header gọn, ẩn caption/name/icon nav phụ; toolbar wrap; layout một cột; dialog chừa 16px mỗi bên; font input 16px tránh zoom khi nhập trên mobile |
| 768 | Subject/sidebar 230px + nội dung; Lesson một cột, tabs dưới video; form login hai vùng vừa chiều rộng |
| 1024 | Lesson video + sidebar 320px; padding/container thu gọn |
| 1440 | Container 1320px; Lesson sidebar 360px; Login hai vùng 1080px |

**Chưa xác minh bằng browser tại cả 5 kích thước.** Browser skill đã được thử, runtime báo `No browser is available`, danh sách browser `[]`. Không có ảnh chụp/rendered overflow measurements, không ghi PASS visual. Cần kiểm tra click/focus/modal, các tab, playback và nội dung dài trong browser khi khả dụng.

## Regression

`scripts/test-hosted.mjs` đã chạy với production server và Supabase thật sau redesign:

| Luồng | Kết quả thực tế |
| --- | --- |
| Login Admin / Student | PASS HTTP qua action thật |
| Change password / mandatory gate | PASS HTTP, mật khẩu sai bị từ chối, đổi đúng và đăng nhập lại |
| Single-session / logout | PASS HTTP cho cả hai role |
| Courses / teacher / course / lesson / Menu | PASS authenticated GET; Student không có controls CRUD |
| Access control | PASS gọi trực tiếp action Admin và Supabase INSERT/PATCH/DELETE bằng Student đều bị chặn |
| Materials | PASS persisted CRUD; URL parsing unit tests PASS; chưa xác minh phát media trong browser |
| Progress | PASS action hoàn thành và persisted row; isolation test PASS |
| Admin CRUD | PASS create/read/update/delete cả 7 entity qua action thật |
| Student management | PASS tạo/cấp lại/thu hồi, không reset mật khẩu; giữ account/progress và quyền từ grant khác |

Fixture riêng đã dọn theo đúng ID trong `finally`. Không thay dữ liệu tài khoản/nội dung sẵn có. Các kiểm thử HTTP không thay thế thao tác trên giao diện hoặc Realtime thông báo trong browser.

## Tests

- `npm run typecheck`: PASS.
- `npm run lint`: PASS.
- `node --test tests/*.test.mjs`: **28 PASS**, không bỏ/disable test.
- `npm run build`: PASS. Lỗi encoding BOM của CSS phát hiện trong lần build đầu đã được sửa, build lại thành công.
- `scripts/test-hosted.mjs`: PASS HTTP và hosted RLS, đã cleanup.
- `git diff --check`: PASS; chỉ cảnh báo chuyển đổi line endings của các file có từ trước.

Không thay cấu hình signup, OAuth, Auth hay deploy. Tình trạng cấu hình Supabase được ghi trong báo cáo Prompt 3 vẫn là một hạng mục vận hành riêng.
