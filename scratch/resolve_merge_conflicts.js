const fs = require('fs');

// 1. Resolve frontend/app/login/page.tsx
let login = fs.readFileSync('frontend/app/login/page.tsx', 'utf8');

// Conflict 1 regex
const loginConflict1 = /<<<<<<< HEAD[\s\S]*?>>>>>>> origin\/develop\r?\n/m;
login = login.replace(loginConflict1, '');

// Conflict 2 regex
const loginConflict2 = /<<<<<<< HEAD\r?\n\s*OPTRIP Platform\r?\n=======\r?\n\s*Optrip\r?\n>>>>>>> origin\/develop/m;
login = login.replace(loginConflict2, '                OPTRIP Platform');

fs.writeFileSync('frontend/app/login/page.tsx', login, 'utf8');
console.log('Resolved login/page.tsx');

// 2. Resolve frontend/components/layout/MainSidebar.tsx
let sidebar = fs.readFileSync('frontend/components/layout/MainSidebar.tsx', 'utf8');

const sidebarConflict = /<<<<<<< HEAD[\s\S]*?>>>>>>> origin\/develop\r?\n/m;
sidebar = sidebar.replace(sidebarConflict, '');

fs.writeFileSync('frontend/components/layout/MainSidebar.tsx', sidebar, 'utf8');
console.log('Resolved MainSidebar.tsx');

