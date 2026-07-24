const fs = require('fs');
const content = fs.readFileSync('pages/Overview.tsx', 'utf8');

const regex = /\/\*\s*\d+\.\s*(.*?)\*\//g;
let match;
while ((match = regex.exec(content)) !== null) {
    console.log(`Matched comment: ${match[0]} at index ${match.index}`);
}
