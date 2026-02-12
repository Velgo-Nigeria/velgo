
// @ts-nocheck
// -------------------------------------------------------------------------
// VELGO EDGE FUNCTION: PUSH NOTIFICATIONS
// Deploy this code to Supabase Edge Functions (e.g., functions/push/index.ts)
// -------------------------------------------------------------------------

import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import webpush from "https://esm.sh/web-push@3.6.0"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

// You must set these in Supabase Dashboard > Edge Functions > Secrets
const subject = 'mailto:admin@velgo.ng';
const publicKey = Deno.env.get('VAPID_PUBLIC_KEY')!;
const privateKey = Deno.env.get('VAPID_PRIVATE_KEY')!;

webpush.setVapidDetails(subject, publicKey, privateKey);

serve(async (req: any) => {
  try {
    const { record, type, table } = await req.json();

    // Initialize Supabase Admin Client
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    let userIdToNotify = '';
    let title = 'Velgo';
    let body = 'New Activity';
    let url = '/';

    // LOGIC: Determine who to notify based on the database event
    
    // 1. New Booking Request (Notify Worker)
    // Table: bookings, Event: INSERT
    if (table === 'bookings' && type === 'INSERT' && record.status === 'pending') {
       userIdToNotify = record.worker_id;
       title = 'New Job Request! 🚀';
       body = 'A client wants to hire you. Tap to view details.';
       url = '/activity';
    }
    
    // 2. Booking Accepted (Notify Client)
    // Table: bookings, Event: UPDATE, Status changed to 'accepted'
    else if (table === 'bookings' && type === 'UPDATE' && record.status === 'accepted') {
       userIdToNotify = record.client_id;
       title = 'Job Accepted! ✅';
       body = 'Your worker has accepted the request. You can now chat.';
       url = '/activity';
    }

    // 3. New Message (Notify Receiver)
    // Table: messages, Event: INSERT
    else if (table === 'messages' && type === 'INSERT') {
       userIdToNotify = record.receiver_id;
       title = 'New Message 💬';
       body = 'You received a new message.';
       url = '/messages';
    }
    
    // 4. Admin Broadcast
    // Table: broadcasts, Event: INSERT
    else if (table === 'broadcasts' && type === 'INSERT') {
        const targetRole = record.target_role;
        let query = supabase.from('push_subscriptions').select('subscription');
        
        // Note: For simplicity in this demo, we send to all subscriptions if role is 'all'.
        // In production, you would join with profiles to filter by role.
        
        const { data: allSubs } = await query;
        if (allSubs) {
            const payload = JSON.stringify({ 
                title: record.title, 
                body: record.message, 
                url: '/' 
            });
            const promises = allSubs.map((sub: any) => 
                webpush.sendNotification(sub.subscription, payload).catch(() => {})
            );
            await Promise.all(promises);
            return new Response(JSON.stringify({ success: true, count: allSubs.length }), { headers: { "Content-Type": "application/json" } });
        }
    }
    
    if (!userIdToNotify) {
        return new Response(JSON.stringify({ message: 'No notification logic matched.' }), { status: 200 });
    }

    // Fetch the user's subscriptions
    const { data: subscriptions } = await supabase
      .from('push_subscriptions')
      .select('subscription')
      .eq('user_id', userIdToNotify);

    if (subscriptions && subscriptions.length > 0) {
        const payload = JSON.stringify({ title, body, url });
        
        // Send to all registered devices for that user
        const promises = subscriptions.map((sub: any) => 
            webpush.sendNotification(sub.subscription, payload)
                .catch((err: any) => {
                    if (err.statusCode === 410 || err.statusCode === 404) {
                        console.log('Subscription expired/invalid.');
                    }
                    console.error('Error sending push:', err);
                })
        );
        
        await Promise.all(promises);
    }

    return new Response(JSON.stringify({ success: true }), { headers: { "Content-Type": "application/json" } });
  } catch (e: any) {
    return new Response(JSON.stringify({ error: e.message }), { status: 500, headers: { "Content-Type": "application/json" } });
  }
});
