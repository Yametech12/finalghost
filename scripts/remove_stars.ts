import fs from 'fs';
const file = 'src/data/guideSections.ts';
let content = fs.readFileSync(file, 'utf8');
content = content.replace(/\*\*/g, '');
fs.writeFileSync(file, content);
