import { createClient } from '@supabase/supabase-js';

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
    
    const supabaseUrl = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL;
    const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY || process.env.SUPABASE_ANON_KEY;
    const resendApiKey = process.env.RESEND_API_KEY;

    if (!supabaseUrl || !supabaseKey) {
       return res.status(500).json({ error: 'Missing Supabase Config' });
    }
    if (!resendApiKey) {
       return res.status(500).json({ error: 'Missing RESEND_API_KEY. Please add it to your Vercel Environment Variables.' });
    }

    const supabase = createClient(supabaseUrl, supabaseKey);

    let userIdToNotify = '';
    let subject = '';
    let html = '';

    // 1. Booking Accepted (Notify Client)
    if (table === 'bookings' && type === 'UPDATE' && record.status === 'accepted') {
       userIdToNotify = record.client_id;
       subject = 'Job Accepted! ✅';
       html = `<p>Your worker has accepted your job. You can now chat with them to discuss further details.</p>`;
    }
    // 2. New Message
    else if (table === 'messages' && type === 'INSERT') {
       userIdToNotify = record.receiver_id;
       subject = 'New Message received on Velgo 💬';
       html = `<p>You received a new message. Log in to your Velgo account to view and reply.</p>`;
    }
    // 3. ID Verification Status
    else if (table === 'profiles' && type === 'UPDATE') {
       const oldRecord = payload.old_record || {};
       if (record.is_verified === true && oldRecord.is_verified === false) {
           userIdToNotify = record.id;
           subject = 'Your ID has been Verified! ✅';
           html = `<p>Congratulations! Your identity verification was successful. You can now fully utilize Velgo.</p>`;
       } else if (record.is_verified === false && oldRecord.is_verified === true) {
           userIdToNotify = record.id;
           subject = 'Important: ID Verification Revoked ❌';
           html = `<p>There is an issue with your identity verification. Please contact support.</p>`;
       }
    }
    // 4. Task Update
    else if (table === 'posted_tasks' && type === 'UPDATE') {
       // Notify the client about task status change
       const oldRecord = payload.old_record || {};
       if (record.status !== oldRecord.status) {
           userIdToNotify = record.client_id;
           subject = `Your Task Status is now ${record.status.toUpperCase()} 🔄`;
           html = `<p>Your task "${record.title}" has moved to the ${record.status} status.</p>`;
       }
    }
    // 5. Admin Broadcasts
    else if (table === 'broadcasts' && type === 'INSERT') {
       subject = record.title || 'New Announcement from Velgo 📢';
       html = `<p>${record.message || 'Check Velgo for details.'}</p>`;
       // For broadcasts, we need to send to everyone. For simplicity here, we might just not provide userIdToNotify.
       // In a real Vercel setup, doing mass emails here directly can timeout. 
       // If you want me to write code to batch all users, I can do so, but it's tricky in a single serverless function without timeouts.
       // We will pass a specific flag.
       return res.status(200).json({ message: 'Broadcasts via email requires a batch emailing service setup.' });
    }
    // 6. Review Request (Example: Triggered manually or by a specific event)
    else if (table === 'review_requests' && type === 'INSERT') {
       userIdToNotify = record.user_id;
       subject = 'How did we do? Please leave a review! ⭐';
       html = `<p>We hope you are enjoying Velgo. Please take a moment to leave a review on your recent experience.</p>`;
    }

    if (!userIdToNotify) {
        return res.status(200).json({ message: 'No email to send for this event.' });
    }

    // Fetch User Email from profiles
    const { data: profile, error } = await supabase
      .from('profiles')
      .select('email')
      .eq('id', userIdToNotify)
      .single();
    
    if (error || !profile?.email) {
       return res.status(400).json({ error: 'User email not found.' });
    }

    // Send email using Resend REST API
    const resendRes = await fetch('https://api.resend.com/emails', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${resendApiKey}`
        },
        body: JSON.stringify({
            from: 'Velgo Notifications <notifications@velgo.com.ng>',
            to: [profile.email],
            subject: subject,
            html: html
        })
    });

    const resData = await resendRes.json();

    if (resendRes.ok) {
        return res.status(200).json({ success: true, data: resData });
    } else {
        return res.status(400).json({ error: resData });
    }

  } catch (e: any) {
    return res.status(500).json({ error: e.message });
  }
}
