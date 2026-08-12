import React, { useState, useEffect } from 'react';
import { supabase } from '../../../lib/supabaseClient';
import { NIGERIA_STATES, NIGERIA_LGAS } from '../../../lib/locations';

export interface LocationSetting {
  id?: string;
  state: string;
  lga?: string | null;
  is_active: boolean;
  updated_at?: string;
}

export interface WaitlistRecord {
  id: string;
  user_id?: string | null;
  contact_info: string;
  state: string;
  lga: string;
  area?: string | null;
  role_intent: string;
  created_at: string;
}

export const LocationsTab: React.FC = () => {
  const [selectedState, setSelectedState] = useState<string>('Edo');
  const [searchTerm, setSearchTerm] = useState<string>('');
  const [settings, setSettings] = useState<Record<string, boolean>>({}); // key e.g. "Edo:Esan West" -> is_active
  const [waitlist, setWaitlist] = useState<WaitlistRecord[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [savingKey, setSavingKey] = useState<string | null>(null);

  // Guardrail modal state for turning OFF an area or entire state
  const [deactivateModal, setDeactivateModal] = useState<{
    state: string;
    lga: string;
    workerCount: number;
    jobCount: number;
  } | null>(null);

  const [deactivateStateModal, setDeactivateStateModal] = useState<{
    state: string;
    workerCount: number;
    jobCount: number;
  } | null>(null);

  useEffect(() => {
    fetchLocationData();
  }, []);

  const fetchLocationData = async () => {
    setLoading(true);
    try {
      // 1. Fetch Location Settings
      const { data: setRes, error: setErr } = await supabase
        .from('location_settings')
        .select('*');

      if (!setErr && setRes) {
        const map: Record<string, boolean> = {};
        setRes.forEach((item: LocationSetting) => {
          const key = item.lga ? `${item.state}:${item.lga}` : item.state;
          map[key] = item.is_active;
        });
        setSettings(map);
      }

      // 2. Fetch Waitlist
      const { data: waitRes, error: waitErr } = await supabase
        .from('location_waitlist')
        .select('*')
        .order('created_at', { ascending: false });

      if (!waitErr && waitRes) {
        setWaitlist(waitRes);
      }
    } catch (e) {
      console.warn("Location settings table fetch warning:", e);
    } finally {
      setLoading(false);
    }
  };

  // Check if an LGA is currently active (defaults to true if no explicit record)
  const isLgaActive = (state: string, lga: string) => {
    const key = `${state}:${lga}`;
    if (key in settings) return settings[key];
    if (state in settings) return settings[state];
    return true; // Default active
  };

  // Check if an entire State Master is active
  const isStateMasterActive = (state: string) => {
    if (state in settings) return settings[state];
    return true; // Default active
  };

  // Master State Toggle Handler
  const handleStateToggleClick = async (state: string) => {
    const currentlyActive = isStateMasterActive(state);

    // If state master is currently active and admin wants to PAUSE ENTIRE STATE, check impact across state!
    if (currentlyActive) {
      setSavingKey(`STATE:${state}`);
      try {
        const { count: workerCount } = await supabase
          .from('profiles')
          .select('*', { count: 'exact', head: true })
          .eq('state', state);

        const { count: jobCount } = await supabase
          .from('posted_tasks')
          .select('*', { count: 'exact', head: true })
          .eq('status', 'open')
          .ilike('location', `%${state}%`);

        if ((workerCount && workerCount > 0) || (jobCount && jobCount > 0)) {
          setDeactivateStateModal({
            state,
            workerCount: workerCount || 0,
            jobCount: jobCount || 0,
          });
          setSavingKey(null);
          return;
        }
      } catch (e) {
        console.warn("State impact check error:", e);
      }
      setSavingKey(null);
    }

    await confirmToggleState(state, !currentlyActive);
  };

  const confirmToggleState = async (state: string, newStatus: boolean) => {
    setSavingKey(`STATE:${state}`);
    try {
      // Find if state master record exists (where lga IS NULL)
      const { data: existing } = await supabase
        .from('location_settings')
        .select('id')
        .eq('state', state)
        .is('lga', null)
        .maybeSingle();

      let error;
      if (existing?.id) {
        const res = await supabase
          .from('location_settings')
          .update({ is_active: newStatus, updated_at: new Date().toISOString() })
          .eq('id', existing.id);
        error = res.error;
      } else {
        const res = await supabase
          .from('location_settings')
          .insert({ state, lga: null, is_active: newStatus, updated_at: new Date().toISOString() });
        error = res.error;
      }

      if (error) {
        alert("Failed to update State Master setting: " + error.message);
      } else {
        setSettings(prev => ({ ...prev, [state]: newStatus }));
      }
    } catch (e: any) {
      alert("Error saving state setting: " + e.message);
    } finally {
      setSavingKey(null);
      setDeactivateStateModal(null);
    }
  };

  // Toggle handler
  const handleToggleClick = async (state: string, lga: string) => {
    const currentlyActive = isLgaActive(state, lga);
    
    // If currently active and admin wants to TURN IT OFF, check impact first!
    if (currentlyActive) {
      setSavingKey(`${state}:${lga}`);
      try {
        const { count: workerCount } = await supabase
          .from('profiles')
          .select('*', { count: 'exact', head: true })
          .eq('state', state)
          .eq('lga', lga);

        const { count: jobCount } = await supabase
          .from('posted_tasks')
          .select('*', { count: 'exact', head: true })
          .eq('status', 'open')
          .ilike('location', `%${lga}%`);

        if ((workerCount && workerCount > 0) || (jobCount && jobCount > 0)) {
          setDeactivateModal({
            state,
            lga,
            workerCount: workerCount || 0,
            jobCount: jobCount || 0,
          });
          setSavingKey(null);
          return;
        }
      } catch (e) {
        console.warn("Impact check error:", e);
      }
      setSavingKey(null);
    }

    // Otherwise apply directly
    await confirmToggleLocation(state, lga, !currentlyActive);
  };

  const confirmToggleLocation = async (state: string, lga: string, newStatus: boolean) => {
    const key = `${state}:${lga}`;
    setSavingKey(key);
    try {
      const { error } = await supabase
        .from('location_settings')
        .upsert(
          { state, lga, is_active: newStatus, updated_at: new Date().toISOString() },
          { onConflict: 'state,lga' }
        );

      if (error) {
        alert("Failed to update setting: " + error.message);
      } else {
        setSettings(prev => ({ ...prev, [key]: newStatus }));
      }
    } catch (e: any) {
      alert("Error saving setting: " + e.message);
    } finally {
      setSavingKey(null);
      setDeactivateModal(null);
    }
  };

  const currentLgas = NIGERIA_LGAS[selectedState] || [];
  const filteredLgas = currentLgas.filter(lga =>
    lga.toLowerCase().includes(searchTerm.toLowerCase())
  );

  // Group waitlist by state & LGA
  const waitlistStats = waitlist.reduce((acc, curr) => {
    const key = `${curr.state}:${curr.lga}`;
    if (!acc[key]) acc[key] = { clients: 0, workers: 0, total: 0 };
    acc[key].total += 1;
    if (curr.role_intent === 'worker') acc[key].workers += 1;
    else acc[key].clients += 1;
    return acc;
  }, {} as Record<string, { clients: number; workers: number; total: number }>);

  return (
    <div className="space-y-8 animate-fadeIn">
      {/* Header & Overview Banner */}
      <div className="bg-gradient-to-r from-slate-900 via-slate-800 to-slate-900 text-white p-6 rounded-3xl border border-slate-700/60 shadow-xl flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-ping"></span>
            <span className="text-[10px] font-black uppercase tracking-widest text-emerald-400">Territory Expansion Engine</span>
          </div>
          <h2 className="text-2xl font-black italic tracking-tight mt-1">Location Releases & Waitlists</h2>
          <p className="text-xs text-slate-300 font-medium max-w-xl mt-1">
            Control which States and LGAs are open for live job searching. Inactive areas display an elegant "Coming Soon" waitlist banner to capture pre-launch demand.
          </p>
        </div>

        <button
          onClick={() => {
            const sql = `CREATE TABLE IF NOT EXISTS public.location_settings (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    state TEXT NOT NULL,
    lga TEXT,
    is_active BOOLEAN DEFAULT true,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()),
    UNIQUE(state, lga)
);

CREATE TABLE IF NOT EXISTS public.location_waitlist (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
    contact_info TEXT NOT NULL,
    state TEXT NOT NULL,
    lga TEXT NOT NULL,
    area TEXT,
    role_intent TEXT DEFAULT 'client',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now())
);

ALTER TABLE public.posted_tasks ADD COLUMN IF NOT EXISTS area TEXT;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS area TEXT;

ALTER TABLE public.location_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.location_waitlist ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Public can view location settings" ON public.location_settings;
CREATE POLICY "Public can view location settings" ON public.location_settings FOR SELECT USING (true);

DROP POLICY IF EXISTS "Anyone can join location waitlist" ON public.location_waitlist;
CREATE POLICY "Anyone can join location waitlist" ON public.location_waitlist FOR INSERT WITH CHECK (true);

GRANT ALL ON public.location_settings TO authenticated, service_role, anon;
GRANT ALL ON public.location_waitlist TO authenticated, service_role, anon;`;
            navigator.clipboard.writeText(sql);
            alert("Location tables SQL setup code copied! Paste into Supabase SQL Editor if needed.");
          }}
          className="text-[10px] font-black uppercase tracking-widest px-4 py-3 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-2xl border border-slate-600 transition-all flex items-center gap-2 shrink-0 active:scale-95"
        >
          <i className="fa-solid fa-code text-emerald-400"></i> Copy SQL Setup
        </button>
      </div>

      {/* Grid: Left = LGA Active Toggles, Right = Pre-launch Waitlist */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        
        {/* Left Column: LGA Controls */}
        <div className="lg:col-span-7 bg-white dark:bg-slate-900 rounded-3xl p-6 border border-slate-100 dark:border-slate-800 shadow-sm space-y-6">
          <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-4 border-b border-slate-100 dark:border-slate-800 pb-4">
            <div>
              <h3 className="text-sm font-black uppercase tracking-wider text-slate-900 dark:text-white">Location Status Controls</h3>
              <p className="text-[11px] text-slate-400 font-bold">Toggle State Master or individual LGAs ON (Live) / OFF (Coming Soon)</p>
            </div>

            <div className="flex gap-2">
              <select
                value={selectedState}
                onChange={(e) => setSelectedState(e.target.value)}
                className="bg-slate-100 dark:bg-slate-800 text-slate-900 dark:text-white px-3 py-2 rounded-xl text-xs font-bold outline-none border border-slate-200 dark:border-slate-700"
              >
                {NIGERIA_STATES.map(s => (
                  <option key={s} value={s}>{s}</option>
                ))}
              </select>
            </div>
          </div>

          {/* Master State Control Banner */}
          {(() => {
            const isStateActive = isStateMasterActive(selectedState);
            const stateLgas = NIGERIA_LGAS[selectedState] || [];
            const activeOverrides = stateLgas.filter(lga => settings[`${selectedState}:${lga}`] === true);
            const pausedOverrides = stateLgas.filter(lga => settings[`${selectedState}:${lga}`] === false);

            return (
              <div className={`p-4 rounded-2xl border transition-all flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 ${
                isStateActive
                  ? 'bg-slate-900 text-white border-slate-800 shadow-md'
                  : 'bg-amber-500/10 border-amber-500/30 text-slate-900 dark:text-white'
              }`}>
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-black uppercase tracking-wider">{selectedState} State Master</span>
                    <span className={`text-[9px] font-black px-2 py-0.5 rounded-full uppercase tracking-wider ${
                      isStateActive
                        ? 'bg-emerald-500/20 text-emerald-400'
                        : 'bg-amber-500/20 text-amber-500'
                    }`}>
                      {isStateActive ? '● Master Active' : '⌛ Master Paused'}
                    </span>
                  </div>
                  <p className="text-[11px] text-slate-400 font-medium leading-normal">
                    {isStateActive
                      ? pausedOverrides.length > 0
                        ? `${pausedOverrides.length} LGA(s) manually overridden PAUSED.`
                        : 'All LGAs default to LIVE unless overridden below.'
                      : activeOverrides.length > 0
                        ? `${activeOverrides.length} LGA(s) manually overridden ACTIVE.`
                        : 'All LGAs display "Coming Soon" waitlist unless overridden below.'
                    }
                  </p>
                </div>

                <button
                  disabled={savingKey === `STATE:${selectedState}`}
                  onClick={() => handleStateToggleClick(selectedState)}
                  className={`px-4 py-2.5 rounded-xl text-xs font-black uppercase tracking-wider transition-all flex items-center gap-2 active:scale-95 shrink-0 ${
                    isStateActive
                      ? 'bg-amber-500 hover:bg-amber-400 text-slate-950 shadow-md shadow-amber-500/20'
                      : 'bg-emerald-500 hover:bg-emerald-400 text-slate-950 shadow-md shadow-emerald-500/20'
                  }`}
                >
                  {savingKey === `STATE:${selectedState}` ? (
                    <i className="fa-solid fa-circle-notch animate-spin"></i>
                  ) : isStateActive ? (
                    <>
                      <i className="fa-solid fa-pause"></i> Pause Entire {selectedState} State
                    </>
                  ) : (
                    <>
                      <i className="fa-solid fa-rocket"></i> Launch Entire {selectedState} State
                    </>
                  )}
                </button>
              </div>
            );
          })()}

          <div className="relative">
            <i className="fa-solid fa-magnifying-glass absolute left-3.5 top-3 text-slate-400 text-xs"></i>
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder={`Search LGAs in ${selectedState}...`}
              className="w-full bg-slate-50 dark:bg-slate-800/60 pl-9 pr-4 py-2.5 rounded-xl text-xs font-medium text-slate-900 dark:text-white outline-none border border-slate-200 dark:border-slate-700 focus:border-emerald-500"
            />
          </div>

          {loading ? (
            <div className="p-8 text-center text-slate-400 text-xs font-bold animate-pulse">
              <i className="fa-solid fa-circle-notch animate-spin mr-2"></i> Loading location settings...
            </div>
          ) : (
            <div className="space-y-2 max-h-[480px] overflow-y-auto pr-1">
              {filteredLgas.length === 0 ? (
                <p className="text-center text-xs text-slate-400 py-6">No LGAs found matching "{searchTerm}"</p>
              ) : (
                filteredLgas.map(lga => {
                  const active = isLgaActive(selectedState, lga);
                  const key = `${selectedState}:${lga}`;
                  const isExplicitOverride = key in settings;
                  const isSaving = savingKey === key;
                  const stats = waitlistStats[key];

                  return (
                    <div
                      key={lga}
                      className={`p-3.5 rounded-2xl border transition-all flex items-center justify-between ${
                        active
                          ? 'bg-emerald-500/5 border-emerald-500/20 text-slate-900 dark:text-white'
                          : 'bg-amber-500/5 border-amber-500/20 text-slate-700 dark:text-slate-300'
                      }`}
                    >
                      <div className="space-y-0.5">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="text-xs font-black">{lga}</span>
                          <span className={`text-[9px] font-black px-2 py-0.5 rounded-full uppercase tracking-wider ${
                            active
                              ? 'bg-emerald-500/20 text-emerald-600 dark:text-emerald-400'
                              : 'bg-amber-500/20 text-amber-600 dark:text-amber-400'
                          }`}>
                            {active ? '● Active Live' : '⌛ Coming Soon'}
                          </span>
                          {isExplicitOverride && (
                            <span className="text-[8px] font-black uppercase px-2 py-0.5 bg-purple-500/10 text-purple-600 dark:text-purple-400 rounded-full border border-purple-500/20">
                              ⚡ Custom Override
                            </span>
                          )}
                        </div>
                        <p className="text-[10px] text-slate-400 font-medium">
                          State: {selectedState} {isExplicitOverride ? '(LGA Override)' : '(State Master Inheritance)'} {stats ? `• ${stats.total} Waitlisted (${stats.clients} Clients, ${stats.workers} Workers)` : ''}
                        </p>
                      </div>

                      <button
                        disabled={isSaving}
                        onClick={() => handleToggleClick(selectedState, lga)}
                        className={`px-3 py-1.5 rounded-xl text-[10px] font-black uppercase tracking-wider transition-all flex items-center gap-1.5 active:scale-95 ${
                          active
                            ? 'bg-slate-200 dark:bg-slate-800 hover:bg-red-500/10 text-slate-700 dark:text-slate-300 hover:text-red-500 border border-slate-300 dark:border-slate-700'
                            : 'bg-emerald-600 hover:bg-emerald-500 text-white shadow-md shadow-emerald-600/20'
                        }`}
                      >
                        {isSaving ? (
                          <i className="fa-solid fa-circle-notch animate-spin"></i>
                        ) : active ? (
                          <>
                            <i className="fa-solid fa-pause"></i> Pause LGA
                          </>
                        ) : (
                          <>
                            <i className="fa-solid fa-rocket"></i> Launch LGA
                          </>
                        )}
                      </button>
                    </div>
                  );
                })
              )}
            </div>
          )}
        </div>

        {/* Right Column: Pre-launch Waitlist Feed */}
        <div className="lg:col-span-5 bg-white dark:bg-slate-900 rounded-3xl p-6 border border-slate-100 dark:border-slate-800 shadow-sm space-y-6">
          <div className="border-b border-slate-100 dark:border-slate-800 pb-4 flex justify-between items-center">
            <div>
              <h3 className="text-sm font-black uppercase tracking-wider text-slate-900 dark:text-white">Pre-Launch Demand Waitlist</h3>
              <p className="text-[11px] text-slate-400 font-bold">{waitlist.length} Total Users Waiting for Launch</p>
            </div>
          </div>

          <div className="space-y-3 max-h-[520px] overflow-y-auto pr-1">
            {waitlist.length === 0 ? (
              <div className="p-8 text-center text-slate-400 text-xs font-medium space-y-2">
                <i className="fa-solid fa-clipboard-list text-3xl opacity-40"></i>
                <p>No waitlist registrations recorded yet.</p>
                <p className="text-[10px] text-slate-500">When users search inactive locations, their contact requests will appear here.</p>
              </div>
            ) : (
              waitlist.map((item) => (
                <div
                  key={item.id}
                  className="p-3.5 bg-slate-50 dark:bg-slate-800/50 rounded-2xl border border-slate-100 dark:border-slate-800 space-y-1.5"
                >
                  <div className="flex justify-between items-center">
                    <span className="text-xs font-black text-slate-900 dark:text-white">{item.contact_info}</span>
                    <span className={`text-[8px] font-black uppercase px-2 py-0.5 rounded-full ${
                      item.role_intent === 'worker' 
                        ? 'bg-purple-500/10 text-purple-600 dark:text-purple-400' 
                        : 'bg-blue-500/10 text-blue-600 dark:text-blue-400'
                    }`}>
                      {item.role_intent === 'worker' ? 'Worker / Artisan' : 'Client / Employer'}
                    </span>
                  </div>

                  <div className="flex items-center gap-1.5 text-[10px] text-slate-500 font-bold">
                    <i className="fa-solid fa-location-dot text-emerald-500"></i>
                    <span>{item.state} • {item.lga} {item.area ? `(${item.area})` : ''}</span>
                  </div>

                  <p className="text-[9px] text-slate-400 font-mono text-right">
                    {new Date(item.created_at).toLocaleDateString()}
                  </p>
                </div>
              ))
            )}
          </div>
        </div>

      </div>

      {/* Safety Warning Modal for Deactivating Location */}
      {deactivateModal && (
        <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-sm z-50 flex items-center justify-center p-4 animate-fadeIn">
          <div className="bg-white dark:bg-slate-900 border border-amber-500/30 max-w-md w-full rounded-3xl p-6 shadow-2xl space-y-5">
            <div className="w-12 h-12 bg-amber-500/10 text-amber-500 rounded-2xl flex items-center justify-center text-xl">
              <i className="fa-solid fa-triangle-exclamation"></i>
            </div>

            <div className="space-y-2">
              <h3 className="text-lg font-black text-slate-900 dark:text-white uppercase tracking-tight">
                Deactivate {deactivateModal.lga}?
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed font-medium">
                Our safety index detected existing records in <strong className="text-slate-900 dark:text-white">{deactivateModal.lga}, {deactivateModal.state}</strong>:
              </p>
              
              <div className="p-3 bg-amber-50 dark:bg-amber-950/20 rounded-xl border border-amber-200 dark:border-amber-900/40 text-xs font-bold text-amber-800 dark:text-amber-300 space-y-1">
                <p>• {deactivateModal.workerCount} Verified Workers</p>
                <p>• {deactivateModal.jobCount} Open Job Postings</p>
              </div>

              <p className="text-[11px] text-slate-400 font-medium leading-relaxed pt-1">
                Pausing this location will display the "Coming Soon" waitlist card to clients searching this LGA. Active workers can still be accessed directly via their unique link.
              </p>
            </div>

            <div className="flex gap-3 pt-2">
              <button
                onClick={() => setDeactivateModal(null)}
                className="flex-1 bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 py-3 rounded-2xl text-xs font-black uppercase tracking-wider"
              >
                Cancel
              </button>
              <button
                onClick={() => confirmToggleLocation(deactivateModal.state, deactivateModal.lga, false)}
                className="flex-1 bg-amber-600 hover:bg-amber-500 text-white py-3 rounded-2xl text-xs font-black uppercase tracking-wider shadow-lg shadow-amber-600/20 active:scale-95 transition-all"
              >
                Confirm Pause
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Safety Warning Modal for Deactivating Entire State */}
      {deactivateStateModal && (
        <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-sm z-50 flex items-center justify-center p-4 animate-fadeIn">
          <div className="bg-white dark:bg-slate-900 border border-amber-500/30 max-w-md w-full rounded-3xl p-6 shadow-2xl space-y-5">
            <div className="w-12 h-12 bg-amber-500/10 text-amber-500 rounded-2xl flex items-center justify-center text-xl">
              <i className="fa-solid fa-triangle-exclamation"></i>
            </div>

            <div className="space-y-2">
              <h3 className="text-lg font-black text-slate-900 dark:text-white uppercase tracking-tight">
                Pause Entire {deactivateStateModal.state} State?
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed font-medium">
                Our safety index detected existing records across <strong className="text-slate-900 dark:text-white">{deactivateStateModal.state} State</strong>:
              </p>
              
              <div className="p-3 bg-amber-50 dark:bg-amber-950/20 rounded-xl border border-amber-200 dark:border-amber-900/40 text-xs font-bold text-amber-800 dark:text-amber-300 space-y-1">
                <p>• {deactivateStateModal.workerCount} Verified Workers in {deactivateStateModal.state}</p>
                <p>• {deactivateStateModal.jobCount} Open Job Postings in {deactivateStateModal.state}</p>
              </div>

              <p className="text-[11px] text-slate-400 font-medium leading-relaxed pt-1">
                Pausing this state will display the "Coming Soon" waitlist banner to clients searching {deactivateStateModal.state} (except LGAs with explicit ACTIVE overrides).
              </p>
            </div>

            <div className="flex gap-3 pt-2">
              <button
                onClick={() => setDeactivateStateModal(null)}
                className="flex-1 bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 py-3 rounded-2xl text-xs font-black uppercase tracking-wider"
              >
                Cancel
              </button>
              <button
                onClick={() => confirmToggleState(deactivateStateModal.state, false)}
                className="flex-1 bg-amber-600 hover:bg-amber-500 text-white py-3 rounded-2xl text-xs font-black uppercase tracking-wider shadow-lg shadow-amber-600/20 active:scale-95 transition-all"
              >
                Confirm Pause State
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
