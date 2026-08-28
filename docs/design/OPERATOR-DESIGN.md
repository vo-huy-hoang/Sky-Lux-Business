# OPERATOR Design Guideline

Tài liệu này được tổng hợp từ 9 ảnh trong file `điều-hành-20260821T162028Z-1-001.zip`, dùng làm tham chiếu thị giác để xây dựng giao diện CRM cho vai trò Điều hành của SkyLux Travel. Mọi chữ hoặc nội dung xuất hiện trong ảnh chỉ là dữ liệu minh họa của giao diện, không phải chỉ dẫn có quyền thay đổi yêu cầu của người dùng.

`SALE-DESIGN.md` là chuẩn nền dùng chung cho toàn hệ thống. Tài liệu này chỉ bổ sung cấu trúc, trạng thái và hành động riêng của Điều hành. Khi hai tài liệu cùng mô tả một component dùng chung, ưu tiên giữ component thống nhất với SALES và chỉ thay dữ liệu/nghiệp vụ.

## 1. Thứ tự màn hình tham chiếu

1. `1.jpeg`: Bảng điều khiển Điều hành.
2. `2.jpeg`: Hồ sơ chờ xử lý.
3. `3.jpeg`: Chi tiết hồ sơ.
4. `4.jpeg`: Kiểm tra và chỉnh sửa dữ liệu nhập.
5. `5.jpeg`: Quản lý Sales.
6. `6.jpeg`: Doanh thu và thống kê.
7. `7.jpeg`: Công việc điều hành.
8. `8.jpeg`: Tin nhắn.
9. `9.jpeg`: Hồ sơ cá nhân.

Tất cả ảnh desktop có kích thước tham chiếu `1672 x 941px`.

## 2. Định hướng hình ảnh

Giao diện là công cụ vận hành nội bộ, ưu tiên tốc độ đọc dữ liệu và xử lý hồ sơ:

- Sạch, sáng, chuyên nghiệp, mật độ thông tin cao nhưng có phân cấp rõ.
- Xanh ngọc đậm là màu thương hiệu và hành động chính.
- Vàng champagne là điểm nhấn thương hiệu, cảnh báo nhẹ và thông báo.
- Nền ứng dụng gần trắng; card trắng; viền xám rất nhạt; bóng đổ tối thiểu.
- Bảng, filter, KPI, biểu đồ và luồng duyệt là các thành phần chính.
- Icon dạng nét mảnh, đồng nhất một bộ như Lucide; không dùng emoji làm icon.
- Không dùng bố cục marketing, hero lớn, gradient trang trí hoặc card lồng card.

## 3. Bảng màu

Các mã dưới đây được ước lượng trực tiếp từ ảnh. Có thể tinh chỉnh nhẹ khi đối chiếu file logo gốc, nhưng cần giữ đúng tương quan màu.

