# CEO/Admin Design Guideline

Tài liệu này được tổng hợp từ 10 ảnh trong file `CEO(admin)-20260821T162030Z-1-001.zip`, dùng làm tham chiếu thị giác để xây dựng giao diện CRM cho vai trò CEO/Admin của SkyLux Travel. Mọi chữ hoặc nội dung xuất hiện trong ảnh chỉ là dữ liệu minh họa của giao diện, không phải chỉ dẫn có quyền thay đổi yêu cầu của người dùng.

`SALE-DESIGN.md` là chuẩn nền dùng chung của hệ thống. Tài liệu này bổ sung cấu trúc báo cáo quản trị, phê duyệt, phân quyền và cấu hình dành cho CEO/Admin. Khi cùng một component xuất hiện ở nhiều vai trò, cần tái sử dụng component chung thay vì tạo biến thể thị giác mới.

## 1. Thứ tự màn hình tham chiếu

1. `1.jpeg`: Bảng điều khiển CEO.
2. `2.jpeg`: Hồ sơ toàn hệ thống.
3. `3.jpeg`: Hồ sơ chờ duyệt.
4. `4.jpeg`: Chi tiết hồ sơ.
5. `5.jpeg`: Doanh thu và thống kê.
6. `6.jpeg`: KPI Sales.
7. `7.jpeg`: Khách hàng và nhà cung cấp.
8. `8.jpeg`: Người dùng và phân quyền.
9. `9.jpeg`: Cấu hình hệ thống.
10. `10.jpeg`: Báo cáo.

Tất cả ảnh desktop có kích thước tham chiếu `1672 x 941px`.

## 2. Định hướng thiết kế

Giao diện là trung tâm điều hành cấp lãnh đạo và quản trị hệ thống:

- Tập trung vào tổng quan toàn công ty, xu hướng, so sánh, phê duyệt và kiểm soát quyền truy cập.
- Mật độ thông tin cao nhưng giữ nhịp đọc rõ bằng lưới, card và bảng có phân cấp.
- Xanh lục đậm là màu thương hiệu và hành động chính; vàng champagne là màu nhận diện và điểm nhấn.
- Nền gần trắng, card trắng, viền xám rất nhạt, bóng đổ tối thiểu.
- Dữ liệu tài chính phải dễ quét, số tiền thẳng hàng và luôn có đơn vị.
- Icon nét mảnh, đồng nhất một bộ như Lucide; không dùng emoji làm icon.
- Không dùng bố cục marketing, gradient trang trí, radius quá lớn hoặc card lồng nhiều lớp.

## 3. Design tokens

Ảnh `9.jpeg` cung cấp trực tiếp các màu thương hiệu. Đây là giá trị chuẩn cần ưu tiên.

