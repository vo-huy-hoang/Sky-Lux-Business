const fs = require('fs');
const lines = fs.readFileSync('recovered.txt', 'utf-8').trim().split('\n');

let stitched = {};

for (const line of lines) {
  try {
    const obj = JSON.parse('{' + line + '}');
    if (obj.content && obj.content.includes('Showing lines')) {
      const match = obj.content.match(/Showing lines (\d+) to (\d+)/);
      if (match) {
        const start = parseInt(match[1]);
        const end = parseInt(match[2]);
        stitched[`${start}-${end}`] = obj.content;
      }
    }
  } catch (e) {
    // Ignore parse errors
  }
}

console.log("Found chunks:");
Object.keys(stitched).forEach(k => console.log(k));
