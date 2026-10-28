const fs = require('fs');
let code = fs.readFileSync('frontend/lib/theme/tokens.config.ts', 'utf8');

const target = `  token: {
    colorPrimary: themeTokens.brand.primary[700],`;

const replacement = `  token: {
    colorPrimary: themeTokens.brand.primary[700],
    colorLink: themeTokens.brand.primary[700],
    colorLinkHover: themeTokens.brand.primary[900],
    colorLinkActive: themeTokens.brand.primary[950],`;

code = code.replace(target, replacement);
fs.writeFileSync('frontend/lib/theme/tokens.config.ts', code, 'utf8');
console.log('tokens.config.ts updated with colorLink');