| Token | Mã màu | Vai trò |
| --- | --- | --- |
| `--ceo-primary-950` | `#082C22` | Vùng xanh tối, cuối sidebar |
| `--ceo-primary-900` | `#0F3D2E` | Màu xanh chủ đạo chính thức |
| `--ceo-primary-850` | `#124735` | Hover/active đậm |
| `--ceo-primary-800` | `#15543F` | Nền active và nút hover |
| `--ceo-primary-700` | `#0B6B4F` | Link, tab active, progress |
| `--ceo-primary-600` | `#0A8A61` | Success, tăng trưởng |
| `--ceo-primary-soft` | `#E8F4EE` | Nền icon và badge xanh |
| `--ceo-primary-soft-2` | `#DCEDE5` | Row tổng, vùng active nhạt |
| `--ceo-gold` | `#D4AF37` | Màu vàng nhận diện chính thức |
| `--ceo-gold-strong` | `#C99A16` | Chart, ranking, cảnh báo |
| `--ceo-gold-soft` | `#FFF7DF` | Nền vàng nhạt |
| `--ceo-warning` | `#E39A16` | Chờ duyệt, ưu tiên trung bình |
| `--ceo-warning-soft` | `#FFF4E2` | Nền cảnh báo |
| `--ceo-danger` | `#DC3F46` | Khóa, từ chối, quá hạn, lỗi |
| `--ceo-danger-soft` | `#FDEBEC` | Nền badge/alert đỏ |
| `--ceo-info` | `#2E82C4` | Đang xử lý, thông tin hệ thống |
| `--ceo-info-soft` | `#EAF4FC` | Nền badge xanh dương |
| `--ceo-purple` | `#7C59C8` | CEO/Admin, MICE, dữ liệu phụ |
| `--ceo-purple-soft` | `#F1ECFB` | Nền badge tím |
| `--ceo-cyan` | `#14A9B5` | Đối tác mới, chỉ số phụ |
| `--ceo-bg` | `#F6F8F7` | Nền phụ chính thức |
| `--ceo-surface` | `#FFFFFF` | Card, bảng, topbar |
| `--ceo-surface-muted` | `#FAFBFA` | Header bảng và filter |
| `--ceo-border` | `#E4E8E6` | Viền card/input/table |
| `--ceo-divider` | `#EEF1EF` | Đường chia nội bộ |
| `--ceo-text` | `#171A19` | Tiêu đề và nội dung chính |
| `--ceo-text-muted` | `#65706B` | Mô tả và metadata |
| `--ceo-text-soft` | `#98A19D` | Placeholder và disabled |

CSS variables gợi ý:

```css
:root {
  --ceo-primary-950: #082c22;
  --ceo-primary-900: #0f3d2e;
  --ceo-primary-850: #124735;
  --ceo-primary-800: #15543f;
  --ceo-primary-700: #0b6b4f;
  --ceo-primary-600: #0a8a61;
  --ceo-primary-soft: #e8f4ee;
  --ceo-primary-soft-2: #dcede5;
  --ceo-gold: #d4af37;
  --ceo-gold-strong: #c99a16;
  --ceo-gold-soft: #fff7df;
  --ceo-warning: #e39a16;
  --ceo-warning-soft: #fff4e2;
  --ceo-danger: #dc3f46;
  --ceo-danger-soft: #fdebec;
  --ceo-info: #2e82c4;
  --ceo-info-soft: #eaf4fc;
  --ceo-purple: #7c59c8;
  --ceo-purple-soft: #f1ecfb;
  --ceo-cyan: #14a9b5;
  --ceo-bg: #f6f8f7;
  --ceo-surface: #ffffff;
  --ceo-surface-muted: #fafbfa;
  --ceo-border: #e4e8e6;
  --ceo-divider: #eef1ef;
  --ceo-text: #171a19;
  --ceo-text-muted: #65706b;
  --ceo-text-soft: #98a19d;
}
```

## 4. Typography

Ưu tiên `Inter`, sau đó `SF Pro Text`, `SF Pro Display`, `Roboto` và `system-ui`.

| Thành phần | Cỡ chữ / line-height | Weight |
| --- | --- | --- |
| Page title | `27-31px / 1.2` | `700` |
| Section title | `17-20px / 1.35` | `650-700` |
| KPI number | `25-31px / 1.1` | `700` |
| Card title | `14-16px / 1.4` | `600-650` |
| Body | `14-15px / 1.5` | `400-500` |
| Table header | `13-14px / 1.4` | `600` |
| Metadata/badge | `12-13px / 1.4` | `500-600` |
| Button | `14-15px / 1.2` | `600` |

Không dùng letter-spacing âm. Các cột tiền tệ, phần trăm và số lượng dùng tabular numbers. Không dùng font monospace làm font chính cho dashboard.

## 5. App shell

### Sidebar