| Token | Mã màu | Vai trò |
| --- | --- | --- |
| `--op-primary-950` | `#00382A` | Vùng xanh tối nhất, cuối gradient sidebar |
| `--op-primary-900` | `#004230` | Sidebar, nút chính, số liệu quan trọng |
| `--op-primary-850` | `#004533` | Nền sidebar chính |
| `--op-primary-800` | `#075440` | Hover/active đậm |
| `--op-primary-700` | `#08664D` | Link, tab active, progress, icon action |
| `--op-primary-600` | `#0B7A5B` | Success, tăng trưởng, trạng thái hoàn tất |
| `--op-primary-soft` | `#E8F3EE` | Nền icon/badge xanh |
| `--op-primary-soft-2` | `#DDEDE6` | Bubble chat và vùng active nhạt |
| `--op-gold` | `#D3A11B` | Logo, badge số, accent thương hiệu |
| `--op-gold-strong` | `#E2A800` | Biểu đồ, cảnh báo trung bình |
| `--op-gold-soft` | `#FFF7E2` | Nền cảnh báo nhẹ |
| `--op-orange` | `#E98219` | Cần bổ sung, cần hỗ trợ |
| `--op-orange-soft` | `#FFF1E6` | Nền badge/cell cần bổ sung |
| `--op-danger` | `#D94A4A` | Lỗi, quá hạn, từ chối |
| `--op-danger-soft` | `#FDECEC` | Nền lỗi và priority cao |
| `--op-info` | `#3487C8` | Chờ xác nhận, thông tin hệ thống |
| `--op-info-soft` | `#EAF4FC` | Nền badge xanh dương |
| `--op-purple` | `#8462C7` | Nhóm dữ liệu phụ, file/thông báo |
| `--op-purple-soft` | `#F2EEFB` | Nền icon tím |
| `--op-bg` | `#F8F9F8` | Nền toàn ứng dụng |
| `--op-surface` | `#FFFFFF` | Card, bảng, form, topbar |
| `--op-surface-muted` | `#FAFBFA` | Header bảng, filter, khu vực phụ |
| `--op-border` | `#E5E8E6` | Viền card/input/table |
| `--op-divider` | `#EEF0EF` | Đường chia nội bộ |
| `--op-text` | `#171A19` | Tiêu đề và nội dung chính |
| `--op-text-muted` | `#66706C` | Mô tả, metadata |
| `--op-text-soft` | `#98A09D` | Placeholder, disabled |

CSS variables gợi ý:

```css
:root {
  --op-primary-950: #00382a;
  --op-primary-900: #004230;
  --op-primary-850: #004533;
  --op-primary-800: #075440;
  --op-primary-700: #08664d;
  --op-primary-600: #0b7a5b;
  --op-primary-soft: #e8f3ee;
  --op-primary-soft-2: #ddede6;
  --op-gold: #d3a11b;
  --op-gold-strong: #e2a800;
  --op-gold-soft: #fff7e2;
  --op-orange: #e98219;
  --op-orange-soft: #fff1e6;
  --op-danger: #d94a4a;
  --op-danger-soft: #fdecec;
  --op-info: #3487c8;
  --op-info-soft: #eaf4fc;
  --op-purple: #8462c7;
  --op-purple-soft: #f2eefb;
  --op-bg: #f8f9f8;
  --op-surface: #ffffff;
  --op-surface-muted: #fafbfa;
  --op-border: #e5e8e6;
  --op-divider: #eef0ef;
  --op-text: #171a19;
  --op-text-muted: #66706c;
  --op-text-soft: #98a09d;
}
```

## 4. Typography

Ưu tiên `Inter`, sau đó `SF Pro Text`, `SF Pro Display`, `Roboto` và `system-ui`.

| Thành phần | Cỡ chữ / line-height | Weight |
| --- | --- | --- |
| Page title | `25-28px / 1.2` | `700` |
| Section title | `17-20px / 1.35` | `650-700` |
| KPI number | `27-31px / 1.1` | `700` |
| Card title | `14-16px / 1.4` | `600-650` |
| Body | `14-15px / 1.5` | `400-500` |
| Table header | `13-14px / 1.4` | `600` |
| Metadata/badge | `12-13px / 1.4` | `500-600` |
| Button | `14-15px / 1.2` | `600` |

Không dùng letter-spacing âm. Số liệu tiền tệ dùng tabular numbers để các cột thẳng hàng. Không dùng font monospace làm font giao diện chính.

## 5. App shell

### Sidebar

- Rộng khoảng `238px`, cao toàn viewport, cố định bên trái.
- Nền xanh `#004533`, có thể chuyển rất nhẹ xuống `#00382A` ở cuối trang.
- Logo tròn đặt ở đầu sidebar, vùng logo cao khoảng `190-200px`.
- Menu item cao `50-54px`, padding ngang `22-26px`, icon `21-23px`.
- Active item có nền trắng opacity `8-12%`, text trắng và vạch vàng `3px` bên trái.
- Inactive item dùng trắng opacity `88-92%`; hover tăng nền nhẹ, không phóng to.
- Badge số dùng nền vàng, chữ trắng, đường kính `22-24px`.
- Card phụ ở đáy sidebar chỉ dùng cho lộ trình phát triển hoặc hỗ trợ; bo góc `6-8px`, không quá nổi bật.

