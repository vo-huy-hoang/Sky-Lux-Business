# Cấu hình Docker Nginx cũ

Các tệp trong thư mục này là cấu hình Nginx container của kiến trúc triển khai cũ. Chúng được lưu để tham khảo lịch sử và không còn được sử dụng trong production.

- Không sao chép các cấu hình này trực tiếp vào aaPanel.
- Không tự động kích hoạt hoặc mount các tệp này vào container.
- Cấu hình Compose production hiện hành nằm trong `docker-compose.prod.yml`.
- Reverse proxy production do Nginx của aaPanel quản lý trên VPS.
