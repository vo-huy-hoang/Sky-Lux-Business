const fs = require('fs');
const content = fs.readFileSync('/Users/macbookair/.gemini/antigravity-ide/brain/6bae9911-03a6-4f00-8279-bf60ded34405/.system_generated/logs/transcript_full.jsonl', 'utf-8');

const lines = content.split('\n');
let chunks = [];

for (const line of lines) {
  if (!line) continue;
  try {
    const obj = JSON.parse(line);
    // Stop if we see the git checkout command
    if (obj.tool_calls && obj.tool_calls.some(t => t.name === 'default_api:run_command' && t.arguments.CommandLine.includes('git checkout'))) {
      console.log('Found git checkout! Stopping.');
      break;
    }

    if (obj.content && obj.content.includes('Showing lines') && obj.content.includes('page.tsx')) {
      chunks.push(obj.content);
    }
  } catch (e) {}
}

console.log("Found", chunks.length, "chunks before git checkout.");

// NOW extract the file lines
let fileLines = new Array(2000).fill('');
let maxLine = 0;

for (const chunk of chunks) {
  const viewLines = chunk.split('\n');
  for (const line of viewLines) {
    const match = line.match(/^(\d+):\s(.*)$/);
    if (match) {
      const lineNum = parseInt(match[1]);
      const lineContent = match[2];
      fileLines[lineNum] = lineContent;
      if (lineNum > maxLine) maxLine = lineNum;
    }
  }
}

// Assemble
let recovered = [];
for (let i = 1; i <= maxLine; i++) {
  if (fileLines[i] === '') {
    recovered.push(`// MISSING LINE ${i}`);
  } else {
    recovered.push(fileLines[i]);
  }
}

fs.writeFileSync('reconstructed-clean.tsx', recovered.join('\n'));
console.log('Max line:', maxLine);
