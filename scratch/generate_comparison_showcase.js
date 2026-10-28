const fs = require('fs');

const markBuf = fs.readFileSync('frontend/public/brand/optrip-mark.png');
const darkLogoBuf = fs.readFileSync('frontend/public/brand/optrip-logo-dark.png');
const transLogoBuf = fs.readFileSync('frontend/public/brand/optrip-logo-transparent.png');
const rawLogoBuf = fs.readFileSync('frontend/public/brand/optrip-logo.png');

const markB64 = 'data:image/png;base64,' + markBuf.toString('base64');
const darkLogoB64 = 'data:image/png;base64,' + darkLogoBuf.toString('base64');
const transLogoB64 = 'data:image/png;base64,' + transLogoBuf.toString('base64');
const rawLogoB64 = 'data:image/png;base64,' + rawLogoBuf.toString('base64');

const html = `<!DOCTYPE html>
<html lang="vi" class="h-full bg-slate-950 text-slate-100">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>OPTRIP Logo Refinement Showcase - So Sánh Cải Tiến</title>
  <script src="https://cdn.tailwindcss.com"></script>
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
  <link href="https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;500;600;700;800;900&display=swap" rel="stylesheet">
  <style>
    body { font-family: 'Plus Jakarta Sans', sans-serif; }
  </style>
</head>
<body class="min-h-full p-6 md:p-12 flex flex-col items-center">
  <div class="max-w-6xl w-full space-y-12">
    
    <!-- Header -->
    <div class="border-b border-slate-800 pb-6 flex flex-col md:flex-row md:items-center justify-between gap-4">
      <div>
        <div class="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-xs font-semibold mb-2">
          <span class="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
          Đã Khắc Phục Lỗi "Dán Tấm Ảnh / Sticker"
        </div>
        <h1 class="text-3xl font-extrabold text-white tracking-tight">OPTRIP Brand Integration Refinement</h1>
        <p class="text-sm text-slate-400 mt-1">So sánh thực tế: Trước (Khung dán trắng thô) vs. Sau (Khử nền 100%, Native Vector Typography & White Text Logo)</p>
      </div>
      <div class="text-xs font-mono bg-emerald-950/60 border border-emerald-800 text-emerald-300 px-3 py-2 rounded-lg">
        ✓ 100% Transparent PNG Alpha<br>
        ✓ Native Brand-Bar Enterprise Mode
      </div>
    </div>

    <!-- Section 1: Dashboard Sidebar Comparison -->
    <div class="space-y-4">
      <div class="flex items-center justify-between">
        <h2 class="text-xl font-bold text-white flex items-center gap-2">
          <span>1. Giao diện Thanh bên Quản trị (Dashboard Sidebar)</span>
        </h2>
        <span class="text-xs text-slate-400 font-mono">Nền xanh lục đậm (#00382A)</span>
      </div>

      <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
        <!-- Before: Sticker Box -->
        <div class="rounded-2xl bg-slate-900 border border-rose-500/30 p-5 space-y-4">
          <div class="flex items-center justify-between pb-2 border-b border-slate-800">
            <span class="text-xs font-bold text-rose-400 flex items-center gap-1.5">
              <span>✕</span> TRƯỚC: Bị dán khung trắng (Thiếu chuyên nghiệp)
            </span>
            <span class="text-[10px] font-mono text-slate-500">Sticker Capsule</span>
          </div>

          <div class="bg-[#00382A] p-6 rounded-xl flex items-center justify-center min-h-[140px]">
            <!-- Old ugly white sticker -->
            <div class="bg-white/95 backdrop-blur-md px-3 py-1.5 rounded-xl border border-white/20 shadow-md">
              <img src="${rawLogoB64}" style="height: 38px; width: 114px; object-fit: contain;">
            </div>
          </div>
          <p class="text-xs text-slate-400 leading-relaxed">
            Logo nằm trong một chiếc hộp màu trắng nổi bần bật như miếng tem/sticker dán đè lên thanh menu xanh, gây cảm giác chắp vá và nặng nề.
          </p>
        </div>

        <!-- After: Native Brand-Bar -->
        <div class="rounded-2xl bg-slate-900 border border-emerald-500/40 p-5 space-y-4 shadow-xl shadow-emerald-950/20">
          <div class="flex items-center justify-between pb-2 border-b border-slate-800">
            <span class="text-xs font-bold text-emerald-400 flex items-center gap-1.5">
              <span>✓</span> SAU: Native Brand-Bar (Chuẩn Linear / Vercel SaaS)
            </span>
            <span class="text-[10px] font-mono text-emerald-400">Pure Vector & Mark</span>
          </div>

          <div class="bg-[#00382A] p-6 rounded-xl flex items-center justify-center min-h-[140px]">
            <!-- New pristine brand bar -->
            <div class="flex items-center gap-3 select-none px-3 py-2 rounded-xl hover:bg-white/5 transition-all cursor-pointer">
              <img src="${markB64}" style="height: 34px; width: 34px; object-fit: contain;" class="drop-shadow-sm">
              <div class="flex items-center gap-2">
                <span class="font-black text-xl tracking-tight text-white font-sans leading-none">OPTRIP</span>
                <span class="text-[9px] font-extrabold uppercase px-1.5 py-0.5 rounded bg-emerald-500/20 text-emerald-300 border border-emerald-400/25 tracking-wider">ERP</span>
              </div>
            </div>
          </div>
          <p class="text-xs text-emerald-300/80 leading-relaxed">
            Mark cánh én vàng trong suốt kết hợp chữ OPTRIP sắc nét và huy hiệu ERP tinh tế. Hoàn toàn không viền trắng, liền mạch 100% với giao diện thanh bên!
          </p>
        </div>
      </div>
    </div>

    <!-- Section 2: Login Hero Card Comparison -->
    <div class="space-y-4">
      <div class="flex items-center justify-between">
        <h2 class="text-xl font-bold text-white flex items-center gap-2">
          <span>2. Màn hình Đăng nhập (Login Hero Banner)</span>
        </h2>
        <span class="text-xs text-slate-400 font-mono">Hero Banner (#00382A)</span>
      </div>

      <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
        <!-- Before: Sticker Box -->
        <div class="rounded-2xl bg-slate-900 border border-rose-500/30 p-5 space-y-4">
          <div class="flex items-center justify-between pb-2 border-b border-slate-800">
            <span class="text-xs font-bold text-rose-400 flex items-center gap-1.5">
              <span>✕</span> TRƯỚC: Hộp dán chữ nhật trắng
            </span>
          </div>

          <div class="bg-[#00382A] p-6 rounded-xl flex items-center justify-center min-h-[140px]">
            <!-- Old ugly white sticker -->
            <div class="bg-white/95 backdrop-blur-md px-4 py-2.5 rounded-2xl border border-white/20 shadow-md">
              <img src="${rawLogoB64}" style="height: 60px; width: 180px; object-fit: contain;">
            </div>
          </div>
          <p class="text-xs text-slate-400 leading-relaxed">
            Khung dán trắng thô kệch che mất nền họa tiết hàng không và mất sự thanh thoát của trang đăng nhập.
          </p>
        </div>

        <!-- After: Seamless White-Text Dark Logo -->
        <div class="rounded-2xl bg-slate-900 border border-emerald-500/40 p-5 space-y-4 shadow-xl shadow-emerald-950/20">
          <div class="flex items-center justify-between pb-2 border-b border-slate-800">
            <span class="text-xs font-bold text-emerald-400 flex items-center gap-1.5">
              <span>✓</span> SAU: Logo Trong Suốt Chữ Trắng + Cánh Én Vàng
            </span>
          </div>

          <div class="bg-[#00382A] p-6 rounded-xl flex items-center justify-center min-h-[140px] relative overflow-hidden">
            <!-- Subtle ambient glow -->
            <div class="absolute inset-0 bg-radial from-emerald-500/10 to-transparent pointer-events-none"></div>
            <!-- Seamless transparent dark logo -->
            <div class="relative select-none">
              <img src="${darkLogoB64}" style="height: 60px; width: 180px; object-fit: contain;" class="drop-shadow-md">
            </div>
          </div>
          <p class="text-xs text-emerald-300/80 leading-relaxed">
            Chữ "OPTRIP" trắng tinh khôi, chữ "O" xanh sapphire và máy bay vàng hổ phách nổi bật tự nhiên trên nền lục đậm. Không một viền trắng thừa, đạt chuẩn thẩm mỹ cao cấp.
          </p>
        </div>
      </div>
    </div>

    <!-- Section 3: Light Background (Header & Cards) -->
    <div class="space-y-4">
      <h2 class="text-xl font-bold text-white">3. Nền Sáng (Thanh Header Viên Thuốc & Trang Chủ)</h2>
      <div class="rounded-2xl bg-white p-8 text-slate-900 shadow-xl border border-slate-200 space-y-4">
        <div class="flex items-center justify-between border-b border-slate-100 pb-3">
          <span class="text-xs font-bold text-slate-500 uppercase tracking-wider">Hiển thị trên nền sáng</span>
          <span class="text-xs font-mono text-blue-600">optrip-logo-transparent.png (100% Alpha)</span>
        </div>
        <div class="flex flex-wrap items-center justify-around gap-6 py-4">
          <div class="p-4 rounded-xl bg-slate-50 border border-slate-100 flex items-center justify-center">
            <img src="${transLogoB64}" style="height: 44px; width: 132px; object-fit: contain;">
          </div>
          <div class="p-4 rounded-xl bg-slate-50 border border-slate-100 flex items-center justify-center">
            <img src="${markB64}" style="height: 44px; width: 44px; object-fit: contain;">
          </div>
        </div>
        <p class="text-xs text-slate-500 text-center">
          Khử 100% viền mép trắng, đảm bảo hiển thị hoàn hảo trên bất kỳ dải màu nền nào mà không bị bóng mờ răng cưa.
        </p>
      </div>
    </div>

  </div>
</body>
</html>`;

fs.writeFileSync('C:/Users/Admin/.gemini/antigravity/brain/c3f2171c-5047-4928-ad14-83c8a2949a5f/optrip_logo_refinement_showcase.html', html, 'utf8');
console.log('Comparison showcase generated successfully');

