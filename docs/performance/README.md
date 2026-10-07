# Performance Audit

Ngày: 2026-10-07. URL được cung cấp: https://web-lms-chi.vercel.app.
Phạm vi: app, components, services, repositories, Supabase clients, proxy, migrations, package/config, loading, realtime và các bộ test hiện có. Đã đọc tài liệu đi kèm Next.js 16.3.8 trước khi sửa.

## Root causes

Các kết luận dưới đây có bằng chứng từ mã nguồn; chưa phải kết luận từ profiler production.

| Vấn đề | Bằng chứng trước sửa | Thay đổi | Tác động dự kiến | Rủi ro / kiểm tra |
| --- | --- | --- | --- | --- |
| Xác thực lặp trong render | Layout và page đều gọi requireUser; mỗi lần đọc claims, session_is_active và profiles | React cache cho snapshot xác thực trong render; kiểm tra role/password vẫn tại từng lời gọi | Tránh lặp RPC/profile trong cùng render | Không dùng cache liên request; hành vi cache trong Server Actions chưa đo |
| Tải danh tính học sinh khi chưa mở danh sách | Courses gọi catalogAccess rồi truyền toàn bộ AccessRow vào mọi StudentList đang đóng | Catalog chỉ lấy count; endpoint dành riêng Admin trả 50 dòng/trang khi mở | Giảm dữ liệu RSC/hydration ban đầu | Endpoint vẫn dùng user-scoped Supabase/RLS; no-store; kiểm thử query encoder |
| Tìm học sinh trên toàn bộ mảng ở browser | StudentList dùng rows.filter trên mọi membership | Database join profile, lọc username/email, phân trang; debounce 250ms và abort | Browser xử lý tối đa một trang kết quả | FK có sẵn trong SQL; join trên PostgREST production chưa chạy được |
| Waterfall Teacher/Course/Lesson | Nội dung, context, sibling progress, materials await nối tiếp | Chạy song song các nhánh sau khi có ID phụ thuộc; truyền knownCourse để tránh đọc lại | Rút ngắn đường chờ dữ liệu | Giữ tất cả kiểm tra access; chỉ trả nội dung khi context hợp lệ; RLS chặn từng query |
| Biểu mẫu đóng vẫn nằm trong đồ thị import ban đầu | RecordDialog chứa EditForm/DeleteForm; StudentList chứa danh sách và form thu hồi | Tách record-forms, student-list-dialog và dynamic import tại trigger | Hoãn JS biểu mẫu đến lúc mở | Chunk tải chậm có trạng thái Đang mở; cần xác nhận kích thước qua build thành công |
| Kiểm tra session có thể chồng request | Timer, focus và realtime đều gọi check độc lập | Single-flight, gộp sự kiện đến trong lúc request đang chạy thành lượt kiểm tra tiếp | Tránh truy vấn session đồng thời trong cùng component | Giữ timer 15 giây, realtime, focus và cleanup; không nuốt lỗi thành trạng thái đăng nhập hợp lệ |
| Quét dữ liệu lặp khi render/tính tiến độ | Mỗi chapter filter toàn bộ lessons; mỗi course lọc toàn bộ completed | Group lessons theo chapter một lượt; Set completed và lọc lessons của từng course | Giảm công việc theo tích số course/chapter và số bài | Giữ thứ tự và cách tính %; regression progress đã qua |

Không phát hiện vòng lặp fetch vô hạn, subscription bị thiếu cleanup, N+1 theo từng lesson/material hoặc hàng loạt iframe trong source. Không gán các vấn đề này làm nguyên nhân khi chưa có bằng chứng.

## Changes

- services/auth.ts: reuse snapshot xác thực trong server render.
- repositories/lms.ts và pages Course/Teacher: tách findCourse, chạy các nhánh độc lập song song, giảm quét progress.
- repositories/catalog-access.ts: catalogAccessCounts và studentAccessList phân trang/tìm kiếm.
- app/(lms)/courses/access/route.ts: GET riêng cho Admin, kiểm tra tham số, dữ liệu private/no-store.
- app/(lms)/courses/page.tsx: chỉ truyền count cho StudentList.
- components/admin/student-list.tsx, student-list-dialog.tsx, record-dialog.tsx, record-forms.tsx: lazy dialogs, loading/error/retry, paging.
- components/session-guard.tsx: chống check đồng thời, cleanup vẫn giữ.
- components/learning/chapter-list.tsx: nhóm bài học một lần.
- courses/loading.tsx, lessons/[id]/loading.tsx, menu/loading.tsx: skeleton theo bố cục.
- types/database.ts: mô tả hai foreign key đã tồn tại, không đổi database.
- tests/catalog-access.test.mjs, tests/repository-performance.test.mjs: thêm regression.
- package.json: thêm npm test chạy toàn bộ suites và audit:performance.

