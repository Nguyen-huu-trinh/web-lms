# Tài khoản học thử 30 phút

Áp dụng migration supabase/migrations/202610070004_trial_students.sql bằng SQL Editor của Supabase với quyền postgres, trước khi dùng nút học thử. Migration bật pg_cron và tạo job lms-delete-expired-trials. Nếu project chưa hỗ trợ bật extension bằng SQL, bật Supabase Cron trong Dashboard rồi chạy lại migration sau khi rollback giao dịch lỗi.

- Admin chọn học thử khi tạo tên đăng nhập mới. Tên đã tồn tại bị từ chối trong chế độ học thử, không chuyển tài khoản cũ thành tài khoản tự xóa.
- Admin Auth API gắn app_metadata.lms_trial. Trigger lưu mốc auth.users.created_at + 30 phút trong bảng private ngay khi tạo Auth user. user_metadata không được dùng để quyết định thời hạn. Lỗi cấp quyền không để lại tài khoản học thử vô thời hạn.
- RLS/session_is_active chặn phiên hết hạn ngay ở backend. SessionGuard có hẹn giờ rời trang kể cả khi nội dung còn trong Router Cache. Đăng nhập lại hoặc cấp thêm quyền không gia hạn mốc này.
- Job mỗi phút xóa Auth user và cascade profile, quyền, tiến độ, phiên đăng nhập. Chỉ xóa tài khoản STUDENT được ghi trong private.student_trials. Không xóa nội dung môn/khóa học. Xóa vật lý diễn ra ở lần chạy cron sau mốc 30 phút, thường chậm tối đa khoảng một phút; downtime hoặc lỗi database có thể lâu hơn. Nội dung đã tải hoặc video ngoài hệ thống không thể bị thu hồi từ xa.
- Theo dõi Supabase Cron Jobs / History và cảnh báo database. Job tiếp tục với tài khoản khác nếu một tài khoản bị lỗi xóa (ví dụ sở hữu Storage object), và thử lại ở lượt sau.
- Không chạy migration trên database, test hay build trong lượt triển khai mã này theo lựa chọn kiểm thử của người dùng.

Tài liệu: https://supabase.com/docs/guides/cron/quickstart và https://supabase.com/docs/guides/auth/auth-anonymous (ví dụ cleanup auth.users).

## Bỏ yêu cầu đổi mật khẩu cho học thử

Áp dụng migration 202610070005_trial_skip_password_change.sql sau migration 004. Trigger đặt must_change_password=false khi tạo học thử; migration cũng cập nhật tài khoản học thử hiện có. Tài khoản thường vẫn phải đổi mật khẩu lần đầu. Không thay đổi mật khẩu thực tế hoặc thời hạn 30 phút. Migration 004 đã được sửa dấu phân cách $$ của trial_cleanup_enabled để chạy đúng khi cài mới.

## Đồng bộ metadata học thử

Áp dụng migration 006 sau 005: bắt cả INSERT và UPDATE raw_app_meta_data của Auth, khôi phục thời hạn từ created_at cho tài khoản có metadata học thử bị bỏ sót, và đặt must_change_password=false tại bước cuối cấp quyền. Giữ nguyên deadline cũ, không gia hạn khi sửa metadata/cấp quyền. Tài khoản cũ đã quá 30 phút sẽ bị chặn và được cron dọn. Chưa chạy migration hoặc test trên database.
