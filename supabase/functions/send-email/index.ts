import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

// You must set this securely in Supabase using:
// supabase secrets set RESEND_API_KEY=re_your_api_key
const resendApiKey = Deno.env.get("RESEND_API_KEY");

serve(async (req) => {
  try {
    const { record, type, table } = await req.json();

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    let userIdToNotify = '';
    let subject = '';
    let text = '';
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

    // 3. New Message (Notify Receiver)
    else if (table === 'messages' && type === 'INSERT') {
       userIdToNotify = record.receiver_id;
       subject = 'New Message received on Velgo 💬';
       html = `<p>You received a new message. Log in to your Velgo account to view and reply.</p>`;
    }

    // 4. Admin Broadcasts
    else if (table === 'broadcasts' && type === 'INSERT') {
       // In a real production app, sending massive broadcast emails should be batched via an email list provider,
       // but here is a simple implementation for learning/starting out.
       /*
       const { data: profiles } = await supabase.from('profiles').select('email');
       if (profiles && profiles.length > 0) {
         // ... implementation ...
       }
       */
       return new Response(JSON.stringify({ success: true, message: "Broadcast skipped via email, handled by push" }), { headers: { "Content-Type": "application/json" } });
    }

    if (!userIdToNotify) {
        return new Response(JSON.stringify({ message: 'No notification target found or unhandled event.' }), { headers: { "Content-Type": "application/json" } });
    }

    // Fetch User Email
    const { data: { user }, error } = await supabase.auth.admin.getUserById(userIdToNotify);
    
    if (error || !user?.email) {
       return new Response(JSON.stringify({ error: 'User email not found.' }), { status: 400, headers: { "Content-Type": "application/json" } });
    }

    if (!resendApiKey) {
       return new Response(JSON.stringify({ error: 'RESEND_API_KEY is not set in edge function secrets.' }), { status: 500, headers: { "Content-Type": "application/json" } });
    }

    // Send email using Resend REST API
    const res = await fetch('https://api.resend.com/emails', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${resendApiKey}`
        },
        body: JSON.stringify({
            from: 'Velgo Notifications <notifications@velgo.com.ng>',
            to: [user.email],
            subject: subject,
            html: html
        })
    });

    const resData = await res.json();

    if (res.ok) {
        return new Response(JSON.stringify({ success: true, data: resData }), { headers: { "Content-Type": "application/json" } });
    } else {
        return new Response(JSON.stringify({ error: resData }), { status: 400, headers: { "Content-Type": "application/json" } });
    }

  } catch (e: any) {
    return new Response(JSON.stringify({ error: e.message }), { status: 500, headers: { "Content-Type": "application/json" } });
  }
});