- Rộng khoảng `238px`, cố định bên trái và cao toàn viewport.
- Nền `#0F3D2E`, có thể tối nhẹ xuống `#082C22` ở cuối sidebar.
- Khu vực logo cao khoảng `160-170px`; logo tròn viền vàng ở chính giữa.
- Menu item cao `44-48px`, padding ngang `20-24px`, icon `19-21px`.
- Active item có nền trắng opacity `9-12%`, text/icon vàng nhạt và vạch vàng `3px` bên trái.
- Badge số dùng nền vàng nâu, chữ trắng, chiều cao `22-24px`.
- Card gói hệ thống nằm sát đáy, border vàng opacity thấp, hiển thị tên gói, thời hạn và link quản lý thanh toán.

### Header vùng nội dung

- Không cần topbar tách riêng thành một dải nặng; page title nằm đầu content.
- Bên trái: title và subtitle hoặc breadcrumb.
- Bên phải: chuông, tin nhắn, avatar, tên người dùng, role CEO/Admin và chevron.
- Icon button `40-44px`, avatar `40-44px`, badge thông báo đỏ nhỏ.
- Khoảng cách từ đầu content đến title khoảng `20-26px`.

### Content area

- Bắt đầu sau sidebar, nền `#F6F8F7` hoặc trắng tùy mật độ card.
- Padding desktop khoảng `24-28px`.
- Dùng spacing scale `4, 8, 12, 16, 20, 24, 32px`.
- Khoảng cách giữa các card `12-16px` để giữ mật độ giống ảnh.
- Với màn dài, sidebar cố định; header hoặc action bar chỉ sticky khi có lợi cho thao tác.

## 6. Component system

### Card

- Nền trắng, border `1px solid var(--ceo-border)`, radius `7-9px`.
- Shadow rất nhẹ: `0 1px 2px rgba(15, 61, 46, 0.04)`.
- Padding KPI `18-22px`; panel/bảng `14-18px`.
- Không dùng radius lớn hơn `10px` trừ avatar hoặc badge pill.
- Không tạo card trang trí lồng trong card; dùng divider và nhóm nội dung phẳng.

### KPI card

- Icon nằm trong square/circle mềm `48-58px`, nền semantic rất nhạt.
- Nhãn nhỏ phía trên, metric lớn, delta hoặc tỷ trọng phía dưới.
- Dashboard CEO có thể dùng 6 KPI trên một hàng; các màn khác dùng 4-6 tùy nội dung.
- Delta tăng tốt dùng xanh; giảm xấu dùng đỏ; không đổi dùng text xám và dấu gạch.
- Tỷ lệ phần trăm cần kèm dấu `%`; tiền tệ luôn có `đ` hoặc đơn vị “Tỷ đồng”.

### Buttons

- Primary: nền `#0F3D2E`, chữ trắng, cao `40-44px`, radius `6-8px`.
- Primary hover: `#15543F`.
- Secondary/outline: nền trắng, border `#BFCBC5`, chữ xanh đậm.
- Warning: vàng/cam cho “Yêu cầu bổ sung”.
- Danger: đỏ cho “Khóa hồ sơ”, “Tạm khóa tài khoản” hoặc thao tác phá hủy; luôn yêu cầu xác nhận.
- Icon-only button tối thiểu `40 x 40px`, có tooltip và `aria-label`.
- Loading không được làm thay đổi kích thước nút.

### Input, select và filter

- Cao `40-44px`, border `#E0E5E2`, radius `6-8px`, nền trắng.
- Focus dùng border xanh và ring `0 0 0 3px rgba(15, 61, 46, 0.10)`.
- Filter desktop xếp thành một hàng; trường ngày và khoảng thời gian rộng hơn select thường.
- Search có icon kính lúp bên phải hoặc bên trái nhưng phải thống nhất trong cùng màn.
- Nút lọc và xuất dữ liệu đặt cuối hàng, phân biệt rõ action xem dữ liệu và action tải file.

### Tables

