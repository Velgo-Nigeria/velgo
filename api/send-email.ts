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

    // 0. Unified In-App Notifications Integration
    if (table === 'notifications' && type === 'INSERT') {
       userIdToNotify = record.user_id;
       subject = record.title || 'New Update on Velgo 🔔';
       
       const titleColor = record.type === 'alert' ? '#b91c1c' : '#059669';
       const icon = record.type === 'alert' ? '⚠️' : record.type === 'success' ? '✅' : '🔔';
       
       html = `
         <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; padding: 32px 16px; background-color: #f3f4f6; color: #1f2937; min-height: 100%;">
           <div style="max-width: 600px; margin: 0 auto; background-color: #ffffff; border-radius: 16px; overflow: hidden; box-shadow: 0 4px 6px rgba(0, 0, 0, 0.05); border: 1px solid #e5e7eb;">
             
             <!-- Header Banner -->
             <div style="background-color: #111827; padding: 24px; text-align: center;">
               <h1 style="color: #ffffff; margin: 0; font-size: 24px; font-weight: 800; letter-spacing: -0.5px;">Velgo Nigeria</h1>
               <p style="color: #9ca3af; margin: 4px 0 0 0; font-size: 12px; font-weight: 500; text-transform: uppercase; letter-spacing: 1px;">On-Demand Safety-Verified Artisans</p>
             </div>
             
             <!-- Content Body -->
             <div style="padding: 32px 24px;">
               <div style="display: flex; align-items: center; margin-bottom: 24px;">
                 <span style="font-size: 32px; margin-right: 12px;">${icon}</span>
                 <h2 style="color: ${titleColor}; margin: 0; font-weight: 800; font-size: 20px; line-height: 1.2;">
                   ${record.title}
                 </h2>
               </div>
               
               <p style="font-size: 15px; line-height: 1.6; color: #374151; margin-bottom: 28px;">
                 ${record.message || 'You have a new update waiting on Velgo Nigeria.'}
               </p>
               
               <!-- Transaction call to action -->
               <div style="text-align: center; margin-top: 32px; margin-bottom: 24px;">
                 <a href="https://www.velgo.com.ng/activity" style="display: inline-block; background-color: #059669; color: #ffffff; padding: 14px 28px; border-radius: 12px; font-weight: bold; text-decoration: none; font-size: 14px; text-align: center; box-shadow: 0 4px 12px rgba(5, 150, 105, 0.2);">
                   View in Dashboard
                 </a>
               </div>
               
               <hr style="border: none; border-top: 1px solid #e5e7eb; margin: 28px 0;" />
               
               <!-- Tips panel -->
               <div style="background-color: #f9fafb; padding: 16px; border-radius: 12px; border-left: 4px solid #111827;">
                 <p style="font-size: 12px; line-height: 1.5; color: #4b5563; margin: 0;">
                   <strong>🛡️ Safety Tip:</strong> Always coordinate payments and details through safe communication channels. Make sure you confirm identities through the verified badges on Velgo.
                 </p>
               </div>
               
             </div>
             
             <!-- Footer Section -->
             <div style="background-color: #f9fafb; padding: 24px; text-align: center; border-top: 1px solid #e5e7eb; font-size: 12px; color: #6b7280;">
               <p style="margin: 0 0 8px 0;">This is an automated notification. Please do not reply directly to this email.</p>
               <p style="margin: 0;">© 2026 Velgo Nigeria. All rights reserved.</p>
             </div>
             
           </div>
         </div>
       `;
    }
    // 1. Booking Accepted (Notify Client)
    else if (table === 'bookings' && type === 'UPDATE' && record.status === 'accepted') {
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
    // 7. Safety Incident Report (Notify Admins)
    else if (table === 'safety_reports' && type === 'INSERT') {
       userIdToNotify = 'admin_role';
       subject = `🚨 URGENT: New Safety Incident (${record.type || 'Alert'})`;
       html = `
         <div style="font-family: sans-serif; padding: 24px; border: 2px solid #dc2626; border-radius: 16px; max-width: 600px; background-color: #fff; color: #1f2937;">
           <div style="display: flex; align-items: center; margin-bottom: 20px;">
             <span style="font-size: 32px; margin-right: 12px;">🚨</span>
             <h2 style="color: #dc2626; margin: 0; font-weight: 900; font-size: 22px; text-transform: uppercase; letter-spacing: -0.5px;">Velgo Safety Alert</h2>
           </div>
           <p style="font-size: 14px; line-height: 1.6; color: #4b5563;">A critical safety report has been filed on Velgo. Please review the incident details immediately.</p>
           <hr style="border: none; border-top: 1px solid #f3f4f6; margin: 20px 0;" />
           
           <div style="margin-bottom: 12px; font-size: 13px;">
             <strong>Incident Type:</strong> <span style="background-color: #fef2f2; color: #b91c1c; padding: 4px 8px; border-radius: 6px; font-weight: bold; font-size: 11px; text-transform: uppercase;">${record.type || 'N/A'}</span>
           </div>
           
           <div style="background-color: #f9fafb; padding: 18px; border-radius: 12px; border-left: 4px solid #dc2626; margin: 20px 0; white-space: pre-wrap; font-size: 13px; line-height: 1.6; font-family: monospace; color: #374151;">${record.details || 'No additional details provided.'}</div>
           
           <div style="margin-top: 24px; text-align: center;">
             <a href="https://velgo.com.ng" style="display: inline-block; background-color: #dc2626; color: #ffffff; padding: 14px 28px; border-radius: 12px; font-weight: bold; text-decoration: none; font-size: 13px; text-transform: uppercase; letter-spacing: 0.5px; box-shadow: 0 4px 12px rgba(220, 38, 38, 0.25);">Manage in Admin Panel</a>
           </div>
         </div>
       `;
    }
    // 8. Support Tickets (Notify Admins for incoming client messages)
    else if (table === 'support_messages' && type === 'INSERT' && !record.admin_reply) {
       userIdToNotify = 'admin_role';
       subject = '💬 New Support Ticket Message';
       html = `
         <div style="font-family: sans-serif; padding: 24px; border: 1px solid #e5e7eb; border-radius: 16px; max-width: 600px; background-color: #fff; color: #1f2937;">
           <div style="display: flex; align-items: center; margin-bottom: 20px;">
             <span style="font-size: 32px; margin-right: 12px;">💬</span>
             <h2 style="color: #059669; margin: 0; font-weight: 900; font-size: 22px; text-transform: uppercase; letter-spacing: -0.5px;">New Help Request</h2>
           </div>
           <p style="font-size: 14px; line-height: 1.6; color: #4b5563;">You have received a new support ticket query from a customer on Velgo.</p>
           <hr style="border: none; border-top: 1px solid #f3f4f6; margin: 20px 0;" />
           
           <div style="background-color: #f9fafb; padding: 18px; border-radius: 12px; border-left: 4px solid #059669; margin: 20px 0; white-space: pre-wrap; font-size: 13px; line-height: 1.6; color: #374151; font-style: italic;">"${record.content || record.message || 'No additional details provided.'}"</div>
           
           <div style="margin-top: 24px; text-align: center;">
             <a href="https://velgo.com.ng" style="display: inline-block; background-color: #059669; color: #ffffff; padding: 14px 28px; border-radius: 12px; font-weight: bold; text-decoration: none; font-size: 13px; text-transform: uppercase; letter-spacing: 0.5px; box-shadow: 0 4px 12px rgba(5, 150, 105, 0.25);">Reply via Admin Panel</a>
           </div>
         </div>
       `;
    }

    if (!userIdToNotify) {
        return res.status(200).json({ message: 'No email to send for this event.' });
    }

    let recipients: string[] = [];

    if (userIdToNotify === 'admin_role') {
        recipients = ['velgonigeria.uni@gmail.com', 'admin.velgo@gmail.com'];
    } else {
        // Fetch User Email from profiles
        const { data: profile, error } = await supabase
          .from('profiles')
          .select('email')
          .eq('id', userIdToNotify)
          .single();
        
        if (error || !profile?.email) {
           return res.status(400).json({ error: 'User email not found.' });
        }
        recipients = [profile.email];
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
            to: recipients,
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
