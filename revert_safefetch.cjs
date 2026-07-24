const fs = require('fs');
let content = fs.readFileSync('pages/AdminDashboard.tsx', 'utf8');

// Replace safeFetch( with safeFetch(() => 
// BUT only on lines where it calls supabase.from
content = content.replace(/safeFetch\(supabase\.from/g, "safeFetch(() => supabase.from");

fs.writeFileSync('pages/AdminDashboard.tsx', content);