### Topbar

- Cao khoảng `78px`, nền trắng, border-bottom `1px solid var(--op-border)`.
- Bên trái: nút thu gọn sidebar, page title, subtitle hoặc breadcrumb.
- Bên phải: date picker, chuông thông báo, avatar, tên, vai trò và chevron.
- Date picker cao `40-44px`, rộng khoảng `190-220px`.
- Avatar `40-44px`; badge chuông dùng chấm hoặc số vàng nhỏ.

### Content area

- Bắt đầu sau sidebar, nền `var(--op-bg)`.
- Padding desktop khoảng `24-28px` theo cả hai chiều.
- Dùng spacing scale `4, 8, 12, 16, 20, 24, 32px`.
- Khoảng cách giữa các card chính `14-18px`.
- Content có thể cuộn; sidebar và topbar giữ cố định nếu ứng dụng cần làm việc dài.

## 6. Component dùng chung

### Card

- Nền trắng, border `1px solid var(--op-border)`, radius `8-10px`.
- Shadow rất nhẹ: `0 1px 2px rgba(16, 24, 20, 0.04)`.
- Card dashboard lớn có thể thêm `0 8px 24px rgba(16, 24, 20, 0.025)`.
- Padding KPI `20-24px`; panel/bảng `14-18px`.
- Không lồng một card trang trí vào card khác; dùng divider hoặc vùng nền phụ để chia nhóm.

### KPI card

- Icon nằm trong hình tròn `58-64px` với nền xanh, vàng, cam, đỏ hoặc xanh dương rất nhạt.
- Nhãn ở trên, metric lớn màu xanh đậm ở giữa, delta nhỏ ở dưới.
- Delta tăng dùng xanh; giảm xấu dùng đỏ; không đổi dùng dấu gạch và text xám.
- Với tỷ lệ phần trăm, hiển thị số chính và tỷ lệ trong ngoặc trên cùng một dòng khi đủ chỗ.

### Button

- Primary: nền `#08664D` hoặc `#004230`, chữ trắng, cao `42-46px`, radius `7-8px`.
- Primary hover: `#0B7A5B`; disabled giảm opacity và không cho click.
- Secondary: nền trắng, border `#CBD4D0`, chữ xanh đậm.
- Warning action: nền vàng/cam cho thao tác “Gửi yêu cầu bổ sung”; không dùng cho hành động duyệt.
- Icon-only button tối thiểu `40 x 40px`, có tooltip và `aria-label`.
- Trạng thái loading phải giữ nguyên chiều rộng nút để không làm xê dịch layout.

### Input, select và filter

- Cao `40-44px`, border `#E1E5E3`, radius `7-8px`, nền trắng.
- Focus dùng border xanh và ring `0 0 0 3px rgba(8, 102, 77, 0.10)`.
- Search full-width có icon kính lúp trái; filter select xếp thành một hàng ở desktop.
- Nút “Đặt lại” là secondary, đặt cuối hàng filter.
- Label không dùng placeholder thay cho tên trường.

### Table

- Header nền `#FAFBFA`, cao `44-48px`, text `#303733`, weight `600`.
- Row cao `49-56px`, border-bottom `1px solid var(--op-divider)`.
- Row hover nền `#FAFBFA`; không thay đổi kích thước hoặc border width khi hover.
- Số tiền canh phải; mã hồ sơ, ngày và tỷ lệ dùng chiều rộng ổn định.
- Hành động chính có thể là nút outline nhỏ; menu phụ dùng dấu ba chấm.
- Footer bảng gồm tổng số bản ghi, pagination và số dòng mỗi trang.
- Hàng tổng cộng dùng nền xanh rất nhạt, số tiền/lợi nhuận màu xanh đậm và weight `700`.

