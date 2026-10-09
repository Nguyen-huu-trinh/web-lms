# Cập nhật đăng nhập học sinh

Đọc [hướng dẫn chuyển sang tên đăng nhập](docs/student-usernames.md) và chạy migration `202610070001_student_usernames.sql` trước khi sử dụng phiên bản mới.

Khối môn học: chạy lần lượt `202610090001_subject_grade.sql`, `202610100001_grades.sql`, `202610100002_custom_grades.sql` trong `supabase/migrations/`. ADMIN chọn **Thêm khối**, nhập tên tùy ý, sau đó **Thêm môn học** và chọn khối đã tạo. Mã khối mới được sinh tự động; danh sách khối và bộ lọc đọc từ bảng `grades`, không giới hạn ba giá trị cũ. Migration giữ nguyên khối và môn học hiện có, bỏ mặc định `subjects.grade` để môn mới bắt buộc chọn khối tồn tại. Không thể xóa khối đang có môn học. Học sinh chỉ được đọc; hệ thống chưa có tài khoản TEACHER riêng.

# LMS — Courses, Lessons và quản trị

Giao diện đã được redesign theo Modern Education SaaS với xanh dương–bạc, giữ nguyên business logic. Xem [báo cáo redesign](docs/ui-redesign.md) về design system, các màn hình và phạm vi kiểm thử.

Courses/Lesson/Progress/Menu và các chức năng quản trị đã được kết nối Supabase. Xem [báo cáo Prompt 3](docs/prompt-3.md) để biết phạm vi, kết quả kiểm thử thực tế và các điều kiện vận hành còn chờ.

Next.js App Router + TypeScript + Tailwind + Supabase PostgreSQL/Auth/Realtime. Student đăng nhập bằng **username/password**, Admin bằng **username/password**. Teacher chỉ là dữ liệu thuộc môn học. Không có đăng ký công khai, quên mật khẩu hay dashboard Admin riêng. Google Drive và YouTube vẫn được giữ làm nguồn tài liệu.

## Chạy dự án

```powershell
npm install
# Chỉ copy nếu chưa có .env.local; không ghi đè cấu hình hiện tại.
Copy-Item .env.example .env.local
npm run dev
```

Ba biến cần thiết:

| Biến | Mục đích |
| --- | --- |
| NEXT_PUBLIC_SUPABASE_URL | URL project |
| NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY | Publishable key |
| SUPABASE_SERVICE_ROLE_KEY | Server-only: tạo Auth user, tra username, kích hoạt phiên, cấp quyền |

`NEXT_PUBLIC_SITE_URL` không còn được sử dụng và đã bỏ khỏi mẫu cấu hình. Không có Client ID/Secret hay biến môi trường cho đăng nhập qua nhà cung cấp bên ngoài. Không commit `.env.local`; không đưa service-role key vào client.

## Migration — không reset database

Giữ nguyên migration lịch sử `supabase/migrations/202610060001_lms_foundation.sql`.

**Project đã chạy Prompt 1:** chạy duy nhất file mới `supabase/migrations/202610060002_password_auth.sql` trong Supabase SQL Editor. **Project hoàn toàn mới:** chạy `001` rồi `002` theo thứ tự. Không chạy lại `001` trên schema đã có.

Nếu đã quản lý migration bằng Supabase CLI chính thức và link đúng project:

```powershell
supabase db push
```

Nếu từng áp dụng bằng SQL Editor và sau đó chuyển sang CLI, đồng bộ lịch sử migration đã áp dụng bằng `supabase migration repair <version> --status applied` trước khi push. Không chạy `db reset` trên project thật.

Migration mới thêm:

- `profiles.must_change_password NOT NULL DEFAULT true`; Admin hiện có được đặt `false`.
- `profiles.provisioned_by_admin NOT NULL DEFAULT false`. Student được cấp quyền từ Prompt 1 được giữ trạng thái đã cấp; tài khoản tự tạo ngoài luồng Admin không được kích hoạt phiên LMS.
- Trigger trên `auth.users.encrypted_password`: khi mật khẩu hiện có thực sự đổi, đặt `must_change_password=false` trong cùng transaction. Không lưu/copy mật khẩu hay hash vào profiles. Không có API cho Student tự bỏ cờ này.
- RLS chặn catalog, nội dung, menu, access và progress trước khi đổi mật khẩu. Student vẫn đọc được profile của mình và trạng thái phiên để đổi mật khẩu/đăng xuất.
- RPC `find_student_account` và `grant_student_access` chỉ cho `service_role`. RPC cấp quyền kiểm tra lại Admin và session, thực hiện profile + access trong một transaction, không nâng role của Student và không chuyển Admin thành Student.

