const fs = require('fs');
let code = fs.readFileSync('frontend/components/layout/MainSidebar.tsx', 'utf8');

const oldBlock = `<div className="px-4 pb-6 pt-5">
          {collapsed ? (
            <BrandLogo variant="mark" size="sm" theme="dark" asLink={true} />
          ) : (
            <BrandLogo variant="full" size="md" theme="dark" asLink={true} />
          )}
        </div>`;

const newBlock = `<div className="px-3 pb-6 pt-5">
          {collapsed ? (
            <div className="flex justify-center">
              <BrandLogo variant="mark" size="sm" asLink={true} />
            </div>
          ) : (
            <div className="flex items-center px-2">
              <BrandLogo variant="brand-bar" size="md" theme="dark" asLink={true} />
            </div>
          )}
        </div>`;

code = code.replace(oldBlock, newBlock);
fs.writeFileSync('frontend/components/layout/MainSidebar.tsx', code, 'utf8');
console.log('Sidebar updated');

