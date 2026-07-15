const fs = require('fs');
function replaceInFile(filePath, replacements) {
    if (!fs.existsSync(filePath)) return;
    let content = fs.readFileSync(filePath, 'utf8');
    let original = content;
    for (const [search, replacement] of replacements) {
        content = content.split(search).join(replacement);
    }
    if (content !== original) {
        fs.writeFileSync(filePath, content, 'utf8');
    }
}

replaceInFile('pages/Landing.tsx', [
    ['hire artisans', 'hire professionals'],
    ['artisan labor', 'professional labor'],
    ['artisans and professionals', 'workers and professionals']
]);

replaceInFile('pages/TaskDetail.tsx', [
    ['friction for the artisan', 'friction for the professional'],
    ['another artisan', 'another professional']
]);

replaceInFile('pages/WorkerDetail.tsx', [
    ['this artisan', 'this professional'],
    ['This artisan', 'This professional']
]);

replaceInFile('pages/Activity.tsx', [
    ['dismiss this artisan', 'dismiss this professional'],
    ['client-to-artisan', 'client-to-professional'],
    ['verified artisan', 'verified professional'],
    ['completed by another artisan', 'completed by another professional'],
    ['artisan replies', 'worker replies']
]);

replaceInFile('pages/AdminDashboard.tsx', [
    ['clients, or artisans', 'clients, or professionals'],
    ['artisan replies', 'worker replies']
]);