## Database

Migration: không có. Index mới: không có.
Đã đối chiếu SQL có index teachers(subject_id), courses(teacher_id), chapters(course_id, order_index), lessons(chapter_id, order_index), materials(lesson_id, order_index); index/unique cho membership, progress, username/email và active_sessions.
Chưa truy cập được EXPLAIN ANALYZE, thống kê cardinality hay slow queries trên Supabase nên không suy đoán thiếu index.
Các query có select(*) được giữ khi phục vụ đầy đủ model/editor hiện tại; query count/list mới chỉ lấy cột cần thiết. Catalog chưa mở danh sách không đọc profiles học sinh. Không thêm RPC/schema chỉ để aggregation khi chưa có phép đo.

## Rendering

Server Components: pages/layout tiếp tục ở server. Không chuyển toàn bộ trang sang client.
Client Components: giữ state/event/browser APIs ở workspace, navigation, dialogs, session guard và forms.
Dynamic imports: record-forms và student-list-dialog chỉ render khi mở. Không tách mọi component nhỏ.
Course outline vẫn giữ các bài trong khóa hiện tại để đáp ứng mục lục, chuyển bài và progress; không tải cây của tất cả khóa trong Lesson.

## Data fetching

- Layout/page có thể dùng chung currentUser trong một React server render. Không dùng unstable_cache hoặc cache toàn cục cho profile/access/progress/session.
- Teacher: first-course content và sibling progress chạy song song.
- Course: sau course metadata, content/context/sidebar chạy song song; sidebar vẫn có progress như trước.
- Lesson: sau lesson/chapter/course metadata, content/context/current materials chạy song song.
- Teacher context: subject và hai quyền truy cập chạy song song sau teacher lookup.
- Student list: tải khi mở, 50 dòng/trang, tìm kiếm trong SQL qua PostgREST; hủy response cũ khi đổi query/đóng.
- Các nhánh vẫn dùng Supabase user client và RLS. Không dùng service-role trong endpoint mới.
- Lệnh audit riêng có service-role chỉ để đọc repository khi có mạng; kết quả đó không thay thế phép đo RLS của Student hoặc route đã đăng nhập.

## Bundle

Đã tách code forms khỏi trigger ban đầu. Không thêm thư viện runtime mới; vẫn dùng Intl thay cho date library.
Không thấy chart/editor/PDF SDK hoặc ảnh lớn import toàn cục. Icon dùng named imports từ lucide-react. Không có ảnh ứng dụng dùng img cần chuyển sang next/image.
Initial JS, route chunk bytes, gzip size: Not measured. Production build bị chặn ở Google Fonts nên không báo phần trăm giảm bundle.
Geist/Geist Mono dùng next/font/google tải lúc build, không phải browser gọi Google Fonts mỗi lượt xem. Chưa thay font để tránh thay giao diện hoặc thiếu glyph tiếng Việt.

## Realtime

SessionGuard có một effect theo userId/sessionId; cleanup clearInterval, removeEventListener và removeChannel đã tồn tại và được giữ.
Đã thêm chống overlapping check; khi có sự kiện trong lúc chờ sẽ kiểm tra tiếp sau lượt hiện tại.
Giữ xử lý phiên cũ: chỉ signOut local nếu cookie vẫn thuộc session cũ; điều hướng login sau khi phát hiện thay phiên.
Không có bằng chứng socket leak từ runtime vì chưa có browser kết nối.

## UX

- Skeleton theo Courses (cũng áp dụng Teacher/Course), Lesson toàn màn hình và Bảng giá.
- Loading mở dialog; loading danh sách; error/retry; nút chuyển trang.
- Tìm kiếm chỉ gửi sau 250ms khi có query; request cũ bị abort.
- Không optimistic cấp quyền/xóa/tạo tài khoản/đổi mật khẩu.
- Video vẫn chỉ có một iframe đang chọn. PDF chỉ mở khi nhấn liên kết. Giữ nguyên player, overlay và điều khiển đã thống nhất.
- Loading của page không che thời gian auth của layout trong lần vào đầu; đây là giới hạn còn lại, không đổi guard để che số đo.

## Measurements

Browser skill đã được thử nhưng không có browser khả dụng (browser list rỗng). Các HTTP probe Vercel và Supabase đều không kết nối được. Đã ghi lỗi thực tế vào before.json và after.json, không tạo timing giả.