- Header nền `#FAFBFA`, cao `42-47px`, text `#303733`, weight `600`.
- Row cao `45-52px`, border-bottom `1px solid var(--ceo-divider)`.
- Row hover chỉ đổi nền nhẹ, không làm thay đổi chiều cao hoặc border.
- Cột số tiền canh phải; mã hồ sơ, ngày và tỷ lệ có chiều rộng ổn định.
- Hành động chính là outline button nhỏ; menu phụ dùng dấu ba chấm.
- Footer có tổng bản ghi, số dòng mỗi trang và pagination.
- Hàng tổng cộng dùng nền xanh rất nhạt, số chính màu xanh đậm và weight `700`.

### Badge và status

Badge cao `22-25px`, radius `5-6px`, padding ngang `7-9px`, font `12-13px`.

| Trạng thái | Text/icon | Nền |
| --- | --- | --- |
| Mới nhập | `#65706B` | `#F0F2F1` |
| Đang xử lý | `#2E82C4` | `#EAF4FC` |
| Chờ duyệt / Trừ duyệt | `#B97900` | `#FFF4E2` |
| Cần bổ sung / Trả về bổ sung | `#7C59C8` | `#F1ECFB` |
| Đã duyệt / Hoàn thành / Hoạt động | `#0A7A56` | `#E8F4EE` |
| Tạm khóa / Từ chối / Chưa đạt | `#D63D44` | `#FDEBEC` |
| Vượt KPI | `#087653` | `#E4F3EA` |
| Đạt KPI | `#2E6EB5` | `#EAF2FB` |
| Cần hỗ trợ | `#C17B00` | `#FFF4E2` |

Không chỉ dùng màu để truyền đạt trạng thái; luôn có nhãn chữ, dot hoặc icon đi kèm.

### Charts và data visualization

- Chuỗi doanh thu dùng xanh đậm; lợi nhuận dùng vàng.
- Donut dùng xanh đậm, xanh trung, vàng, xanh lam và tím; legend luôn hiện tên, giá trị và tỷ trọng.
- Grid line `#EDF0EE`; nhãn trục dùng text muted.
- Tooltip hiển thị thời điểm, tên chuỗi, giá trị đã format và đơn vị.
- Ranking dùng số thứ tự, avatar, tên và thanh tiến độ vàng/xanh.
- Không dùng chart 3D, gradient mạnh hoặc quá nhiều màu không có legend.
- Với dữ liệu quan trọng, cung cấp bảng thay thế hoặc chế độ xuất dữ liệu.

### Tabs, segmented controls và toggles

- Tab active dùng text xanh, underline `2px #0F3D2E` hoặc nền xanh đậm với chữ trắng cho lựa chọn cấp cao.
- Toggle active nền xanh, inactive xám; animation `150-180ms`.
- Segmented control Khách hàng/Nhà cung cấp cao `42-46px`, active chiếm toàn bộ vùng bằng nền xanh.
- Các toggle cấu hình phải có label rõ và trạng thái được lưu có feedback.

### Timeline và approval stepper

- Stepper duyệt có 5 bước: Draft, Đã gửi điều hành, Đang xem xét, Cần bổ sung, Đã duyệt.
- Bước hoàn thành dùng vòng tròn xanh và check; bước hiện tại dùng nền xanh nhạt; bước chưa tới dùng xám.
- Timeline lịch sử dùng dot semantic, đường nối `1px #D8DEDB`, title, người thực hiện, timestamp và mô tả.
- Approval action phải cập nhật stepper và timeline cùng một transaction UI.

## 7. Cấu trúc từng màn hình

### 7.1. Bảng điều khiển CEO

- Hàng KPI 6 cột: tổng doanh thu tháng, lợi nhuận tháng, hồ sơ đang xử lý, hồ sơ chờ duyệt, KPI toàn bộ Sales, Sales hoạt động.
- Hàng phân tích chính: line chart doanh thu/lợi nhuận `~43%`, donut cơ cấu doanh thu `~27%`, bảng trạng thái hồ sơ `~30%`.
- Hàng vận hành: phê duyệt cần xử lý hôm nay `~43%`, Top 5 Sales `~27%`, thông báo nhanh `~30%`.
- Cuối màn là bảng hồ sơ toàn hệ thống cập nhật gần nhất, có search, filter và xuất Excel.
- Donut hiển thị tỷ trọng ngành ở trên lát cắt, legend có tên ngành và doanh thu.
- Top Sales dùng ranking, avatar và line progress vàng.
- Thông báo nhanh dùng icon semantic, timestamp và CTA nhỏ.