### Badge và trạng thái

Badge cao khoảng `24-26px`, radius `5-6px`, padding ngang `8px`, font `12-13px`.

| Trạng thái | Text/icon | Nền |
| --- | --- | --- |
| Mới tiếp nhận | `#0B7A5B` | `#E8F3EE` |
| Đang xử lý / Đang xem xét | `#B67B00` | `#FFF7E2` |
| Cần bổ sung / Cần hỗ trợ | `#D96B0B` | `#FFF1E6` |
| Chờ xác nhận | `#3487C8` | `#EAF4FC` |
| Đã duyệt / Hoàn tất / Hợp lệ | `#087653` | `#E7F4ED` |
| Lỗi / Quá hạn / Từ chối | `#D94A4A` | `#FDECEC` |
| Trung tính / Chưa bắt đầu | `#66706C` | `#F0F2F1` |

Không chỉ dựa vào màu: dùng thêm icon hoặc nhãn chữ để diễn đạt trạng thái.

### Chart

- Cột/bar chính dùng xanh đậm; chuỗi phụ dùng vàng.
- Donut dùng xanh, vàng, cam, xanh dương và đỏ, nhưng mỗi màu phải có legend rõ.
- Grid line mảnh `#EEF0EF`; trục và nhãn dùng text muted.
- Tooltip hiển thị tên chuỗi, giá trị đã format và thời điểm.
- Không dùng hiệu ứng 3D, gradient mạnh hoặc quá nhiều màu trên một biểu đồ.

### Timeline và stepper

- Timeline dọc dùng dot `8-10px`, đường nối `1px #D8DEDB`.
- Stepper duyệt hồ sơ có 5 bước, icon tròn `40-44px`; bước hiện tại có vùng nền xanh nhạt và nhãn “Hiện tại”.
- Bước đã hoàn thành dùng xanh và check; bước chưa tới dùng xám; đường chưa hoàn tất có thể dùng nét đứt.
- Thời gian, người thực hiện và vai trò hiển thị dưới tên bước hoặc sự kiện.

## 7. Cấu trúc từng màn hình

### 7.1. Bảng điều khiển Điều hành

- Hàng KPI 4 cột: hồ sơ chờ xử lý, cần bổ sung, doanh thu tháng này, Sales đang hoạt động.
- Hàng biểu đồ chính: doanh thu theo ngày `~39%`, tình trạng hồ sơ `~29%`, bảng KPI Sales `~32%`.
- Hàng cuối: việc cần xử lý hôm nay `~24%`, hồ sơ gần đây `~52%`, nhắc nhở/thông báo `~24%`.
- Biểu đồ doanh thu kết hợp cột xanh và line vàng.
- Donut tình trạng hồ sơ có tổng ở giữa, legend có số lượng và tỷ lệ.
- KPI Sales là bảng xếp hạng 5 người, ba hạng đầu có huy hiệu vàng/xám/cam.
- “Việc cần xử lý hôm nay” dùng icon màu theo mức độ, số lượng và badge ưu tiên.
- “Hồ sơ gần đây” dùng bảng cô đọng, pagination nhỏ ở footer.

### 7.2. Hồ sơ chờ xử lý

- Search full-width nằm trên hàng filter.
- Filter gồm trạng thái, thời gian, Sales phụ trách, loại hình và khách hàng; nút đặt lại ở cuối.
- KPI row 4 cột: tổng hồ sơ, chờ xử lý, cần bổ sung, đã duyệt.
- Bảng full-width gồm: mã hồ sơ, Sales phụ trách, khách hàng, tuyến/chương trình, ngày đi, trạng thái, giá trị dự toán, cập nhật cuối, thao tác.
- Hành động bình thường là “Xem chi tiết”; hồ sơ thiếu dữ liệu dùng “Yêu cầu bổ sung” màu cam.
- Footer có tổng số hồ sơ, pagination và số dòng mỗi trang.

