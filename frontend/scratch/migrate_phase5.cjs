const fs = require('fs');
const path = require('path');

const stylesPath = path.resolve(__dirname, '../src/styles.css');
const content = fs.readFileSync(stylesPath, 'utf8');
const lines = content.split('\n');

console.log('Original line count:', lines.length);

// Extract parts
// Slices by 0-based indices:
// 1. Sidebar: [238, 312)
const sidebar = lines.slice(238, 312).join('\n').trim();

// 2. Table, Chat, Toast: [312, 466)
const tableChatToast = lines.slice(312, 466).join('\n').trim();

// 3. Editor: [466, 953)
const editor = lines.slice(466, 953).join('\n').trim();

// 4. Course card price: [953, 1073)
const courseCard = lines.slice(953, 1073).join('\n').trim();

// 5. Empty state: [1073, 1102)
const emptyState = lines.slice(1073, 1102).join('\n').trim();

// 6. Course detail & catalog: [1850, 2454)
const courseDetailCatalog = lines.slice(1850, 2454).join('\n').trim();

// 7. Flashcard: [2454, 3768)
const flashcard = lines.slice(2454, 3768).join('\n').trim();

// Combine components
const feedbackContent = `@layer components {\n${tableChatToast}\n\n${emptyState}\n}\n`;
const editorContent = `@layer components {\n${editor}\n}\n`;
const courseContent = `@layer components {\n${sidebar}\n\n${courseCard}\n\n${courseDetailCatalog}\n}\n`;
const flashcardContent = `@layer components {\n${flashcard}\n}\n`;

// Write new component files
const compDir = path.resolve(__dirname, '../src/styles/components');
fs.writeFileSync(path.join(compDir, 'feedback.css'), feedbackContent, 'utf8');
fs.writeFileSync(path.join(compDir, 'editor.css'), editorContent, 'utf8');
fs.writeFileSync(path.join(compDir, 'course.css'), courseContent, 'utf8');
fs.writeFileSync(path.join(compDir, 'flashcard.css'), flashcardContent, 'utf8');

console.log('Wrote feedback.css, editor.css, course.css, flashcard.css');

// Prepare updated styles.css
// Line 0 to 238 contains existing imports and variables.
// Let's add the new imports to the import list.
let headerLines = lines.slice(0, 238);
const newImports = [
  '@import "./styles/components/feedback.css";',
  '@import "./styles/components/editor.css";',
  '@import "./styles/components/course.css";',
  '@import "./styles/components/flashcard.css";',
];

// Find index after practice.css import
const practiceImportIdx = headerLines.findIndex(l => l.includes('practice.css'));
if (practiceImportIdx !== -1) {
  headerLines.splice(practiceImportIdx + 1, 0, ...newImports);
} else {
  headerLines.unshift(...newImports);
}

// Remaining sections to keep:
// 1. headerLines (originally 0..238 plus 4 imports)
// 2. curriculum / authoring: [1102, 1850)
// 3. teacher workspace / reports / etc: [3768, lines.length)
const middlePart = lines.slice(1102, 1850);
const tailPart = lines.slice(3768);

const updatedStyles = [...headerLines, ...middlePart, ...tailPart].join('\n');
fs.writeFileSync(stylesPath, updatedStyles, 'utf8');

const updatedLines = updatedStyles.split('\n');
console.log('Updated styles.css line count:', updatedLines.length);

// Balance check
function checkBalance(str, name) {
  let open = (str.match(/{/g) || []).length;
  let close = (str.match(/}/g) || []).length;
  console.log(name, 'Open {:', open, 'Close }:', close, 'Balanced:', open === close);
}

checkBalance(feedbackContent, 'feedback.css');
checkBalance(editorContent, 'editor.css');
checkBalance(courseContent, 'course.css');
checkBalance(flashcardContent, 'flashcard.css');
checkBalance(updatedStyles, 'Updated styles.css');