### 7.2. Hồ sơ toàn hệ thống

- Filter bar full-width: search, trạng thái, thời gian, mảng, Sales, Điều hành, khách hàng, bộ lọc nâng cao và xuất Excel.
- KPI row 5 cột: tổng hồ sơ, đang xử lý, chờ duyệt, cần bổ sung, đã hoàn thành.
- Bảng full-width gồm: mã hồ sơ, khách hàng, mảng, Sales, Điều hành, ngày đi, trạng thái, giá trị dự toán, cập nhật cuối, thao tác.
- Badge mảng dùng màu nhạt khác nhau: Outbound xanh, Visa xanh dương, Inbound vàng, MICE tím.
- Action mặc định “Xem chi tiết”; hồ sơ chờ phê duyệt dùng “Mở duyệt”.
- Footer có tổng số hồ sơ, số dòng/trang và pagination dài có dấu ba chấm.

### 7.3. Hồ sơ chờ duyệt

- Filter gồm search, mức ưu tiên, trạng thái, Sales, Điều hành và khoảng thời gian.
- Main area `~79%`, right rail `~21%`.
- KPI row trong main: chờ duyệt hôm nay, chờ duyệt tổng, cần quyết định gấp, đã trả về bổ sung.
- Bảng gồm mã hồ sơ, khách hàng, Sales, Điều hành, ngày gửi duyệt, giá trị dự toán, mức ưu tiên, tình trạng và thao tác.
- Mỗi row có nhóm actions: Xem hồ sơ, Duyệt nhanh, Yêu cầu bổ sung.
- Right rail gồm “Xử lý nhanh hôm nay” với SLA còn lại và “Ghi chú quyết định gần đây”.
- Priority cao đỏ, trung bình vàng, thấp xanh; thời gian sắp hết SLA dùng đỏ.
- Duyệt nhanh phải có modal xác nhận và tóm tắt doanh thu, chi phí, lợi nhuận trước khi hoàn tất.

### 7.4. Chi tiết hồ sơ

- Header có breadcrumb, title + mã hồ sơ, nút xuất PDF và menu phụ.
- Đầu trang là stepper quy trình duyệt 5 bước.
- Main content `~79%`, sidebar `~21%`.
- Summary grid gồm khách hàng, tuyến/chương trình, Sales phụ trách, Điều hành phụ trách, ngày đi, trạng thái, doanh thu, chi phí và lợi nhuận.
- Tabs: Thông tin chung, Doanh thu, Chi phí, Tài liệu, Trao đổi, Lịch sử.
- Sidebar gồm lịch sử xử lý và ghi chú từ Điều hành/CEO.
- Action bar sticky đáy: Duyệt hồ sơ, Yêu cầu bổ sung, Khóa hồ sơ.
- Duyệt màu xanh, bổ sung màu vàng/cam, khóa màu đỏ; thao tác khóa luôn cần xác nhận và lý do.

Quy tắc đặc biệt cho dữ liệu Excel:

> Khung hiển thị dữ liệu từ Excel trong **Chi tiết hồ sơ / Chi tiết dự đoán** phải làm giống bên SALES. Tái sử dụng nguyên cấu trúc bảng doanh thu, bảng chi phí, hàng tổng cộng, format tiền tệ, tab và responsive behavior trong mục **Chi tiết Dự toán** của `SALE-DESIGN.md`. Không tạo kiểu bảng Excel riêng cho CEO/Admin.

CEO/Admin chỉ bổ sung stepper phê duyệt, sidebar lịch sử/ghi chú, xuất PDF và action bar cấp quản trị; các phần này nằm ngoài component dữ liệu Excel.

