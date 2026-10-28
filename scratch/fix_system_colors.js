const fs = require('fs');

// 1. Update InteractiveAppPreview.tsx
let preview = fs.readFileSync('frontend/components/client/InteractiveAppPreview.tsx', 'utf8');

// Replace HAN ✈ NRT badge
preview = preview.replace(
  'text-[11px] font-bold text-sky-600 bg-sky-50 px-2 py-0.5 rounded-full',
  'text-[11px] font-bold text-(--color-primary-800) bg-(--color-primary-soft) px-2 py-0.5 rounded-full'
);

// Replace FPT 120 pax badge
preview = preview.replace(
  'text-[10px] font-bold text-sky-600 bg-sky-50 px-1.5 py-0.2 rounded-full',
  'text-[10px] font-bold text-(--color-primary-800) bg-(--color-primary-soft) px-1.5 py-0.2 rounded-full'
);

// Replace 42 nhà cung cấp text
preview = preview.replace(
  'text-sm sm:text-base font-black text-sky-600 mt-0.5">42 nhà cung cấp',
  'text-sm sm:text-base font-black text-(--color-primary-900) mt-0.5">42 nhà cung cấp'
);

// Replace guide icon
preview = preview.replace(
  'w-8 h-8 rounded-lg bg-sky-50 text-sky-600 flex items-center justify-center',
  'w-8 h-8 rounded-lg bg-(--color-primary-soft) text-(--color-primary-700) flex items-center justify-center'
);

// Replace 4 hồ sơ đoàn
preview = preview.replace(
  'text-sm sm:text-base font-black text-sky-600 mt-0.5">4 hồ sơ đoàn',
  'text-sm sm:text-base font-black text-(--color-primary-900) mt-0.5">4 hồ sơ đoàn'
);

fs.writeFileSync('frontend/components/client/InteractiveAppPreview.tsx', preview, 'utf8');
console.log('InteractiveAppPreview updated');

// 2. Update ClientFeaturesBento.tsx
let bento = fs.readFileSync('frontend/components/client/ClientFeaturesBento.tsx', 'utf8');
bento = bento.replace(
  'bg-sky-50 flex items-center justify-center text-(--color-info) text-2xl shadow-xs group-hover:scale-105 transition-transform',
  'bg-(--color-primary-soft) flex items-center justify-center text-(--color-primary-700) text-2xl shadow-xs group-hover:scale-105 transition-transform'
);
bento = bento.replace(
  'bg-slate-100 text-(--color-info)',
  'bg-(--color-primary-soft) text-(--color-primary-800)'
);
fs.writeFileSync('frontend/components/client/ClientFeaturesBento.tsx', bento, 'utf8');
console.log('ClientFeaturesBento updated');

// 3. Update ClientTrustMetrics.tsx
let trust = fs.readFileSync('frontend/components/client/ClientTrustMetrics.tsx', 'utf8');
trust = trust.replace(
  'bg-sky-50 text-(--color-info) flex items-center justify-center',
  'bg-(--color-primary-soft) text-(--color-primary-700) flex items-center justify-center'
);
fs.writeFileSync('frontend/components/client/ClientTrustMetrics.tsx', trust, 'utf8');
console.log('ClientTrustMetrics updated');

