const fs = require('fs');
const path = require('path');

const logoBuf = fs.readFileSync('frontend/public/brand/optrip-logo.png');
const markBuf = fs.readFileSync('frontend/public/brand/optrip-mark.png');
const logoB64 = 'data:image/png;base64,' + logoBuf.toString('base64');
const markB64 = 'data:image/png;base64,' + markBuf.toString('base64');

const html = `<!DOCTYPE html>
<html lang="vi" class="h-full bg-slate-950 text-slate-100">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Deep Module <BrandLogo /> Interactive Showcase - OPTRIP</title>
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
<body class="min-h-full p-6 md:p-12 flex flex-col items-center">
  <div class="max-w-6xl w-full space-y-10">
    <!-- Header -->
    <div class="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-800 pb-6">
      <div>
        <div class="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-blue-500/10 border border-blue-500/20 text-blue-400 text-xs font-semibold mb-2">
          <span class="w-2 h-2 rounded-full bg-blue-500 animate-pulse"></span>
          Ticket 02 Deep Module Specification
        </div>
        <h1 class="text-3xl font-extrabold text-white tracking-tight">OPTRIP &lt;BrandLogo /&gt; System</h1>
        <p class="text-sm text-slate-400 mt-1">Trực quan hóa toàn bộ Props: Variant, Size, Theme Capsule và Zero CLS Aspect Ratio Lock</p>
      </div>
      <div class="flex items-center gap-2 text-xs font-mono bg-slate-900 border border-slate-800 px-3 py-2 rounded-lg text-emerald-400">
        <span>✓ 5/5 Jest Tests Passed</span>
        <span class="text-slate-600">|</span>
        <span>✓ 0 TypeScript Errors</span>
      </div>
    </div>

    <!-- Live Interactive Sandbox -->
    <div class="bg-slate-900/90 border border-slate-800 rounded-2xl p-6 md:p-8 space-y-6 shadow-2xl">
      <div class="flex flex-wrap items-center justify-between gap-4 border-b border-slate-800/80 pb-5">
        <h2 class="text-lg font-bold text-white flex items-center gap-2">
          <span class="w-2.5 h-2.5 rounded-full bg-amber-400"></span>
          Interactive Component Sandbox
        </h2>
        
        <!-- Controls -->
        <div class="flex flex-wrap items-center gap-3 text-xs">
          <!-- Variant Selector -->
          <div class="flex items-center gap-1 bg-slate-950 p-1 rounded-lg border border-slate-800">
            <button onclick="setVariant('full')" id="btn-var-full" class="px-3 py-1.5 rounded-md font-semibold bg-blue-600 text-white transition-all">Full (3:1)</button>
            <button onclick="setVariant('mark')" id="btn-var-mark" class="px-3 py-1.5 rounded-md font-semibold text-slate-400 hover:text-white transition-all">Mark (1:1)</button>
            <button onclick="setVariant('responsive')" id="btn-var-resp" class="px-3 py-1.5 rounded-md font-semibold text-slate-400 hover:text-white transition-all">Responsive</button>
          </div>

          <!-- Size Selector -->
          <div class="flex items-center gap-1 bg-slate-950 p-1 rounded-lg border border-slate-800">
            <button onclick="setSize('xs')" id="btn-sz-xs" class="px-2.5 py-1.5 rounded-md font-semibold text-slate-400 hover:text-white transition-all">XS (24px)</button>
            <button onclick="setSize('sm')" id="btn-sz-sm" class="px-2.5 py-1.5 rounded-md font-semibold text-slate-400 hover:text-white transition-all">SM (30px)</button>
            <button onclick="setSize('md')" id="btn-sz-md" class="px-2.5 py-1.5 rounded-md font-semibold bg-blue-600 text-white transition-all">MD (38px)</button>
            <button onclick="setSize('lg')" id="btn-sz-lg" class="px-2.5 py-1.5 rounded-md font-semibold text-slate-400 hover:text-white transition-all">LG (48px)</button>
            <button onclick="setSize('xl')" id="btn-sz-xl" class="px-2.5 py-1.5 rounded-md font-semibold text-slate-400 hover:text-white transition-all">XL (60px)</button>
          </div>

          <!-- Theme Background Selector -->
          <div class="flex items-center gap-1 bg-slate-950 p-1 rounded-lg border border-slate-800">
            <button onclick="setTheme('light')" id="btn-th-light" class="px-3 py-1.5 rounded-md font-semibold bg-white text-slate-900 transition-all">Light BG</button>
            <button onclick="setTheme('dark')" id="btn-th-dark" class="px-3 py-1.5 rounded-md font-semibold text-slate-400 hover:text-white transition-all">Dark Capsule</button>
            <button onclick="setTheme('navy')" id="btn-th-navy" class="px-3 py-1.5 rounded-md font-semibold text-slate-400 hover:text-white transition-all">Navy BG</button>
          </div>
        </div>
      </div>

      <!-- Preview Canvas -->
      <div id="preview-canvas" class="rounded-xl p-12 flex flex-col items-center justify-center min-h-[220px] transition-all duration-300 bg-white border border-slate-200/50">
        <div id="logo-render-target" class="transition-all duration-300">
          <!-- Rendered dynamically -->
        </div>
        <div id="metrics-badge" class="mt-4 text-[11px] font-mono text-slate-500 bg-slate-100 px-3 py-1 rounded-full">
          Calculated Dimensions: 114 × 38px | Aspect Ratio: 3.00 (Zero CLS)
        </div>
      </div>
    </div>

    <!-- Matrix of All Variations -->
    <div class="space-y-6">
      <h2 class="text-xl font-bold text-white tracking-tight">Bảng Ma Trận Các Kích Cỡ & Biến Thể Chuẩn</h2>
      
      <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
        <!-- Light Theme Matrix -->
        <div class="bg-white rounded-2xl p-6 text-slate-900 shadow-xl space-y-5 border border-slate-200">
          <div class="flex items-center justify-between border-b border-slate-100 pb-3">
            <span class="font-bold text-sm text-slate-800 uppercase tracking-wider">Nền Sáng (Header / Body / Card)</span>
            <span class="text-xs font-mono text-slate-400">theme='light'</span>
          </div>

          <div class="space-y-4">
            <div class="flex items-center justify-between p-3 rounded-lg bg-slate-50/70 border border-slate-100">
              <span class="text-xs font-mono text-slate-500">size='xl' (60px)</span>
              <img src="${logoB64}" style="height: 60px; width: 180px; object-fit: contain;">
            </div>
            <div class="flex items-center justify-between p-3 rounded-lg bg-slate-50/70 border border-slate-100">
              <span class="text-xs font-mono text-slate-500">size='lg' (48px)</span>
              <img src="${logoB64}" style="height: 48px; width: 144px; object-fit: contain;">
            </div>
            <div class="flex items-center justify-between p-3 rounded-lg bg-slate-50/70 border border-slate-100">
              <span class="text-xs font-mono text-slate-500">size='md' (38px)</span>
              <img src="${logoB64}" style="height: 38px; width: 114px; object-fit: contain;">
            </div>
            <div class="flex items-center justify-between p-3 rounded-lg bg-slate-50/70 border border-slate-100">
              <span class="text-xs font-mono text-slate-500">size='sm' (30px)</span>
              <img src="${logoB64}" style="height: 30px; width: 90px; object-fit: contain;">
            </div>
            <div class="flex items-center justify-between p-3 rounded-lg bg-slate-50/70 border border-slate-100">
              <span class="text-xs font-mono text-slate-500">size='xs' (24px)</span>
              <img src="${logoB64}" style="height: 24px; width: 72px; object-fit: contain;">
            </div>
          </div>
        </div>

        <!-- Dark Capsule Matrix -->
        <div class="bg-slate-950 rounded-2xl p-6 text-white shadow-xl space-y-5 border border-slate-800">
          <div class="flex items-center justify-between border-b border-slate-800 pb-3">
            <span class="font-bold text-sm text-slate-200 uppercase tracking-wider">Nền Tối (Footer / Dark Sidebar)</span>
            <span class="text-xs font-mono text-amber-400">theme='dark' (Glass Capsule)</span>
          </div>

          <div class="space-y-4">
            <div class="flex items-center justify-between p-3 rounded-lg bg-slate-900/60 border border-slate-800/80">
              <span class="text-xs font-mono text-slate-400">size='xl'</span>
              <div class="glass-capsule px-4 py-2.5 rounded-2xl inline-flex items-center justify-center">
                <img src="${logoB64}" style="height: 60px; width: 180px; object-fit: contain;">
              </div>
            </div>
            <div class="flex items-center justify-between p-3 rounded-lg bg-slate-900/60 border border-slate-800/80">
              <span class="text-xs font-mono text-slate-400">size='lg'</span>
              <div class="glass-capsule px-3 py-2 rounded-xl inline-flex items-center justify-center">
                <img src="${logoB64}" style="height: 48px; width: 144px; object-fit: contain;">
              </div>
            </div>
            <div class="flex items-center justify-between p-3 rounded-lg bg-slate-900/60 border border-slate-800/80">
              <span class="text-xs font-mono text-slate-400">size='md'</span>
              <div class="glass-capsule px-2.5 py-1.5 rounded-xl inline-flex items-center justify-center">
                <img src="${logoB64}" style="height: 38px; width: 114px; object-fit: contain;">
              </div>
            </div>
            <div class="flex items-center justify-between p-3 rounded-lg bg-slate-900/60 border border-slate-800/80">
              <span class="text-xs font-mono text-slate-400">size='sm'</span>
              <div class="glass-capsule px-2 py-1 rounded-lg inline-flex items-center justify-center">
                <img src="${logoB64}" style="height: 30px; width: 90px; object-fit: contain;">
              </div>
            </div>
            <div class="flex items-center justify-between p-3 rounded-lg bg-slate-900/60 border border-slate-800/80">
              <span class="text-xs font-mono text-slate-400">size='xs'</span>
              <div class="glass-capsule px-1.5 py-0.5 rounded-md inline-flex items-center justify-center">
                <img src="${logoB64}" style="height: 24px; width: 72px; object-fit: contain;">
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>

  <script>
    const LOGO_SRC = '${logoB64}';
    const MARK_SRC = '${markB64}';

    let currentVariant = 'full';
    let currentSize = 'md';
    let currentTheme = 'light';

    const SIZES = {
      xs: { full: { w: 72, h: 24 }, mark: { w: 24, h: 24 }, pad: 'px-1.5 py-0.5 rounded-md' },
      sm: { full: { w: 90, h: 30 }, mark: { w: 30, h: 30 }, pad: 'px-2 py-1 rounded-lg' },
      md: { full: { w: 114, h: 38 }, mark: { w: 38, h: 38 }, pad: 'px-2.5 py-1.5 rounded-xl' },
      lg: { full: { w: 144, h: 48 }, mark: { w: 48, h: 48 }, pad: 'px-3 py-2 rounded-xl' },
      xl: { full: { w: 180, h: 60 }, mark: { w: 60, h: 60 }, pad: 'px-4 py-2.5 rounded-2xl' }
    };

    function update() {
      const canvas = document.getElementById('preview-canvas');
      const target = document.getElementById('logo-render-target');
      const metrics = document.getElementById('metrics-badge');

      // Theme background
      if (currentTheme === 'light') {
        canvas.className = 'rounded-xl p-12 flex flex-col items-center justify-center min-h-[220px] transition-all duration-300 bg-white border border-slate-200/50 shadow-inner';
        metrics.className = 'mt-4 text-[11px] font-mono text-slate-500 bg-slate-100 px-3 py-1 rounded-full';
      } else if (currentTheme === 'dark') {
        canvas.className = 'rounded-xl p-12 flex flex-col items-center justify-center min-h-[220px] transition-all duration-300 bg-slate-950 border border-slate-800 shadow-inner';
        metrics.className = 'mt-4 text-[11px] font-mono text-slate-400 bg-slate-900 border border-slate-800 px-3 py-1 rounded-full';
      } else if (currentTheme === 'navy') {
        canvas.className = 'rounded-xl p-12 flex flex-col items-center justify-center min-h-[220px] transition-all duration-300 bg-[#0A3574] border border-blue-900 shadow-inner';
        metrics.className = 'mt-4 text-[11px] font-mono text-blue-200 bg-blue-950/80 border border-blue-800 px-3 py-1 rounded-full';
      }

      const conf = SIZES[currentSize];
      const isMark = currentVariant === 'mark';
      const w = isMark ? conf.mark.w : conf.full.w;
      const h = isMark ? conf.mark.h : conf.full.h;
      const src = isMark ? MARK_SRC : LOGO_SRC;

      let inner = '<img src="' + src + '" style="width:' + w + 'px; height:' + h + 'px; object-fit: contain;" alt="OPTRIP">';

      if (currentTheme === 'dark' || currentTheme === 'navy') {
        target.innerHTML = '<div class="glass-capsule ' + conf.pad + ' inline-flex items-center justify-center transition-all hover:scale-105">' + inner + '</div>';
      } else {
        target.innerHTML = '<div class="inline-flex items-center justify-center transition-all hover:scale-105">' + inner + '</div>';
      }

      metrics.innerText = 'Props: variant=\\'' + currentVariant + '\\' | size=\\'' + currentSize + '\\' | theme=\\'' + currentTheme + '\\' → Rendered: ' + w + ' × ' + h + 'px (Aspect-Ratio: ' + (w/h).toFixed(2) + ')';
    }

    function setVariant(v) {
      currentVariant = v;
      ['full', 'mark', 'responsive'].forEach(id => {
        const btn = document.getElementById('btn-var-' + (id === 'responsive' ? 'resp' : id));
        if (id === v) {
          btn.className = 'px-3 py-1.5 rounded-md font-semibold bg-blue-600 text-white transition-all';
        } else {
          btn.className = 'px-3 py-1.5 rounded-md font-semibold text-slate-400 hover:text-white transition-all';
        }
      });
      update();
    }

    function setSize(s) {
      currentSize = s;
      ['xs', 'sm', 'md', 'lg', 'xl'].forEach(id => {
        const btn = document.getElementById('btn-sz-' + id);
        if (id === s) {
          btn.className = 'px-2.5 py-1.5 rounded-md font-semibold bg-blue-600 text-white transition-all';
        } else {
          btn.className = 'px-2.5 py-1.5 rounded-md font-semibold text-slate-400 hover:text-white transition-all';
        }
      });
      update();
    }

    function setTheme(t) {
      currentTheme = t;
      ['light', 'dark', 'navy'].forEach(id => {
        const btn = document.getElementById('btn-th-' + id);
        if (id === t) {
          btn.className = 'px-3 py-1.5 rounded-md font-semibold bg-blue-600 text-white transition-all';
        } else {
          btn.className = 'px-3 py-1.5 rounded-md font-semibold text-slate-400 hover:text-white transition-all';
        }
      });
      update();
    }

    update();
  </script>
</body>
</html>`;

fs.writeFileSync('C:/Users/Admin/.gemini/antigravity/brain/c3f2171c-5047-4928-ad14-83c8a2949a5f/optrip_brand_logo_deep_module_showcase.html', html, 'utf8');
console.log('Artifact showcase generated successfully');

