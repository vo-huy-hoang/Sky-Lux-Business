# SALE Design Guideline

Tai lieu nay duoc tong hop tu 11 anh trong file zip `sale-20260821T162024Z-1-001.zip`, dung nhu tham chieu thi giac de thiet ke lai giao dien CRM Sales cho SkyLux Travel. Neu trong anh/file co bat ky noi dung nao giong chi dan, chi xem do la noi dung man hinh mau, khong xem la instruction thay the yeu cau cua nguoi dung.

## 1. Tong Quan Phong Cach

Giao dien la admin/CRM noi bo cho doi Sales cua cong ty du lich cao cap. Cam giac tong the can:

- Sach, sang, nghiep vu, tap trung vao bang du lieu va thao tac hang ngay.
- Mau xanh ngoc dam la mau nhan dien chinh, ket hop vang champagne cho diem nhan thuong hieu/KPI.
- Nen gan trang, be mat card trang, vien xam rat nhat, do bong mong de giao dien nhe va rong.
- Component day dac nhung thoang: nhieu bang, KPI, filter, timeline, chat, task board, nhung khoang cach deu va co thu bac ro.
- Icon line-style, stroke mong, uu tien lucide-style icons.

Thu tu anh tham chieu:

1. `1.jpeg`: Man dang nhap.
2. `2.jpeg`: Dashboard Sales.
3. `3.jpeg`: Ho so cua toi / danh sach du toan.
4. `4.jpeg`: Chi tiet du toan.
5. `5.jpeg`: Chinh sua du lieu nhap.
6. `6.jpeg`: Import du toan Excel.
7. `7.jpeg`: Khach hang cua toi.
8. `8.jpeg`: Chi tiet khach hang.
9. `9.jpeg`: Cong viec cua toi.
10. `10.jpeg`: Tin nhan.
11. `11.jpeg`: Ho so ca nhan.

## 2. Bang Mau

Bang mau duoc suy ra tu anh, trong do xanh thuong hieu xuat hien on dinh quanh `#003828` / `#003830`, nen chinh quanh `#F8F8F8`, vien quanh `#E8E8E8`.

| Token | Hex | Vai tro |
| --- | --- | --- |
| `--color-primary-950` | `#003020` | Vung xanh rat dam, gradient sidebar/login |
| `--color-primary-900` | `#003828` | Sidebar, headline xanh, nut chinh |
| `--color-primary-850` | `#003830` | Nen sidebar chinh |
| `--color-primary-800` | `#004030` | Hover/active tren sidebar |
| `--color-primary-700` | `#00543D` | Nut chinh, active tab underline |
| `--color-primary-600` | `#007A55` | Icon success, CTA hover |
| `--color-primary-soft` | `#EAF5EF` | Nen icon xanh, badge thanh cong |
| `--color-primary-soft-2` | `#DFF1E7` | Bong/nen chat cua user |
| `--color-gold` | `#D6A51F` | Logo, badge so thong bao, KPI progress |
| `--color-gold-strong` | `#F0C020` | Donut/chart vang, icon KPI |
| `--color-gold-soft` | `#FFF6DF` | Nen canh bao nhe, card icon vang |
| `--color-warning` | `#F59E0B` | Trang thai dang xu ly/canh bao |
| `--color-warning-soft` | `#FFF7E8` | Nen row canh bao |
| `--color-danger` | `#D93737` | Loi import, qua han, can xu ly |
| `--color-danger-soft` | `#FFF1F2` | Nen row loi/card loi |
| `--color-info` | `#2F80ED` | Trang thai moi nhap, thong tin phu |
| `--color-info-soft` | `#EEF5FF` | Badge xanh duong nhat |
| `--color-purple` | `#7C5CCB` | Trang thai da gui/de xuat, donut |
| `--color-purple-soft` | `#F3F0FF` | Badge tim nhat |
| `--color-bg` | `#F8F8F8` | Nen toan app |
| `--color-surface` | `#FFFFFF` | Card, bang, form |
| `--color-surface-muted` | `#F9FAFA` | Header bang, filter bar |
| `--color-border` | `#E8E8E8` | Vien card/input/table |
| `--color-divider` | `#F0F0F0` | Duong chia noi bo |
| `--color-text` | `#111827` | Tieu de va noi dung chinh |
| `--color-text-muted` | `#6B7280` | Mo ta, metadata |
| `--color-text-soft` | `#9CA3AF` | Placeholder, disabled |

