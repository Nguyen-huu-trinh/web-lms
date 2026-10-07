# Giao diện LMS

## Thành phần dùng chung

- `app/globals.css`: màu nền slate, điểm nhấn blue/indigo, card 24px, bóng mềm, input và nút 14px. Các lớp có ý nghĩa như `surface`, `button`, `chapter`, `auth-card` dùng chung giữa các route; Tailwind dùng cho bố cục cục bộ.
- `components/ui/page-heading.tsx`: tiêu đề, mô tả, icon và vùng thao tác thống nhất cho Courses, giáo viên/khóa học và Menu.
- `components/ui/icon.tsx`: ánh xạ tên icon sang các import Lucide React tĩnh. Icon trang trí ẩn khỏi trình đọc màn hình; nút cần nhãn chữ hoặc `aria-label`.

## Quy tắc mở rộng

- Card dùng nền trắng, viền slate nhẹ và bóng; glass blur dành cho header, dropdown, auth card và dialog.
- CTA dùng gradient blue/indigo; giữ màu đỏ cho thao tác xóa và xanh lá cho hoàn thành.
- Tương tác chuyển tiếp 300ms; hover nâng nhẹ chỉ trên thiết bị có chuột. Tôn trọng `prefers-reduced-motion`, không di chuyển nút disabled.
- Giữ focus ring, trạng thái pending, nhãn trường và thông báo lỗi. Không chỉ dùng màu để thể hiện trạng thái.
- Container desktop có khoảng đệm 24–32px; mobile giảm khoảng đệm, cho phép thao tác xuống dòng. Bài học chuyển sang một cột ở 900px, danh mục chuyển ở 767px.

## Phạm vi kiểm tra

Build production và các test logic không thay thế kiểm tra trực quan. Cần kiểm tra ở 375/768/1440px với cả Admin và Student: tên dài, dữ liệu rỗng, dialog có lỗi, điều hướng bàn phím, mục lục/tài liệu và nội dung video. Phiên refactor này không có Browser khả dụng để xác minh các tình huống đó.
