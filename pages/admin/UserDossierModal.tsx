import React, { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabaseClient';
import { 
  UserDossierData, 
  exportUserDossierPDF, 
  exportUserDossierJSON, 
  exportUserDossierCSV 
} from './exportUtils';

interface UserDossierModalProps {
  user: any;
  isDeleted?: boolean;
  onClose: () => void;
}

export const UserDossierModal: React.FC<UserDossierModalProps> = ({
  user,
  isDeleted = false,
  onClose,
}) => {
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'summary' | 'bookings' | 'reviews' | 'support' | 'safety' | 'audit' | 'raw'>('summary');
  const [dossier, setDossier] = useState<UserDossierData | null>(null);
  const [exportingFormat, setExportingFormat] = useState<string | null>(null);

  const userId = isDeleted ? (user.user_id || user.id) : user.id;

  useEffect(() => {
    let isMounted = true;

    async function fetchUserDossier() {
      setLoading(true);
      try {
        if (!userId) {
          if (isMounted) setLoading(false);
          return;
        }

        // Fetch user activity records in parallel
        const [
          bookingsRes,
          reviewsRes,
          supportRes,
          safetyRes,
          ratingsRes,
          auditRes
        ] = await Promise.all([
          supabase
            .from('bookings')
            .select('*')
            .or(`client_id.eq.${userId},artisan_id.eq.${userId}`)
            .order('created_at', { ascending: false }),
          supabase
            .from('reviews')
            .select('*')
            .or(`reviewer_id.eq.${userId},worker_id.eq.${userId}`)
            .order('created_at', { ascending: false }),
          supabase
            .from('support_tickets')
            .select('*')
            .eq('user_id', userId)
            .order('created_at', { ascending: false }),
          supabase
            .from('safety_incidents')
            .select('*')
            .or(`reporter_id.eq.${userId},reported_user_id.eq.${userId}`)
            .order('created_at', { ascending: false }),
          supabase
            .from('app_ratings')
            .select('*')
            .eq('user_id', userId)
            .order('created_at', { ascending: false }),
          supabase
            .from('admin_audit_logs')
            .select('*')
            .or(`target_id.eq.${userId},admin_id.eq.${userId}`)
            .order('created_at', { ascending: false })
        ]);

        if (isMounted) {
          setDossier({
            profile: user,
            isDeleted,
            bookings: bookingsRes.data || [],
            reviews: reviewsRes.data || [],
            supportTickets: supportRes.data || [],
            safetyIncidents: safetyRes.data || [],
            appRatings: ratingsRes.data || [],
            auditLogs: auditRes.data || [],
            fetchedAt: new Date().toISOString()
          });
        }
      } catch (err) {
        console.error("Failed fetching user dossier data:", err);
      } finally {
        if (isMounted) setLoading(false);
      }
    }

    fetchUserDossier();

    return () => {
      isMounted = false;
    };
  }, [userId, user, isDeleted]);

  const handleExportPDF = () => {
    if (!dossier) return;
    setExportingFormat('PDF');
    setTimeout(() => {
      exportUserDossierPDF(dossier);
      setExportingFormat(null);
    }, 100);
  };

  const handleExportJSON = () => {
    if (!dossier) return;
    setExportingFormat('JSON');
    setTimeout(() => {
      exportUserDossierJSON(dossier);
      setExportingFormat(null);
    }, 100);
  };

  const handleExportCSV = () => {
    if (!dossier) return;
    setExportingFormat('CSV');
    setTimeout(() => {
      exportUserDossierCSV(dossier);
      setExportingFormat(null);
    }, 100);
  };

  const fullName = user.full_name || 'Anonymous User';
  const email = user.email || 'N/A';
  const phone = user.phone_number || 'N/A';
  const role = user.role || 'user';
  const isVerified = isDeleted ? !!user.metadata?.is_verified : !!user.is_verified;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-950/80 backdrop-blur-md p-3 sm:p-6 overflow-y-auto">
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl shadow-2xl w-full max-w-5xl max-h-[92vh] flex flex-col overflow-hidden animate-in fade-in zoom-in-95 duration-200">
        
        {/* Modal Header */}
        <div className="bg-slate-900 text-white p-5 sm:p-6 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 shrink-0 border-b border-slate-800">
          <div className="flex items-center gap-3.5 min-w-0">
            <div className={`w-12 h-12 rounded-2xl flex items-center justify-center font-black text-lg shrink-0 shadow-inner ${
              isDeleted ? 'bg-rose-950/80 text-rose-400 border border-rose-800' : 'bg-brand/20 text-brand border border-brand/30'
            }`}>
              <i className={`fa-solid ${isDeleted ? 'fa-user-slash' : 'fa-id-card'}`}></i>
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <h3 className="font-extrabold text-lg text-white truncate">{fullName}</h3>
                <span className={`px-2.5 py-0.5 rounded-full text-[9px] font-black uppercase tracking-wider ${
                  role === 'admin' ? 'bg-purple-900/60 text-purple-300 border border-purple-700' :
                  role === 'artisan' || role === 'worker' ? 'bg-teal-900/60 text-teal-300 border border-teal-700' :
                  'bg-blue-900/60 text-blue-300 border border-blue-700'
                }`}>
                  {role}
                </span>
                <span className={`px-2.5 py-0.5 rounded-full text-[9px] font-black uppercase tracking-wider ${
                  isDeleted 
                    ? 'bg-rose-900/80 text-rose-300 border border-rose-700' 
                    : isVerified 
                    ? 'bg-emerald-900/60 text-emerald-300 border border-emerald-700' 
                    : 'bg-slate-800 text-slate-400 border border-slate-700'
                }`}>
                  {isDeleted ? 'Blacklisted / Deleted' : isVerified ? 'Verified Account' : 'Unverified'}
                </span>
              </div>
              <p className="text-xs text-slate-400 mt-1 font-mono truncate">
                ID: {userId} • {email} • {phone}
              </p>
            </div>
          </div>

          {/* Download & Export Action Bar */}
          <div className="flex items-center gap-2 shrink-0 w-full sm:w-auto overflow-x-auto pb-1 sm:pb-0">
            <button
              onClick={handleExportPDF}
              disabled={loading || !dossier}
              className="bg-rose-600 hover:bg-rose-700 disabled:opacity-50 text-white px-3.5 py-2 rounded-xl text-xs font-black uppercase tracking-wider flex items-center gap-1.5 transition-all shadow-md active:scale-95 shrink-0"
              title="Export complete printable PDF dossier"
            >
              <i className="fa-solid fa-file-pdf"></i>
              <span>{exportingFormat === 'PDF' ? 'Generating...' : 'PDF Dossier'}</span>
            </button>

            <button
              onClick={handleExportJSON}
              disabled={loading || !dossier}
              className="bg-slate-800 hover:bg-slate-700 border border-slate-700 disabled:opacity-50 text-slate-200 px-3.5 py-2 rounded-xl text-xs font-black uppercase tracking-wider flex items-center gap-1.5 transition-all active:scale-95 shrink-0"
              title="Download raw structured JSON dataset"
            >
              <i className="fa-solid fa-code"></i>
              <span>{exportingFormat === 'JSON' ? 'Saving...' : 'JSON'}</span>
            </button>

            <button
              onClick={handleExportCSV}
              disabled={loading || !dossier}
              className="bg-brand hover:bg-brand/90 disabled:opacity-50 text-white px-3.5 py-2 rounded-xl text-xs font-black uppercase tracking-wider flex items-center gap-1.5 transition-all shadow-md active:scale-95 shrink-0"
              title="Download UTF-8 CSV package"
            >
              <i className="fa-solid fa-file-csv"></i>
              <span>{exportingFormat === 'CSV' ? 'Exporting...' : 'CSV'}</span>
            </button>

            <button
              onClick={onClose}
              className="w-9 h-9 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white flex items-center justify-center transition-all shrink-0 ml-1"
              title="Close Modal"
            >
              <i className="fa-solid fa-xmark text-lg"></i>
            </button>
          </div>
        </div>

        {/* Tab Navigation */}
        <div className="bg-slate-100 dark:bg-slate-950 px-4 py-2.5 border-b border-slate-200 dark:border-slate-800 flex gap-2 overflow-x-auto shrink-0 scrollbar-hide">
          {[
            { id: 'summary', label: '📊 Executive Summary', count: null },
            { id: 'bookings', label: '📋 Bookings & Jobs', count: dossier?.bookings?.length },
            { id: 'reviews', label: '⭐ Reviews & Ratings', count: dossier?.reviews?.length },
            { id: 'support', label: '🎫 Support Tickets', count: dossier?.supportTickets?.length },
            { id: 'safety', label: '🛡️ Safety Incidents', count: dossier?.safetyIncidents?.length },
            { id: 'audit', label: '📝 Audit Logs', count: dossier?.auditLogs?.length },
            { id: 'raw', label: '⚙️ Profile Metadata', count: null }
          ].map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as any)}
              className={`px-3.5 py-1.5 rounded-xl text-xs font-bold whitespace-nowrap transition-all flex items-center gap-1.5 ${
                activeTab === tab.id
                  ? 'bg-brand text-white font-black shadow-sm'
                  : 'text-slate-600 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-800 hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              <span>{tab.label}</span>
              {tab.count !== null && tab.count !== undefined && (
                <span className={`px-1.5 py-0.2 rounded-full text-[10px] font-extrabold ${
                  activeTab === tab.id ? 'bg-white/20 text-white' : 'bg-slate-200 dark:bg-slate-800 text-slate-700 dark:text-slate-300'
                }`}>
                  {tab.count}
                </span>
              )}
            </button>
          ))}
        </div>

        {/* Modal Body */}
        <div className="p-5 sm:p-6 overflow-y-auto flex-1 bg-slate-50/50 dark:bg-slate-900/50 space-y-6">
          {loading ? (
            <div className="py-20 text-center space-y-3">
              <i className="fa-solid fa-circle-notch fa-spin text-3xl text-brand"></i>
              <p className="text-xs font-black text-slate-500 uppercase tracking-widest">
                Aggregating User Dossier & Activity Records...
              </p>
            </div>
          ) : !dossier ? (
            <div className="py-16 text-center text-slate-500 text-sm font-bold">
              Failed to load activity records for this user.
            </div>
          ) : (
            <>
              {/* TAB 1: EXECUTIVE SUMMARY */}
              {activeTab === 'summary' && (
                <div className="space-y-6">
                  {/* Stat Cards Grid */}
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                    <div className="bg-white dark:bg-slate-800 p-4 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-sm">
                      <p className="text-[10px] font-black uppercase text-slate-400 tracking-wider">Total Bookings</p>
                      <p className="text-2xl font-black text-slate-900 dark:text-white mt-1">
                        {dossier.bookings.length}
                      </p>
                      <span className="text-[10px] text-slate-500 mt-1 block">As Client & Worker</span>
                    </div>

                    <div className="bg-white dark:bg-slate-800 p-4 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-sm">
                      <p className="text-[10px] font-black uppercase text-slate-400 tracking-wider">Reviews Received</p>
                      <p className="text-2xl font-black text-amber-500 mt-1">
                        {dossier.reviews.length}
                      </p>
                      <span className="text-[10px] text-slate-500 mt-1 block">Feedback Entries</span>
                    </div>

                    <div className="bg-white dark:bg-slate-800 p-4 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-sm">
                      <p className="text-[10px] font-black uppercase text-slate-400 tracking-wider">Support Tickets</p>
                      <p className="text-2xl font-black text-blue-500 mt-1">
                        {dossier.supportTickets.length}
                      </p>
                      <span className="text-[10px] text-slate-500 mt-1 block">Inquiries & Tickets</span>
                    </div>

                    <div className="bg-white dark:bg-slate-800 p-4 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-sm">
                      <p className="text-[10px] font-black uppercase text-slate-400 tracking-wider">Safety Incidents</p>
                      <p className={`text-2xl font-black mt-1 ${dossier.safetyIncidents.length > 0 ? 'text-rose-600' : 'text-slate-900 dark:text-white'}`}>
                        {dossier.safetyIncidents.length}
                      </p>
                      <span className="text-[10px] text-slate-500 mt-1 block">Flagged Reports</span>
                    </div>
                  </div>

                  {/* Profile Key Details Card */}
                  <div className="bg-white dark:bg-slate-800 p-5 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-sm space-y-4">
                    <h4 className="text-xs font-black uppercase tracking-wider text-slate-900 dark:text-white flex items-center gap-2">
                      <i className="fa-solid fa-user-gear text-brand"></i>
                      <span>Identity & Account Metadata</span>
                    </h4>

                    <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4 text-xs">
                      <div>
                        <span className="text-[9px] font-black text-slate-400 uppercase block">Full Name</span>
                        <span className="font-bold text-slate-800 dark:text-slate-200">{fullName}</span>
                      </div>

                      <div>
                        <span className="text-[9px] font-black text-slate-400 uppercase block">Email Address</span>
                        <span className="font-mono font-bold text-slate-800 dark:text-slate-200">{email}</span>
                      </div>

                      <div>
                        <span className="text-[9px] font-black text-slate-400 uppercase block">Phone Number</span>
                        <span className="font-mono font-bold text-slate-800 dark:text-slate-200">{phone}</span>
                      </div>

                      <div>
                        <span className="text-[9px] font-black text-slate-400 uppercase block">State & LGA</span>
                        <span className="font-bold text-slate-800 dark:text-slate-200">
                          {user.state || 'N/A'}, {user.lga || 'N/A'}
                        </span>
                      </div>

                      <div>
                        <span className="text-[9px] font-black text-slate-400 uppercase block">Subscription Tier</span>
                        <span className="font-bold text-slate-800 dark:text-slate-200 uppercase">{user.subscription_tier || 'basic'}</span>
                      </div>

                      <div>
                        <span className="text-[9px] font-black text-slate-400 uppercase block">Date Account Created / Deleted</span>
                        <span className="font-mono text-slate-800 dark:text-slate-200">
                          {user.created_at || user.deleted_at ? new Date(user.created_at || user.deleted_at).toLocaleDateString() : 'N/A'}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Recent Activity Brief */}
                  <div className="bg-white dark:bg-slate-800 p-5 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-sm space-y-3">
                    <h4 className="text-xs font-black uppercase tracking-wider text-slate-900 dark:text-white flex items-center gap-2">
                      <i className="fa-solid fa-clock-rotate-left text-brand"></i>
                      <span>Recent Activity Overview</span>
                    </h4>

                    {dossier.bookings.length === 0 && dossier.reviews.length === 0 && dossier.supportTickets.length === 0 ? (
                      <p className="text-xs text-slate-400 italic py-2">No activity records logged for this user yet.</p>
                    ) : (
                      <div className="space-y-2 text-xs">
                        {dossier.bookings.slice(0, 3).map((b: any) => (
                          <div key={b.id} className="p-3 bg-slate-50 dark:bg-slate-900/60 rounded-xl flex items-center justify-between">
                            <div>
                              <span className="font-bold text-slate-800 dark:text-slate-200 block">{b.service_title || b.category || 'Booking Service'}</span>
                              <span className="text-[10px] text-slate-400 font-mono">ID: {b.id.substring(0, 8)} • Status: {b.status}</span>
                            </div>
                            <span className="font-black text-emerald-600 dark:text-emerald-400 font-mono">
                              ₦{(b.amount || 0).toLocaleString()}
                            </span>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* TAB 2: BOOKINGS */}
              {activeTab === 'bookings' && (
                <div className="space-y-3">
                  <div className="flex justify-between items-center">
                    <h4 className="text-xs font-black uppercase text-slate-900 dark:text-white">
                      Bookings & Service Jobs ({dossier.bookings.length})
                    </h4>
                  </div>

                  {dossier.bookings.length === 0 ? (
                    <div className="p-8 text-center bg-white dark:bg-slate-800 rounded-2xl border border-dashed border-slate-200 dark:border-slate-700 text-slate-400 text-xs">
                      No bookings recorded for this user.
                    </div>
                  ) : (
                    <div className="space-y-2">
                      {dossier.bookings.map((b: any) => {
                        const isClient = b.client_id === userId;
                        return (
                          <div key={b.id} className="bg-white dark:bg-slate-800 p-4 rounded-xl border border-slate-200 dark:border-slate-700 shadow-sm flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2">
                            <div>
                              <div className="flex items-center gap-2">
                                <span className={`text-[9px] font-black uppercase px-2 py-0.5 rounded-full ${
                                  isClient ? 'bg-blue-100 text-blue-700 dark:bg-blue-950 dark:text-blue-300' : 'bg-teal-100 text-teal-700 dark:bg-teal-950 dark:text-teal-300'
                                }`}>
                                  {isClient ? 'Client Role' : 'Worker / Artisan Role'}
                                </span>
                                <h5 className="font-bold text-xs text-slate-900 dark:text-white">{b.service_title || b.category || 'Job Booking'}</h5>
                              </div>
                              <p className="text-[10px] text-slate-400 font-mono mt-1">
                                ID: {b.id} • Date: {new Date(b.created_at).toLocaleDateString()}
                              </p>
                              {b.notes && (
                                <p className="text-[11px] text-slate-600 dark:text-slate-300 italic mt-1 bg-slate-50 dark:bg-slate-900/50 p-2 rounded-lg">
                                  "{b.notes}"
                                </p>
                              )}
                            </div>

                            <div className="text-right shrink-0">
                              <span className="font-black text-sm text-emerald-600 dark:text-emerald-400 font-mono block">
                                ₦{(b.amount || 0).toLocaleString()}
                              </span>
                              <span className="text-[9px] font-black uppercase tracking-wider px-2 py-0.5 rounded-full bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300">
                                {b.status || 'pending'}
                              </span>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              )}

              {/* TAB 3: REVIEWS */}
              {activeTab === 'reviews' && (
                <div className="space-y-3">
                  <h4 className="text-xs font-black uppercase text-slate-900 dark:text-white">
                    Reviews & Feedback ({dossier.reviews.length})
                  </h4>

                  {dossier.reviews.length === 0 ? (
                    <div className="p-8 text-center bg-white dark:bg-slate-800 rounded-2xl border border-dashed border-slate-200 dark:border-slate-700 text-slate-400 text-xs">
                      No reviews found.
                    </div>
                  ) : (
                    <div className="space-y-2">
                      {dossier.reviews.map((r: any) => (
                        <div key={r.id} className="bg-white dark:bg-slate-800 p-4 rounded-xl border border-slate-200 dark:border-slate-700 shadow-sm space-y-1.5">
                          <div className="flex justify-between items-center">
                            <div className="flex items-center gap-1.5 text-amber-500 font-bold text-xs">
                              <span>⭐ {r.rating || 5} / 5</span>
                            </div>
                            <span className="text-[10px] text-slate-400 font-mono">
                              {new Date(r.created_at).toLocaleDateString()}
                            </span>
                          </div>
                          <p className="text-xs text-slate-700 dark:text-slate-300 italic">
                            "{r.comment || r.review_text || 'No comment provided'}"
                          </p>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {/* TAB 4: SUPPORT TICKETS */}
              {activeTab === 'support' && (
                <div className="space-y-3">
                  <h4 className="text-xs font-black uppercase text-slate-900 dark:text-white">
                    Support Inquiries & Tickets ({dossier.supportTickets.length})
                  </h4>

                  {dossier.supportTickets.length === 0 ? (
                    <div className="p-8 text-center bg-white dark:bg-slate-800 rounded-2xl border border-dashed border-slate-200 dark:border-slate-700 text-slate-400 text-xs">
                      No support tickets submitted by this user.
                    </div>
                  ) : (
                    <div className="space-y-2">
                      {dossier.supportTickets.map((t: any) => (
                        <div key={t.id} className="bg-white dark:bg-slate-800 p-4 rounded-xl border border-slate-200 dark:border-slate-700 shadow-sm space-y-2">
                          <div className="flex justify-between items-center">
                            <span className="font-bold text-xs text-slate-900 dark:text-white">
                              {t.subject || t.category || 'Support Ticket'}
                            </span>
                            <span className={`text-[9px] font-black uppercase px-2 py-0.5 rounded-full ${
                              t.status === 'resolved' ? 'bg-emerald-100 text-emerald-700' : 'bg-amber-100 text-amber-700'
                            }`}>
                              {t.status || 'open'}
                            </span>
                          </div>
                          <p className="text-xs text-slate-600 dark:text-slate-300">{t.message || t.description}</p>
                          <span className="text-[10px] text-slate-400 font-mono block">
                            Submitted: {new Date(t.created_at).toLocaleString()}
                          </span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {/* TAB 5: SAFETY INCIDENTS */}
              {activeTab === 'safety' && (
                <div className="space-y-3">
                  <h4 className="text-xs font-black uppercase text-slate-900 dark:text-white">
                    Safety & Dispute Reports ({dossier.safetyIncidents.length})
                  </h4>

                  {dossier.safetyIncidents.length === 0 ? (
                    <div className="p-8 text-center bg-white dark:bg-slate-800 rounded-2xl border border-dashed border-slate-200 dark:border-slate-700 text-slate-400 text-xs">
                      No safety incidents filed involving this user.
                    </div>
                  ) : (
                    <div className="space-y-2">
                      {dossier.safetyIncidents.map((s: any) => (
                        <div key={s.id} className="bg-rose-50/50 dark:bg-rose-950/20 p-4 rounded-xl border border-rose-200 dark:border-rose-900/40 shadow-sm space-y-2">
                          <div className="flex justify-between items-center">
                            <span className="font-bold text-xs text-rose-700 dark:text-rose-400 uppercase">
                              {s.category || 'Safety Violation Report'}
                            </span>
                            <span className="text-[10px] text-slate-400 font-mono">
                              {new Date(s.created_at).toLocaleString()}
                            </span>
                          </div>
                          <p className="text-xs text-slate-700 dark:text-slate-300">{s.description || s.reason}</p>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {/* TAB 6: AUDIT LOGS */}
              {activeTab === 'audit' && (
                <div className="space-y-3">
                  <h4 className="text-xs font-black uppercase text-slate-900 dark:text-white">
                    Admin Audit History ({dossier.auditLogs.length})
                  </h4>

                  {dossier.auditLogs.length === 0 ? (
                    <div className="p-8 text-center bg-white dark:bg-slate-800 rounded-2xl border border-dashed border-slate-200 dark:border-slate-700 text-slate-400 text-xs">
                      No audit events logged for this user ID.
                    </div>
                  ) : (
                    <div className="space-y-2">
                      {dossier.auditLogs.map((log: any) => (
                        <div key={log.id} className="bg-white dark:bg-slate-800 p-3.5 rounded-xl border border-slate-200 dark:border-slate-700 shadow-sm text-xs space-y-1">
                          <div className="flex justify-between items-center">
                            <span className="font-mono font-bold text-purple-600 dark:text-purple-400 uppercase text-[10px]">
                              {log.action_type}
                            </span>
                            <span className="text-[10px] text-slate-400 font-mono">
                              {new Date(log.created_at).toLocaleString()}
                            </span>
                          </div>
                          <pre className="text-[10px] font-mono bg-slate-50 dark:bg-slate-900 p-2 rounded-lg overflow-x-auto text-slate-700 dark:text-slate-300">
                            {JSON.stringify(log.details || {}, null, 2)}
                          </pre>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {/* TAB 7: RAW METADATA */}
              {activeTab === 'raw' && (
                <div className="space-y-3">
                  <h4 className="text-xs font-black uppercase text-slate-900 dark:text-white">
                    Raw Profile JSON Metadata
                  </h4>
                  <pre className="text-xs font-mono bg-slate-900 text-emerald-400 p-4 rounded-2xl overflow-x-auto border border-slate-800 leading-relaxed">
                    {JSON.stringify(user, null, 2)}
                  </pre>
                </div>
              )}
            </>
          )}
        </div>

        {/* Modal Footer */}
        <div className="bg-slate-100 dark:bg-slate-950 px-6 py-3 border-t border-slate-200 dark:border-slate-800 text-[10px] text-slate-400 flex flex-col sm:flex-row justify-between items-center gap-2 shrink-0">
          <span>Velgo Administrative Dossier Engine • NDPR Security Compliant</span>
          <span className="font-mono">Generated: {new Date().toLocaleString()}</span>
        </div>

      </div>
    </div>
  );
};
