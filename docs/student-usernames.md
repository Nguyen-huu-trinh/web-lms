# Đăng nhập bằng tên tài khoản

Chạy migration supabase/migrations/202610070001_student_usernames.sql trong Supabase SQL Editor sau hai migration hiện có, trước khi chạy phiên bản mới. Không reset database.

- Học sinh và admin đăng nhập bằng tên tài khoản và mật khẩu. Tên được chuẩn hóa chữ thường, 3–50 ký tự a–z, 0–9, _.
- Admin nhập tên tài khoản khi cấp học sinh. Tên đã có được cấp thêm quyền, không đổi mật khẩu.
- Email tài khoản mới: <username>@students.lms.invalid, chỉ dùng nội bộ, không nhận email. Mật khẩu ban đầu vẫn là 123456 và phải đổi ở lần đăng nhập đầu tiên.
- Tài khoản cũ giữ nguyên email Auth, mật khẩu, ID, quyền và tiến độ. Username lấy từ phần email trước @; thay ký tự ngoài a–z/0–9/_ bằng _; thêm hậu tố _1, _2 nếu trùng.
- RPC mới chỉ cho service_role và kiểm tra phiên admin. Username và quyền được cập nhật trong cùng transaction.

Tra cứu tên đăng nhập sau migration bằng SQL:

    select username, email from public.profiles where role = 'STUDENT' order by username;

Admin cũng xem được tên đăng nhập trong danh sách học sinh đã cấp quyền.
