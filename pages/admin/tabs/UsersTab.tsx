import React, { useState } from 'react';
import { TIERS } from '../../../lib/constants';
import { openWhatsAppHelper } from '../../../lib/whatsapp';

export interface UsersTabProps {
  searchTerm: any;
  setSearchTerm: any;
  downloadUsersCSV: any;
  downloadUsersPDF: any;
  filteredUsers: any;
  handleManualTierUpdate: any;
  currentUserProfile: any;
  unblockConfirmId: any;
  handleUnblockUser: any;
  setUnblockConfirmId: any;
  blockingUserId: any;
  blockReasonInput: any;
  setBlockReasonInput: any;
  handleBlockUser: any;
  setBlockingUserId: any;
  onViewDossier?: (user: any) => void;
  onUpdateUserProfile?: (userId: string, newFullName: string, newPhoneNumber: string, reason: string) => Promise<void>;
}

export const UsersTab: React.FC<UsersTabProps> = ({
  searchTerm,
  setSearchTerm,
  downloadUsersCSV,
  downloadUsersPDF,
  filteredUsers,
  handleManualTierUpdate,
  currentUserProfile,
  unblockConfirmId,
  handleUnblockUser,
  setUnblockConfirmId,
  blockingUserId,
  blockReasonInput,
  setBlockReasonInput,
  handleBlockUser,
  setBlockingUserId,
  onViewDossier,
  onUpdateUserProfile
}) => {
  const [editingUser, setEditingUser] = useState<any | null>(null);
  const [editFullName, setEditFullName] = useState<string>('');
  const [editPhoneNumber, setEditPhoneNumber] = useState<string>('');
  const [editReason, setEditReason] = useState<string>('');
  const [isSaving, setIsSaving] = useState<boolean>(false);

  const handleOpenEdit = (user: any) => {
    setEditingUser(user);
    setEditFullName(user.full_name || '');
    setEditPhoneNumber(user.phone_number || '');
    setEditReason('');
  };

  const handleSaveProfile = async () => {
    if (!editingUser) return;
    if (!editFullName.trim()) {
      alert("Full Name cannot be empty.");
      return;
    }

    setIsSaving(true);
    try {
      if (onUpdateUserProfile) {
        await onUpdateUserProfile(editingUser.id, editFullName.trim(), editPhoneNumber.trim(), editReason.trim());
      }
      setEditingUser(null);
    } catch (err) {
      console.error("Save profile error:", err);
    } finally {
      setIsSaving(false);
    }
  };
  return (
    (
            <div className="space-y-4">
                <div className="flex gap-2">
                    <input value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} placeholder="Search by name, ID, email, or phone number..." className="flex-1 p-4 rounded-2xl border dark:bg-slate-800 dark:border-slate-700 dark:text-white outline-none focus:border-brand" />
                    <button 
                        onClick={downloadUsersCSV}
                        className="bg-brand text-white px-5 rounded-2xl font-black text-xs uppercase tracking-widest hover:bg-brand/90 active:scale-95 transition-all flex items-center justify-center gap-2 shadow-md shrink-0"
                        title="Download all user records as CSV"
                    >
                        <i className="fa-solid fa-file-csv text-base"></i>
                        <span className="hidden sm:inline">Download CSV</span>
                    </button>
                    <button 
                        onClick={downloadUsersPDF}
                        className="bg-rose-600 text-white px-5 rounded-2xl font-black text-xs uppercase tracking-widest hover:bg-rose-700 active:scale-95 transition-all flex items-center justify-center gap-2 shadow-md shrink-0"
                        title="Export current user list as printable PDF report"
                    >
                        <i className="fa-solid fa-file-pdf text-base"></i>
                        <span className="hidden sm:inline">Export PDF</span>
                    </button>
                </div>
                <div className="space-y-3">
                    {filteredUsers.map(user => (
                        <div key={user.id} className="bg-white dark:bg-slate-800 p-4 rounded-xl shadow-sm flex flex-col gap-3">
                            <div className="flex justify-between items-start">
                                <div className="min-w-0">
                                    <p className="font-bold text-sm text-gray-900 dark:text-white truncate">{user.full_name}</p>
                                    <p className="text-xs text-gray-500 truncate">{user.email}</p>
                                    {user.phone_number && (
                                        <div className="flex items-center gap-2 mt-1">
                                            <a href={`tel:${user.phone_number}`} className="text-xs font-mono font-bold text-gray-700 dark:text-gray-300 hover:text-brand hover:underline">
                                                {user.phone_number}
                                            </a>
                                            <button 
                                                onClick={(e) => {
                                                    e.preventDefault();
                                                    navigator.clipboard.writeText(user.phone_number);
                                                    alert("Phone copied!");
                                                }} 
                                                className="text-gray-400 hover:text-brand transition-colors"
                                                title="Copy Phone"
                                            >
                                                <i className="fa-regular fa-copy text-[10px]"></i>
                                            </button>
                                        </div>
                                    )}
                                </div>
                                <span className={`px-2 py-1 rounded-full text-[10px] font-black uppercase ${user.is_verified ? 'bg-blue-100 text-blue-600' : 'bg-gray-100 text-gray-400'}`}>
                                    {user.is_verified ? 'Verified' : 'Unverified'}
                                </span>
                            </div>
                            <div className="flex items-center justify-between pt-2 border-t border-gray-50 dark:border-slate-700">
                                <span className={`px-2 py-1 rounded-md text-[9px] font-black uppercase tracking-wider ${user.role === 'admin' ? 'bg-purple-50 text-purple-600' : 'bg-blue-50 text-blue-600'}`}>{user.role}</span>
                                <div className="flex items-center gap-2">
                                    <button
                                        onClick={() => handleOpenEdit(user)}
                                        className="bg-brand/10 hover:bg-brand/20 text-brand text-[9px] font-black uppercase tracking-wider px-2.5 py-1 rounded-lg transition-all flex items-center gap-1 shrink-0"
                                        title="Edit user profile details"
                                    >
                                        <i className="fa-solid fa-pen text-[10px]"></i>
                                        <span>Edit Profile</span>
                                    </button>
                                    {onViewDossier && (
                                        <button
                                            onClick={() => onViewDossier(user)}
                                            className="bg-slate-900 hover:bg-slate-800 text-white dark:bg-slate-700 dark:hover:bg-slate-600 text-[9px] font-black uppercase tracking-wider px-2.5 py-1 rounded-lg transition-all flex items-center gap-1 shrink-0"
                                            title="View and download full user activity dossier"
                                        >
                                            <i className="fa-solid fa-file-invoice text-[10px] text-brand"></i>
                                            <span>Dossier & Audit</span>
                                        </button>
                                    )}
                                    <select value={user.subscription_tier || 'basic'} onChange={(e) => handleManualTierUpdate(user.id, e.target.value as SubscriptionTier)} className="bg-gray-100 dark:bg-slate-700 text-[10px] font-bold py-1 px-2 rounded-lg outline-none dark:text-white">
                                        {TIERS.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
                                    </select>
                                </div>
                            </div>

                            {/* Referral Analytics Diagnostic block */}
                            <div className="bg-gray-50 dark:bg-slate-900/40 p-3 rounded-xl border border-gray-100 dark:border-slate-800 text-xs text-gray-700 dark:text-gray-300 space-y-1.5 font-sans mt-1">
                                <p className="text-[8px] font-black uppercase text-gray-400 dark:text-gray-500 tracking-wider">Referral Analytics & Control</p>
                                <div className="grid grid-cols-2 gap-2 text-[10px]">
                                    <div>
                                        <span className="text-gray-400 dark:text-gray-500 font-bold uppercase block text-[8px] leading-tight">Referred By Parent</span>
                                        <span className="font-mono text-[9px] truncate block mt-0.5 select-all" title={user.referrer_id || 'Direct Signup'}>
                                            {user.referrer_id ? user.referrer_id.substring(0, 18) + '...' : 'Direct Signup'}
                                        </span>
                                    </div>
                                    <div className="text-right">
                                        <span className="text-gray-400 dark:text-gray-500 font-bold uppercase block text-[8px] leading-tight">Actions</span>
                                        <button 
                                            onClick={(e) => {
                                                e.preventDefault();
                                                navigator.clipboard.writeText(`${window.location.origin}?ref=${user.id}`);
                                                alert("Referral link copied for this user: " + user.full_name);
                                            }}
                                            className="text-brand text-[9px] font-black uppercase tracking-wider hover:underline mt-1 bg-brand/5 dark:bg-brand/10 px-2 py-0.5 rounded border border-brand/10 inline-block"
                                        >
                                            <i className="fa-solid fa-copy mr-1"></i> Promo Link
                                        </button>
                                    </div>
                                </div>
                                {user.portfolio_images && user.portfolio_images.length > 0 && (
                                    <div className="mt-3 pt-3 border-t border-gray-100 dark:border-gray-700">
                                        <p className="text-[10px] font-black text-gray-500 uppercase tracking-widest mb-2">Portfolio Images ({user.portfolio_images.length})</p>
                                        <div className="flex gap-2 overflow-x-auto pb-2">
                                            {user.portfolio_images.map((img: string, idx: number) => (
                                                <a key={idx} href={img} target="_blank" rel="noreferrer" className="shrink-0 w-16 h-16 rounded-lg overflow-hidden bg-gray-100">
                                                    <img src={img} className="w-full h-full object-cover" />
                                                </a>
                                            ))}
                                        </div>
                                    </div>
                                )}
                            </div>
                            
                            {/* Emergency Blocking System (NDPR compliant) */}
                            {currentUserProfile && user.id !== currentUserProfile.id && (
                                <div className="mt-2 pt-2 border-t border-gray-50 dark:border-slate-700/60 flex flex-col gap-2">
                                    {user.is_blocked ? (
                                        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center bg-red-50 dark:bg-red-950/20 p-3 rounded-xl border border-red-100 dark:border-red-900/30 gap-2">
                                            <div className="min-w-0">
                                                <p className="text-[9px] font-black text-red-600 dark:text-red-400 uppercase tracking-widest flex items-center gap-1.5">
                                                    <i className="fa-solid fa-lock text-xs"></i>
                                                    <span>Emergency Blocked</span>
                                                </p>
                                                <p className="text-[10px] text-gray-500 dark:text-gray-400 mt-1 font-bold truncate italic" title={user.block_reason}>
                                                    Reason: {user.block_reason || 'N/A'}
                                                </p>
                                            </div>
                                            {unblockConfirmId === user.id ? (
                                                <div className="flex gap-2 shrink-0 items-center">
                                                    <button 
                                                        onClick={() => handleUnblockUser(user.id)}
                                                        className="bg-green-600 hover:bg-green-700 text-white px-3 py-1.5 rounded-lg text-[9px] uppercase font-black tracking-widest transition-all shadow-md shrink-0 focus:outline-none"
                                                    >
                                                        Confirm Unblock
                                                    </button>
                                                    <button 
                                                        onClick={() => setUnblockConfirmId(null)}
                                                        className="bg-slate-100 hover:bg-slate-200 dark:bg-slate-700 dark:text-gray-200 dark:hover:bg-slate-600 text-slate-700 px-2.5 py-1.5 rounded-lg text-[9px] uppercase font-black tracking-widest transition-all shrink-0 focus:outline-none border border-slate-200 dark:border-slate-600"
                                                    >
                                                        Cancel
                                                    </button>
                                                </div>
                                            ) : (
                                                <button 
                                                    onClick={() => setUnblockConfirmId(user.id)}
                                                    className="w-full sm:w-auto bg-green-600 hover:bg-green-700 text-white px-3 py-1.5 rounded-lg text-[9px] uppercase font-black tracking-widest transition-all shadow-md shrink-0 focus:outline-none"
                                                >
                                                    Unblock User
                                                </button>
                                            )}
                                        </div>
                                    ) : (
                                        <div className="flex flex-col gap-2">
                                            {blockingUserId === user.id ? (
                                                <div className="flex flex-col gap-2 bg-slate-50 dark:bg-slate-900/40 p-3 rounded-xl border border-slate-100 dark:border-slate-800">
                                                    <div className="flex items-center gap-1.5 text-[9px] font-black text-slate-500 uppercase tracking-wider mb-1">
                                                        <i className="fa-solid fa-solid fa-circle-info text-rose-500"></i>
                                                        <span>Space Reason For Block</span>
                                                    </div>
                                                    <div className="flex gap-2">
                                                        <input 
                                                            type="text" 
                                                            placeholder="Enter reason for suspension..." 
                                                            value={blockReasonInput} 
                                                            onChange={(e) => setBlockReasonInput(e.target.value)} 
                                                            className="flex-1 text-[11px] font-medium p-2.5 rounded-lg border dark:bg-slate-900 dark:border-slate-700 dark:text-white outline-none focus:border-red-500"
                                                        />
                                                        <button 
                                                            onClick={() => handleBlockUser(user.id)}
                                                            className="bg-red-600 hover:bg-red-700 text-white px-3 py-2.5 rounded-lg text-[9px] font-black uppercase tracking-widest transition-all shrink-0 active:scale-95"
                                                        >
                                                            Confirm
                                                        </button>
                                                        <button 
                                                            onClick={() => { setBlockingUserId(null); setBlockReasonInput(''); }}
                                                            className="text-gray-400 hover:text-gray-600 dark:hover:text-white text-[10px] font-black uppercase tracking-wider px-2"
                                                        >
                                                            Cancel
                                                        </button>
                                                    </div>
                                                </div>
                                            ) : (
                                                <div className="flex justify-end">
                                                    <button 
                                                        onClick={() => { setBlockingUserId(user.id); setBlockReasonInput(''); }}
                                                        className="bg-red-50 hover:bg-red-100 dark:bg-red-950/20 dark:hover:bg-red-950/40 text-red-600 px-3 py-1.5 rounded-lg text-[9px] uppercase font-black tracking-widest transition-all"
                                                    >
                                                        Emergency Block
                                                    </button>
                                                </div>
                                            )}
                                        </div>
                                    )}
                                </div>
                            )}
                        </div>
                    ))}
                </div>

                {/* Edit Profile Modal */}
                {editingUser && (
                  <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-xs animate-fadeIn">
                    <div className="bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 rounded-3xl p-6 max-w-md w-full shadow-2xl space-y-5 animate-scaleUp">
                      <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded-2xl bg-brand/10 text-brand flex items-center justify-center font-bold text-lg">
                            <i className="fa-solid fa-user-pen"></i>
                          </div>
                          <div>
                            <h3 className="text-sm font-black text-slate-900 dark:text-white uppercase tracking-wider">Edit User Profile</h3>
                            <p className="text-[11px] text-slate-400 font-medium">Update official full name & phone number</p>
                          </div>
                        </div>
                        <button
                          onClick={() => setEditingUser(null)}
                          className="w-8 h-8 rounded-full bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 text-slate-500 dark:text-slate-400 flex items-center justify-center transition-all"
                        >
                          <i className="fa-solid fa-xmark"></i>
                        </button>
                      </div>

                      <div className="space-y-4 text-xs">
                        {/* User Info Badge */}
                        <div className="p-3 bg-slate-50 dark:bg-slate-800/50 rounded-2xl border border-slate-100 dark:border-slate-800 flex items-center justify-between">
                          <div className="min-w-0">
                            <p className="font-bold text-slate-900 dark:text-white truncate">{editingUser.email}</p>
                            <p className="text-[10px] text-slate-400 font-mono mt-0.5 truncate">UUID: {editingUser.id}</p>
                          </div>
                          <span className={`px-2 py-0.5 rounded-full text-[9px] font-black uppercase ${editingUser.is_verified ? 'bg-blue-100 text-blue-600 dark:bg-blue-950/40 dark:text-blue-400' : 'bg-gray-100 text-gray-500 dark:bg-slate-800 dark:text-gray-400'}`}>
                            {editingUser.is_verified ? 'Verified' : 'Unverified'}
                          </span>
                        </div>

                        {/* Full Name Input */}
                        <div className="space-y-1">
                          <label className="text-[10px] font-black uppercase text-slate-500 tracking-wider">Full Name *</label>
                          <input
                            type="text"
                            value={editFullName}
                            onChange={(e) => setEditFullName(e.target.value)}
                            placeholder="Enter user's full name..."
                            className="w-full p-3 rounded-xl border border-slate-200 dark:border-slate-700 dark:bg-slate-800 text-slate-900 dark:text-white font-bold outline-none focus:border-brand"
                          />
                        </div>

                        {/* Phone Number Input */}
                        <div className="space-y-1">
                          <label className="text-[10px] font-black uppercase text-slate-500 tracking-wider">Phone Number</label>
                          <input
                            type="text"
                            value={editPhoneNumber}
                            onChange={(e) => setEditPhoneNumber(e.target.value)}
                            placeholder="+234..."
                            className="w-full p-3 rounded-xl border border-slate-200 dark:border-slate-700 dark:bg-slate-800 text-slate-900 dark:text-white font-mono font-bold outline-none focus:border-brand"
                          />
                        </div>

                        {/* Reason for change */}
                        <div className="space-y-1">
                          <label className="text-[10px] font-black uppercase text-slate-500 tracking-wider">Audit Reason (Optional)</label>
                          <input
                            type="text"
                            value={editReason}
                            onChange={(e) => setEditReason(e.target.value)}
                            placeholder="e.g. Name change per support request #402..."
                            className="w-full p-3 rounded-xl border border-slate-200 dark:border-slate-700 dark:bg-slate-800 text-slate-900 dark:text-white outline-none focus:border-brand"
                          />
                        </div>
                      </div>

                      <div className="flex gap-2 pt-2 border-t border-slate-100 dark:border-slate-800">
                        <button
                          disabled={isSaving}
                          onClick={() => setEditingUser(null)}
                          className="flex-1 py-3 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 font-bold text-xs transition-all"
                        >
                          Cancel
                        </button>
                        <button
                          disabled={isSaving}
                          onClick={handleSaveProfile}
                          className="flex-1 py-3 rounded-xl bg-brand hover:bg-brand/90 text-white font-black text-xs uppercase tracking-wider transition-all flex items-center justify-center gap-2 shadow-md active:scale-95 disabled:opacity-50"
                        >
                          {isSaving ? (
                            <i className="fa-solid fa-circle-notch animate-spin"></i>
                          ) : (
                            <>
                              <i className="fa-solid fa-floppy-disk"></i>
                              <span>Save Changes</span>
                            </>
                          )}
                        </button>
                      </div>
                    </div>
                  </div>
                )}
            </div>
         )
  );
};
