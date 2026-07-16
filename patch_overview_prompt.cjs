const fs = require('fs');
let code = fs.readFileSync('pages/Overview.tsx', 'utf8');

// Update Gemini Prompt
const oldInstruction = `If the user asks about buying tokens, NIN verification, safety reports, or completed counts, kindly explain that they can see and manage these features directly inside this Hub page.`;
const newInstruction = `If the user asks about buying tokens or NIN verification, guide them to go to their 'Profile' page via the bottom menu. For safety reports, tell them they can use the form directly on this Hub page.`;

code = code.replace(oldInstruction, newInstruction);

// Update local router
const oldEarn = `    if (q.includes('earn') || q.includes('get job') || q.includes('client') || q.includes('worker') || q.includes('artisan') || q.includes('apply')) {`;
const newEarn = `    if (q.includes('earn') || q.includes('get job') || q.includes('client') || q.includes('worker') || q.includes('artisan') || q.includes('apply')) {
      return \`To start earning on Velgo Nigeria:
1. Go to your 'Profile' page via the bottom menu.
2. Complete your details (bio, category, pricing) and submit your NIN for verification.
3. Once verified, visit the 'Marketplace' to apply for open jobs.
4. Clients will review your profile and accept your application to hire you!\`;
    }`;

// Let's check what the old earn router returned
