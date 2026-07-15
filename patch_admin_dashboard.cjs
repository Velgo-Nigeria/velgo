const fs = require('fs');
let code = fs.readFileSync('pages/AdminDashboard.tsx', 'utf8');

// Update left panel wrapper
code = code.replace(
  'className="flex-1 bg-slate-900 border-r border-slate-800 flex flex-col p-6 min-h-0 relative"',
  'className="h-[50vh] md:h-auto md:flex-1 bg-slate-900 border-b md:border-b-0 md:border-r border-slate-800 flex flex-col p-4 md:p-6 min-h-0 shrink-0 relative"'
);

// Update right panel wrapper
code = code.replace(
  'className="w-full md:w-[420px] bg-slate-950 p-6 overflow-y-auto flex flex-col justify-between border-t md:border-t-0 md:border-l border-slate-800"',
  'className="flex-1 md:flex-none w-full md:w-[420px] bg-slate-950 p-4 md:p-6 overflow-y-auto flex flex-col border-l-0 md:border-l border-slate-800"'
);

// Optimize the control buttons in left panel for mobile
code = code.replace(
  '<div className="flex flex-wrap items-center justify-center gap-3 mt-4 bg-slate-950 p-3 rounded-2xl border border-slate-800 shadow">',
  '<div className="flex flex-wrap items-center justify-center gap-2 md:gap-3 mt-3 md:mt-4 bg-slate-950 p-2 md:p-3 rounded-xl md:rounded-2xl border border-slate-800 shadow shrink-0">'
);

// Optimize individual buttons
code = code.replace(/px-4 py-2 bg-slate-900 hover:bg-slate-850 border border-slate-800 rounded-xl text-xs font-black uppercase/g, 'px-3 md:px-4 py-1.5 md:py-2 bg-slate-900 hover:bg-slate-850 border border-slate-800 rounded-lg md:rounded-xl text-[10px] md:text-xs font-black uppercase');
code = code.replace(/px-4 py-2 bg-slate-900 hover:bg-slate-800 border border-slate-800 rounded-xl text-xs font-black uppercase text-slate-400/g, 'px-3 md:px-4 py-1.5 md:py-2 bg-slate-900 hover:bg-slate-800 border border-slate-800 rounded-lg md:rounded-xl text-[10px] md:text-xs font-black uppercase text-slate-400');

fs.writeFileSync('pages/AdminDashboard.tsx', code);
console.log("Patched AdminDashboard mobile layout for verification suite.");
