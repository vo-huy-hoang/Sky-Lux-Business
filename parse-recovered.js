const fs = require('fs');
const lines = fs.readFileSync('recovered.txt', 'utf-8').trim().split('\n');

for (const line of lines) {
  // It's a JSON string fragment
  // We can just regex the raw file content or parse it if it's valid JSON
  try {
    const obj = JSON.parse('{' + line + '}');
    if (obj.content) {
      console.log("Found content of length", obj.content.length);
      // We know `page.tsx` is around 40-44KB
      // Find the last one which is likely the final state
      fs.writeFileSync('recovered_page.tsx', obj.content);
    }
  } catch (e) {
    // If not valid JSON, we can extract it manually
    const match = line.match(/"content"\s*:\s*"(.*)"/);
    if (match) {
      const content = match[1].replace(/\\n/g, '\n').replace(/\\"/g, '"').replace(/\\\\/g, '\\');
      fs.writeFileSync('recovered_page.tsx', content);
    }
  }
}
console.log('Done parsing');
