const fs = require('fs');
let code = fs.readFileSync('pages/AdminDashboard.tsx', 'utf8');
const leftPanelClass = `flex-1 bg-slate-900 border-r border-slate-800 flex flex-col p-6 min-h-0 relative`;
if (code.includes(leftPanelClass)) {
    console.log("Left panel classes found.");
}
const rightPanelClass = `w-full md:w-[420px] bg-slate-950 p-6 overflow-y-auto flex flex-col justify-between border-t md:border-t-0 md:border-l border-slate-800`;
if (code.includes(rightPanelClass)) {
    console.log("Right panel classes found.");
}
