import fs from 'fs';
const file = 'src/data/personalityTypes.ts';
let content = fs.readFileSync(file, 'utf8');
content = content.replace(/\*\*/g, '');
fs.writeFileSync(file, content);