## Supabase Dashboard bắt buộc

1. **Authentication → Sign In / Providers:** bật Email/password; tắt Google và mọi nhà cung cấp không sử dụng.
2. **Authentication → General configuration:** tắt **Allow new users to sign up**; tắt anonymous sign-in. Đây là cấu hình cần thiết để chặn cả lời gọi trực tiếp đến Supabase Auth signup, ngoài việc ứng dụng không có UI/action đăng ký. Admin API `createUser()` vẫn là luồng cấp tài khoản từ server.
3. Mật khẩu mặc định theo yêu cầu là `123456`. Policy Auth phải chấp nhận mật khẩu này khi tạo tài khoản (tối thiểu 6 ký tự; policy bắt ký tự đặc biệt/chặn mật khẩu đã lộ có thể từ chối). Ứng dụng không tự thay đổi policy, không tự chọn mật khẩu khác khi API từ chối. Mật khẩu mới được kiểm tra tối thiểu 6 ký tự và Supabase kiểm tra policy thực tế; không cho đổi về `123456` trong form.
4. Bật **Require current password when changing password** nếu có. Server vẫn xác thực mật khẩu hiện tại bằng client tạm để không phụ thuộc cấu hình này, và gửi `current_password` vào `updateUser()`. Nếu bật reauthentication qua nonce cho phiên cũ, người dùng cần đăng xuất/đăng nhập lại trước khi đổi; ứng dụng không gửi email recovery.
5. Giữ publication Realtime cho `active_sessions`. Ứng dụng dùng single-session riêng trong RLS; không cần bật thêm chính sách single-session gốc của Supabase (client tạm xác thực mật khẩu không được kích hoạt làm phiên LMS).
6. Không cần OAuth callback/Google Cloud. Có thể xóa redirect callback cũ khỏi Dashboard.

