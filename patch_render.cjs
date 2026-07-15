const fs = require('fs');

let code = fs.readFileSync('pages/Activity.tsx', 'utf8');

code = code.replace(
  "{(item.status === 'declined' || item.status === 'cancelled') && item.decline_reason && (",
  "{(item.status === 'declined' || item.status === 'cancelled') && (item.decline_reason || item.quote_notes) && ("
);

code = code.replace(
  "<p className=\"text-xs font-medium text-red-900/80 dark:text-red-200\">{item.decline_reason}</p>",
  "<p className=\"text-xs font-medium text-red-900/80 dark:text-red-200\">{item.decline_reason || item.quote_notes}</p>"
);

fs.writeFileSync('pages/Activity.tsx', code);
