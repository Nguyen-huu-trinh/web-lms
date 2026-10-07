# Chính sách cache LMS

Cập nhật ngày 2026-10-07 theo yêu cầu bổ sung cache trên các trang.

Trước thay đổi này chỉ có React cache cho xác thực trong một server render. Hiện đã thêm Next Data Cache dùng lại dữ liệu giữa các request; không chỉ là ghi nhớ trong RAM của một function Vercel.

## Phạm vi

| Trang | Dữ liệu cache giữa các request | Dữ liệu luôn kiểm tra mới |
| --- | --- | --- |
| /courses | Danh sách môn học và giáo viên | Quyền môn/giáo viên, danh sách và số lượng học sinh |
| /courses/teachers/[teacherId] | Danh sách khóa học, chương/bài của khóa đang mở | Teacher context, quyền, thông tin khóa hiện tại, tiến độ |
| /courses/[id] | Danh sách khóa của giáo viên, chương và bài học | RLS của khóa, quyền, tiến độ |
| /lessons/[id] | Chương/bài của khóa, tài liệu của bài đang mở | RLS của lesson/chapter/course, quyền, tiến độ |
| /menu, đích redirect /menus | Các hạng mục bảng giá | Phiên đăng nhập và role |
| /, /login, /change-password | Không lưu response xác thực vào Data Cache | Redirect, cookie, tài khoản, đổi mật khẩu và phiên |
| /courses/access | Không cache lâu dài | Admin guard và danh sách học sinh phân trang, private/no-store |

Không cache HTML toàn trang có thông tin cá nhân. Dynamic layout và proxy vẫn hoạt động. Phiên hết hạn/bị thay thế, must_change_password và role được kiểm tra trước khi page sử dụng cache.

## Thời gian và khóa cache

- Revalidate sau 15 phút theo cơ chế Next Data Cache. Đây là thời gian bắt đầu tái xác thực, không phải cam kết mọi thay đổi ngoài ứng dụng xuất hiện chính xác sau 15 phút: lần đọc đầu sau thời gian đó có thể nhận bản cũ trong khi cập nhật nền.
- Key gồm phiên bản cache, Supabase project URL, user ID, session ID, role và resource ID.
- Không đưa mật khẩu, bearer token hay cookie vào key hoặc log.
- Tạo reader sau requireUser. Không đọc cookies()/headers() bên trong callback được cache; Supabase client được tạo trước đó và vẫn sử dụng quyền RLS của người dùng, không dùng service-role.
- React cache cho teacherContext/findCourse chỉ chống đọc lặp trong cùng render; không lưu quyền giữa các lượt truy cập.
- Cache hit của teacherCourses vẫn phải qua teacherContext hiện tại. Cache outline vẫn phải qua findCourse/RLS hiện tại kể cả khi caller truyền knownCourse. Materials cache chỉ được đọc sau lookup bài học/chương/khóa hiện tại.

## Xóa cache

- Admin thêm/sửa/xóa subjects, teachers, courses, chapters, lessons hoặc materials: updateTag cho lms:learning:v1, sau đó revalidatePath như trước.
- Cấp/thu hồi quyền: xóa tag học tập. Bản thân quyền vẫn không được cache giữa request, nên thu hồi trực tiếp tại database cũng không bị cache nội dung bỏ qua khi truy cập lại.
- Thay đổi bảng giá: updateTag riêng lms:pricing:v1.
- updateTag hết hạn ngay, lần đọc tiếp theo chờ dữ liệu mới thay vì phục vụ bản cũ. Tag áp dụng cho mọi key người dùng liên quan, nên chỉnh sửa của Admin cũng làm hết hạn cache của Student.
- Hoàn thành bài: progress không cache; revalidatePath cập nhật giao diện như trước, không cần xóa toàn bộ outline.
- Đăng nhập phiên mới: session ID mới tạo key khác; guard phiên vẫn đọc trực tiếp. Router Cache phía trình duyệt được mô tả riêng bên dưới.
- Các chỉnh sửa nội dung trực tiếp bằng SQL/Supabase Dashboard không gọi Server Action nên dùng revalidation theo thời gian. Nếu cần cập nhật nội dung ngay trong trường hợp này, cần bổ sung webhook có xác thực; hiện chưa có webhook.

