const fs = require('fs');
let code = fs.readFileSync('pages/AdminDashboard.tsx', 'utf8');
const regex = /<div className="fixed inset-0 z-50 bg-slate-950\/95 flex flex-col md:flex-row items-stretch select-none overflow-hidden animate-fadeIn">([\s\S]*?)<div className="w-full md:w-\[420px\] bg-slate-950/g;
const match = regex.exec(code);
if (match) {
    console.log("Left panel classes:", match[1].substring(0, 200));
}
