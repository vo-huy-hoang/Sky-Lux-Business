const fs = require('fs');
let code = fs.readFileSync('frontend/app/login/page.tsx', 'utf8');

const oldBlock = `function LoginLogo() {
  return (
    <div className="inline-block">
      <BrandLogo variant="full" size="xl" theme="dark" asLink={false} priority />
    </div>
  );
}`;

const newBlock = `function LoginLogo() {
  return (
    <div className="relative inline-block select-none">
      <div className="absolute -inset-4 rounded-full bg-emerald-400/15 blur-xl pointer-events-none" />
      <BrandLogo variant="full" size="xl" theme="dark" asLink={false} priority />
    </div>
  );
}`;

code = code.replace(oldBlock, newBlock);
fs.writeFileSync('frontend/app/login/page.tsx', code, 'utf8');
console.log('Login logo updated with ambient glow');

