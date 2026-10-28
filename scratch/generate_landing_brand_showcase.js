const fs = require('fs');

const logoBuf = fs.readFileSync('frontend/public/brand/optrip-logo.png');
const markBuf = fs.readFileSync('frontend/public/brand/optrip-mark.png');
const logoB64 = 'data:image/png;base64,' + logoBuf.toString('base64');
const markB64 = 'data:image/png;base64,' + markBuf.toString('base64');

const html = `<!DOCTYPE html>
<html lang="vi" class="h-full bg-slate-50 text-slate-900 scroll-smooth">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>OPTRIP Landing Page - Ticket 03 Live Integration</title>
  <script src="https://cdn.tailwindcss.com"></script>
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
  <link href="https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;500;600;700;800;900&display=swap" rel="stylesheet">
  <style>
    body { font-family: 'Plus Jakarta Sans', sans-serif; }
    .glass-capsule {
      background: rgba(255, 255, 255, 0.95);
      backdrop-filter: blur(12px);
      box-shadow: 0 4px 20px -2px rgba(0, 0, 0, 0.3), inset 0 1px 1px rgba(255, 255, 255, 0.8);
      border: 1px solid rgba(255, 255, 255, 0.2);
    }
  </style>
</head>
<body class="min-h-full flex flex-col relative selection:bg-blue-600 selection:text-white">

  <!-- Top Sticky Navigation Bar (Doppelrand Floating Capsule) -->
  <header class="sticky top-4 z-50 w-full max-w-7xl mx-auto px-4 sm:px-6">
    <div class="p-1 rounded-full bg-slate-900/[0.04] ring-1 ring-slate-900/[0.06] backdrop-blur-2xl">
      <div class="bg-white/95 backdrop-blur-xl rounded-full px-5 sm:px-8 h-16 flex items-center justify-between shadow-[inset_0_1px_1px_rgba(255,255,255,0.9),0_10px_35px_-10px_rgba(0,0,0,0.06)]">
        
        <!-- OPTRIP Responsive Brand Logo -->
        <a href="#" class="group cursor-pointer">
          <span class="block sm:hidden">
            <img src="${markB64}" alt="OPTRIP" style="height: 38px; width: 38px; object-fit: contain;">
          </span>
          <span class="hidden sm:block">
            <img src="${logoB64}" alt="OPTRIP" style="height: 38px; width: 114px; object-fit: contain;">
          </span>
        </a>

        <!-- Navigation Links -->
        <nav class="hidden lg:flex items-center gap-8 text-sm font-semibold text-slate-700">
          <a href="#features" class="hover:text-blue-900 transition-colors py-1 flex items-center gap-1">
            <span>Sản phẩm</span>
            <span class="text-[10px] text-slate-400">▼</span>
          </a>
          <a href="#solutions" class="hover:text-blue-900 transition-colors py-1 flex items-center gap-1">
            <span>Giải pháp</span>
            <span class="text-[10px] text-slate-400">▼</span>
          </a>
          <a href="#features" class="hover:text-blue-900 transition-colors">Chức năng chính</a>
          <a href="#workflow" class="hover:text-blue-900 transition-colors">Quy trình</a>
          <a href="#trust" class="hover:text-blue-900 transition-colors">Cam kết</a>
        </nav>

        <!-- Right Action Button -->
        <div class="flex items-center">
          <button class="h-11 pl-6 pr-2 rounded-full text-white font-bold text-xs sm:text-sm bg-[#0A3574] hover:bg-[#082a5c] shadow-sm hover:shadow-lg hover:shadow-blue-950/20 active:scale-95 transition-all flex items-center gap-2 group cursor-pointer">
            <span>Đăng Ký Demo</span>
            <span class="w-7 h-7 rounded-full bg-white/20 flex items-center justify-center transition-all group-hover:translate-x-1 group-hover:bg-white/30">
              →
            </span>
          </button>
        </div>
      </div>
    </div>
  </header>

  <!-- Hero Section -->
  <section class="relative pt-12 pb-24 overflow-hidden bg-white">
    <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
      <div class="grid grid-cols-1 lg:grid-cols-12 gap-12 items-center">
        <!-- Left Hero Content -->
        <div class="lg:col-span-5 space-y-6 text-left">
          <!-- Eyebrow Badge -->
          <div class="p-1 rounded-full bg-slate-900/[0.04] ring-1 ring-slate-900/[0.08] inline-block">
            <div class="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-blue-50/90 text-[#0A3574] text-xs font-black uppercase tracking-[0.16em]">
              <span class="w-2 h-2 rounded-full bg-[#FECF07] animate-pulse"></span>
              OPTRIP • TRAVEL OPERATIONS PLATFORM
            </div>
          </div>

          <!-- Main Title -->
          <h1 class="text-3xl sm:text-5xl font-black text-slate-900 leading-[1.18] tracking-tight">
            Nền tảng quản trị <br>
            & điều hành tour <br>
            <span class="bg-clip-text text-transparent bg-gradient-to-r from-[#0A3574] to-[#0072CE]">
              CHUYÊN BIỆT CHO LỮ HÀNH
            </span>
          </h1>

          <!-- Slogan & Subtitle -->
          <p class="text-base text-slate-600 leading-relaxed font-medium">
            <strong class="text-slate-800">One Platform. Every Trip.</strong> Tự động bóc tách dự toán Excel trong 1.2 giây, kiểm soát biên lợi nhuận gộp từng đoàn tour và đóng băng giá bán thương mại bất biến.
          </p>

          <!-- CTAs -->
          <div class="flex flex-wrap items-center gap-4 pt-2">
            <button class="h-13 px-8 rounded-full text-white font-extrabold text-sm sm:text-base bg-[#0A3574] hover:bg-[#082a5c] shadow-lg shadow-blue-950/20 active:scale-95 transition-all flex items-center gap-3">
              <span>Đăng ký Demo</span>
              <span class="w-8 h-8 rounded-full bg-white/20 flex items-center justify-center">→</span>
            </button>
            <button class="h-13 px-7 rounded-full font-bold text-sm sm:text-base text-slate-800 border border-slate-300 hover:border-blue-900 hover:text-blue-900 bg-white transition-all flex items-center gap-2">
              <span>Xem quy trình</span>
              <span>↗</span>
            </button>
          </div>
        </div>

        <!-- Right App Preview Window -->
        <div class="lg:col-span-7">
          <div class="p-2.5 rounded-[2.2rem] bg-slate-900/[0.04] ring-1 ring-slate-900/[0.06] shadow-2xl">
            <div class="rounded-3xl border border-slate-200/90 bg-white overflow-hidden">
              <!-- Window Top Bar -->
              <div class="h-12 bg-slate-50 border-b border-slate-200/80 px-5 flex items-center justify-between">
                <div class="flex items-center gap-2">
                  <span class="w-3 h-3 rounded-full bg-rose-400"></span>
                  <span class="w-3 h-3 rounded-full bg-amber-400"></span>
                  <span class="w-3 h-3 rounded-full bg-emerald-400"></span>
                </div>
                <div class="flex items-center gap-2 px-3 py-1 rounded-full bg-white border border-slate-200 text-xs font-semibold text-slate-700">
                  <span>Ban Giám Đốc (CEO)</span>
                </div>
                <div class="text-xs text-slate-400 font-mono">OPTRIP Operations OS</div>
              </div>

              <!-- Workspace Card Preview -->
              <div class="p-6 space-y-4">
                <div class="p-4 rounded-2xl bg-slate-50/80 border border-slate-200/90 space-y-3">
                  <div class="flex items-center justify-between pb-2 border-b border-slate-200/60">
                    <div class="flex items-center gap-2">
                      <span class="px-2.5 py-1 rounded-md bg-blue-100 text-[#0A3574] text-xs font-black">
                        OPT-2026-089
                      </span>
                      <span class="font-extrabold text-sm text-slate-800">
                        Tokyo - Núi Phú Sĩ (6N5Đ)
                      </span>
                    </div>
                    <span class="text-xs font-black text-amber-600 bg-amber-50 px-2.5 py-1 rounded-full border border-amber-200">
                      Biên LN: 22.1% (+160tr)
                    </span>
                  </div>
                  
                  <div class="grid grid-cols-3 gap-2 text-center text-xs">
                    <div class="p-2 rounded-xl bg-white border border-slate-100">
                      <span class="text-[10px] text-slate-400 block">Doanh thu bán tour</span>
                      <strong class="text-xs font-black text-[#0A3574]">725,000,000 đ</strong>
                    </div>
                    <div class="p-2 rounded-xl bg-white border border-slate-100">
                      <span class="text-[10px] text-slate-400 block">Chi phí đối tác Net</span>
                      <strong class="text-xs font-bold text-slate-600">565,000,000 đ</strong>
                    </div>
                    <div class="p-2 rounded-xl bg-emerald-50 border border-emerald-100">
                      <span class="text-[10px] text-emerald-700 block">Lợi nhuận gộp</span>
                      <strong class="text-xs font-black text-emerald-800">160,000,000 đ</strong>
                    </div>
                  </div>

                  <div class="w-full py-2.5 rounded-xl bg-[#0A3574] text-white text-xs font-extrabold flex items-center justify-center gap-2">
                    <span>🔒 Phê Duyệt Giá Bán & Đóng Băng Dự Toán</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  </section>

  <!-- Corporate Dark Footer with Glass Capsule BrandLogo -->
  <footer class="bg-slate-950 text-white pt-16 pb-12 border-t border-white/10 mt-auto">
    <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-12">
      <div class="grid grid-cols-1 md:grid-cols-12 gap-10 pb-12 border-b border-white/10">
        <!-- Brand Info -->
        <div class="md:col-span-5 space-y-5">
          <div class="glass-capsule px-3 py-2 rounded-xl inline-flex items-center justify-center">
            <img src="${logoB64}" style="height: 48px; width: 144px; object-fit: contain;" alt="OPTRIP">
          </div>
          <p class="text-sm text-white/60 leading-relaxed max-w-sm">
            Nền tảng ERP/CRM quản trị điều hành tour, tự động bóc tách dự toán Excel, kiểm soát lợi nhuận gộp và quản lý chuỗi phê duyệt trạng thái khép kín cho doanh nghiệp lữ hành.
          </p>
          <div class="space-y-1 text-xs text-white/70">
            <div>Trụ sở: Tòa nhà OPTRIP Tower, Cầu Giấy, Hà Nội</div>
            <div>Hotline: 1900 6868 • Email: contact@optrip.vn</div>
          </div>
        </div>

        <!-- Quick Links -->
        <div class="md:col-span-7 flex flex-wrap justify-between gap-8 text-xs text-white/60">
          <div>
            <div class="font-bold text-sm text-white mb-3">Chức Năng Nền Tảng</div>
            <div class="space-y-2">
              <div>Bóc tách dự toán Excel</div>
              <div>Khóa biên lợi nhuận gộp</div>
              <div>Điều hành phân bổ cọc</div>
            </div>
          </div>
          <div>
            <div class="font-bold text-sm text-white mb-3">Giải Pháp Phân Hệ</div>
            <div class="space-y-2">
              <div>Ban Giám Đốc (CEO)</div>
              <div>Bộ Phận Điều Hành (Operator)</div>
              <div>Chuyên Viên Kinh Doanh (Sales)</div>
            </div>
          </div>
        </div>
      </div>

      <!-- Copyright -->
      <div class="flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-white/50">
        <div>© ${new Date().getFullYear()} OPTRIP Platform. Nền Tảng Quản Trị & Điều Hành Tour Lữ Hành Chuyên Biệt.</div>
        <div class="flex items-center gap-4">
          <span>Chính sách bảo mật</span>
          <span>Quy chuẩn dữ liệu NUMERIC(18,2)</span>
        </div>
      </div>
    </div>
  </footer>
</body>
</html>`;

fs.writeFileSync('C:/Users/Admin/.gemini/antigravity/brain/c3f2171c-5047-4928-ad14-83c8a2949a5f/optrip_landing_live_preview.html', html, 'utf8');
console.log('Preview generated successfully');