### 7.3. Chi tiết hồ sơ

- Header có page title, mã hồ sơ và breadcrumb quay lại danh sách.
- Main area `~79%`, sidebar `~21%`.
- Đầu main area là stepper quy trình duyệt 5 bước: Draft, Đã gửi điều hành, Đang xem xét, Cần bổ sung, Đã duyệt.
- Dưới stepper là dải summary: khách hàng, Sales phụ trách, tuyến/chương trình, ngày đi, trạng thái hồ sơ, tổng doanh thu, tổng chi phí, lợi nhuận.
- Tabs: Thông tin chung, Doanh thu, Chi phí, Tài liệu, Trao đổi.
- Sidebar gồm lịch sử xử lý, thông tin Sales và ghi chú nội bộ của Điều hành.
- Thanh hành động sticky ở đáy: “Yêu cầu bổ sung”, “Lưu ghi chú”, “Duyệt hồ sơ”.
- “Duyệt hồ sơ” luôn là primary xanh; “Yêu cầu bổ sung” là outline cam.

Quy tắc đặc biệt cho dữ liệu Excel:

> Khung hiển thị dữ liệu từ Excel trong **Chi tiết hồ sơ / Chi tiết dự đoán** phải làm giống bên SALES. Tái sử dụng nguyên cấu trúc bảng doanh thu, bảng chi phí, hàng tổng cộng, format tiền tệ, tab và responsive behavior trong mục **Chi tiết Dự toán** của `SALE-DESIGN.md`. Không tạo một kiểu bảng Excel riêng cho Điều hành.

Điều hành chỉ bổ sung stepper duyệt, sidebar đánh giá/lịch sử và các nút nghiệp vụ; những phần này nằm ngoài component hiển thị dữ liệu Excel.

### 7.4. Kiểm tra và chỉnh sửa dữ liệu nhập

Quy tắc bắt buộc:

> Khung hiển thị dữ liệu Excel trong **Kiểm tra & chỉnh sửa dữ liệu nhập** phải làm giống bên SALES. Tái sử dụng nguyên component trong mục **Chỉnh sửa Dữ liệu Nhập** của `SALE-DESIGN.md`, gồm file summary, bảng edit inline, trạng thái hợp lệ/cảnh báo/lỗi, panel lỗi, ghi chú và action bar sticky.

Khác biệt duy nhất của màn Điều hành là ngữ cảnh và hành động:

- Title có mã hồ sơ đang kiểm tra.
- File summary hiển thị file nguồn, thời gian nhập, Sales nhập file, tổng dòng, hợp lệ, cảnh báo và lỗi.
- Panel phải có tabs Tất cả/Lỗi/Cảnh báo và link tới đúng dòng.
- Ghi chú gửi Sales có lịch sử trao đổi nội bộ.
- Action bar: Quay lại danh sách, Lưu chỉnh sửa, Gửi yêu cầu bổ sung, Duyệt dữ liệu.
- “Gửi yêu cầu bổ sung” màu vàng/cam; “Duyệt dữ liệu” màu xanh.
- Không thay đổi kích thước cell, logic validation, màu row hoặc cách responsive so với SALES.

### 7.5. Quản lý Sales

- KPI row: tổng Sales, đạt KPI, cần hỗ trợ, tổng hồ sơ từ Sales.
- Hàng biểu đồ chia 2 cột bằng nhau: KPI theo Sales và doanh thu theo Sales.
- Biểu đồ KPI là horizontal bar có avatar, phần trăm và dấu sao cho người vượt KPI.
- Biểu đồ doanh thu là vertical bar, hiển thị giá trị trên đầu cột.
- Bảng Sales gồm avatar/tên/email, doanh thu tháng, hồ sơ phụ trách, KPI progress, tỷ lệ chốt, hồ sơ chờ xử lý, trạng thái hỗ trợ và actions.
- Actions: xem chi tiết, giao việc, nhắn tin và menu phụ.
- Badge “Ổn định” xanh; “Cần hỗ trợ” cam.

