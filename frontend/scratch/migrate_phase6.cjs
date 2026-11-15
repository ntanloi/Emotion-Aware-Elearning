const fs = require('fs');
const path = require('path');

const stylesPath = path.resolve(__dirname, '../src/styles.css');
const content = fs.readFileSync(stylesPath, 'utf8');
const lines = content.split('\n');

console.log('Original line count:', lines.length);

// Extract parts
// Slices by 0-based indices:
// 1. Teacher part 1 (Stack list, Content Group, Passage card, Units, Modals, Vocab tile, Drag Drop, Course Editor): [242, 1198)
const teacher1 = lines.slice(242, 1198).join('\n').trim();

// 2. Vocab Library pagination: [1198, 1282)
const vocabLib = lines.slice(1198, 1282).join('\n').trim();

// 3. Payment modal & VietQR: [1282, 1523)
const payment = lines.slice(1282, 1523).join('\n').trim();

// 4. Admin dashboard & moderation: [1523, 1899)
const admin = lines.slice(1523, 1899).join('\n').trim();

// 5. Learning & progress tracking: [1899, 2189)
const learning = lines.slice(1899, 2189).join('\n').trim();

// 6. Teacher part 2 (Teacher course list modern cards): [2189, 2522)
const teacher2 = lines.slice(2189, 2522).join('\n').trim();

// 7. Student Reports overview: [2522, 2617)
const reports = lines.slice(2522, 2617).join('\n').trim();

// 8. Mobile responsiveness: [2617, 2769)
const responsive = lines.slice(2617, 2769).join('\n').trim();

// 9. Teacher part 3 (Teacher dashboard search box): [2769, 2862)
const teacher3 = lines.slice(2769, 2862).join('\n').trim();

// Combine teacher
const teacherContent = `@layer components {\n${teacher1}\n\n${teacher2}\n\n${teacher3}\n}\n`;
const paymentContent = `@layer components {\n${payment}\n}\n`;
const adminContent = `@layer components {\n${admin}\n}\n`;
const learningContent = `@layer components {\n${learning}\n}\n`;
const reportsContent = `@layer components {\n${reports}\n}\n`;
const responsiveContent = `@layer components {\n${responsive}\n}\n`;

// Write new component files
const compDir = path.resolve(__dirname, '../src/styles/components');
fs.writeFileSync(path.join(compDir, 'teacher.css'), teacherContent, 'utf8');
fs.writeFileSync(path.join(compDir, 'payment.css'), paymentContent, 'utf8');
fs.writeFileSync(path.join(compDir, 'admin.css'), adminContent, 'utf8');
fs.writeFileSync(path.join(compDir, 'learning.css'), learningContent, 'utf8');
fs.writeFileSync(path.join(compDir, 'reports.css'), reportsContent, 'utf8');
fs.writeFileSync(path.join(compDir, 'responsive.css'), responsiveContent, 'utf8');

// Append vocabLib into flashcard.css right before the last closing }
const flashcardPath = path.join(compDir, 'flashcard.css');
let flashcardExisting = fs.readFileSync(flashcardPath, 'utf8').trim();
if (flashcardExisting.endsWith('}')) {
  flashcardExisting = flashcardExisting.slice(0, -1).trim();
}
const updatedFlashcard = `${flashcardExisting}\n\n${vocabLib}\n}\n`;
fs.writeFileSync(flashcardPath, updatedFlashcard, 'utf8');

console.log('Wrote teacher.css, payment.css, admin.css, learning.css, reports.css, responsive.css');
console.log('Updated flashcard.css with vocabLib');

// Update styles.css
let headerLines = lines.slice(0, 242);
const newImports = [
  '@import "./styles/components/teacher.css";',
  '@import "./styles/components/payment.css";',
  '@import "./styles/components/admin.css";',
  '@import "./styles/components/learning.css";',
  '@import "./styles/components/reports.css";',
  '@import "./styles/components/responsive.css";',
];

// Find index of flashcard.css import
const flashcardImportIdx = headerLines.findIndex(l => l.includes('flashcard.css'));
if (flashcardImportIdx !== -1) {
  headerLines.splice(flashcardImportIdx + 1, 0, ...newImports);
} else {
  headerLines.unshift(...newImports);
}

// Keep only base header (which now has all 19 imports, variables, resets)
const updatedStyles = headerLines.join('\n') + '\n';
fs.writeFileSync(stylesPath, updatedStyles, 'utf8');

console.log('Updated styles.css line count:', updatedStyles.split('\n').length);

// Balance check
function checkBalance(str, name) {
  let open = (str.match(/{/g) || []).length;
  let close = (str.match(/}/g) || []).length;
  console.log(name, 'Open {:', open, 'Close }:', close, 'Balanced:', open === close);
}

checkBalance(teacherContent, 'teacher.css');
checkBalance(paymentContent, 'payment.css');
checkBalance(adminContent, 'admin.css');
checkBalance(learningContent, 'learning.css');
checkBalance(reportsContent, 'reports.css');
checkBalance(responsiveContent, 'responsive.css');
checkBalance(updatedFlashcard, 'flashcard.css');
checkBalance(updatedStyles, 'Updated styles.css');