CSS variables goi y:

```css
:root {
  --color-primary-950: #003020;
  --color-primary-900: #003828;
  --color-primary-850: #003830;
  --color-primary-800: #004030;
  --color-primary-700: #00543d;
  --color-primary-600: #007a55;
  --color-primary-soft: #eaf5ef;
  --color-primary-soft-2: #dff1e7;
  --color-gold: #d6a51f;
  --color-gold-strong: #f0c020;
  --color-gold-soft: #fff6df;
  --color-warning: #f59e0b;
  --color-warning-soft: #fff7e8;
  --color-danger: #d93737;
  --color-danger-soft: #fff1f2;
  --color-info: #2f80ed;
  --color-info-soft: #eef5ff;
  --color-purple: #7c5ccb;
  --color-purple-soft: #f3f0ff;
  --color-bg: #f8f8f8;
  --color-surface: #ffffff;
  --color-surface-muted: #f9fafa;
  --color-border: #e8e8e8;
  --color-divider: #f0f0f0;
  --color-text: #111827;
  --color-text-muted: #6b7280;
  --color-text-soft: #9ca3af;
}
```

## 3. Typography

Dung font sans hien dai, uu tien `Inter`, `SF Pro Display`, `SF Pro Text`, hoac fallback `system-ui`.

| Thanh phan | Size / Line-height | Weight | Ghi chu |
| --- | --- | --- | --- |
| Login hero title | 36-40 / 1.15 | 700 | "SkyLux Travel" tren man login |
| Page title | 26-30 / 1.2 | 700 | Tieu de: Bang dieu khien Sales, Ho so cua toi |
| Section title | 18-20 / 1.35 | 650-700 | Title trong card/panel |
| Card metric number | 28-32 / 1.1 | 700 | So KPI: 78%, 568, 1.250... |
| Body | 14-15 / 1.5 | 400-500 | Bang, mo ta, chat |
| Table header | 13-14 / 1.4 | 600 | Nen xam nhat |
| Metadata | 12-13 / 1.4 | 400-500 | Ngay gio, label phu |
| Button | 14-15 / 1.2 | 600 | Nut chinh va phu |

Khong dung letter-spacing am. Tieu de nen den gan `#111827`, cac label phu dung `#6B7280`.

## 4. Layout Shell

### Desktop App Shell

- Khung thiet ke chinh theo anh 2-11 la `1672 x 941`.
- Sidebar trai co chieu rong khoang `228px`, full height, nen xanh dam.
- Content area bat dau sau sidebar, nen `#F8F8F8`.
- Topbar cao khoang `64-68px`, nen trang, vien duoi `1px #E8E8E8`.
- Noi dung co padding ngang `28-32px`, padding tren `20-28px`.
- Luoi spacing nen theo don vi 8px: `8, 12, 16, 20, 24, 32`.

### Sidebar

- Nen gradient rat nhe tu `#003828` sang `#003020` hoac solid `#003830`.
- Logo nam tren cung, canh giua, kich thuoc khoang `110-125px`.
- Menu item cao `48-56px`, padding ngang `20-24px`, radius `8-10px`.
- Active item: nen `rgba(255,255,255,0.08-0.12)`, text trang, icon trang.
- Inactive item: text `rgba(255,255,255,0.86)`, icon line mau trang.
- Badge tin nhan/thong bao: tron mau vang `#D6A51F`, text trang, size `22-24px`.
- Footer ho tro o day sidebar, co icon tai nghe/dien thoai, text vang cho so hotline.

