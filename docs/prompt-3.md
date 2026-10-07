# Báo cáo Prompt 3 — 06/10/2026

Đã kết nối quản trị vào Courses/Menu hiện có, dùng dữ liệu Supabase và schema/RLS hiện tại. Không cần migration mới. Không thay đổi luồng Auth, mật khẩu mặc định, mandatory password hoặc single-session.

**Chưa nghiệm thu toàn bộ:** signup của Supabase vẫn bật trong lần kiểm tra gần nhất; Browser runtime không có browser (`[]`), nên chưa xác minh tương tác và responsive. PASS bên dưới chỉ áp dụng đúng lớp kiểm thử được nêu.

## 1. Authentication

| Hạng mục | Kết quả và bằng chứng |
| --- | --- |
| Student email/password | PASS HTTP: tài khoản được action Admin tạo đăng nhập bằng mật khẩu mặc định |
| Admin username/password | PASS HTTP qua action đăng nhập thật |
| Must change password | PASS HTTP redirect và hosted RLS không trả catalog/menu trước đổi mật khẩu |
| Change password | PASS HTTP: sai mật khẩu hiện tại không đổi cờ; đổi đúng bỏ cờ; mật khẩu mới đăng nhập được, mật khẩu cũ bị từ chối |
| Single session | PASS HTTP cho Admin và Student: phiên mới làm phiên cũ bị redirect; DB test kiểm tra JWT cũ và logout cũ không phá phiên mới |
| Logout | PASS HTTP: xóa phiên, trang riêng chuyển về login |
| Google OAuth removed | PASS audit source và HTTP callback 404; Google provider tắt |
| Public signup | CHƯA ĐẠT cấu hình hosted: `signupDisabled=false`. Không có UI/action signup; cần tắt trong Dashboard |

Realtime notification, cookie trong trình duyệt và thao tác form thực tế chưa được kiểm thử bằng browser. Kiểm thử HTTP dùng cookie jar riêng cho từng phiên và chạy server actions từ production build.

## 2. Student

| Hạng mục | Kết quả |
| --- | --- |
| Courses, teacher/course navigation, Lesson, Menu | PASS HTTP có session Student; không có controls CRUD trong HTML |
| All Subjects / My Courses | Giữ implementation Prompt 2; quyền subject/teacher/combined được DB test, chưa click kiểm tra tab |
| Chapter accordion | Đã triển khai, chưa kiểm thử keyboard/click browser |
| Materials | PASS test URL Drive/YouTube và hosted CRUD dữ liệu; chưa kiểm tra phát video/quyền file trên Drive |
| Progress | PASS action hoàn thành thật và đọc persisted row; DB test unique lesson count, isolation INSERT/UPDATE/DELETE |
| Nội dung không có quyền | PASS HTTP trả thông báo từ chối, không lộ tiêu đề khóa học thử |

## 3. Admin

| Hạng mục | Kết quả |
| --- | --- |
| Subject CRUD | PASS create/read/update/delete qua server actions + kiểm tra persisted DB |
| Teacher CRUD | PASS tương tự, gắn subject theo ngữ cảnh |
| Course CRUD | PASS tương tự, gắn teacher |
| Chapter CRUD | PASS tương tự, validation thứ tự |
| Lesson CRUD | PASS tương tự, validation thứ tự |
| Material CRUD | PASS tương tự, PDF Drive; test validation các tổ hợp video/URL |
| Menu CRUD | PASS tương tự, validation giá không âm và giới hạn precision |
| Student creation | PASS hosted Auth/profile/access, STUDENT + must_change_password=true; test orchestration tình huống lỗi/race/retry |
| Subject access / Teacher access | PASS action thật; thêm lại không trùng access, giữ mật khẩu đã đổi |
| Revoke access | PASS action thật: giữ account/progress; còn grant khác thì vẫn đọc course, hết grant thì bị từ chối |
| Cascade | PASS PostgreSQL cô lập: xóa subject kéo theo teacher/course/chapter/lesson/material/access/progress |

Dialog native có label/title, xác nhận xóa/thu hồi, pending, thông báo lỗi/thành công; input controlled giữ nội dung khi lỗi. Danh sách học sinh có tìm email/ngày cấp quyền và chỉ quản lý quyền trực tiếp. Revalidation cập nhật dữ liệu; xóa chuyển về trang cha. Chưa đánh dấu các tương tác dialog là PASS browser.

