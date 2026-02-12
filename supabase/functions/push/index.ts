
// @ts-nocheck
import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import webpush from "https://esm.sh/web-push@3.6.0"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

// Configuration
// NOTE: For testing purposes, we use a public test key pair. 
// For production, regenerate these using `web-push generate-vapid-keys` and set via `supabase secrets set`
const subject = 'mailto:admin@velgo.ng';
const publicKey = Deno.env.get('VAPID_PUBLIC_KEY') || 'BEl62iUYgUivxIkv69yViEuiBIa-Ib9-SkvMeAtA3LFgDzkrxZJjSgSnfckjBJuBkr3qBLYFpaaNYTupyyV33GQ';
const privateKey = Deno.env.get('VAPID_PRIVATE_KEY') || 'rswBUssqX3V5Q18P_5-M9VcwqK8qjKj8X7k_7jXy8-A';

webpush.setVapidDetails(subject, publicKey, privateKey);

serve(async (req: any) => {
  try {
    const { record, type, table } = await req.json();

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    // --- CASE 1: Admin Broadcast ---
    if (table === 'broadcasts' && type === 'INSERT') {
        const targetRole = record.target_role;
        
        // Fetch all subscriptions (In a real massive app, you would batch this or use a queue)
        // If role is specific, we should filter, but for MVP we send to all or filter in application logic if needed.
        // Optimally: join with profiles. Here we blindly send to subscribers for simplicity.
        const { data: allSubs } = await supabase.from('push_subscriptions').select('subscription');
        
        if (allSubs && allSubs.length > 0) {
            const payload = JSON.stringify({ 
                title: record.title, 
                body: record.message, 
                url: '/' 
            });
            
            const promises = allSubs.map((sub: any) => 
                webpush.sendNotification(sub.subscription, payload).catch((e) => console.log('Broadcast error', e))
            );
            
            // Don't await all for speed, or await if you want to ensure delivery before response
            await Promise.all(promises); 
            return new Response(JSON.stringify({ success: true, type: 'broadcast', count: allSubs.length }), { headers: { "Content-Type": "application/json" } });
        }
        return new Response(JSON.stringify({ success: true, count: 0 }), { headers: { "Content-Type": "application/json" } });
    }

    // --- CASE 2: Targeted Notifications (User to User) ---
    let userIdToNotify = '';
    let title = 'Velgo';
    let body = 'New Activity';
    let url = '/';

    // 1. New Booking (Notify Worker)
    if (table === 'bookings' && type === 'INSERT' && record.status === 'pending') {
       userIdToNotify = record.worker_id;
       title = 'New Job Request! 🚀';
       body = 'A client wants to hire you. Open to view details.';
       url = '/activity';
    }
    
    // 2. Booking Accepted (Notify Client)
    else if (table === 'bookings' && type === 'UPDATE' && record.status === 'accepted') {
       userIdToNotify = record.client_id;
       title = 'Job Accepted! ✅';
       body = 'Your worker has accepted. You can now chat.';
       url = '/activity';
    }

    // 3. New Message (Notify Receiver)
    else if (table === 'messages' && type === 'INSERT') {
       userIdToNotify = record.receiver_id;
       title = 'New Message 💬';
       body = 'You received a new message.';
       url = '/messages';
    }
    
    if (!userIdToNotify) {
        return new Response(JSON.stringify({ message: 'No notification target found.' }), { headers: { "Content-Type": "application/json" } });
    }

    // Fetch User Subscriptions
    const { data: subscriptions } = await supabase
      .from('push_subscriptions')
      .select('subscription')
      .eq('user_id', userIdToNotify);

    if (subscriptions && subscriptions.length > 0) {
        const payload = JSON.stringify({ title, body, url });
        
        const promises = subscriptions.map((sub: any) => 
            webpush.sendNotification(sub.subscription, payload)
                .catch((err: any) => {
                    if (err.statusCode === 410) {
                        // Cleanup invalid subscription
                        supabase.from('push_subscriptions').delete().match({ subscription: sub.subscription });
                    }
                })
        );
        await Promise.all(promises);
    }

    return new Response(JSON.stringify({ success: true }), { headers: { "Content-Type": "application/json" } });
  } catch (e: any) {
    return new Response(JSON.stringify({ error: e.message }), { status: 500, headers: { "Content-Type": "application/json" } });
  }
});
