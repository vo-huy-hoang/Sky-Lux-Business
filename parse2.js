const fs = require('fs');
const content = fs.readFileSync('/Users/macbookair/.gemini/antigravity-ide/brain/6bae9911-03a6-4f00-8279-bf60ded34405/.system_generated/logs/transcript_full.jsonl', 'utf-8');

const lines = content.split('\n');
let chunks = [];

for (const line of lines) {
  if (!line) continue;
  try {
    const obj = JSON.parse(line);
    if (obj.content && obj.content.includes('Showing lines') && obj.content.includes('page.tsx')) {
      chunks.push(obj.content);
    }
    // also capture replace_file_content output
    if (obj.content && obj.content.includes('The following changes were made by the multi_replace_file_content tool to: /Users/macbookair/Documents/Sky-Lux-CRM/frontend/app/main/revenue/page.tsx')) {
      chunks.push(obj.content);
    }
  } catch (e) {}
}

console.log("Found", chunks.length, "chunks");
fs.writeFileSync('all-chunks.txt', chunks.join('\n\n---CHUNK---\n\n'));
