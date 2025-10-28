```markdown
# opescs — files to commit for branch: optimize/extract-questions-and-a11y

This prepared branch externalizes CSS/JS, adds accessibility checks and moves the questions into data/questions.json.

If you want me to push the branch, I can do it once I have repository write access. If you prefer to perform the commit & push yourself, follow the steps below.

1) Create branch & add files locally (run in repository root):

# create and switch to branch
git checkout -b optimize/extract-questions-and-a11y

# add files prepared above
git add index.html assets/style.min.css assets/app.min.js data/questions.json .github/workflows/a11y.yml README.md

# commit
git commit -m "Move inline CSS/JS to assets, extract questions to data/questions.json, add a11y CI workflow"

# push branch
git push -u origin optimize/extract-questions-and-a11y

2) Extract full 540 questions from the current index.html (if your repo's index.html still has the full list)
If your current repository still contains the original index.html with the 540-question array in a JS variable, you can extract it with this small Node script.

Create file scripts/extract-questions.js:

```js
const fs = require('fs');
const path = require('path');

const htmlPath = path.join(__dirname, '..', 'index.html'); // adjust if needed
const outPath = path.join(__dirname, '..', 'data', 'questions.json');

const html = fs.readFileSync(htmlPath, 'utf8');
// simple regex-based extraction: looks for "const questions = [ ... ];"
const m = html.match(/const\\s+questions\\s*=\\s*(\\[.*?\\])\\s*;/s);
if (!m) {
  console.error('Could not find questions array pattern. The script assumes `const questions = [ ... ];` exists in index.html');
  process.exit(1);
}
let arrText = m[1];
// optional: try to fix trailing commas or broken strings here
fs.mkdirSync(path.dirname(outPath), { recursive: true });
fs.writeFileSync(outPath, arrText, 'utf8');
console.log('Extracted questions to', outPath);
```

Run it:

node scripts/extract-questions.js

After extraction, open data/questions.json, make sure the JSON is valid (no JS comments or trailing commas). If any fixes are needed (unescaped characters), fix them or share the file and I can help clean it.

3) If you prefer I perform the push:
- Grant me repository write access for a short time (or allow me to create a branch). If you prefer not to, run the git commands above on your machine and push the branch.

4) CI accessibility choice:
- I added a pa11y CI workflow (lightweight HTML accessibility checks). It runs on pushes and PRs and is easy to maintain. If you'd like a deeper report (axe-cli) I can add it too. Pa11y is fine as a default for now.

If you want me to push the branch for you and create the PR, reply that I should proceed and provide a way to authorize me to push (or allow me to act in the repository). Alternatively, run the git commands above and push the prepared files yourself.
```