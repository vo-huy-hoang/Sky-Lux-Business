const fs = require('fs');

const chunksText = fs.readFileSync('all-chunks.txt', 'utf-8');
const chunks = chunksText.split('---CHUNK---');

let fileLines = new Array(2000).fill('');
let maxLine = 0;

for (const chunk of chunks) {
  // Extract lines from `view_file` blocks
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
let missingGaps = [];
let isMissing = false;

for (let i = 1; i <= maxLine; i++) {
  if (fileLines[i] === '') {
    recovered.push(`// MISSING LINE ${i}`);
    if (!isMissing) {
      missingGaps.push(`Started missing at ${i}`);
      isMissing = true;
    }
  } else {
    recovered.push(fileLines[i]);
    if (isMissing) {
      missingGaps[missingGaps.length - 1] += ` to ${i - 1}`;
      isMissing = false;
    }
  }
}

if (isMissing) {
  missingGaps[missingGaps.length - 1] += ` to ${maxLine}`;
}

fs.writeFileSync('reconstructed.tsx', recovered.join('\n'));
console.log('Max line:', maxLine);
console.log('Missing gaps:', missingGaps);