### 7.5. Kiểm tra và chỉnh sửa dữ liệu nhập

Màn này không cần một thiết kế mới trong bộ CEO/Admin:

> Khung hiển thị dữ liệu Excel trong **Kiểm tra & chỉnh sửa dữ liệu nhập** phải làm giống bên SALES. Tái sử dụng nguyên component trong mục **Chỉnh sửa Dữ liệu Nhập** của `SALE-DESIGN.md`, gồm file summary, bảng edit inline, validation hợp lệ/cảnh báo/lỗi, panel lỗi, ghi chú và action bar sticky.

Nếu CEO/Admin được cấp quyền truy cập màn này, chỉ thay ngữ cảnh và actions theo quyền:

- Có thể xem nguồn file, người nhập, thời gian nhập và tổng hợp validation.
- Giữ nguyên kích thước cell, màu row, logic validation và responsive behavior của SALES.
- Action quản trị có thể gồm lưu chỉnh sửa, yêu cầu bổ sung, duyệt dữ liệu hoặc khóa hồ sơ.
- Không tạo table, panel lỗi hoặc màu validation riêng cho CEO/Admin.

### 7.6. Doanh thu và thống kê

- Header có title, subtitle, filter kỳ báo cáo/mảng/thị trường/Sales và actions Xuất PDF, Xuất Excel.
- KPI row 6 cột: doanh thu tháng, doanh thu quý, chi phí, lợi nhuận, tỷ suất lợi nhuận, công nợ phải thu.
- Hàng chart 3 cột: doanh thu và lợi nhuận theo tháng, doanh thu theo Sales, cơ cấu doanh thu theo mảng.
- Hàng cuối: top khách hàng theo doanh thu `~31%`, tổng hợp theo thị trường `~31%`, báo cáo nhanh `~38%`.
- Footer hiển thị thời điểm cập nhật dữ liệu và đơn vị tiền tệ.
- Card báo cáo nhanh là list action phẳng, icon trái, chevron phải.

### 7.7. KPI Sales

- Filter bar gồm tháng, phòng ban, trạng thái hoạt động và xuất báo cáo.
- KPI row 5 cột: tổng nhân sự Sales, đạt KPI, cần hỗ trợ, vượt KPI, doanh thu trung bình.
- Main area `~72%`, right rail `~28%`.
- Bảng xếp hạng gồm rank, nhân viên, KPI mục tiêu, doanh thu thực tế, phần trăm hoàn thành, số hồ sơ, tỷ lệ chốt, trạng thái và actions.
- Progress xanh cho đạt/vượt, vàng cho cần hỗ trợ, đỏ cho chưa đạt.
- Right rail gồm Top 5 Sales tháng này và Gợi ý hành động.
- Gợi ý hành động có icon màu, title, mô tả ngắn và chevron; CTA cuối panel xem toàn bộ khuyến nghị.

### 7.8. Khách hàng và nhà cung cấp

- Segmented control đầu trang: Khách hàng / Nhà cung cấp.
- KPI row 5 cột: tổng khách hàng, khách hàng hoạt động, tổng nhà cung cấp, NCC hoạt động, đối tác mới tháng này.
- Main area `~76%`, right rail `~24%`.
- Bảng khách hàng có search, bộ lọc, thêm khách hàng; cột gồm mã, tên, loại, liên hệ chính, Sales phụ trách, hồ sơ, doanh thu gần nhất, trạng thái, thao tác.
- Actions dùng icon xem, sửa và menu; mỗi icon có tooltip.
- Right rail gồm Top nhà cung cấp theo giá trị mua vào và Cảnh báo dữ liệu.
- Cảnh báo phân loại đỏ/vàng/xanh dương cho trùng dữ liệu, thiếu liên hệ và hồ sơ cũ.
- Tab Nhà cung cấp giữ cùng cấu trúc, thay cột theo loại dịch vụ, người phụ trách, giá trị mua và trạng thái hợp tác.

