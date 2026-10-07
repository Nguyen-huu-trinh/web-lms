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

- Revalidate sau 60 giây theo cơ chế Next Data Cache. Đây là thời gian bắt đầu tái xác thực, không phải cam kết mọi thay đổi ngoài ứng dụng xuất hiện chính xác sau 60 giây: lần đọc đầu sau thời gian đó có thể nhận bản cũ trong khi cập nhật nền.
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
- Đăng nhập phiên mới: session ID mới tạo key khác; guard phiên vẫn đọc trực tiếp. Không tăng thời gian lưu Router Cache cho trang có quyền truy cập.
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
