// Small Node.js script to convert a JS-style questions.json into valid JSON.
// Usage (Windows Terminal):
// 1) Open terminal in the repository root (where questions.json lives).
// 2) Ensure Node.js is installed (node --version).
// 3) Run: node fix_questions.js
//
// The script will:
// - Try JSON.parse() first (if the file is already valid JSON).
// - Otherwise evaluate the file as a JS expression inside a safe VM sandbox.
// - Validate the resulting structure (array of objects with required keys).
// - Create a backup questions.json.bak (if conversion needed).
// - Write questions.fixed.json (pretty-printed valid JSON). If you want to overwrite original,
//   rename/move the fixed file after review.

const fs = require('fs');
const vm = require('vm');
const path = require('path');

const INPUT = path.join(process.cwd(), 'questions.json');
const BACKUP = path.join(process.cwd(), 'questions.json.bak');
const OUTPUT = path.join(process.cwd(), 'questions.fixed.json');

function isLikelyQuestionObject(o) {
  if (!o || typeof o !== 'object') return false;
  if (!('id' in o)) return false;
  if (!('question' in o)) return false;
  if (!Array.isArray(o.options)) return false;
  if (!('correctAnswer' in o)) return false;
  return true;
}

try {
  if (!fs.existsSync(INPUT)) {
    console.error(`ERROR: ${INPUT} not found in current directory.`);
    process.exit(2);
  }

  const raw = fs.readFileSync(INPUT, 'utf8').trim();

  // Quick attempt: try to parse as JSON first
  try {
    const parsed = JSON.parse(raw);
    console.log('questions.json is already valid JSON. Writing a pretty copy to', OUTPUT);
    fs.writeFileSync(OUTPUT, JSON.stringify(parsed, null, 2), 'utf8');
    process.exit(0);
  } catch (jsonErr) {
    console.log('questions.json is not valid JSON (JSON.parse failed). Attempting JS-style evaluation...');
  }

  // Prepare to evaluate as JS. Wrap in parentheses so an array/object literal evaluates to a value.
  const wrapped = `(${raw})`;

  // Use vm to evaluate with empty sandbox to avoid access to outer scope.
  const sandbox = {};
  const script = new vm.Script(wrapped, { filename: 'questions.json (evaluated)' });
  const context = vm.createContext(sandbox, { name: 'questions-sandbox' });

  let evaluated;
  try {
    evaluated = script.runInContext(context, { timeout: 2000 });
  } catch (evalErr) {
    console.error('Evaluation failed:', evalErr && evalErr.message ? evalErr.message : evalErr);
    console.error('The file likely contains syntax not evaluable as JS or contains constructs that the sandbox blocked.');
    process.exit(3);
  }

  if (!Array.isArray(evaluated)) {
    console.error('Evaluation succeeded but result is not an array. Aborting.');
    process.exit(4);
  }

  // Basic validation of elements
  const invalidItems = [];
  for (let i = 0; i < evaluated.length; i++) {
    if (!isLikelyQuestionObject(evaluated[i])) invalidItems.push(i + 1);
  }

  if (invalidItems.length > 0) {
    console.warn(`Warning: ${invalidItems.length} item(s) failed basic validation (indices: ${invalidItems.join(', ')}).`);
    console.warn('You may want to inspect those entries manually after the conversion.');
  } else {
    console.log('All items passed the basic validation checks (id, question, options array, correctAnswer).');
  }

  // Backup original file before writing output
  try {
    fs.copyFileSync(INPUT, BACKUP, fs.constants.COPYFILE_EXCL);
    console.log(`Created backup: ${BACKUP}`);
  } catch (copyErr) {
    // If backup already exists, warn but continue
    if (fs.existsSync(BACKUP)) {
      console.warn(`Backup ${BACKUP} already exists. Continuing without creating a new backup.`);
    } else {
      console.warn(`Could not create backup ${BACKUP}:`, copyErr && copyErr.message ? copyErr.message : copyErr);
    }
  }

  // Normalize correctAnswer to single uppercase letter where possible
  const normalized = evaluated.map((q) => {
    const clone = Object.assign({}, q);
    let ca = clone.correctAnswer;
    if (typeof ca === 'number') {
      ca = String.fromCharCode(65 + ca);
    } else if (typeof ca === 'string') {
      const trimmed = ca.trim();
      if (/^\d+$/.test(trimmed)) {
        ca = String.fromCharCode(65 + parseInt(trimmed, 10));
      } else {
        ca = trimmed.charAt(0).toUpperCase();
      }
    } else {
      ca = String(clone.correctAnswer);
      ca = ca.charAt(0).toUpperCase();
    }
    clone.correctAnswer = ca;
    return clone;
  });

  fs.writeFileSync(OUTPUT, JSON.stringify(normalized, null, 2), 'utf8');
  console.log(`Success: wrote fixed JSON to ${OUTPUT}`);
  console.log('Inspect the file, then (optionally) replace the original questions.json with the fixed file:');
  console.log(`  copy /Y "${OUTPUT}" "${INPUT}"   (Windows cmd)`);
  console.log(`  mv "${OUTPUT}" "${INPUT}"         (PowerShell / bash)`);
  process.exit(0);

} catch (err) {
  console.error('Unexpected error:', err && err.message ? err.message : err);
  process.exit(1);
}