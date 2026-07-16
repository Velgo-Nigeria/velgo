const fs = require('fs');
let code = fs.readFileSync('pages/WorkerDetail.tsx', 'utf8');

code = code.replace(
    '<span>{worker?.address ? `${worker.address}, ` : \'\'}{worker?.lga}, {worker?.state}</span>',
    '<span>{[worker?.address, worker?.lga, worker?.state].filter(Boolean).join(", ")}</span>'
);

fs.writeFileSync('pages/WorkerDetail.tsx', code);
console.log("Patched WorkerDetail location");