## 4. Security

| Hạng mục | Kết quả |
| --- | --- |
| RLS | PASS test PostgreSQL cả 12 bảng; hosted Student INSERT/PATCH/DELETE cả 7 bảng nội dung đều bị chặn |
| Server authorization | PASS gọi trực tiếp action tạo subject/xóa course/tạo hoặc cấp quyền Student bằng session Student: bị từ chối, DB không thay đổi |
| Service role protected | PASS audit: factory có `server-only`; quét 31 file `.next/static` không có giá trị service-role key; `.env.local` được gitignore |
| Student cannot admin | PASS action + hosted RLS; role spoof bị chặn |
| Student progress isolation | PASS DB INSERT/UPDATE/DELETE; hosted INSERT giả student_id bị chặn |
| Must-change-password API protection | PASS hosted RLS đọc subjects/teachers/courses/chapters/lessons/materials/menus đều rỗng trước đổi mật khẩu |
| Anonymous | PASS HTTP route redirect và DB quyền truy cập cả 12 bảng bị từ chối |
| Orphans | PASS FK/cascade tests, audit hosted không có Auth/profile mồ côi |

Server parse whitelist, không truyền FormData tùy ý vào DB. Kiểm tra UUID, parent tồn tại và đúng quan hệ của row; ignore role/id/parent trong form. Materials chỉ HTTPS, host đúng provider, không credential/port tùy ý. CRUD bình thường dùng session RLS, không dùng service-role bypass. Không lưu plaintext password trong bảng ứng dụng, không thêm signup/reset email/OAuth.

## 5. Quality

| Hạng mục | Kết quả |
| --- | --- |
| Typecheck | PASS `npm run typecheck` |
| Lint | PASS `npm run lint` |
| Production build | PASS `npm run build` |
| Tests | PASS 28: database 13 (gồm test bao), Auth 6, Learning 5, Admin validation 4 |
| HTTP smoke/integration | PASS `scripts/test-hosted.mjs`: production server + Supabase thật, không mock |
| Responsive 375/768/1440 | CHƯA KIỂM CHỨNG: browser runtime không khả dụng |
| UI click/focus/modal/media | CHƯA KIỂM CHỨNG vì cùng giới hạn browser |

Test hosted tạo fixture có tên riêng, không sửa tài khoản/nội dung hiện có; đã dọn ID fixture trong finally. Audit sau kiểm thử xác nhận không còn Auth user fixture. Không reset DB, không thay đổi Auth configuration, không deploy.

## File của Prompt 3

Tạo:

- `lib/admin-validation.ts`, `types/admin.ts`.
- `services/admin-mutations.ts`, `app/(lms)/admin-actions.ts`.
- `components/admin/{dialog,record-controls,record-dialog,student-list,curriculum-editor,material-editor,mutation-notice}.tsx`.
- `tests/admin.test.mjs`, `scripts/test-hosted.mjs`, `docs/prompt-3.md`.

Sửa:

- Các page Courses, teacher, course, lesson, menu; layout LMS và `app/globals.css`.
- `components/learning/course-view.tsx`, `components/learning/lesson-workspace.tsx`, `components/add-student-form.tsx`.
- `services/students.ts`, `app/(lms)/courses/actions.ts` thêm thông báo grant đã tồn tại và refresh subtree.
- `services/admin.ts` bỏ utilities không còn dùng (delete/list Student cũ); thu hồi quyền không xóa Auth user.
- `tests/database.test.mjs`, `package.json`, `README.md`.

## Phần cần xác nhận trước vận hành

1. Tắt **Allow new users to sign up** trong Supabase Dashboard và chạy lại `npm run check:auth` để thấy `signupDisabled=true`. Service-role key không có quyền sửa cấu hình này.
2. Có browser khả dụng để chạy đầy đủ Login/Change Password/Courses/Lesson/Menu/dialog Admin/danh sách học sinh ở 375, 768, 1440px. Kiểm tra overflow, focus/Tab/Escape, double-submit, giữ form khi lỗi, refresh sau mutation và playback với file thật.

Các giới hạn này không được thay bằng PASS suy đoán từ build hoặc HTTP.
