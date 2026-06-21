import { createClient } from '@supabase/supabase-js';
import webpush from 'web-push';

export default async function handler(req: any, res: any) {
  // Only allow POST requests
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method Not Allowed' });
  }

  try {
    const payload = req.body;
    
    // Check if body is empty
    if (!payload) {
      return res.status(400).json({ error: 'Missing request body' });
    }

    const { type, table, record } = payload;
    
    const supabaseUrl = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL || 'https://mrnypajnlltkuitfzgkh.supabase.co';
    // For reading other users' subscriptions, we MUST prefer the Service Role Key (secret) to bypass RLS.
    const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im1ybnlwYWpubGx0a3VpdGZ6Z2toIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2NjM3OTY0NywiZXhwIjoyMDgxOTU1NjQ3fQ.ZtxDaG71AgbD8DChdXVmI4Am8a3f_2lNLJl7rlGrZAU' || process.env.SUPABASE_ANON_KEY || process.env.VITE_SUPABASE_ANON_KEY;

    if (!supabaseUrl || !supabaseServiceKey) {
       return res.status(500).json({ error: 'Missing Supabase Config. Ensure SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY are set.' });
    }

    const supabase = createClient(supabaseUrl, supabaseServiceKey, {
      auth: {
        persistSession: false,
        autoRefreshToken: false
      }
    });

    // 1. Configure VAPID keys (Zero-Config Default fallback matching pushManager.ts)
    const subject = process.env.VAPID_SUBJECT || 'mailto:admin@velgo.ng';
    
    let publicKey = process.env.VITE_VAPID_PUBLIC_KEY || process.env.VAPID_PUBLIC_KEY;
    if (!publicKey || publicKey === 'undefined' || publicKey === 'null' || publicKey.trim() === '' || publicKey.length < 40) {
        publicKey = 'BE24hFf2ZMbL8kfXPykLjBGESP1rGAaUU6qWRX2uuGZiJMV-JAv2NEAfRn2Kt4agaWPhbSq5UjFYb1Hao4JtdWI';
    }
    
    let privateKey = process.env.VAPID_PRIVATE_KEY;
    if (!privateKey || privateKey === 'undefined' || privateKey === 'null' || privateKey.trim() === '' || privateKey.length < 20) {
        privateKey = 'Ja-URxYlZDUo1EBRicjfHI63B4--O-9ktPHSuxoPXqU';
    }

    webpush.setVapidDetails(subject, publicKey, privateKey);

    // --- CASE 1: Admin Broadcasts ---
    if (table === 'broadcasts' && type === 'INSERT') {
        const title = record.title || 'Announcement 📢';
        const body = record.message || 'Check Velgo for details.';
        
        // Fetch all subscriptions in the database
        const { data: allSubs, error } = await supabase.from('push_subscriptions').select('id, subscription, endpoint');
        
        if (error) {
            return res.status(400).json({ error: 'Failed to fetch subscriptions', details: error.message });
        }

        if (allSubs && allSubs.length > 0) {
            const pushPayload = JSON.stringify({ 
                title, 
                body, 
                url: '/' 
            });
            
            const results = await Promise.allSettled(
                allSubs.map(async (sub: any) => {
                    try {
                        await webpush.sendNotification(sub.subscription, pushPayload);
                        return { id: sub.id, status: 'success' };
                    } catch (err: any) {
                        // If subscription is expired or unregistered, delete it from the DB
                        if (err.statusCode === 410 || err.statusCode === 404) {
                            await supabase.from('push_subscriptions').delete().eq('id', sub.id);
                        }
                        return { id: sub.id, status: 'failed', statusCode: err.statusCode };
                    }
                })
            );
            
            return res.status(200).json({ success: true, type: 'broadcast', count: allSubs.length, results });
        }
        return res.status(200).json({ success: true, message: 'No active push subscriptions found for broadcast.' });
    }

    // --- CASE 2: Targeted Notifications (User to User) ---
    let userIdToNotify = '';
    let title = 'Velgo';
    let body = 'New Activity';
    let url = '/';

    // 1. Handling unified notifications
    if (table === 'notifications' && type === 'INSERT') {
       userIdToNotify = record.user_id;
       title = record.title || 'Velgo Notification';
       body = record.message || 'New update from Velgo. Tap to view.';
       
       const lowerTitle = title.toLowerCase();
       const lowerBody = body.toLowerCase();
       if (lowerTitle.includes('booking') || lowerTitle.includes('job') || lowerTitle.includes('application') || lowerTitle.includes('activity') || lowerTitle.includes('hired')) {
           url = '/activity';
       } else if (lowerTitle.includes('verify') || lowerTitle.includes('identity') || lowerTitle.includes('profile')) {
           url = '/profile';
       } else if (lowerTitle.includes('message') || lowerTitle.includes('chat')) {
           url = '/messages';
       } else if (lowerTitle.includes('token') || lowerTitle.includes('pack') || lowerTitle.includes('refuel') || lowerTitle.includes('coin')) {
           url = '/overview';
       } else if (lowerTitle.includes('referral') || lowerTitle.includes('reward') || lowerTitle.includes('promo')) {
           url = '/overview';
       } else if (lowerTitle.includes('dispute') || lowerTitle.includes('report') || lowerTitle.includes('resolved')) {
           url = '/activity';
       } else {
           url = '/activity';
       }
    }

    // 2. Fallbacks and Direct Triggers (for fast real-time messaging or old schema events)
    else if (table === 'bookings' && type === 'INSERT' && record.status === 'pending') {
       userIdToNotify = record.worker_id;
       title = 'New Job Request! 🚀';
       body = 'A client wants to hire you. Open to view details.';
       url = '/activity';
    }
    
    else if (table === 'bookings' && type === 'UPDATE' && record.status === 'accepted') {
       userIdToNotify = record.client_id;
       title = 'Job Accepted! ✅';
       body = 'Your worker has accepted. You can now chat.';
       url = '/activity';
    }

    else if (table === 'messages' && type === 'INSERT') {
       userIdToNotify = record.receiver_id;
       title = 'New Message 💬';
       body = record.content || 'You received a new message.';
       url = '/messages';
    }

    else if (table === 'profiles' && type === 'UPDATE') {
       const { old_record } = payload;
       if (record.is_verified === true && (!old_record || old_record.is_verified === false)) {
          userIdToNotify = record.id;
          title = 'Identity Verified! ✅';
          body = 'Your Velgo Professional Identity is now successfully verified.';
          url = '/profile';
       }
    }

    if (!userIdToNotify) {
        return res.status(200).json({ message: 'No target subscription needed for this database trigger event.' });
    }

    // Fetch Target User Subscriptions matching the ID
    const { data: userSubs, error: subError } = await supabase
      .from('push_subscriptions')
      .select('id, subscription, endpoint')
      .eq('user_id', userIdToNotify);

    if (subError) {
        return res.status(400).json({ error: 'Failed to fetch user subscriptions', details: subError.message });
    }

    if (!userSubs || userSubs.length === 0) {
        return res.status(200).json({ success: true, message: `Notification skipped: Target user (${userIdToNotify}) has no push subscriptions registered.` });
    }

    const pushPayload = JSON.stringify({ title, body, url });

    const results = await Promise.allSettled(
        userSubs.map(async (sub: any) => {
            try {
                await webpush.sendNotification(sub.subscription, pushPayload);
                return { id: sub.id, status: 'success' };
            } catch (err: any) {
                // Garbage collect dead subscriptions automatically
                if (err.statusCode === 410 || err.statusCode === 404) {
                    await supabase.from('push_subscriptions').delete().eq('id', sub.id);
                }
                return { id: sub.id, status: 'failed', statusCode: err.statusCode };
            }
        })
    );

    return res.status(200).json({ success: true, userId: userIdToNotify, results });

  } catch (e: any) {
    return res.status(500).json({ error: e.message });
  }
}