## Triển khai

lib/cache/policy.ts chứa key, tag, thời gian và giao diện reader. lib/cache/learning.ts nối vào Next Data Cache. Repository nhận reader tùy chọn; các tác vụ audit/test gọi raw repository vẫn mặc định không cache.

Dùng unstable_cache tương thích với kiến trúc force-dynamic hiện tại. Tài liệu Next 16 khuyến nghị use cache cùng Cache Components; chưa bật Cache Components vì điều đó thay đổi cách rendering của toàn bộ các route xác thực. API hiện tại vẫn được hỗ trợ trong phiên bản đã cài.

## Kiểm tra

- npm run typecheck: PASS.
- npm run lint: PASS.
- npm test: PASS, 47/47.
- Test bổ sung: key cách ly user/session/role/project; metadata cache hit; progress đọc mới; course RLS và teacher grant thu hồi chặn cache cũ; lesson bị chặn không trả cached materials.
- Test dùng memory reader để kiểm tra ranh giới repository, không thay cho kiểm thử hit/miss của Next Data Cache trên Vercel. Chưa đo tỷ lệ cache hit hay tốc độ production.
- Build vẫn cần mạng Google Fonts; xem cache-build.txt cho kết quả lần chạy mới.

Chưa deploy thay đổi lên Vercel.

## Chuyển môn trong trang danh mục

Cache server không loại bỏ round-trip: trước đây mỗi Link chọn môn vẫn gửi request RSC, requireUser và kiểm tra quyền dù metadata đã có trong Data Cache.

CatalogSubjectBrowser hiện dùng dữ liệu danh mục đã đọc để chuyển panel cục bộ, cập nhật URL bằng History API được Next hỗ trợ. Chọn môn không gọi router.push/refresh hoặc fetch trang. Back/Forward, reload và mở tab mới vẫn dựa trên subject trong URL. Chỉ panel từng xem mới mount; panel đã xem được giữ để quay lại không phải tải số lượng học sinh lần nữa.

Admin lấy counts của môn đầu từ server như trước; môn khác tải counts qua /courses/access-counts khi mở lần đầu. Endpoint kiểm tra ADMIN, UUID và dùng Supabase RLS, private/no-store. Không tải danh tính học sinh, chương, bài hay video của mọi môn.

Một server render mới sau mutation, filter hoặc refresh tạo phiên bản view mới và bỏ snapshot panel/counts cũ. Bản lưu trong trang không tồn tại qua lần tải lại và không thay thế kiểm tra quyền server khi mở nội dung hoặc thực hiện thao tác. Nội dung danh mục đang mở là snapshot đến lần refresh tiếp theo; thay đổi bởi người khác không tự động push vào snapshot này.

Typecheck/lint và 47 tests hiện có đạt; chưa xác minh tương tác trên trình duyệt trong môi trường không có browser kết nối. Không coi các kết quả này là số đo thời gian load production.

## Bộ lọc và điều hướng giữa các trang