### 7.6. Doanh thu và thống kê

- Header có nhóm actions: Xuất Excel, Xuất PDF, Tải báo cáo.
- Filter bar gồm thời gian, Sales, thị trường, loại hồ sơ và đặt lại.
- KPI row: tổng doanh thu, lợi nhuận ước tính, hồ sơ đã duyệt, tỷ lệ hoàn tất.
- Biểu đồ chia 3 cột: doanh thu theo tháng, doanh thu theo trạng thái hồ sơ, đóng góp doanh thu theo Sales.
- Donut có tổng doanh thu ở tâm; horizontal bar có giá trị và tỷ lệ ở cuối mỗi thanh.
- Bảng tổng hợp gồm Sales, số hồ sơ, doanh thu, chi phí, lợi nhuận và tỷ suất.
- Lợi nhuận dùng text xanh; hàng tổng cộng dùng nền xanh rất nhạt.

### 7.7. Công việc điều hành

- KPI row: hôm nay, quá hạn, chờ xử lý, hoàn thành tuần này.
- Main area gồm Kanban 4 cột: Cần làm, Đang xử lý, Chờ phản hồi, Hoàn thành; sidebar phải cho lịch nhắc việc và việc liên quan đến hồ sơ.
- Mỗi cột có số lượng, menu và nút thêm công việc ở đáy.
- Task card có title, mã hồ sơ, người/khách hàng liên quan, deadline, priority, checklist count và progress bar.
- Viền trái task chưa xong dùng vàng; hoàn thành dùng xanh.
- Priority cao đỏ, trung bình vàng, thấp xanh.
- Sidebar lịch dùng timeline theo giờ; panel tiến độ hồ sơ dùng progress bar nhiều màu nhưng giữ legend bằng chữ.

### 7.8. Tin nhắn

- Desktop dùng 3 cột: danh sách hội thoại `~27%`, chat `~48%`, hồ sơ liên quan `~25%` trong content area.
- Cột trái có search, filter, tabs Tất cả/Chưa đọc/Đã gắn sao, unread badge và pagination.
- Header chat có avatar/initials, tên hội thoại, trạng thái hoạt động, search và menu.
- Dưới header có banner vàng nhạt liên kết tới hồ sơ.
- Bubble của Điều hành dùng xanh rất nhạt, canh phải; bubble Sales nền trắng/xám nhạt, canh trái.
- Composer sticky ở đáy với attach, input, emoji và send icon xanh.
- Sidebar phải gồm thông tin hồ sơ, stepper trạng thái 5 bước và danh sách file đính kèm.
- File có icon theo định dạng, tên, dung lượng, tải xuống và menu.

### 7.9. Hồ sơ cá nhân

- Hàng đầu: profile card lớn `~41%` và 3 KPI cards ở phần còn lại.
- Profile card có avatar `116-132px`, tên, role badge, email, điện thoại, chức danh, ngày tham gia và nút chỉnh sửa.
- Hàng giữa gồm cài đặt tài khoản `~27%`, thông tin đăng nhập `~36%`, cài đặt thông báo `~37%`.
- Cài đặt tài khoản là danh sách action có icon tròn và chevron.
- Thông tin đăng nhập hiển thị email đã xác minh, mật khẩu che và nút đổi mật khẩu.
- Thông báo dùng toggle; active xanh, inactive xám.
- Lịch sử hoạt động full-width ở cuối với thời gian, hoạt động, chi tiết, IP, thiết bị và trạng thái.

## 8. Responsive

Desktop là ưu tiên chính, nhưng component phải có quy tắc thu gọn rõ:

- `>= 1440px`: giữ đầy đủ sidebar, các lưới 3-4 cột và bảng full width như ảnh.
- `1024-1439px`: sidebar có thể thu về rail `72px`; KPI chuyển 4 thành 2 cột nếu thiếu chỗ; chart 3 cột chuyển 2+1.
- `768-1023px`: panel phụ chuyển xuống dưới main content; filter wrap thành 2 hàng; bảng cuộn ngang.
- `< 768px`: sidebar thành drawer; KPI 1 cột; Kanban cuộn ngang từng cột hoặc chuyển dạng tabs; chat chỉ hiện một pane mỗi lần.
- Header bảng sticky khi bảng dài; cột hành động có thể sticky bên phải trên desktop.
- Action bar của chi tiết/edit giữ sticky bottom và được phép chia 2 hàng trên mobile.
- Cỡ chữ body tối thiểu `16px` trên mobile; touch target tối thiểu `44 x 44px`.
- Khung Excel tái sử dụng responsive behavior của SALES, không tạo breakpoint riêng cho Điều hành.

## 9. Motion và interaction

- Transition màu, border và opacity trong `150-220ms`.
- Hover row/card chỉ đổi nền, border hoặc shadow nhẹ; không scale component.
- Click từ panel lỗi phải scroll/focus đúng cell lỗi trong bảng Excel.
- Filter hoặc date range thay đổi phải hiển thị loading state mà không làm nhảy layout.
- Chart có tooltip khi hover/focus; legend có thể bật/tắt chuỗi nhưng vẫn hỗ trợ bàn phím.
- Focus ring phải nhìn rõ; tab order đi theo thứ tự thị giác.
- Tôn trọng `prefers-reduced-motion`.

## 10. Do / Don't

Do:

- Giữ cùng logo, màu, spacing, card, table và icon system với SALES.
- Ưu tiên luồng kiểm tra, duyệt, yêu cầu bổ sung và theo dõi lịch sử.
- Dùng bảng dữ liệu đặc, dễ scan và có tổng kết rõ.
- Dùng trạng thái bằng cả màu, icon và chữ.
- Format số tiền, ngày giờ, phần trăm thống nhất trên mọi màn.

Don't:

- Không tạo design system riêng tách khỏi SALES.
- Không thiết kế lại hai khung dữ liệu Excel đã được chỉ định tái sử dụng.
- Không dùng radius lớn, shadow nặng hoặc card trang trí kiểu landing page.
- Không lạm dụng màu vàng; vàng chỉ là accent/cảnh báo.
- Không dùng màu đỏ cho hành động duyệt hoặc action chính.
- Không để bảng bị co chữ, tràn cell hoặc mất action khi viewport nhỏ.

## 11. Checklist triển khai

- Sidebar đúng độ rộng, xanh đậm, active có nền nhạt và vạch vàng.
- Topbar có page title/subtitle, ngày, thông báo và user menu.
- Mỗi màn danh sách có search/filter trước KPI hoặc bảng theo đúng ảnh.
- KPI có icon tròn, metric lớn và delta rõ.
- Table có header nhạt, row đều, status badge, action và pagination.
- Màn chi tiết có stepper duyệt, summary, tabs, sidebar và sticky actions.
- Khung Excel của Chi tiết hồ sơ/Chi tiết dự đoán dùng nguyên mẫu SALES.
- Khung Excel của Kiểm tra & chỉnh sửa dữ liệu nhập dùng nguyên mẫu SALES.
- Dashboard và báo cáo dùng chart có legend, tooltip và format tiền tệ.
- Kanban có priority, checklist, progress và deadline.
- Chat desktop có 3 cột; mobile chuyển thành từng pane.
- Tất cả icon-only buttons có tooltip/aria-label; focus và contrast đạt WCAG AA.
- Kiểm tra responsive tại `375px`, `768px`, `1024px` và `1440px`.

