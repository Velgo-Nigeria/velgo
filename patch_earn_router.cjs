const fs = require('fs');
let code = fs.readFileSync('pages/Overview.tsx', 'utf8');

const oldEarn = `    if (q.includes('earn') || q.includes('get job') || q.includes('client') || q.includes('worker') || q.includes('artisan') || q.includes('apply')) {
      return \`To maximize your earnings as a certified Velgo Professional:
1. Keep your Location State & LGA, starting prices, and services description updated on your Profile page.
2. Include clear, real visual photos of your previous portfolio works.
3. Check the Marketplace tab regularly for open tasks, and apply immediately before other competitive quotes are locked in!\`;
    }`;

// Wait, the oldEarn matches the code.
// I think that's fine. It mentions Profile page.

// What about verify/verification?
const oldVerify = `    if (q.includes('verify') || q.includes('verification') || q.includes('nin') || q.includes('identity') || q.includes('badge')) {
      return \`A verified badge raises your Professional conversion rate by over 200%!
To get verified:
1. Go to your 'Profile' tab in the bottom menu and tap 'Verify Identity'.
2. Ensure you have input your legal full name exactly as it appears on your document.
3. Upload your NIN (National Identification Number) or corporate government ID cards.
4. Our manual verification team reviews most applications in under 24 hours. Your profile will then show the certified green verify badge immediately.\`;
    }`;

// Both of these already reference the Profile tab.
// Only the Gemini prompt had "directly inside this Hub page", which we just fixed.
