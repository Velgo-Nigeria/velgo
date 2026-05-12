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

    // 1. New Booking (Notify Worker)
    if (table === 'bookings' && type === 'INSERT' && record.status === 'pending') {
       userIdToNotify = record.worker_id;
       subject = 'You have a new Job Request on Velgo! 🚀';
       html = `<p>A client wants to hire you for a job. Log in to Velgo to view the details and accept the request.</p>`;
    }
    // 2. Booking Accepted (Notify Client)
    else if (table === 'bookings' && type === 'UPDATE' && record.status === 'accepted') {
       userIdToNotify = record.client_id;
       subject = 'Job Accepted! ✅';
       html = `<p>Your worker has accepted your job. You can now chat with them to discuss further details.</p>`;
    }
    // 3. New Message
    else if (table === 'messages' && type === 'INSERT') {
       userIdToNotify = record.receiver_id;
       subject = 'New Message received on Velgo 💬';
       html = `<p>You received a new message. Log in to your Velgo account to view and reply.</p>`;
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
