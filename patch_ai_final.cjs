const fs = require('fs');
let code = fs.readFileSync('pages/Overview.tsx', 'utf8');

const regex = /systemInstruction: `[\s\S]*?`/g;
const newSystemInstruction = `systemInstruction: \`You are Velgo AI, the official intelligent assistant of the Velgo Nigeria marketplace (velgo.com.ng).
Your goal is to assist Nigerian professionals and clients. Speak with cultural context when suitable (keeping it professional but highly approachable).
Focus on helping them hire or earn safely. Keep answers concise, direct, and under 110 words.
If the user asks about buying tokens, NIN verification, or profile completion, guide them to go to their 'Profile' page via the bottom menu.
For safety reports, tell them they can use the form directly below on this Hub page.
To Post a Job, tell them to click the green plus (+) button.
To Apply for Jobs, tell them to tap on a job card in the Marketplace and click Apply.
To Hire, tell them to click on a professional's profile in the Marketplace or review applicants in My Activities.\``;

code = code.replace(regex, newSystemInstruction);

const oldRouter = code.substring(code.indexOf('const getLocalRouterReply = (query: string): string | null => {'), code.indexOf('const handleSendMessage = async') - 4);

const newRouter = `const getLocalRouterReply = (query: string): string | null => {
    const q = query.toLowerCase();
    
    if (q.includes('token') || q.includes('coin') || q.includes('buy') || q.includes('refill') || q.includes('credit') || q.includes('pack')) {
      return \`To buy token packs on Velgo:
1. Tap your 'Profile' icon in the bottom menu, then click on 'Subscription / Credits'.
2. You can select standard refill packs starting from extremely affordable rates.
3. Pay securely via card, bank transfer, or USSD using our native Paystack gateway.
4. Spent tokens let professionals instantly apply for high-budget marketplace jobs before others!\`;
    }
    
    if (q.includes('verify') || q.includes('verification') || q.includes('nin') || q.includes('identity') || q.includes('badge') || q.includes('complete profile') || q.includes('profile')) {
      return \`A verified badge raises your Professional conversion rate by over 200%!
To get verified:
1. Go to your 'Profile' tab in the bottom menu.
2. Complete your details (bio, category, pricing) and tap 'Verify Identity'.
3. Upload your NIN (National Identification Number) or corporate government ID cards.
4. Our manual verification team reviews most applications in under 24 hours.\`;
    }

    if (q.includes('post') || q.includes('create job') || q.includes('new task')) {
      return \`To post a job for professionals:
1. Look for the floating green plus (+) button at the bottom right of your screen.
2. Fill in the job details, budget, and location.
3. Submit it to the Marketplace and wait for professionals to apply, or directly hire a worker!\`;
    }

    if (q.includes('hire')) {
      return \`To hire a professional:
1. Browse the Marketplace and click on any professional's profile.
2. Click "Hire Worker" to send them a direct request.
3. If you posted a job, go to "My Activities", check your pending Requests, and click on an Applicant to hire them!\`;
    }

    if (q.includes('pay') || q.includes('payment') || q.includes('escrow') || q.includes('milestone') || q.includes('fund') || q.includes('price') || q.includes('pricing') || q.includes('deal')) {
      return \`Velgo supports direct milestone agreements and secure negotiations:
1. Clients and professionals communicate directly via secure WhatsApp redirects to negotiate scope & pricing.
2. We recommend working in structured milestones (e.g. fractional deposit or step-by-step progress payments).
3. Do not pay full upfront contract budgets before previewing or receiving finished services.
4. In case of issues or suspicious behavior, please file a priority alert in the Safety Center form below immediately!\`;
    }

    if (q.includes('dispute') || q.includes('issue') || q.includes('report') || q.includes('cheat') || q.includes('scam') || q.includes('theft') || q.includes('safety') || q.includes('security')) {
      return \`Your safety is our absolute, maximum priority.
If you experience any challenge during a transaction:
1. Fill out the "Priority Security Report" form on this Hub page below. Select the incident category, describe the issue, attach relevant log/screenshot evidence, and submit.
2. A priority emergency copy is routed straight to our dedicated Velgo Nigeria Safety Unit, and you will be redirected to chat with our staff.
3. For immediate physical dangers, contact native local safety lines at 112 or 122.\`;
    }

    if (q.includes('earn') || q.includes('get job') || q.includes('client') || q.includes('worker') || q.includes('artisan') || q.includes('apply')) {
      return \`To start earning and applying for jobs:
1. Keep your Location, starting prices, and services description updated on your Profile page.
2. Check the Marketplace tab regularly for open tasks.
3. Tap on a job card and click Apply immediately before other competitive quotes are locked in!
4. Clients will review your profile and accept your application to hire you!\`;
    }

    return null; // Force fallback to Gemini AI for general questions
  };`;

code = code.replace(oldRouter, newRouter);
fs.writeFileSync('pages/Overview.tsx', code);
console.log("Patched Overview.tsx AI assistant instructions and router.");
