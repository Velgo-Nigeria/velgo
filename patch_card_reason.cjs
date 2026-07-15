const fs = require('fs');
let content = fs.readFileSync('pages/Activity.tsx', 'utf8');

const targetStr = `{item.status === 'pending' && (
                        <div className="w-full relative z-10 mt-4">`;

const reasonJSX = `
                    {(item.status === 'declined' || item.status === 'cancelled') && item.decline_reason && (
                        <div className="mt-3 bg-red-50 dark:bg-red-900/10 border border-red-100 dark:border-red-900/30 p-3 rounded-2xl relative z-10">
                            <p className="text-[9px] font-black uppercase text-red-500 tracking-widest mb-1">{item.status === 'declined' ? 'Decline Reason' : 'Cancel Reason'}</p>
                            <p className="text-xs font-medium text-red-900/80 dark:text-red-200">{item.decline_reason}</p>
                        </div>
                    )}
`;

if (!content.includes('Decline Reason')) {
    content = content.replace(targetStr, reasonJSX + "\n                    " + targetStr);
    fs.writeFileSync('pages/Activity.tsx', content);
    console.log("Patched card body with reason display.");
} else {
    console.log("Already patched.");
}
