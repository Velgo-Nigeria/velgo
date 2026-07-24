const fs = require('fs');
const content = fs.readFileSync('pages/overview/DashboardTab.tsx', 'utf8');

const match = content.match(/export interface DashboardTabProps \{([^}]+)\}/);
if (match) {
    const props = match[1].split('\n').map(l => l.trim().split(':')[0]).filter(Boolean);
    console.log(props);
}
