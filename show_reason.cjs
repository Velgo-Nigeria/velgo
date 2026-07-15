const fs = require('fs');
let content = fs.readFileSync('pages/Activity.tsx', 'utf8');

const targetStr = `{(item.status === 'cancelled' || item.status === 'declined') && (
                        <p className="text-[9px] text-gray-500 italic mt-2">Request was {item.status}.</p>
                    )}`;
                    
const newStr = `{(item.status === 'cancelled' || item.status === 'declined') && (
                        <div className="mt-2 space-y-1">
                            <p className="text-[9px] text-gray-500 italic">Request was {item.status}.</p>
                            {item.decline_reason && (
                                <p className="text-[9px] font-medium text-red-500/80 bg-red-50 dark:bg-red-900/10 p-1.5 rounded-md inline-block">Reason: {item.decline_reason}</p>
                            )}
                        </div>
                    )}`;

if (content.includes(targetStr)) {
    content = content.replace(targetStr, newStr);
    fs.writeFileSync('pages/Activity.tsx', content);
    console.log("Replaced target string");
} else {
    // If not found, let's just insert it after the status badges.
    console.log("Target string not found, falling back.");
}
