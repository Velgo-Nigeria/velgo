const fs = require('fs');
let code = fs.readFileSync('pages/WorkerDetail.tsx', 'utf8');

code = code.replace(
    '<span className="bg-brand-light text-brand px-3 py-1 rounded-xl text-[10px] font-black uppercase tracking-widest">{worker?.category}</span>',
    '{worker?.category ? <span className="bg-brand-light text-brand px-3 py-1 rounded-xl text-[10px] font-black uppercase tracking-widest">{worker.category}</span> : <span className="bg-brand-light text-brand px-3 py-1 rounded-xl text-[10px] font-black uppercase tracking-widest">Professional</span>}'
);

code = code.replace(
    '₦{worker?.starting_price}',
    '₦{worker?.starting_price || 0}'
);

code = code.replace(
    '{worker?.bio || `Professional ${worker?.subcategory} available in ${worker?.address}.`}',
    '{worker?.bio || `Professional ${worker?.subcategory || "Service Provider"} available${worker?.address ? " in " + worker.address : ""}.`}'
);

fs.writeFileSync('pages/WorkerDetail.tsx', code);
console.log("Patched WorkerDetail.tsx for incomplete profiles");
