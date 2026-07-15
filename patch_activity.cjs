const fs = require('fs');
let content = fs.readFileSync('pages/Activity.tsx', 'utf8');

// Add state variables
const stateVars = `
  const [showDeclineModal, setShowDeclineModal] = useState(false);
  const [declineBookingItem, setDeclineBookingItem] = useState<any>(null);
  const [declineActionType, setDeclineActionType] = useState<'declined' | 'cancelled'>('declined');
  const [declineReason, setDeclineReason] = useState("");
`;

if (!content.includes('showDeclineModal')) {
  content = content.replace("const [showRedirectModal, setShowRedirectModal] = useState(false);", stateVars + "\n  const [showRedirectModal, setShowRedirectModal] = useState(false);");
}

const originalUpdate = `const updateBookingStatus = async (booking: any, newStatus: string) => {`;
const newUpdate = `const updateBookingStatus = async (booking: any, newStatus: string, bypassModal: boolean = false) => {
    if ((newStatus === 'declined' || newStatus === 'cancelled') && !bypassModal) {
        setDeclineBookingItem(booking);
        setDeclineActionType(newStatus);
        setDeclineReason("");
        setShowDeclineModal(true);
        return;
    }`;

content = content.replace(originalUpdate, newUpdate);

// Wait, the update itself for 'declined' and 'cancelled' should pass decline_reason.
const originalDbUpdate = `const { error } = await supabase.from('bookings').update({ status: newStatus }).eq('id', booking.id);`;
const newDbUpdate = `let updatePayload: any = { status: newStatus };
            if ((newStatus === 'declined' || newStatus === 'cancelled') && declineReason && declineBookingItem?.id === booking.id) {
                updatePayload.decline_reason = declineReason;
            }
            const { error } = await supabase.from('bookings').update(updatePayload).eq('id', booking.id);`;

content = content.replace(originalDbUpdate, newDbUpdate);

// Now to insert the auto-decline logic in case it's accepted.
// Search for Auto-assign Task if Client accepts Application
const autoAssignStr = `        if (newStatus === 'accepted' && booking.task_id && profile.id === booking.client_id) {
            const { error: taskError } = await supabase
                .from('posted_tasks')
                .update({ 
                    status: 'assigned',
                    assigned_worker_id: booking.worker_id 
                })
                .eq('id', booking.task_id);
            
            if (taskError) console.error("Failed to auto-assign task:", taskError.message);`;
            
const newAutoAssignStr = `        if (newStatus === 'accepted' && booking.task_id && profile.id === booking.client_id) {
            const { error: taskError } = await supabase
                .from('posted_tasks')
                .update({ 
                    status: 'assigned',
                    assigned_worker_id: booking.worker_id 
                })
                .eq('id', booking.task_id);
            
            if (taskError) console.error("Failed to auto-assign task:", taskError.message);

            // Auto-decline other applications for this job since one has been accepted
            const { error: declineError } = await supabase
                .from('bookings')
                .update({ 
                    status: 'declined',
                    decline_reason: 'The client has accepted another artisan for this job.'
                })
                .eq('task_id', booking.task_id)
                .eq('status', 'pending');
            
            if (declineError) console.error("Failed to auto-decline others:", declineError.message);`;

content = content.replace(autoAssignStr, newAutoAssignStr);

fs.writeFileSync('pages/Activity.tsx', content);
