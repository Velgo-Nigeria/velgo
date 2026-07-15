const fs = require('fs');
let content = fs.readFileSync('pages/Activity.tsx', 'utf8');

// I will look for `<span className="text-[10px] font-black uppercase text-gray-500 tracking-widest">{item.status}</span>` or similar.
// Wait, I will just search for `{item.status === 'declined'`.