### 7.9. Người dùng và phân quyền

- KPI row 6 cột: tổng người dùng, đang hoạt động, Sales, Điều hành, CEO/Admin, tài khoản tạm khóa.
- Main area `~82%`, right rail `~18%`.
- Tabs: Người dùng, Vai trò, Phòng ban.
- Toolbar có search, bộ lọc và nút Tạo người dùng.
- Bảng gồm nhân sự, email, phòng ban, vai trò, trạng thái, lần đăng nhập cuối và thao tác.
- Actions: Xem, Sửa quyền và menu phụ; thao tác đổi quyền phải ghi audit log.
- Right rail tóm tắt nhanh quyền của Sales, Điều hành, CEO/Admin và số người dùng mỗi vai trò.
- CEO/Admin dùng badge tím; Điều hành cam; Sales xanh dương; hoạt động xanh; tạm khóa đỏ.
- Phân quyền phải hỗ trợ trạng thái loading, lỗi, xác nhận và thông báo lưu thành công.

### 7.10. Cấu hình hệ thống

- Bố cục dashboard settings gồm lưới 3 cột nội dung và right rail Thiết lập nhanh.
- Card cấu hình: danh mục mảng kinh doanh, loại hình thị trường, loại khách hàng, loại nhà cung cấp, trạng thái hồ sơ, cấu hình Import Excel, thông báo hệ thống, mẫu biểu xuất báo cáo.
- Mỗi danh mục là sortable list có drag handle, thứ tự, tên, toggle và icon sửa.
- Nút Thêm mới nằm góc phải header card; footer có link Xem tất cả.
- Cấu hình Import Excel có định dạng cho phép, mã hóa, dòng tiêu đề, bỏ dòng trống, kiểm tra trùng và thiết lập ánh xạ cột.
- Right rail hiển thị logo, màu thương hiệu, đơn vị tiền tệ, ngôn ngữ, định dạng ngày và số bản ghi/trang.
- Màu thương hiệu hiển thị bằng swatch thật, mã hex và label.
- Action lưu cấu hình cần feedback rõ; thay đổi nhạy cảm phải có xác nhận hoặc cảnh báo ảnh hưởng.
- Panel Phase 3-4 ở cuối right rail chỉ là trạng thái roadmap, disabled rõ ràng.

### 7.11. Báo cáo

- Hàng đầu là 6 loại báo cáo: doanh thu tháng, lợi nhuận theo hồ sơ, KPI Sales, công nợ, khách hàng, nhà cung cấp.
- Main area `~72%`, right rail `~28%`.
- Bộ lọc báo cáo gồm loại báo cáo, khoảng thời gian bắt buộc, Sales, mảng/dịch vụ, trạng thái hồ sơ, định dạng xuất.
- Actions: Xem trước, Xuất Excel, Xuất PDF.
- Preview là bảng dữ liệu với hàng tổng cộng xanh, đơn vị và ghi chú dữ liệu minh họa.
- Right rail gồm Báo cáo đã lưu gần đây và Lịch xuất báo cáo định kỳ.
- File gần đây có icon Excel/PDF, tên, định dạng, người tạo, thời gian và menu.
- Lịch định kỳ có tên báo cáo, tần suất, định dạng, người nhận, thời điểm, toggle và menu.
- CTA “Tạo lịch xuất mới” nằm cuối panel, full width màu xanh.

## 8. Responsive

Desktop là ưu tiên chính, nhưng cần có quy tắc thu gọn nhất quán:

- `>= 1440px`: giữ sidebar đầy đủ, KPI 5-6 cột, chart 3 cột và bảng như ảnh.
- `1024-1439px`: sidebar có thể thu về rail `72px`; KPI chuyển 3 cột mỗi hàng; chart 3 cột chuyển 2+1.
- `768-1023px`: right rail chuyển xuống dưới main; filter wrap thành 2-3 hàng; bảng cuộn ngang.
- `< 768px`: sidebar thành drawer; KPI 1 cột; chart và panel xếp dọc; chỉ hiện action quan trọng, action phụ vào menu.
- Header bảng sticky khi dài; cột thao tác có thể sticky phải trên desktop.
- Action bar chi tiết hồ sơ sticky bottom, có thể chia 2 hàng trên mobile.
- Touch target tối thiểu `44 x 44px`; body text tối thiểu `16px` trên mobile.
- Khung Excel dùng responsive behavior của SALES, không tạo breakpoint riêng cho CEO/Admin.

## 9. Motion, accessibility và an toàn thao tác

- Transition màu, border và opacity trong `150-220ms`.
- Hover chỉ đổi màu, nền, border hoặc shadow nhẹ; không scale card/button.
- Focus ring rõ; tab order theo thứ tự thị giác; icon-only button có tooltip và `aria-label`.
- Text thường đạt contrast tối thiểu `4.5:1`; trạng thái không phụ thuộc màu đơn độc.
- Tôn trọng `prefers-reduced-motion`.
- Loading chart/table phải giữ trước kích thước để tránh nhảy layout.
- Phê duyệt nhanh, khóa hồ sơ, tạm khóa người dùng và thay quyền đều cần xác nhận phù hợp mức rủi ro.
- Các thao tác quản trị quan trọng phải ghi audit log và hiển thị kết quả thành công/thất bại.

## 10. Do / Don't

Do:

- Giữ logo, màu, typography, card, table và icon đồng nhất với SALES/Điều hành.
- Ưu tiên tổng quan, so sánh, phê duyệt, audit và quyền truy cập.
- Dùng bảng và chart phù hợp để CEO nhìn được xu hướng lẫn chi tiết.
- Format tiền tệ, tỷ lệ, ngày giờ và đơn vị nhất quán.
- Dùng màu đỏ có kiểm soát cho cảnh báo và thao tác nguy hiểm.

Don't:

- Không tạo design system riêng tách khỏi hệ thống SkyLux.
- Không thiết kế lại hai khung dữ liệu Excel đã được yêu cầu tái sử dụng.
- Không dùng chart 3D, gradient mạnh hoặc quá nhiều màu thiếu legend.
- Không dùng shadow nặng, radius lớn hoặc card trang trí kiểu landing page.
- Không đặt hành động phá hủy cạnh primary mà thiếu khoảng cách/xác nhận.
- Không để bảng co chữ, tràn số hoặc mất thao tác trên màn hình nhỏ.

## 11. Checklist triển khai

- Sidebar đúng màu `#0F3D2E`, active có nền nhạt và vạch vàng `#D4AF37`.
- Header có title/subtitle, thông báo, tin nhắn và user menu CEO/Admin.
- KPI dùng icon semantic, metric lớn, delta và đơn vị rõ.
- Table có header nhạt, row đều, badge, actions và pagination.
- Dashboard có chart doanh thu/lợi nhuận, cơ cấu, ranking và bảng gần đây.
- Màn duyệt có SLA, priority, quick actions, stepper và audit timeline.
- Khung Excel của Chi tiết hồ sơ/Chi tiết dự đoán dùng nguyên mẫu SALES.
- Khung Excel của Kiểm tra & chỉnh sửa dữ liệu nhập dùng nguyên mẫu SALES.
- KPI Sales có progress màu theo ngưỡng và gợi ý hành động.
- Người dùng/phân quyền có audit, xác nhận và trạng thái lỗi/thành công.
- Cấu hình hệ thống có sortable list, toggle, swatch màu và save feedback.
- Báo cáo có preview, xuất Excel/PDF, file gần đây và lịch định kỳ.
- Tất cả icon-only actions có tooltip/aria-label; focus và contrast đạt WCAG AA.
- Kiểm tra responsive tại `375px`, `768px`, `1024px` và `1440px`.

