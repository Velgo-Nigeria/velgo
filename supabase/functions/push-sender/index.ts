// Follow Supabase Edge Function setup guide to deploy this
import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import webpush from "https://esm.sh/web-push@3.6.0"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

declare const Deno: any;

// Configuration
const subject = 'mailto:admin@velgo.ng';
const publicKey = Deno.env.get('VAPID_PUBLIC_KEY')!;
const privateKey = Deno.env.get('VAPID_PRIVATE_KEY')!;

webpush.setVapidDetails(subject, publicKey, privateKey);

serve(async (req: any) => {
  try {
    const { record, type, table, schema } = await req.json();

    // Initialize Supabase Admin Client
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    let userIdToNotify = '';
    let title = 'Velgo Update';
    let body = 'You have a new notification';
    let url = '/';

    // LOGIC: Determine who to notify based on the database event
    
    // Case 1: New Booking Request (Notify Worker)
    if (table === 'bookings' && type === 'INSERT') {
       userIdToNotify = record.worker_id;
       title = 'New Job Request!';
       body = 'A client wants to hire you. Tap to view.';
       url = '/activity';
    }
    
    // Case 2: Booking Accepted (Notify Client)
    else if (table === 'bookings' && type === 'UPDATE' && record.status === 'accepted') {
       userIdToNotify = record.client_id;
       title = 'Booking Accepted';
       body = 'Your worker has accepted the job!';
       url = '/activity';
    }

    // Case 3: New Message (Notify Receiver)
    else if (table === 'messages' && type === 'INSERT') {
       userIdToNotify = record.receiver_id;
       title = 'New Message';
       body = 'You received a new message.';
       url = '/messages';
    }
    
    if (!userIdToNotify) {
        return new Response(JSON.stringify({ message: 'No user to notify' }), { status: 200 });
    }

    // Fetch the user's subscriptions from the database
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
                        // Subscription is invalid/expired, delete it
                        console.log('Subscription expired, deleting...');
                        // Note: You would add logic here to delete from DB
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
})