const fs = require('fs');
let code = fs.readFileSync('pages/Activity.tsx', 'utf8');

// Add customDeclineReason state
if (!code.includes('const [customDeclineReason, setCustomDeclineReason] = useState("");')) {
    code = code.replace(
        'const [declineReason, setDeclineReason] = useState("");',
        'const [declineReason, setDeclineReason] = useState("");\n  const [customDeclineReason, setCustomDeclineReason] = useState("");'
    );
}

// Reset custom reason when closing modal
code = code.replace(
    'setShowDeclineModal(false);',
    'setShowDeclineModal(false);\n        setCustomDeclineReason("");'
);

// Modify updatePayload in updateBookingStatus
// It is around line 203: updatePayload.decline_reason = declineReason;
code = code.replace(
    'updatePayload.decline_reason = declineReason;',
    'updatePayload.decline_reason = declineReason === "Other" ? ("Other: " + customDeclineReason) : declineReason;'
);
code = code.replace(
    'updatePayload.quote_notes = declineReason;',
    'updatePayload.quote_notes = declineReason === "Other" ? ("Other: " + customDeclineReason) : declineReason;'
);

// The textarea onChange
code = code.replace(
    'onChange={(e) => setDeclineReason("Other: " + e.target.value)}',
    'value={customDeclineReason}\n                            onChange={(e) => setCustomDeclineReason(e.target.value)}'
);

// The Confirm button disabled state
// disabled={!declineReason} -> disabled={!declineReason || (declineReason === 'Other' && !customDeclineReason.trim())}
code = code.replace(
    'disabled={!declineReason}',
    'disabled={!declineReason || (declineReason === "Other" && !customDeclineReason.trim())}'
);

fs.writeFileSync('pages/Activity.tsx', code);
console.log("Fixed custom reason textarea logic in Activity.tsx");
