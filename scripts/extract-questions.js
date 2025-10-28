// Run: node scripts/extract-questions.js
const fs = require('fs');
const path = require('path');

const htmlPath = path.join(__dirname, '..', 'index.html'); // adjust if needed
const outPath = path.join(__dirname, '..', 'data', 'questions.json');

const html = fs.readFileSync(htmlPath, 'utf8');
// This regex expects a pattern like: const questions = [ ... ];
const m = html.match(/const\s+questions\s*=\s*(\[[\s\S]*?\])\s*;/m);
if (!m) {
  console.error('Could not find questions array pattern. The script assumes `const questions = [ ... ];` exists in index.html');
  process.exit(1);
}
let arrText = m[1];

// Write output
fs.mkdirSync(path.dirname(outPath), { recursive: true });
fs.writeFileSync(outPath, arrText, 'utf8');
console.log('Extracted questions to', outPath);