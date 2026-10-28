const fs = require('fs');
let code = fs.readFileSync('frontend/app/login/page.tsx', 'utf8');

// Replace imports
const oldImport = "import { useAuthStore } from '@/lib/stores/auth-store';";
const newImport = "import { useAuthStore } from '@/lib/stores/auth-store';\r\nimport { BrandLogo } from '@/components/ui';";
code = code.replace(oldImport, newImport);

// Replace LoginLogo
const oldLoginLogoRegex = /function LoginLogo\(\) \{[\s\S]*?\r?\n\}/;
const newLoginLogo = `function LoginLogo() {
  return (
    <div className="inline-block">
      <BrandLogo variant="full" size="xl" theme="dark" asLink={false} priority />
    </div>
  );
}`;
code = code.replace(oldLoginLogoRegex, newLoginLogo);

// Replace Headings
code = code.replace('SkyLux Travel', 'OPTRIP Platform');
code = code.replace('Phần mềm quản trị nội bộ dành cho Sales', 'Travel Operations Platform • One Platform. Every Trip.');
code = code.replace(
  /Nền tảng quản lý toàn diện giúp đội ngũ Sales[\s\S]*?chốt tour nhanh chóng\./,
  'Nền tảng quản trị và điều hành tour lữ hành toàn diện. Đồng bộ dữ liệu kinh doanh, tối ưu hóa biên lợi nhuận và kiểm soát chuỗi phê duyệt dự toán khép kín.'
);

// Replace copyright
code = code.replace('© 2025 SkyLux Travel. All rights reserved.', '© ' + new Date().getFullYear() + ' OPTRIP Platform. All rights reserved.');

fs.writeFileSync('frontend/app/login/page.tsx', code, 'utf8');
console.log('Login page updated successfully');

