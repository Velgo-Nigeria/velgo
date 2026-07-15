const fs = require('fs');

function replaceInFile(filePath, replacements) {
    if (!fs.existsSync(filePath)) {
        console.log(`Skipped ${filePath} (not found)`);
        return;
    }
    let content = fs.readFileSync(filePath, 'utf8');
    let original = content;
    for (const [search, replacement] of replacements) {
        content = content.split(search).join(replacement);
    }
    if (content !== original) {
        fs.writeFileSync(filePath, content, 'utf8');
        console.log(`Updated ${filePath}`);
    }
}

// pages/Activity.tsx
replaceInFile('pages/Activity.tsx', [
    ['artisan is ready', 'professional is ready'],
    ['Artisan tried to accept', 'Professional tried to accept'],
    ['another artisan for this job', 'another professional for this job'],
    ['approved responses from the artisan', 'approved responses from the professional'],
    ['Response from Artisan', 'Response from Professional'],
]);

// pages/Pricing.tsx
replaceInFile('pages/Pricing.tsx', [
    ['Smart Artisans & Clients', 'Smart Professionals & Clients'],
    ['credit for artisans', 'credit for professionals'],
    ['an artisan uses', 'a professional uses'],
    ['Professional Artisan Hub', 'Professional Service Hub'],
]);

// pages/PostTask.tsx
replaceInFile('pages/PostTask.tsx', [
    ['Artisan Services, Repairs & Maintenance', 'Professional Services, Repairs & Maintenance'],
    ['any artisan or digital freelancer', 'any professional or digital freelancer'],
]);

// pages/Overview.tsx
replaceInFile('pages/Overview.tsx', [
    ['artisans instantly apply', 'professionals instantly apply'],
    ['Artisan conversion rate', 'Professional conversion rate'],
    ['artisans communicate directly', 'professionals communicate directly'],
    ['professional Velgo Artisan', 'certified Velgo Professional'],
    ['Nigerian artisans and clients', 'Nigerian professionals and clients'],
    ['artisan metrics', 'professional metrics'],
    ['Artisan Stats', 'Professional Stats'],
    ['artisan listings', 'professional listings'],
    ['an artisan a 100%', 'a professional a 100%'],
    ['the artisan over', 'the professional over'],
    ['clients, or artisans', 'clients, or professionals'],
]);

// pages/AdminDashboard.tsx
replaceInFile('pages/AdminDashboard.tsx', [
    ['Artisan Replies', 'Worker Replies'],
    ['Artisan / Worker', 'Professional / Worker'],
    ['Artisans / Workers', 'Professionals / Workers'],
    ['Direct Artisan Bookings', 'Direct Worker Bookings'],
    ['Artisan reply approved', 'Worker reply approved'],
    ['artisan reply', 'worker reply'],
    ['The artisan will', 'The worker will'],
    ['Artisan reply rejected', 'Worker reply rejected'],
    ['Artisan Reply Vetting', 'Worker Reply Vetting'],
    ['Proposed Artisan Reply', 'Proposed Worker Reply'],
    ['Artisan Applications', 'Worker Applications'],
]);

// components/UserGuide.tsx
replaceInFile('components/UserGuide.tsx', [
    ['local artisans inside', 'local professionals inside'],
    ['with the artisan', 'with the professional'],
    ['accompany the artisan', 'accompany the worker'],
    ['These artisans have', 'These professionals have'],
    ['Artisans with bright', 'Professionals with bright'],
    ["artisan's WhatsApp", "professional's WhatsApp"],
    ['verified artisan', 'verified professional'],
    ['Artisan: Tunde', 'Professional: Tunde'],
    ['Nigeran artisan history', 'Nigerian professional history'],
]);

// components/SavedBookmarksWidget.tsx
replaceInFile('components/SavedBookmarksWidget.tsx', [
    ['Professional Artisan', 'Verified Professional'],
]);

// components/NotificationToast.tsx
replaceInFile('components/NotificationToast.tsx', [
    ["msg.includes('artisan')", "msg.includes('artisan') || msg.includes('professional')"],
]);

// components/ShareModal.tsx
replaceInFile('components/ShareModal.tsx', [
    ['local artisans on', 'local professionals on'],
    ['Professional Artisan', 'Verified Professional'],
    ['Artisan: ${data.full_name}', 'Professional: ${data.full_name}'],
    ['Category: Artisan', 'Category: Professional'],
    ['local artisans near', 'local professionals near'],
    ['Verified Artisan', 'Verified Professional'],
    ['Artisan Hub', 'Professional Hub'],
]);

// lib/constants.ts
replaceInFile('lib/constants.ts', [
    ['Artisan Services, Repairs & Maintenance', 'Professional Services, Repairs & Maintenance'],
]);

console.log("Terminology update complete.");
