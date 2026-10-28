const fs = require('fs');
let code = fs.readFileSync('frontend/app/globals.css', 'utf8');

const target = `html {
  scroll-behavior: smooth;
}`;

const replacement = `html {
  scroll-behavior: smooth;
}

a {
  color: inherit;
  text-decoration: none;
}
a:hover {
  color: var(--color-primary-800);
}`;

code = code.replace(target, replacement);
fs.writeFileSync('frontend/app/globals.css', code, 'utf8');
console.log('globals.css updated with base a style');

