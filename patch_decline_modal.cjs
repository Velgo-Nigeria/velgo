const fs = require('fs');
let content = fs.readFileSync('pages/Activity.tsx', 'utf8');

const confirmFunction = `
  const confirmUpdateBookingStatus = () => {
    if (declineBookingItem && declineActionType) {
        updateBookingStatus(declineBookingItem, declineActionType, true);
        setShowDeclineModal(false);
    }
  };
`;

if (!content.includes('confirmUpdateBookingStatus')) {
  const targetStr = `  const submitWorkerRating = async () => {`;
  content = content.replace(targetStr, confirmFunction + "\n" + targetStr);
}

const modalJSX = `
      {/* Decline/Cancel Reason Modal */}
      {showDeclineModal && declineBookingItem && (
        <div className="fixed inset-0 bg-black/80 z-[120] flex items-end sm:items-center justify-center p-0 sm:p-6 backdrop-blur-md animate-fadeIn">
            <div className="bg-white dark:bg-gray-800 rounded-t-[40px] sm:rounded-[40px] p-8 w-full max-w-sm relative shadow-2xl space-y-6 max-h-[90vh] overflow-hidden flex flex-col font-sans">
                <button onClick={() => setShowDeclineModal(false)} className="absolute top-6 right-6 text-gray-400 hover:text-gray-900 dark:hover:text-white transition-colors">
                    <i className="fa-solid fa-xmark text-lg"></i>
                </button>
                <div className="text-center">
                    <div className="w-16 h-16 bg-red-100 dark:bg-red-900/40 rounded-full flex items-center justify-center mx-auto mb-4">
                        <i className="fa-solid fa-circle-exclamation text-2xl text-red-600 dark:text-red-400"></i>
                    </div>
                    <h3 className="text-xl font-black text-gray-900 dark:text-white mb-2">
                        {declineActionType === 'declined' ? 'Decline Request' : 'Cancel Request'}
                    </h3>
                    <p className="text-sm text-gray-500 dark:text-gray-400">
                        Please provide a reason. This helps keep the platform transparent.
                    </p>
                </div>
                
                <div className="space-y-3">
                    <label className="text-[10px] font-black text-gray-400 dark:text-gray-500 uppercase tracking-widest ml-1 block">Select Reason</label>
                    <select 
                        value={declineReason} 
                        onChange={(e) => setDeclineReason(e.target.value)}
                        className="w-full bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-2xl py-3.5 px-4 text-sm font-medium text-gray-900 dark:text-white focus:ring-2 focus:ring-brand focus:border-brand transition-all outline-none"
                    >
                        <option value="">-- Select a reason --</option>
                        {profile?.id === declineBookingItem.client_id ? (
                            declineActionType === 'declined' ? (
                                <>
                                    <option value="Found someone else">Found someone else</option>
                                    <option value="Price is too high">Price is too high</option>
                                    <option value="Timing doesn't work for me">Timing doesn't work for me</option>
                                    <option value="Worker profile doesn't match my needs">Worker profile doesn't match my needs</option>
                                </>
                            ) : (
                                <>
                                    <option value="No longer need this service">No longer need this service</option>
                                    <option value="Created request by mistake">Created request by mistake</option>
                                    <option value="Found someone outside Velgo">Found someone outside Velgo</option>
                                </>
                            )
                        ) : (
                            declineActionType === 'declined' ? (
                                <>
                                    <option value="Fully booked at the moment">Fully booked at the moment</option>
                                    <option value="Job scope is outside my expertise">Job scope is outside my expertise</option>
                                    <option value="Location is too far">Location is too far</option>
                                    <option value="Price offered is too low">Price offered is too low</option>
                                </>
                            ) : (
                                <>
                                    <option value="Fully booked now">Fully booked now</option>
                                    <option value="Applied by mistake">Applied by mistake</option>
                                </>
                            )
                        )}
                        <option value="Other">Other</option>
                    </select>
                </div>

                {declineReason === 'Other' && (
                    <div>
                        <textarea
                            placeholder="Please specify (optional)"
                            className="w-full bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-2xl py-3 px-4 text-sm font-medium text-gray-900 dark:text-white outline-none resize-none h-20 focus:ring-2 focus:ring-brand focus:border-brand"
                            onChange={(e) => setDeclineReason("Other: " + e.target.value)}
                        ></textarea>
                    </div>
                )}

                <button 
                    onClick={confirmUpdateBookingStatus}
                    disabled={!declineReason}
                    className="w-full bg-red-600 hover:bg-red-500 disabled:bg-gray-200 disabled:text-gray-400 dark:disabled:bg-gray-800 dark:disabled:text-gray-600 text-white py-4 rounded-2xl font-black uppercase tracking-widest text-[10px] shadow-xl hover:-translate-y-0.5 active:translate-y-0 transition-all"
                >
                    Confirm {declineActionType === 'declined' ? 'Decline' : 'Cancel'}
                </button>
            </div>
        </div>
      )}
`;

if (!content.includes('showDeclineModal && declineBookingItem')) {
  content = content.replace("{showReplyModal && (", modalJSX + "\n      {showReplyModal && (");
}

fs.writeFileSync('pages/Activity.tsx', content);
