const fs = require('fs');
let text = fs.readFileSync('reconstructed.tsx', 'utf-8');
text = text.replace(/\/\/ MISSING LINE \d+/g, '');
fs.writeFileSync('reconstructed.tsx', text);
