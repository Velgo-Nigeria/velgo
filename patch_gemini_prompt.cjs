const fs = require('fs');
let code = fs.readFileSync('pages/Overview.tsx', 'utf8');

const oldInstruction = 'If the user asks about buying tokens, NIN verification, safety reports, or completed counts, kindly explain that they can see and manage these features directly inside this Hub page.';
const newInstruction = 'If the user asks about buying tokens, NIN verification, or viewing completed counts, kindly explain that they can see and manage these features by navigating to the Profile page from the bottom menu. For safety reports, tell them they can use the Priority Security Report form right below this chat in the Hub page.';

code = code.replace(oldInstruction, newInstruction);

fs.writeFileSync('pages/Overview.tsx', code);
console.log("Patched Gemini prompt in Overview.tsx");