### Topbar

- O tim kiem o trai, rong `500-560px`, cao `40-44px`, radius `8px`, vien `#E8E8E8`.
- Placeholder mau `#9CA3AF`.
- Shortcut `⌘ K` nam trong o tim kiem, canh phai.
- Ben phai gom icon chuong co badge vang, avatar tron `40-44px`, ten nguoi dung, role, chevron.

## 5. Component System

### Card

- Nen `#FFFFFF`, vien `1px solid #E8E8E8`, radius `8-10px`.
- Shadow rat nhe: `0 1px 2px rgba(16, 24, 40, 0.04)` va `0 8px 24px rgba(16, 24, 40, 0.03)` cho card lon.
- Padding: card KPI `20-24px`; card noi dung/bang `16-20px`.
- Khong lam card qua trang tri; uu tien be mat lam viec ro rang.

### KPI Cards

Can co icon tron/phu:

- Icon container `56-64px`, radius `50%`.
- Nen icon theo loai: xanh `#EAF5EF`, vang `#FFF6DF`, tim `#F3F0FF`, do `#FFF1F2`, xanh duong `#EEF5FF`.
- So chinh dung `#003828`, size `28-32px`, weight 700.
- Delta tang: mui ten len nho mau xanh `#007A55`.
- Progress KPI dung thanh vang `#D6A51F` tren track `#E8E8E8`.

### Buttons

- Primary: nen `#00543D` hoac `#003828`, text trang, radius `8px`, cao `44-48px`.
- Primary hover: `#007A55`.
- Secondary/outline: nen trang, vien `#B7D3C7` hoac `#D0D0D0`, text `#003828`.
- Danger khong dung cho nut lon neu khong can; chi dung cho loi/huy.
- Icon button hinh vuong `36-40px`, radius `8px`, vien nhat.
- Button co icon trai/phai, icon stroke `18-20px`.

### Inputs / Selects / Filters

- Cao `40-44px`, radius `8px`, vien `#E8E8E8`, nen trang.
- Focus: vien `#00543D`, shadow nhe `0 0 0 3px rgba(0, 84, 61, 0.10)`.
- Filter bar la card ngang, chua search input, selects, date picker, CTA.
- Label input size `13-14px`, mau text chinh; placeholder mau `#9CA3AF`.

### Tables

- Bang la pattern quan trong nhat.
- Header nen `#F9FAFA`, chu dam `#374151`, cao `44-48px`.
- Row cao `48-56px`, vien duoi `1px #F0F0F0`.
- Text trong cell size `14px`.
- Row hover nen `#F9FAFA`.
- Row warning: nen `#FFF7E8`, text/icon vang `#F59E0B`.
- Row error: nen `#FFF1F2`, text/icon do `#D93737`.
- Tong cong row: nen xanh rat nhat `#EAF5EF`, text tong tien mau `#003828`, weight 700.
- Action trong bang nen la nut outline nho co icon mat/pen/send/menu.

### Badges / Status

Dung badge pill radius `6-999px`, padding `4px 8px`, font `12-13px`, weight 500-600.

| Trang thai | Text | Nen |
| --- | --- | --- |
| Moi nhap | `#2F80ED` | `#EEF5FF` |
| Dang xu ly | `#F59E0B` | `#FFF7E8` |
| De xuat / Da gui | `#7C5CCB` | `#F3F0FF` |
| Dam phan | `#2684C7` | `#EAF6FF` |
| Thanh cong / Da duyet / Hop le | `#007A55` | `#EAF5EF` |
| Da huy / Loi | `#D93737` | `#FFF1F2` |
| Moi / Disabled | `#6B7280` | `#F0F0F0` |

### Tabs

- Tabs nam trong card chi tiet, height `48-56px`.
- Active tab: text `#003828`, icon cung mau, underline `2px #00543D`.
- Inactive: text `#6B7280`.
- Noi dung tab cach header tab `16-20px`.

