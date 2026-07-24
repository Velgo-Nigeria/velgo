import React from 'react';
import { SparkChart } from '../AdminComponents';
export interface StatsTabProps {
  handleDownloadPdf: any;
  stats: any;
}

export const StatsTab: React.FC<StatsTabProps> = ({
  handleDownloadPdf,
  stats
}) => {
  return (
    (
              <>
              {/* Executive Header Banner */}
              <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-white dark:bg-slate-800 p-6 rounded-[24px] border border-gray-100 dark:border-slate-700/60 shadow-sm">
                  <div>
                      <h2 className="text-sm font-black text-slate-900 dark:text-white uppercase tracking-widest flex items-center gap-2">
                          <i className="fa-solid fa-chart-line text-indigo-500"></i> Velgo Compliance Analytics
                      </h2>
                      <p className="text-[10px] text-gray-400 font-bold uppercase tracking-wider">Metrics and compliance telemetry overview</p>
                  </div>
                  <button 
                      onClick={handleDownloadPdf}
                      className="bg-indigo-600 hover:bg-indigo-700 active:scale-95 text-white py-2.5 px-4 rounded-xl font-black text-[10px] uppercase tracking-widest transition-all flex items-center gap-2 shadow-sm"
                      title="Generate official audit PDF"
                  >
                      <i className="fa-solid fa-file-pdf text-sm"></i> Download PDF Report
                  </button>
              </div>
              <div className="space-y-6 animate-fadeIn pb-12 font-sans max-w-6xl mx-auto">
                  {/* Overview Card Stats Grid */}
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                      {/* Metric 1: Total Users */}
                      <div className="bg-white dark:bg-slate-800 p-5 rounded-[24px] border border-gray-100 dark:border-slate-700/60 shadow-sm relative overflow-hidden flex flex-col justify-between min-h-[110px]">
                          <div>
                              <p className="text-[10px] font-black uppercase text-gray-400 dark:text-gray-500 tracking-wider">Total Registers</p>
                              <h3 className="text-2xl font-black text-gray-900 dark:text-white mt-1">{stats.totalUsers}</h3>
                          </div>
                          <div className="flex justify-between items-center text-[9px] font-bold text-gray-500 mt-2">
                              <span>{stats.verifiedCount} Verified</span>
                              <span className="w-2 h-2 rounded-full bg-emerald-500"></span>
                          </div>
                      </div>

                      {/* Metric 2: Weekly Active (WAU) */}
                      <div className="bg-white dark:bg-slate-800 p-5 rounded-[24px] border border-gray-100 dark:border-slate-700/60 shadow-sm relative overflow-hidden flex flex-col justify-between min-h-[110px]">
                          <div>
                              <p className="text-[10px] font-black uppercase text-gray-400 dark:text-gray-500 tracking-wider">Weekly Active (WAU)</p>
                              <h3 className="text-2xl font-black text-indigo-600 dark:text-indigo-400 mt-1">{stats.weeklyActiveCount}</h3>
                          </div>
                          <div className="flex justify-between items-center text-[9px] font-bold text-gray-500 mt-2">
                              <span>7-Day Active Index</span>
                              <span className="w-2 h-2 rounded-full bg-indigo-500 animate-ping"></span>
                          </div>
                      </div>

                      {/* Metric 3: Jobs / Tasks Posted */}
                      <div className="bg-white dark:bg-slate-800 p-5 rounded-[24px] border border-gray-100 dark:border-slate-700/60 shadow-sm relative overflow-hidden flex flex-col justify-between min-h-[110px]">
                          <div>
                              <p className="text-[10px] font-black uppercase text-gray-400 dark:text-gray-500 tracking-wider">Total Task Flow</p>
                              <h3 className="text-2xl font-black text-emerald-600 dark:text-emerald-400 mt-1">{stats.totalTasks + (stats.totalDirectBookings || 0)}</h3>
                          </div>
                          <div className="flex justify-between items-center text-[9px] font-bold text-gray-500 mt-2">
                              <span>{stats.totalDirectBookings || 0} Direct / {stats.totalTasks} Market</span>
                              <span className="w-2 h-2 rounded-full bg-emerald-500"></span>
                          </div>
                      </div>

                      {/* Metric 4: Platform Estimated MRR */}
                      <div className="bg-white dark:bg-slate-800 p-5 rounded-[24px] border border-gray-100 dark:border-slate-700/60 shadow-sm relative overflow-hidden flex flex-col justify-between min-h-[110px]">
                          <div>
                              <p className="text-[10px] font-black uppercase text-gray-400 dark:text-gray-500 tracking-wider">Monthly Revenue (MRR)</p>
                              <h3 className="text-2xl font-black text-amber-500 mt-1">₦{stats.revenueMRR.toLocaleString()}</h3>
                          </div>
                          <div className="flex justify-between items-center text-[9px] font-bold text-gray-500 mt-2">
                              <span>Packs Sold Count</span>
                              <span className="w-2 h-2 rounded-full bg-amber-500"></span>
                          </div>
                      </div>
                  </div>

                  {/* Visual Trendline Charts Section */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      {/* Chart 1: User Growth Monthly */}
                      <div className="bg-white dark:bg-slate-800 p-6 rounded-[32px] border border-gray-100 dark:border-slate-700/60 shadow-sm space-y-4">
                          <div>
                              <h4 className="text-sm font-black text-gray-900 dark:text-white uppercase tracking-wider">User Growth Trend</h4>
                              <p className="text-[10px] text-gray-400 font-bold uppercase tracking-wider">Registered profiles over last 8 weeks (weekly intervals)</p>
                          </div>
                          <div className="pt-2">
                              <SparkChart data={stats.userGrowth} color="#4f46e5" gradientId="userGrowthGrad" type="bar" />
                          </div>
                      </div>

                      {/* Chart 2: Task Volume Monthly */}
                      <div className="bg-white dark:bg-slate-800 p-6 rounded-[32px] border border-gray-100 dark:border-slate-700/60 shadow-sm space-y-4">
                          <div>
                              <h4 className="text-sm font-black text-gray-900 dark:text-white uppercase tracking-wider">Job Traffic & Posting Volume</h4>
                              <p className="text-[10px] text-gray-400 font-bold uppercase tracking-wider">Posted task submissions & direct bookings over last 7 days</p>
                          </div>
                          <div className="pt-2">
                              <SparkChart data={stats.taskVolumeWeekly} color="#10b981" gradientId="taskVolumeGrad" type="bar" />
                          </div>
                      </div>
                  </div>

                  {/* Subscription split and transaction metrics */}
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                      {/* Grid Item 1: Tiers breakdown */}
                      <div className="bg-white dark:bg-slate-800 p-6 rounded-[32px] border border-gray-100 dark:border-slate-700/60 shadow-sm space-y-4">
                          <div>
                              <h4 className="text-xs font-black text-gray-900 dark:text-white uppercase tracking-widest">Subscription Split</h4>
                              <p className="text-[9px] text-gray-400 font-black uppercase tracking-widest">Revenue generation channels</p>
                          </div>
                          <div className="space-y-3 pt-2">
                              {[
                                  { name: 'Starter Pack (₦900)', count: stats.tiers.basic, color: 'bg-slate-400' },
                                  { name: 'Standard Pack (₦3,999)', count: stats.tiers.lite, color: 'bg-blue-400' },
                                  { name: 'Pro Pack (₦6,999)', count: stats.tiers.standard, color: 'bg-indigo-400' },
                                  { name: 'Power Pack (₦9,999)', count: stats.tiers.pro, color: 'bg-purple-400' }
                              ].map((item, idx) => {
                                  const total = stats.tiers.basic + stats.tiers.lite + stats.tiers.standard + stats.tiers.pro || 1;
                                  const pct = Math.round((item.count / total) * 100);
                                  return (
                                      <div key={idx} className="space-y-1">
                                          <div className="flex justify-between items-center text-xs">
                                              <span className="font-bold text-gray-700 dark:text-gray-300">{item.name}</span>
                                              <span className="font-black text-gray-900 dark:text-white">{item.count} users ({pct}%)</span>
                                          </div>
                                          <div className="w-full h-2 bg-gray-100 dark:bg-slate-700 rounded-full overflow-hidden">
                                              <div className={`h-full ${item.color} rounded-full`} style={{ width: `${pct}%` }} />
                                          </div>
                                      </div>
                                  );
                              })}
                          </div>
                      </div>

                      {/* Grid Item 2: User Types Split */}
                      <div className="bg-white dark:bg-slate-800 p-6 rounded-[32px] border border-gray-100 dark:border-slate-700/60 shadow-sm space-y-4">
                          <div>
                              <h4 className="text-xs font-black text-gray-900 dark:text-white uppercase tracking-widest">Roles & Ecosystem Split</h4>
                              <p className="text-[9px] text-gray-400 font-black uppercase tracking-widest">Ecosystem balance indices</p>
                          </div>
                          <div className="space-y-3 pt-2">
                              {[
                                  { label: 'Clients', count: stats.roles.client, icon: 'fa-user', color: 'bg-indigo-500' },
                                  { label: 'Professionals / Workers', count: stats.roles.worker, icon: 'fa-user-ninja', color: 'bg-emerald-500' },
                                  { label: 'Admins', count: stats.roles.admin, icon: 'fa-shield', color: 'bg-amber-500' }
                              ].map((r, idx) => {
                                  const total = stats.roles.client + stats.roles.worker + stats.roles.admin || 1;
                                  const pct = Math.round((r.count / total) * 100);
                                  return (
                                      <div key={idx} className="space-y-1">
                                          <div className="flex justify-between items-center text-xs">
                                              <span className="font-bold text-gray-700 dark:text-gray-300 flex items-center gap-1.5">
                                                  <i className={`fa-solid ${r.icon} text-[10px]`}></i> {r.label}
                                              </span>
                                              <span className="font-black text-gray-900 dark:text-white">{r.count} ({pct}%)</span>
                                          </div>
                                          <div className="w-full h-2 bg-gray-100 dark:bg-slate-700 rounded-full overflow-hidden">
                                              <div className={`h-full ${r.color} rounded-full`} style={{ width: `${pct}%` }} />
                                          </div>
                                      </div>
                                  );
                              })}
                          </div>
                      </div>

                      {/* Grid Item 3: Job Distribution Details */}
                      <div className="bg-white dark:bg-slate-800 p-6 rounded-[32px] border border-gray-100 dark:border-slate-700/60 shadow-sm space-y-4">
                          <div>
                              <h4 className="text-xs font-black text-gray-900 dark:text-white uppercase tracking-widest">Job Metrics Overview</h4>
                              <p className="text-[9px] text-gray-400 font-black uppercase tracking-widest">Ecosystem Activity breakdown</p>
                          </div>
                          <div className="space-y-3 text-xs pt-1.5">
                              <div className="flex justify-between items-center py-2.5 border-b dark:border-slate-700/50">
                                  <span className="font-bold text-gray-500 uppercase text-[9px]">Mean Client Budget</span>
                                  <span className="font-black text-gray-900 dark:text-white text-sm">₦{stats.averageBudget.toLocaleString()}</span>
                              </div>
                              <div className="flex justify-between items-center py-2.5 border-b dark:border-slate-700/50">
                                  <span className="font-bold text-gray-500 uppercase text-[9px]">Marketplace Listings</span>
                                  <span className="font-bold text-gray-950 dark:text-gray-100">{stats.totalTasks} postings</span>
                              </div>
                              <div className="flex justify-between items-center py-2 border-b dark:border-slate-700/50">
                                  <span className="font-bold text-gray-500 uppercase text-[9px]">Direct Bookings (No Post)</span>
                                  <span className="font-bold text-indigo-600 dark:text-indigo-400">{stats.totalDirectBookings || 0} hires</span>
                              </div>
                              <div className="flex justify-between items-center py-2 border-b dark:border-slate-700/50">
                                  <span className="font-bold text-gray-500 uppercase text-[9px]">Worker Applications</span>
                                  <span className="font-bold text-blue-500">{stats.totalApplications || 0} bids</span>
                              </div>
                              <div className="flex justify-between items-center py-2.5">
                                  <span className="font-bold text-gray-500 uppercase text-[9px]">Completed Bookings</span>
                                  <span className="font-black text-emerald-500 font-mono text-sm">{stats.bookingStatus.completed || 0} jobs</span>
                              </div>
                          </div>
                      </div>
                  </div>

                  {/* Categories Leaderboard */}
                  <div className="bg-white dark:bg-slate-800 p-6 rounded-[32px] border border-gray-100 dark:border-slate-700/60 shadow-sm">
                      <div className="mb-4">
                          <h4 className="text-xs font-black text-gray-900 dark:text-white uppercase tracking-widest">Task Postings by Industry Category</h4>
                          <p className="text-[9px] text-gray-400 font-black uppercase tracking-widest">Ecosystem supply/demand indicators</p>
                      </div>
                      
                      {Object.keys(stats.categoryDistribution).length === 0 ? (
                          <div className="text-center py-6 text-xs text-gray-400">No postings recorded yet.</div>
                      ) : (
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                              {Object.entries(stats.categoryDistribution)
                                  .sort((a, b) => b[1] - a[1])
                                  .slice(0, 10)
                                  .map(([cat, count], idx) => {
                                      const total = stats.totalTasks || 1;
                                      const pct = Math.round((count / total) * 100);
                                      return (
                                          <div key={idx} className="bg-gray-50 dark:bg-slate-900/40 p-3.5 rounded-2xl flex items-center justify-between border border-gray-100 dark:border-slate-800/60 font-sans">
                                              <div className="min-w-0 flex-1 pr-2">
                                                  <h5 className="font-bold text-xs text-gray-800 dark:text-gray-200 truncate">{cat}</h5>
                                                  <div className="flex items-center gap-1 mt-1">
                                                      <div className="w-16 h-1.5 bg-gray-100 dark:bg-slate-700 rounded-full overflow-hidden">
                                                          <div className="h-full bg-indigo-500 rounded-full" style={{ width: `${pct}%` }} />
                                                      </div>
                                                      <span className="text-[9px] text-gray-400 font-bold">{pct}%</span>
                                                  </div>
                                              </div>
                                              <span className="bg-indigo-50 dark:bg-indigo-950 text-indigo-600 dark:text-indigo-400 px-3 py-1.5 rounded-xl text-xs font-black font-mono shrink-0">
                                                  {count} posts
                                              </span>
                                          </div>
                                      );
                                  })}
                          </div>
                      )}
                  </div>
              </div>
              </>
          )
  );
};
