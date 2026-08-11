import React, { useState } from 'react';
import { openWhatsAppHelper } from '../../../lib/whatsapp';

export interface DeletedAccountRecord {
  id: string;
  user_id?: string;
  full_name?: string;
  email?: string;
  phone_number?: string;
  role?: string;
  reason?: string;
  metadata?: any;
  deleted_at: string;
}

export interface DeletedAccountsTabProps {
  deletedAccounts: DeletedAccountRecord[];
  searchTerm: string;
  setSearchTerm: (term: string) => void;
  onRestoreUser?: (record: DeletedAccountRecord) => void;
  onViewDossier?: (record: DeletedAccountRecord) => void;
  loading?: boolean;
}

export const DeletedAccountsTab: React.FC<DeletedAccountsTabProps> = ({
  deletedAccounts,
  searchTerm,
  setSearchTerm,
  onRestoreUser,
  onViewDossier,
  loading = false,
}) => {
  const [restoringId, setRestoringId] = useState<string | null>(null);

  const filtered = deletedAccounts.filter((record) => {
    if (!searchTerm.trim()) return true;
    const term = searchTerm.toLowerCase();
    const nameMatch = record.full_name?.toLowerCase().includes(term);
    const emailMatch = record.email?.toLowerCase().includes(term);
    const phoneMatch = record.phone_number?.includes(term);
    const reasonMatch = record.reason?.toLowerCase().includes(term);
    return nameMatch || emailMatch || phoneMatch || reasonMatch;
  });

  return (
    <div className="space-y-4">
      {/* Header Banner */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center bg-white dark:bg-slate-800 p-4 rounded-xl shadow-sm border border-slate-200 dark:border-slate-700 gap-3">
        <div>
          <div className="flex items-center gap-2">
            <h3 className="font-black text-slate-900 dark:text-white uppercase text-xs tracking-wider">
              Deleted Accounts & Blacklist
            </h3>
            <span className="bg-amber-100 dark:bg-amber-900/40 text-amber-800 dark:text-amber-300 text-[9px] font-black uppercase px-2 py-0.5 rounded-full border border-amber-200 dark:border-amber-800">
              Security Log
            </span>
          </div>
          <p className="text-[10px] text-slate-500 mt-1">
            Permanently deleted user accounts. Associated emails and phone numbers are blacklisted from re-registration for platform integrity.
          </p>
        </div>
        <div className="bg-slate-100 dark:bg-slate-900 text-slate-700 dark:text-slate-300 font-black text-xs px-3.5 py-1.5 rounded-full border border-slate-200 dark:border-slate-800 shrink-0">
          {deletedAccounts.length} Blacklisted
        </div>
      </div>

      {/* Search Bar */}
      <div className="flex gap-2">
        <div className="relative flex-1">
          <i className="fa-solid fa-magnifying-glass absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 text-xs"></i>
          <input
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Search blacklisted name, email, or phone number..."
            className="w-full pl-10 pr-4 py-3.5 rounded-2xl border dark:bg-slate-800 dark:border-slate-700 dark:text-white text-xs font-medium outline-none focus:border-brand transition-colors"
          />
        </div>
      </div>

      {/* List / Empty State */}
      {loading ? (
        <div className="bg-white dark:bg-slate-800 p-12 text-center rounded-2xl border border-dashed border-gray-200 dark:border-slate-700">
          <i className="fa-solid fa-spinner fa-spin text-3xl text-brand mb-3"></i>
          <p className="text-xs font-bold text-gray-400 uppercase tracking-widest">
            Loading Deleted Records...
          </p>
        </div>
      ) : filtered.length === 0 ? (
        <div className="bg-white dark:bg-slate-800 p-12 text-center rounded-2xl border border-dashed border-gray-200 dark:border-slate-700 space-y-2">
          <i className="fa-solid fa-user-slash text-4xl text-slate-300 dark:text-slate-600 mb-2"></i>
          <p className="font-bold text-gray-400 uppercase text-xs tracking-widest">
            {searchTerm ? 'No Matching Blacklisted Accounts' : 'No Deleted Accounts Logged'}
          </p>
          <p className="text-[11px] text-gray-500 max-w-sm mx-auto">
            {searchTerm
              ? 'Try searching with a different name, email address, or phone number.'
              : 'When users delete their accounts, their identity records will automatically be archived here.'}
          </p>
        </div>
      ) : (
        <div className="grid gap-3">
          {filtered.map((record) => {
            const isVerifiedAtDeletion = record.metadata?.is_verified;
            return (
              <div
                key={record.id}
                className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 p-4 rounded-2xl shadow-sm hover:shadow-md transition-all space-y-3 relative overflow-hidden"
              >
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-100 dark:border-slate-700/60 pb-3">
                  <div className="flex items-center gap-2.5">
                    <div className="w-9 h-9 rounded-full bg-slate-100 dark:bg-slate-700 flex items-center justify-center text-slate-400 font-bold text-xs shrink-0">
                      <i className="fa-solid fa-user-xmark"></i>
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <h4 className="font-bold text-slate-900 dark:text-white text-sm">
                          {record.full_name || 'Anonymous User'}
                        </h4>
                        <span className="bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300 text-[9px] font-black uppercase px-2 py-0.5 rounded-full">
                          {record.role || 'user'}
                        </span>
                        {isVerifiedAtDeletion && (
                          <span className="bg-emerald-100 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-400 text-[9px] font-black uppercase px-2 py-0.5 rounded-full flex items-center gap-1">
                            <i className="fa-solid fa-circle-check text-[8px]"></i> Was Verified
                          </span>
                        )}
                      </div>
                      <p className="text-[10px] text-slate-400 mt-0.5 font-mono">
                        User ID: {record.user_id || record.id}
                      </p>
                    </div>
                  </div>

                  <div className="text-right shrink-0">
                    <span className="text-[10px] text-slate-400 font-bold block">
                      Deleted on {new Date(record.deleted_at).toLocaleDateString('en-NG', { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })}
                    </span>
                  </div>
                </div>

                {/* Contact & Identity details */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
                  <div className="bg-slate-50 dark:bg-slate-900/60 p-2.5 rounded-xl border border-slate-100 dark:border-slate-800 flex items-center justify-between">
                    <div className="truncate pr-2">
                      <span className="text-[9px] text-slate-400 uppercase font-black block">Email Address</span>
                      <span className="font-mono text-slate-800 dark:text-slate-200 font-bold truncate block">
                        {record.email || 'N/A'}
                      </span>
                    </div>
                    {record.email && (
                      <button
                        onClick={() => {
                          navigator.clipboard.writeText(record.email!);
                          alert(`Copied email (${record.email}) to clipboard.`);
                        }}
                        className="text-slate-400 hover:text-brand text-xs p-1"
                        title="Copy Email"
                      >
                        <i className="fa-regular fa-copy"></i>
                      </button>
                    )}
                  </div>

                  <div className="bg-slate-50 dark:bg-slate-900/60 p-2.5 rounded-xl border border-slate-100 dark:border-slate-800 flex items-center justify-between">
                    <div className="truncate pr-2">
                      <span className="text-[9px] text-slate-400 uppercase font-black block">Phone Number</span>
                      <span className="font-mono text-slate-800 dark:text-slate-200 font-bold truncate block">
                        {record.phone_number || 'N/A'}
                      </span>
                    </div>
                    {record.phone_number && (
                      <button
                        onClick={() => {
                          navigator.clipboard.writeText(record.phone_number!);
                          alert(`Copied phone number (${record.phone_number}) to clipboard.`);
                        }}
                        className="text-slate-400 hover:text-brand text-xs p-1"
                        title="Copy Phone Number"
                      >
                        <i className="fa-regular fa-copy"></i>
                      </button>
                    )}
                  </div>
                </div>

                {/* Reason & Actions */}
                <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2 pt-1">
                  <div className="text-[11px] text-slate-500 dark:text-slate-400 italic">
                    <span className="font-bold not-italic uppercase text-[9px] text-slate-400 mr-1">Reason:</span>
                    {record.reason || 'User self-requested account deletion'}
                  </div>

                  <div className="flex items-center gap-2 shrink-0 ml-auto">
                    {onViewDossier && (
                      <button
                        onClick={() => onViewDossier(record)}
                        className="text-[10px] font-black uppercase tracking-wider text-slate-700 dark:text-slate-200 bg-slate-100 dark:bg-slate-700 hover:bg-slate-200 dark:hover:bg-slate-600 px-3 py-1.5 rounded-xl transition-all flex items-center gap-1.5"
                        title="View complete activity dossier for this deleted account"
                      >
                        <i className="fa-solid fa-file-invoice text-brand"></i>
                        <span>Dossier & Audit</span>
                      </button>
                    )}

                    {onRestoreUser && (
                      <button
                        onClick={() => {
                          if (window.confirm(`Un-blacklist ${record.full_name || record.email}?\n\nThis will remove their email/phone from the registration blacklist and allow them to create a new account or log in if restored.`)) {
                            onRestoreUser(record);
                          }
                        }}
                        className="text-[10px] font-black uppercase tracking-wider text-rose-600 hover:text-rose-700 bg-rose-50 dark:bg-rose-950/30 border border-rose-200 dark:border-rose-900/40 px-3 py-1.5 rounded-xl transition-all flex items-center gap-1.5 shrink-0"
                      >
                        <i className="fa-solid fa-unlock text-[10px]"></i>
                        Remove from Blacklist
                      </button>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};