### Timeline / Activity

- Timeline dung dot mau theo trang thai, duong doc `#E8E8E8`.
- Moi item co title dam, nguoi thuc hien/role, mo ta, timestamp canh phai.
- Panel phu thuong nam ben phai, rong `340-380px`.

### Empty / Info / Alert States

- Info bar vang nhat: nen `#FFF6DF`, vien `#F0C020`, icon info vang.
- Empty state: icon line mau `#D0D0D0`, title `#6B7280`, mo ta `#9CA3AF`.
- Error summary card: title dam, moi dong loi co icon do/vang, mo ta nho ben duoi.

## 6. Man Hinh Theo Anh Tham Chieu

### 1. Dang Nhap

Bo cuc:

- Nen toan trang `#F8F8F8` co hoa tiet du lich rat mo: duong bay net dut, pin dia diem, skyline, may bay, ban do/qua dia cau opacity thap.
- Container lon nam giua, co radius `14-16px`, shadow nhe.
- Chia 2 cot: cot trai xanh dam `~48%`, cot phai form `~52%`.
- Cot trai co logo, loi chao, title `SkyLux Travel`, subcopy, gach vang nho, minh hoa dashboard line-art opacity 12-20%.
- Cot phai co form canh giua theo chieu doc, max width `440-480px`.

Chi tiet form:

- Title "Dang nhap he thong" mau `#003828`.
- Input email/password cao `56px`, icon trai, password co icon eye phai.
- Checkbox "Ghi nho dang nhap" mau checked `#003828`.
- CTA "Dang nhap" full width, cao `56px`, nen xanh, icon arrow phai.
- Divider "hoac" voi 2 line ngang.
- Link phu: "Quen mat khau?", "Dang ky tai khoan".
- Footer copyright va version o day.

### 2. Dashboard Sales

Bo cuc:

- Sau topbar la page heading va subtitle.
- Hang KPI 4 cot: doanh thu, ho so dang xu ly, khach hang dang cham soc, KPI ca nhan.
- Luoi chinh: chart duong lon ben trai `2/3`, donut + task list ben phai.
- Ben duoi: bang ho so gan day rong lon, panel nhac nho tu dieu hanh ben phai.

Thanh phan can co:

- Chart doanh thu mau xanh, line co dot, fill gradient xanh rat nhat.
- Donut nhieu mau: tim, vang, xanh duong, xanh la, do; giua donut hien tong so.
- Task list co checkbox, title, cong ty, gio trong pill mau do/vang/xanh duong.
- Bang recent records co status dot va cot cap nhat cuoi.

### 3. Ho So Cua Toi / Danh Sach Ho So

Bo cuc:

- Filter/search card ngang tren cung: search, trang thai, thoi gian, loai hinh, khach hang, nut import Excel.
- KPI row 4 cot: tong ho so, cho xu ly, can bo sung, da duyet.
- Bang danh sach full width, co pagination day.

Bang:

- Cot: Ma ho so, Khach hang, Tuyen/Chuong trinh, Ngay di, Trang thai, Gia tri du toan, Dieu hanh phu trach, Cap nhat cuoi, Thao tac.
- Status badge mau nhe theo loai.
- Action la outline button "Xem chi tiet" hoac "Chinh sua du lieu nhap", kem chevron/menu.
- Footer bang co so dong moi trang va pagination.

### 4. Chi Tiet Du Toan

Bo cuc:

- Breadcrumb tren title.
- Summary cards ngang: khach hang, tuyen, ngay di, trang thai, tong doanh thu, tong chi phi, loi nhuan.
- Tabs: Thong tin chung, Doanh thu, Chi phi, Tai lieu, Trao doi.
- Main content `~72%`, sidebar phu `~28%`.
- Main content gom nhieu bang doanh thu/chi phi.
- Sidebar gom lich su xu ly va ghi chu tu dieu hanh.
- Day man co nut outline va primary: Chinh sua du lieu nhap, Tai file goc, Gui dieu hanh.

