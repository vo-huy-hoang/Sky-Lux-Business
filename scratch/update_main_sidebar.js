const fs = require('fs');
let code = fs.readFileSync('frontend/components/layout/MainSidebar.tsx', 'utf8');

// Replace Image import with BrandLogo import
code = code.replace(
  "import Image from 'next/image';",
  "import { BrandLogo } from '@/components/ui';"
);

// Remove local dummy BrandLogo component
const dummyBrandLogoRegex = /const BrandLogo = React\.memo\(function BrandLogo\(\{ collapsed \}: \{ collapsed: boolean \}\) \{[\s\S]*?\}\);\r?\n/m;
code = code.replace(dummyBrandLogoRegex, '');

// Update sidebar rendering
code = code.replace(
  '<BrandLogo collapsed={collapsed} />',
  `{collapsed ? (
            <BrandLogo variant="mark" size="sm" theme="dark" asLink={true} />
          ) : (
            <BrandLogo variant="full" size="md" theme="dark" asLink={true} />
          )}`
);

fs.writeFileSync('frontend/components/layout/MainSidebar.tsx', code, 'utf8');
console.log('MainSidebar updated successfully');