Tài liệu tham chiếu: [Supabase Auth configuration](https://supabase.com/docs/guides/auth/general-configuration), [Password security/current password](https://supabase.com/docs/guides/auth/password-security), [Admin createUser](https://supabase.com/docs/reference/javascript/auth-admin-createuser).

## Tạo Admin đầu tiên

Trong **Authentication → Users → Add user**, tạo email/password và xác nhận email. Trigger tạo profile. Chạy SQL Editor cho đúng UUID vừa tạo:

```sql
update public.profiles
set role='ADMIN', username='admin_lms', must_change_password=false
where id='UUID_AUTH_USER';
```

Username duy nhất, chữ thường, 3–50 ký tự `a-z`, `0-9`, `_`. Đăng nhập bằng username và mật khẩu của Auth user. Mật khẩu chỉ được Supabase Auth quản lý. Existing Admin không bị yêu cầu đổi mật khẩu ngoài ý muốn.

## Admin thêm học sinh

Ở `/courses`, Admin có nút chung “+ Thêm học sinh”, chọn Môn học/Giáo viên và email. Môn đang chọn và mỗi giáo viên có nút thêm theo ngữ cảnh (chỉ nhập email) và “Xem học sinh”. Danh sách giáo viên hiển thị **quyền trực tiếp**; quyền kế thừa được quản lý tại môn học. Danh sách có tìm email, ngày cấp quyền và xác nhận thu hồi. Thu hồi chỉ xóa access, giữ tài khoản và tiến độ; quyền từ nguồn khác vẫn có hiệu lực.

Server xác thực phiên và role ADMIN trước mọi thao tác:

1. Chuẩn hóa email về chữ thường, kiểm tra định dạng và target tồn tại.
2. Tra cứu Auth và profiles theo email chính xác, không phân biệt hoa thường.
3. Chưa tồn tại: `auth.admin.createUser({ email, password: '123456', email_confirm: true })`. Student không cần xác nhận email hay tự đăng ký.
4. Đã tồn tại: tái sử dụng ID, **không gọi API đổi mật khẩu**, không đặt lại `must_change_password`.
5. RPC cập nhật profile và upsert đúng `student_subject_access` hoặc `student_teacher_access`. Unique constraints làm việc cấp lại quyền trở thành thao tác an toàn.

Nếu hai request tạo cùng email, lỗi trùng từ Auth được xử lý bằng tra cứu lại. Auth creation và Postgres không thể chung transaction: nếu Auth đã tạo nhưng bước cấp quyền lỗi, UI báo rõ và Admin thử lại sẽ dùng đúng tài khoản đó, không tạo lại/reset password; không xóa tài khoản có thể đã được request khác sử dụng. Không có mô hình pending student.

Email của Admin, record trùng, account không có password hoặc profile thiếu Auth user bị từ chối để kiểm tra thủ công. Không tự demote Admin, không tự sửa mật khẩu tài khoản cũ.

## Đăng nhập và đổi mật khẩu

- Student nhập email/password. Server kiểm tra profile STUDENT được Admin cấp, kích hoạt session mới, rồi chuyển đến `/change-password` nếu cờ bắt buộc đang bật.
- Admin vẫn nhập username/password; role được kiểm tra server-side.
- `requireUser()` bảo vệ mọi trang/action LMS; RLS cũng chặn trực tiếp Data API trước khi đổi mật khẩu.
- `/change-password` nằm ngoài layout LMS để không bị vòng lặp redirect. Cả Admin và Student có thể dùng trang này; form gồm mật khẩu hiện tại, mật khẩu mới, nhập lại mật khẩu mới.
- Mật khẩu hiện tại được xác thực bằng một client Auth tạm, không ghi cookie, không thay phiên LMS. Kiểm tra lại phiên chính trước `client.auth.updateUser({ password, current_password })`; luôn signOut phiên tạm theo scope local.
- Chỉ khi Auth cập nhật thành công, trigger mới bỏ cờ. Sau đó chuyển `/courses?password=changed` và hiển thị “Đổi mật khẩu thành công.”
- Không có route `/register`, `/forgot-password`, callback OAuth hay action gửi email recovery.

Single-device giữ cách hoạt động của Prompt 1: một `active_sessions`/user, Realtime + polling 15 giây/khi focus; phiên cũ bị chặn bằng RLS, báo “Tài khoản đã đăng nhập ở thiết bị khác” rồi về Login. Một lần đăng nhập mới thay phiên cũ cho cả hai role. Các tab cùng trình duyệt chia sẻ cookie; cơ chế này khóa theo phiên Auth, không theo từng tab độc lập.

## Tài khoản cũ

Chạy `supabase/audit_legacy_accounts.sql` trong SQL Editor để liệt kê record cần xử lý: profile thiếu Auth user, Auth user thiếu profile, Student không có password và email profile bị trùng. Script chỉ đọc và không xuất hash/mật khẩu.

Profile hiện tại có FK tới Auth, nên trường hợp thiếu Auth thường chỉ có ở dữ liệu cũ khác schema. Tài khoản trước đây chỉ dùng nhà cung cấp bên ngoài cần quy trình chuyển đổi được quyết định riêng; chức năng “thêm lại học sinh” sẽ không tự đặt password. Không tự gộp/xóa record hoặc reset mật khẩu hiện có.

## Kiểm tra

Cần Node.js >=22.18 cho test TypeScript trực tiếp.

```powershell
npm run typecheck
npm run lint
npm run test:db
npm run test:auth
npm run test:learning
npm run test:admin
npm run build
npm run check:auth
```

- `test:db`: PGlite chạy **cả hai migration** trên PostgreSQL cô lập; kiểm tra Admin cũ, password flag/trigger, RLS trước/sau đổi password, provisioning service-only, transaction rollback, idempotency, quyền teacher/subject, giả role và phiên cũ.
- `test:auth`: orchestration thật với IO giả lập: tạo mới đúng `123456`, thêm lại không tạo/reset password, lỗi đồng thời, retry sau lỗi grant, account cũ và validation.
- `check:auth`: kiểm tra chỉ đọc cấu hình và account trên project trong `.env.local`; không in secrets/email/password, không ghi dữ liệu. Chẩn đoán lỗi/các UUID cần rà soát.
- Build dùng Google Fonts từ bộ khung, cần mạng khi font chưa được cache; đây không phải chức năng đăng nhập.

Kết quả Prompt 3: typecheck/lint/build đạt; 28 test tự động đạt (13 database gồm test bao, 6 Auth, 5 Learning, 4 Admin validation). Kiểm thử HTTP gọi thật các server action và Supabase đã kiểm tra đăng nhập hai role, bắt buộc đổi mật khẩu, CRUD, cấp/thu hồi quyền, tiến độ, Student không thể gọi action Admin và single-session. Xem báo cáo để phân biệt kiểm thử HTTP/RLS với tương tác trình duyệt.

Kiểm tra project thật ngày 06/10/2026: Email provider bật, Google tắt, migration `002` đã sẵn sàng, **signup còn bật**. Cần tắt trong Dashboard trước khi vận hành. Không có profile thiếu Auth hoặc Auth thiếu profile trong lần audit. Kiểm thử hosted chỉ tạo fixture riêng rồi xóa theo đúng ID; không chỉnh sửa tài khoản/nội dung sẵn có.

Checklist nghiệm thu (các luồng HTTP đã kiểm tra trong báo cáo; thao tác bằng trình duyệt vẫn cần xác minh):

| Trường hợp | Kết quả cần xác nhận trên Supabase thật |
| --- | --- |
| Admin thêm email mới theo subject/teacher | Auth user + profile STUDENT + access; password `123456` |
| Student đăng nhập lần đầu | Tới change-password; Courses/Data API chưa đọc được nội dung |
| Sai current password hoặc password mới không khớp | Không đổi password/cờ/session |
| Đổi đúng password | Cờ false, tới Courses, thông báo thành công |
| Logout/login lại | Password mới được chấp nhận, password cũ bị từ chối |
| Admin thêm lại email vào môn khác | Cùng user ID, giữ password mới và cờ false, thêm access |
| Gọi signup trực tiếp bằng publishable key | Auth từ chối do cấu hình tắt signup |
| Student gọi mutation quản trị/đổi role | Server/RLS từ chối |
| Admin đăng nhập username/password | Thành công |
| Hai trình duyệt đăng nhập cùng tài khoản | Phiên cũ bị thay; áp dụng cả Admin/Student |

Các test cục bộ không thay thế kiểm thử password/token/cookie/Realtime của hosted Supabase. Service-role key không cấp quyền chạy DDL hoặc đổi cấu hình Auth Dashboard, nên migration/config trên project cần được áp dụng bằng SQL Editor hoặc CLI đã được cấp quyền phù hợp.

## File thay đổi trong lần chuyển Auth này

**Sửa:** `app/login/actions.ts`, `app/login/page.tsx`, `services/auth.ts`, `types/database.ts`, `proxy.ts`, `app/(lms)/layout.tsx`, `app/(lms)/courses/page.tsx`, `.env.example`, `.env.local` (chỉ bỏ biến URL callback không còn dùng), `package.json`, `tests/database.test.mjs`, `README.md`.

**Tạo:** `supabase/migrations/202610060002_password_auth.sql`, `supabase/audit_legacy_accounts.sql`, `lib/auth-validation.ts`, `services/students.ts`, `services/student-provisioning-core.ts`, `app/(lms)/courses/actions.ts`, `components/add-student-form.tsx`, `app/change-password/actions.ts`, `app/change-password/page.tsx`, `components/change-password-form.tsx`, `tests/auth.test.mjs`, `scripts/check-auth-config.mjs`.

**Xóa:** `app/auth/callback/route.ts`.

Không sửa migration lịch sử và không reset database. Prompt 3 dùng schema/FK/RLS hiện có, không cần migration mới. Khi deploy Vercel, dùng ba biến môi trường hiện tại và kiểm tra cấu hình Auth trước khi vận hành.

## Quản trị và học tập

- `/courses`: chọn môn; Admin thêm/sửa/xóa môn và giáo viên, tạo học sinh, cấp và thu hồi quyền.
- `/courses/teachers/[teacherId]`, `/courses/[id]`: danh sách khóa học; Admin CRUD khóa học/chương/bài học, sửa thứ tự chương và bài.
- `/lessons/[id]`: video, mục lục, tài liệu; Student đánh dấu hoàn thành; Admin sửa/xóa bài và quản lý PDF Google Drive, video Google Drive/YouTube trong tab Tài liệu.
- `/menu`: Student chỉ đọc; Admin thêm/sửa/xóa món và giá.
- Form kiểm tra dữ liệu ở server, giữ nội dung khi lỗi, có trạng thái đang gửi/thành công và xác nhận xóa. Xóa nội dung áp dụng FK cascade hiện có; quyền và tiến độ liên quan có thể bị xóa theo.
- Các quyền được kiểm tra trong server actions và RLS, không chỉ dựa vào nút hiển thị. Student không được tự gán role, cấp access hoặc sửa catalog.

## Kiểm thử tích hợp hosted

Sau `npm run build`, chạy server ở một terminal:

```powershell
npm run start -- --port 3101
```

Ở terminal khác:

```powershell
$env:LMS_TEST_URL='http://localhost:3101'
node scripts/test-hosted.mjs
```

Script này **có ghi dữ liệu** trên Supabase được cấu hình: tạo tài khoản/content thử có định danh riêng, gọi action bằng HTTP, kiểm tra dữ liệu persist và phân quyền, rồi dọn chính xác fixture trong `finally`. Dùng project test/staging khi chạy lại. Không ngắt tiến trình giữa chừng; nếu cleanup báo lỗi, xử lý các ID được báo. Script phụ thuộc manifest action của bản build Next hiện tại; không phải kiểm thử click/keyboard/visual.

Browser của môi trường triển khai không khả dụng. Chưa xác minh modal, focus, video/PDF thực tế và responsive 375/768/1440px bằng trình duyệt. Chưa coi nghiệm thu toàn bộ hoàn thành cho đến khi các mục này và cấu hình tắt signup được xác nhận.

## Giao diện danh mục khóa học

Trang `/courses` dùng thanh khối ngang, danh sách môn và thẻ giáo viên; điều hướng gồm Tất cả khóa học, Khóa học của tôi và Bảng giá. Nút Vào học kiểm tra quyền trên máy chủ mỗi lần bấm; từ chối quyền mở dialog và không chuyển trang. Đường dẫn trực tiếp tới giáo viên/khóa học cũng được kiểm tra quyền.

ADMIN dùng các icon thêm/sửa/xóa/cấp quyền. Menu Quản lý khối cho phép đổi tên, xóa khối rỗng và thêm học sinh vào các môn hiện có trong khối. Quyền được lưu theo môn; môn tạo sau phải được cấp quyền riêng. Khối có môn học không thể xóa.

Thứ tự khối: chạy migration `supabase/migrations/202610100003_grade_order.sql` trước khi triển khai. ADMIN nhập **Thứ tự hiển thị** trong hộp thoại tạo/sửa khối (số nguyên từ 0, nhỏ hơn đứng trước; trùng số thì theo tên và mã). Khối cũ mặc định thứ tự 0. Khi vào `/courses` không chỉ định khối, học sinh thấy danh mục của khối đầu tiên theo thứ tự này; bộ lọc mặc định là Tất cả khóa học. Đường dẫn có `grade` hợp lệ vẫn mở khối được chỉ định và quyền vào học vẫn được kiểm tra.

Trang giáo viên: chạy migration `supabase/migrations/202610100004_teacher_status.sql` trước khi triển khai. Bấm Vào học/Bắt đầu học trên thẻ giáo viên mở trang hồ sơ và danh sách khóa học; mỗi khóa mở `/courses/[id]` để xem nội dung. ADMIN sửa trường **Trạng thái** (tối đa 2.000 ký tự) ngay trên thẻ giáo viên; đây là nội dung thông báo, không thay đổi quyền truy cập. Trên điện thoại, thông tin giáo viên và danh sách khóa được xếp dọc.