Chi tiet:

- Summary icon tron mau nhe.
- Loi nhuan co phan tram xanh trong ngoac.
- Tab active underline xanh.
- Bang tong cong co row nen xanh nhat.

### 5. Chinh Sua Du Lieu Nhap

Bo cuc:

- Title lon: "Chinh sua du lieu nhap - HS02567".
- Info banner vang nhat ngay duoi title.
- File summary card: icon Excel, file nguon, thoi gian import, tong dong, dong hop le, dong loi.
- Main table ben trai, panel loi/ghi chu ben phai.
- Bottom action bar sticky, nen trang, vien tren, co autosave status.

Bang edit:

- Cell co input/select inline.
- Row warning nen vang nhat; row error nen do nhat.
- Trang thai hop le co dot xanh; canh bao co triangle vang; loi co icon tron do.
- Input loi co vien do; input canh bao co vien vang.
- Section title co chip "Chinh sua truc tiep tren bang".

Bottom action bar:

- Trai: "Da luu lan cuoi..." va "Tu dong luu".
- Phai: Huy, Gui dieu hanh lai, Luu nhap.
- Primary "Luu nhap" mau xanh.

### 6. Import Du Toan Excel

Bo cuc:

- Header co title va subtitle.
- Quy trinh theo buoc: tai mau file, tai len file, file da chon, xem truoc du lieu, ket qua kiem tra.
- Card upload co border dashed, icon cloud upload, CTA chon file.
- Sidebar phai gom checklist luu y va ket qua kiem tra.
- Bottom co actions: Tai lai file, Kiem tra file, Xac nhan import.

Bang preview:

- Hien 10 dong dau tien.
- Dong loi nen do nhat, cot loi co text do.
- Badge hop le mau xanh.

### 7. Khach Hang Cua Toi

Bo cuc:

- KPI row 4 cot: tong khach hang, dang cham soc, dang bao gia, da phat sinh ho so.
- Filter row: loai khach hang, trang thai, nguon khach, reset, them khach hang.
- Bang khach hang rong full width.

Bang:

- Avatar chu cai tron hoac icon doanh nghiep.
- Badge loai: ca nhan xanh nhat, doanh nghiep xanh duong nhat.
- Cot nhu cau gan nhat gom ten tour va thang.
- Cot ho so la badge so nho.
- Action: eye icon va menu ba cham.

### 8. Chi Tiet Khach Hang

Bo cuc:

- Nut back tren title.
- Hero card thong tin khach hang: avatar/icon doanh nghiep, ten, badge loai, thong tin lien he.
- Ben phai hero card co 4 KPI nho: so ho so, doanh thu du toan, ho so gan nhat, trang thai cham soc.
- Noi dung duoi chia 2 cot: trai contacts + tabs/bang ho so, phai hoat dong gan day.

Activity panel:

- Item co icon tron theo loai: call, document, chat.
- Timestamp canh phai, nguoi thuc hien duoi.

### 9. Cong Viec Cua Toi

Bo cuc:

- KPI cards: hom nay, qua han, cho xu ly, hoan thanh tuan nay.
- Segmented control: Hom nay / Tuan nay / Tat ca.
- Kanban 3 cot: Can lam, Dang xu ly, Hoan thanh.
- Sidebar phai: lich nhac viec va viec lien quan den ho so.

Task card:

- Card nho trong cot, radius 8, border nhat.
- Title dam, ho so/cong ty metadata.
- Ngay gio co icon calendar.
- Priority dot/text: cao do, trung binh vang, thap xanh.
- Checklist task con voi checkbox.
- Progress mini bar mau xanh.
- Menu ba cham o goc phai.

### 10. Tin Nhan

Bo cuc:

