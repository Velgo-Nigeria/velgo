const fs = require('fs');
let code = fs.readFileSync('pages/Activity.tsx', 'utf8');

code = code.replace(
    'setDeclineReason("");\n        setShowDeclineModal(true);',
    'setDeclineReason("");\n        setCustomDeclineReason("");\n        setShowDeclineModal(true);'
);

// Also fix the X button
code = code.replace(
    'onClick={() => setShowDeclineModal(false)}',
    'onClick={() => { setShowDeclineModal(false); setCustomDeclineReason(""); }}'
);

fs.writeFileSync('pages/Activity.tsx', code);
console.log("Fixed resetting custom reason in Activity.tsx");
