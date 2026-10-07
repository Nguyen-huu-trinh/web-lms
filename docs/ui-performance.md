# Dialog và hiệu năng

- Thêm/sửa/xóa và thêm học sinh đóng dialog khi server trả về thành công. Lỗi vẫn hiển thị trong form, giữ dữ liệu nhập. Thu hồi quyền đóng cả xác nhận và danh sách học sinh để thông báo không bị native dialog che.
- Toast nằm tại layout LMS, tồn tại qua chuyển trang, tự ẩn sau 5 giây và có nút đóng. Không dùng query `notice=deleted` để tránh lặp thông báo khi tải lại URL.
- Courses chỉ lấy quyền của môn và các giáo viên đang hiển thị, rồi lấy hồ sơ học sinh liên quan. ID được chia lô 100, kết quả vẫn phân trang để không mất dữ liệu khi vượt giới hạn Supabase. Tra email bằng Map thay cho tìm tuyến tính trên toàn bộ học sinh.
- Kiểm tra phiên và đọc profile chạy song song sau khi xác minh claims; giữ kiểm tra role, phiên và yêu cầu đổi mật khẩu.
- Thao tác Menu chỉ revalidate Menu; tài liệu chỉ revalidate trang bài học. Không gọi thêm router.refresh sau khi server action đã revalidate.
- Bỏ blur toàn màn hình của dialog và hover shadow trên container lớn; giới hạn thuộc tính transition, giữ chế độ giảm chuyển động.

Kiểm tra: `npm run typecheck`, `npx eslint app components repositories services tests`, `npm run test:learning`, `npm run test:admin`, `npm run test:auth`, `npm run build`.

Chưa đo thời gian phản hồi/FPS hay kiểm tra click thực tế vì phiên làm việc không có Browser khả dụng. Những thay đổi trên giảm công việc thừa; không phải số liệu chứng minh đã hết lag. Đánh giá hiệu năng thực tế bằng bản production (`npm run build` rồi `npm run start`), tránh so sánh với chi phí biên dịch của `next dev`.
