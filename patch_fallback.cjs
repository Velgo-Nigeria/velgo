const fs = require('fs');
let content = fs.readFileSync('pages/Activity.tsx', 'utf8');

const originalUpdate = `let updatePayload: any = { status: newStatus };
            if ((newStatus === 'declined' || newStatus === 'cancelled') && declineReason && declineBookingItem?.id === booking.id) {
                updatePayload.decline_reason = declineReason;
            }
            const { error } = await supabase.from('bookings').update(updatePayload).eq('id', booking.id);`;

const newUpdate = `let updatePayload: any = { status: newStatus };
            if ((newStatus === 'declined' || newStatus === 'cancelled') && declineReason && declineBookingItem?.id === booking.id) {
                updatePayload.decline_reason = declineReason;
            }
            let { error } = await supabase.from('bookings').update(updatePayload).eq('id', booking.id);
            
            // Fallback if decline_reason column doesn't exist yet
            if (error && error.message && error.message.includes('decline_reason')) {
                delete updatePayload.decline_reason;
                updatePayload.quote_notes = declineReason;
                const fallbackRes = await supabase.from('bookings').update(updatePayload).eq('id', booking.id);
                error = fallbackRes.error;
            }`;

content = content.replace(originalUpdate, newUpdate);

// Also fallback for auto-decline
const originalAutoDecline = `            const { error: declineError } = await supabase
                .from('bookings')
                .update({ 
                    status: 'declined',
                    decline_reason: 'The client has accepted another artisan for this job.'
                })
                .eq('task_id', booking.task_id)
                .eq('status', 'pending');`;
                
const newAutoDecline = `            let { error: declineError } = await supabase
                .from('bookings')
                .update({ 
                    status: 'declined',
                    decline_reason: 'The client has accepted another artisan for this job.'
                })
                .eq('task_id', booking.task_id)
                .eq('status', 'pending');
                
            if (declineError && declineError.message && declineError.message.includes('decline_reason')) {
                const fallbackDecline = await supabase
                    .from('bookings')
                    .update({ 
                        status: 'declined',
                        quote_notes: 'The client has accepted another artisan for this job.'
                    })
                    .eq('task_id', booking.task_id)
                    .eq('status', 'pending');
                declineError = fallbackDecline.error;
            }`;

content = content.replace(originalAutoDecline, newAutoDecline);

fs.writeFileSync('pages/Activity.tsx', content);