- 3 cot: danh sach hoi thoai trai, khung chat giua, thong tin hoi thoai phai.
- Danh sach hoi thoai co search, filter icon, avatar initials tron, preview, time, unread badge.
- Header chat co avatar, ten hoi thoai, so thanh vien, icons call/video/info.
- Khung chat nen rat nhat, bubble nguoi khac trang, bubble cua minh xanh nhat.
- Composer bottom co input, attach, emoji, nut gui mau xanh.
- Panel phai co thong tin ho so lien quan, progress status, alert vang, tep dinh kem.

Status progress:

- 4 buoc: Tiep nhan, Dang xu ly, Cho duyet, Hoan tat.
- Buoc active mau xanh, buoc chua toi mau xam.

### 11. Ho So Ca Nhan

Bo cuc:

- Page title + subtitle.
- Hang dau: profile card lon ben trai, 3 KPI cards ben phai.
- Hang giua: cai dat tai khoan, form thong tin dang nhap, cai dat thong bao.
- Hang duoi: lich su hoat dong gan day full width.
- Footer copyright canh giua.

Chi tiet:

- Avatar lon `96-112px`, ten dam, verified badge vang.
- Toggle active mau xanh, inactive xam.
- Form password co icon eye.
- Nut cap nhat mat khau full width mau xanh.

## 7. Responsive

Desktop la uu tien chinh. Cho tablet/mobile:

- Sidebar thu gon thanh icon rail `72px`, logo rut gon.
- Topbar search co the thu gon thanh icon search; profile van o phai.
- KPI cards chuyen 4 cot -> 2 cot -> 1 cot.
- Bang co horizontal scroll, giu header sticky neu co the.
- Layout 2/3 cot chuyen thanh 1 cot, panel phu nam duoi main content.
- Chat 3 cot chuyen thanh danh sach -> chat -> info drawer, khong chen ca 3 cot tren mobile.
- Bottom action bar trong man edit/import can sticky bottom va nut xep 1-2 hang tuy chieu rong.

## 8. Motion Va Interaction

- Hover card/action: tang shadow rat nhe, border xanh nhat.
- Button hover: doi xanh sang `#007A55`, transition `150ms ease`.
- Focus state ro nhung nhe, dung ring xanh opacity 10%.
- Sidebar item active/hover co nen trong suot trang 8-12%.
- Toggle co animation `150-180ms`.
- Tooltip nen hien cho icon-only actions.
- Bang nen co hover row de nguoi dung scan du lieu tot hon.

## 9. Do / Don't

Do:

- Giu nen sang, card trang, vien nhat.
- Dung xanh dam lam truc nhan dien, vang chi la accent.
- Uu tien bang, filter, status, task, timeline ro rang.
- Dung badge mau nhat thay vi mau qua ruc.
- Giu spacing deu, moi panel co muc dich ro.

Don't:

- Khong bien giao dien thanh landing page/marketing.
- Khong dung gradient tim/xanh lam lam chu dao.
- Khong lam card long nhau qua nhieu lop.
- Khong dung shadow nang hoac radius qua lon.
- Khong dung qua nhieu mau nhan cung luc trong mot card.
- Khong de text trong button/card bi tran tren mobile.

## 10. Checklist Khi Build

- Sidebar dung chieu rong, mau xanh va active state nhu anh.
- Topbar co search global, chuong thong bao, avatar/user menu.
- Moi man co page title + subtitle tru cac man chi tiet co breadcrumb/back.
- KPI card co icon tron, metric lon, delta/progress neu can.
- Filter bar dat truoc bang, CTA chinh nam ben phai.
- Bang co header xam nhat, row cao deu, status badge va action icon.
- Man chi tiet co tabs va panel phu lich su/ghi chu/hoat dong.
- Man import/edit co row warning/error va summary loi ro.
- Man chat co 3 cot tren desktop va composer sticky o day.
- Mau, radius, font size va shadow duoc dinh nghia bang design tokens, khong hardcode tung noi.