| Metric | BEFORE | AFTER |
| --- | --- | --- |
| Courses load / navigation / LCP / INP | Not measured | Not measured |
| Teacher/Course/Lesson load / navigation | Not measured | Not measured |
| Admin thao tác hoàn tất | Not measured | Not measured |
| Network request count / slowest request / bytes thật | Not measured | Not measured |
| Production route/bundle size | Not measured (font fetch failed) | Not measured (font fetch failed) |
| Vercel cold start / function duration / region tới DB | Not measured | Not measured |

So sánh cấu trúc đã xác minh từ code, KHÔNG phải benchmark:

| Luồng | BEFORE | AFTER |
| --- | --- | --- |
| Admin catalog, dialog đóng | Toàn bộ danh tính học sinh liên quan được serialize | Không serialize danh sách học sinh; chỉ count |
| Danh sách mở | Toàn bộ rows, lọc tại browser | Tối đa 50 rows/trang, tìm tại DB |
| Course | content → context → courses → sibling progress | course metadata → content/context/sidebar song song |
| Lesson | lesson → chapter → content → context → materials | lesson → chapter → course → content/context/materials song song |
| Admin forms | Static import cùng trigger | Dynamic import khi mở |

Chạy lại: npm run audit:performance -- current trên máy có mạng. Script chỉ đọc, không login hay thay active_sessions; không log tokens/keys/usernames. Snapshot HTTP không đăng nhập có thể chỉ đo redirect. Mode before trong script chỉ chọn repository access cũ để so sánh count/list; không khôi phục toàn bộ ứng dụng trước sửa. So sánh end-to-end thật cần dùng commit baseline và commit sau sửa trên cùng môi trường/dataset.

## Tests

- Typecheck: PASS — npm run typecheck.
- Lint: PASS — npm run lint, không warning.
- Tests: PASS — npm test, 42/42.
- Build: FAIL — npm run build không fetch được Geist và Geist Mono từ fonts.googleapis.com; cùng lỗi đã có ở build baseline.
- check:auth: FAIL — không kết nối được Supabase; không phải xác nhận auth config sai.
- git diff --check: PASS.

Bộ test chạy gồm validation CRUD/URL, provisioning, username, search/filter, pagination, progress, access theo môn/giáo viên, chặn escalation, first-password-change, single-session, cascade deletes và migrations trong PGlite. Test mới dùng SDK thật với fixture transport để kiểm tra query bounded, count không tải identity, lỗi không bị đổi thành empty và parallel repository vẫn chặn access.
Fixture chỉ trong test; không có mock data đưa vào ứng dụng. Unit/PGlite tests không thay thế browser E2E hoặc PostgREST production integration. Chưa xác nhận đăng nhập/đăng xuất/đổi mật khẩu, các dialog và video trên browser thật trong môi trường này. Không có Playwright/Vitest/Jest trong package hiện tại.

## Remaining issues

1. Hoàn tất build ở môi trường truy cập Google Fonts; hoặc đưa bộ font Geist chính thức có glyph tiếng Việt và license vào repo rồi dùng next/font/local. Chưa thể kết luận build toàn bộ thành công khi bước font đang chặn.
2. Kiểm tra giao diện/đăng nhập hai role và mọi hành động trên preview có tài khoản thử nghiệm; xác nhận route student list join, paging/search/revoke bằng Supabase thật. Không tự tạo hay thay đổi dữ liệu production để đo.
3. Ghi HAR/Performance ở Courses/Teacher/Course/Lesson với cache lạnh/ấm, mobile throttling; so sánh payload/RSC/chunks và navigation trên cùng dataset. Chưa có số liệu chứng minh mục tiêu tốc độ production đã đạt.
4. Catalog còn đọc tất cả subject/teacher để giữ tìm kiếm tiếng Việt bỏ dấu và lựa chọn Admin. Teacher counts còn đọc teacher_id từng membership tại server theo batch. Nếu thực tế lớn/chậm, đo EXPLAIN trước khi cân nhắc aggregation/index/search ở DB.
5. Lesson còn tải outline của khóa hiện tại để giữ chức năng mục lục, bài tiếp theo và progress. Với khóa cực lớn cần profiler trước khi tách thêm streaming/outline lazy.
6. Chưa đo lợi ích React cache trong Server Actions; các lớp guard của mutation vẫn giữ. Không bỏ các lần kiểm tra an ninh chỉ để giảm số query trên giấy.
7. Region Vercel/Supabase và cold starts chưa xác minh được; chưa thay preferredRegion hay deployment config theo suy đoán.

Các thay đổi nằm ở workspace, chưa deploy Vercel.