- Tất cả/Khóa học của tôi dùng chung snapshot danh mục đã qua xác thực. Cả hai danh sách được chuẩn bị từ cùng query; đổi filter/subject qua History API không gửi request RSC mới. Học sinh vẫn chỉ thấy các giáo viên được cấp quyền ở chế độ mine; search giữ nguyên quy tắc bỏ dấu hiện có. Dữ liệu danh mục ở chế độ all vốn được RLS cho phép, không phải nội dung khóa được bảo vệ.
- next.config.ts bật experimental.staleTimes dynamic=300/static=300 theo API của Next 16.3.8 đã cài. Router Cache nằm ở browser, tái sử dụng page RSC khi quay lại URL đã xem còn hạn; không phải cache HTML chung trên CDN. Đây là tùy chọn experimental của Next; cần kiểm tra lại khi nâng phiên bản.
- NavigationLink tải trước đầy đủ khi hover/focus, giữ prefetch tự động mặc định ở các thời điểm khác; có thanh báo nhỏ khi điều hướng đang chờ. Không chủ động tải cây lesson/material/video của mọi khóa.
- Link trở lại khóa mặc định dùng đúng URL gốc để trúng mục cache ban đầu. Link các khóa khác giữ query course để không reset cả segment.
- Các trang chưa có bản lưu, hết hạn hoặc vừa invalidated vẫn phải tải mới. Thời hạn 5 phút không đảm bảo mọi thao tác đều tức thì và không phải benchmark production.
- Khác với Data Cache, Router Cache có thể hiển thị lại snapshot đã được phép xem mà không chạy requireUser lần nữa trong 5 phút. SessionGuard vẫn theo dõi single-session. Mọi request mới/mutation vẫn qua auth/RLS; login/logout cập nhật cookie qua Server Action làm mất hiệu lực Router Cache. RevalidatePath của CRUD/cấp quyền/progress vẫn được giữ để refresh dữ liệu sau thao tác.
- Thay đổi từ tài khoản khác/SQL bên ngoài có thể chưa phản ánh trên snapshot đã xem cho đến khi tải mới. Không lưu snapshot vào localStorage hoặc dùng chung giữa các tài khoản trên server.
- Typecheck, lint, 47 tests hiện có: PASS. Chưa xác minh chuyển trang thực tế trên browser; số đo cache-hit/navigation trên production chưa có.

## Chuyển khóa trong cùng danh sách giáo viên

- CourseBrowser thay điều hướng Link bằng History API. Danh sách bên trái giữ nguyên; khóa đã mở được giữ trong bộ nhớ của view để chuyển A → B → A không cần request lại.
- Khóa chưa mở tải riêng CourseDetail qua loadCoursePanel. Nội dung cũ vẫn hiển thị cùng trạng thái tải nhỏ; transition và Suspense cục bộ tránh thay cả trang bằng loading. Không tải trước toàn bộ chương/bài của mọi khóa.
- Mỗi lần tải panel mới kiểm tra requireUser, course RLS và quyền giáo viên. Các nút quản trị vẫn được render ở server với Server Action như trước.
- Request cùng khóa được gộp; lỗi không lưu vĩnh viễn và có nút thử lại. Kết quả trả chậm không đổi khóa đang chọn. Back/Forward và mở URL trực tiếp vẫn xác định khóa bằng query course.
- Snapshot chỉ tồn tại trong view đang mở, không lưu localStorage. Server render mới sau refresh/mutation reset bộ nhớ này. Thay đổi từ tài khoản khác chưa tự động cập nhật snapshot; truy cập bài học và mọi thao tác mới vẫn kiểm tra quyền server.
- Kiểm tra: typecheck và lint đạt; 50/50 tests đạt, gồm quay lại khóa, gộp request, thử lại sau lỗi và cách ly cache. Chưa xác minh tương tác trên browser vì không có browser kết nối. Build bị chặn bởi kết nối Google Fonts (Geist/Geist Mono), chưa có kết quả production build thành công.

## Tăng thời gian cache cho dữ liệu ít thay đổi

- Data Cache: 15 phút cho danh mục, nội dung khóa, tài liệu và bảng giá.
- Router Cache: 5 phút cho trang đã xem hoặc được tải trước. Cần khởi động lại Next dev để áp dụng next.config.ts.
- Hoàn thành bài lưu user_progress trước, sau đó revalidatePath cho /courses và /lessons: cập nhật tiến độ, trạng thái hoàn thành và bài học tiếp theo mà không chờ TTL. Progress vẫn đọc ngoài Data Cache.
- Admin chỉnh sửa vẫn updateTag/revalidatePath; không phải chờ 15 phút. Thay đổi trực tiếp ngoài ứng dụng có thể xuất hiện chậm hơn.
- Theo yêu cầu người dùng, lần chỉnh TTL này không chạy test, lint, typecheck, build hoặc kiểm thử trình duyệt; các kết quả ở phần trước thuộc các lần thay đổi trước.
