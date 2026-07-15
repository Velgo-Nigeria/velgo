const fs = require('fs');
let types = fs.readFileSync('lib/types.ts', 'utf8');
types = types.replace(
  "status: 'pending' | 'accepted' | 'completed' | 'cancelled' | 'declined';",
  "status: 'pending' | 'accepted' | 'completed' | 'cancelled' | 'declined';\n  decline_reason?: string;\n  quote_notes?: string;"
);
fs.writeFileSync('lib/types.ts', types);
