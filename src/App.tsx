import React, { useState, useEffect, useRef } from 'react';
import { fixstackApi } from './api';
import { Run, RunEvent } from './types';
import { Shield, Play, Loader2, CheckCircle2, AlertCircle, Clock, History, Github, ArrowRight, Activity, Box, XCircle, LogOut, Settings, Calendar, Building, Bell } from 'lucide-react';
const useRunDuration = (run: Run | null) => {
  const [duration, setDuration] = useState<number>(0);

  useEffect(() => {
    if (!run) {
      setDuration(0);
      return;
    }

    if (run.status === 'COMPLETED' || run.status === 'FAILED') {
      const end = run.endTime ? new Date(run.endTime).getTime() : new Date().getTime();
      const start = new Date(run.startTime).getTime();
      setDuration(Math.floor((end - start) / 1000));
      return;
    }

    const start = new Date(run.startTime).getTime();
    const interval = setInterval(() => {
      setDuration(Math.floor((new Date().getTime() - start) / 1000));
    }, 1000);

    return () => clearInterval(interval);
  }, [run]);

  return duration;
};

const TimelineEventCard = ({ event, run }: { event: RunEvent, run: Run }) => {
  const isRetryWarn = event.agentName === 'Retry Controller' && event.status === 'WARNING';
  const isRetrySuccess = event.agentName === 'Retry Controller' && event.status === 'SUCCESS';
  const isPRCreated = event.agentName === 'GitHub PR Agent' && event.toolName === 'PR Created';

  let eventClass = `relative mb-6 animate-[slideIn_0.3s_ease-out_forwards] flex items-start`;
  
  const getRelativeTime = (timestamp: string) => {
    const seconds = Math.floor((new Date().getTime() - new Date(timestamp).getTime()) / 1000);
    if (seconds < 60) return `${seconds}s ago`;
    const mins = Math.floor(seconds / 60);
    return `${mins}m ago`;
  };

  const getIcon = () => {
    if (isPRCreated) return <Github size={20} className="text-green-500" />;
    switch (event.status) {
      case 'SUCCESS': return <CheckCircle2 size={16} className={isRetrySuccess ? '' : 'text-green-500'} />;
      case 'ERROR': return <AlertCircle size={16} className="text-red-500" />;
      case 'WARNING': return <AlertCircle size={16} className={isRetryWarn ? '' : 'text-amber-500'} />;
      default: return <div className="w-3 h-3 rounded-full bg-blue-500 border-2 border-white" />;
    }
  };

  let contentClass = "flex-1 p-4 rounded-lg border ml-6 ";
  if (isRetryWarn) {
    contentClass += "bg-amber-950/40 border-amber-900 border-l-4 border-l-amber-500";
  } else if (isRetrySuccess) {
    contentClass += "bg-green-950/40 border-green-900 border-l-4 border-l-green-500";
  } else if (isPRCreated) {
    contentClass += "bg-green-950/40 border-green-900 border-l-4 border-l-green-500 text-center py-8";
  } else {
    contentClass += "bg-slate-800/40 border-slate-700 border-l-4 ";
    if (event.status === 'INFO') contentClass += "border-l-blue-500";
    else if (event.status === 'SUCCESS') contentClass += "border-l-green-500";
    else if (event.status === 'WARNING') contentClass += "border-l-amber-500";
    else if (event.status === 'ERROR') contentClass += "border-l-red-500";
  }

  return (
    <div className={eventClass}>
      <div className="absolute -left-[1.3rem] top-4 bg-slate-900 p-1 rounded-full flex items-center justify-center z-10">
        {getIcon()}
      </div>
      <div className={contentClass}>
        {isPRCreated ? (
          <>
            <h3 className="text-green-400 text-2xl font-bold mb-4 flex justify-center items-center gap-2">
              🎉 Pull Request Created
            </h3>
            <p className="text-slate-200 mb-6">{event.message}</p>
            {run.prUrl && (
              <a href={run.prUrl} target="_blank" rel="noopener noreferrer">
                <button className="bg-blue-600 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded inline-flex items-center gap-2">
                  <Github size={18} /> View Pull Request <ArrowRight size={18} />
                </button>
              </a>
            )}
          </>
        ) : (
          <>
            <div className="flex items-center gap-3 mb-2 flex-wrap">
              <span className="bg-slate-700 text-slate-200 px-2 py-1 rounded text-xs font-bold uppercase">{event.agentName}</span>
              <span className="text-sm text-slate-400 font-mono">{event.toolName}</span>
              <span className="text-xs text-slate-500 ml-auto">{getRelativeTime(event.timestamp)}</span>
            </div>
            <div className={`text-base font-medium ${isRetryWarn ? 'text-amber-300' : isRetrySuccess ? 'text-green-300' : 'text-slate-200'}`}>
              {isRetryWarn ? '⚠ Attempt Failed — Retrying...' : isRetrySuccess ? '✅ Retry Succeeded' : event.message}
            </div>
            {event.metadata && typeof event.metadata === 'object' && (
              <div className="mt-3 pt-3 border-t border-slate-700 border-dashed flex gap-4 text-sm text-slate-400 flex-wrap">
                {Object.entries(event.metadata).map(([key, val]) => (
                  <span key={key}>{key}: <strong className="text-slate-300">{String(val)}</strong></span>
                ))}
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
};

export default function App() {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [pin, setPin] = useState('');
  
  const [currentTab, setCurrentTab] = useState<'dashboard' | 'history' | 'schedules' | 'settings'>('dashboard');
  const [currentRun, setCurrentRun] = useState<Run | null>(null);
  const [repoUrl, setRepoUrl] = useState('');
  const [orgName, setOrgName] = useState('');
  const [events, setEvents] = useState<RunEvent[]>([]);
  const [history, setHistory] = useState<any[]>([]);
  const [schedules, setSchedules] = useState<any[]>([]);
  const [settings, setSettings] = useState({ webhookUrl: '', email: '' });
  
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  const [scheduleRepo, setScheduleRepo] = useState('');
  const [cronExp, setCronExp] = useState('0 0 * * *');
  const [showScheduleModal, setShowScheduleModal] = useState(false);

  const pollInterval = useRef<number | null>(null);
  const duration = useRunDuration(currentRun);

  useEffect(() => {
    const auth = localStorage.getItem('auth');
    if (auth === 'true') setIsAuthenticated(true);
  }, []);

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    if (pin === 'depshield2026') {
      localStorage.setItem('auth', 'true');
      setIsAuthenticated(true);
      fetchData();
    } else {
      alert('Invalid PIN');
    }
  };

  const handleLogout = () => {
    localStorage.removeItem('auth');
    setIsAuthenticated(false);
    setPin('');
  };

  useEffect(() => {
    if (isAuthenticated) fetchData();
  }, [isAuthenticated, currentTab]);

  const fetchData = async () => {
    try {
      if (currentTab === 'history' || currentTab === 'dashboard') {
        const res = await fixstackApi.getScans();
        setHistory(res.data);
      }
      if (currentTab === 'schedules') {
        const res = await fixstackApi.getSchedules();
        setSchedules(res.data);
      }
      if (currentTab === 'settings') {
        const res = await fixstackApi.getSettings();
        setSettings(res.data);
      }
    } catch (e) {
      console.error(e);
    }
  };

  const validateUrl = (url: string) => url && url.startsWith('https://github.com/');

  const startScan = async (isDemo = false) => {
    if (!isDemo && !validateUrl(repoUrl)) {
      setError('Please enter a valid GitHub URL starting with https://github.com/');
      return;
    }
    setIsLoading(true); setError(null); setCurrentRun(null); setEvents([]);
    try {
      const response = await fixstackApi.startScan(isDemo ? undefined : repoUrl);
      const runId = response.data.runId;
      fetchRun(runId);
      startPolling(runId);
    } catch (err: any) {
      setError(err.response?.data?.error || err.message || 'Failed to start scan');
      setIsLoading(false);
    }
  };

  const startOrgScan = async () => {
    if (!orgName) { setError('Please enter an org name'); return; }
    setIsLoading(true); setError(null);
    try {
      await fixstackApi.startOrgScan(orgName);
      alert(`Started queueing scans for org: ${orgName}. Check history shortly.`);
      setOrgName('');
      setIsLoading(false);
      setCurrentTab('history');
    } catch (err: any) {
      setError(err.response?.data?.error || err.message);
      setIsLoading(false);
    }
  };

  const loadRun = (id: string) => {
    setCurrentTab('dashboard');
    window.scrollTo({ top: 0, behavior: 'smooth' });
    setCurrentRun(null); setEvents([]);
    fetchRun(id); startPolling(id);
  };

  const fetchRun = async (id: string) => {
    try {
      const runRes = await fixstackApi.getRun(id);
      setCurrentRun(runRes.data);
      const evRes = await fixstackApi.getEvents(id);
      setEvents(evRes.data);
      if (runRes.data.status === 'COMPLETED' || runRes.data.status === 'FAILED') stopPolling();
    } catch (err) { console.error('Error fetching run details:', err); }
  };

  const startPolling = (id: string) => {
    stopPolling();
    pollInterval.current = window.setInterval(() => fetchRun(id), 2500);
  };

  const stopPolling = () => {
    if (pollInterval.current) { clearInterval(pollInterval.current); pollInterval.current = null; setIsLoading(false); }
  };

  useEffect(() => { return () => stopPolling(); }, []);

  const saveSchedule = async () => {
    if (!validateUrl(scheduleRepo)) return alert('Invalid GitHub URL');
    await fixstackApi.addSchedule(scheduleRepo, cronExp);
    setShowScheduleModal(false);
    setScheduleRepo('');
    fetchData();
  };

  const deleteSchedule = async (url: string) => {
    await fixstackApi.deleteSchedule(url);
    fetchData();
  };

  const saveSettings = async (e: React.FormEvent) => {
    e.preventDefault();
    await fixstackApi.saveSettings(settings.webhookUrl, settings.email);
    alert('Settings saved!');
  };

  if (!isAuthenticated) {
    return (
      <div className="min-h-screen bg-slate-900 text-slate-100 flex flex-col items-center justify-center p-4">
        <div className="bg-slate-800 p-8 rounded-xl border border-slate-700 shadow-xl max-w-md w-full text-center">
          <Shield size={64} className="text-blue-500 mx-auto mb-6" />
          <h1 className="text-3xl font-bold mb-2">DepShield</h1>
          <p className="text-slate-400 mb-8">Autonomous Dependency Remediation</p>
          <form onSubmit={handleLogin} className="space-y-4">
            <input type="password" value={pin} onChange={e => setPin(e.target.value)} placeholder="Enter Access PIN" className="w-full bg-slate-900 border border-slate-600 rounded-lg px-4 py-3 text-center text-xl tracking-widest focus:outline-none focus:border-blue-500" autoFocus />
            <button type="submit" className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-3 px-4 rounded-lg transition-colors">
              Login
            </button>
          </form>
          <p className="mt-4 text-xs text-slate-500">Hint: depshield2026</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-900 text-slate-100 font-sans">
      {/* Navbar */}
      <nav className="bg-slate-800 border-b border-slate-700 sticky top-0 z-50">
        <div className="max-w-6xl mx-auto px-4 flex justify-between items-center h-16">
          <div className="flex items-center gap-2 font-bold text-xl cursor-pointer" onClick={() => {setCurrentRun(null); setCurrentTab('dashboard');}}>
            <Shield className="text-blue-500" /> DepShield
          </div>
          <div className="flex gap-1">
            {['dashboard', 'history', 'schedules', 'settings'].map(tab => (
              <button key={tab} onClick={() => setCurrentTab(tab as any)} className={`px-4 py-2 rounded-lg font-medium text-sm capitalize transition-colors ${currentTab === tab ? 'bg-slate-700 text-white' : 'text-slate-400 hover:text-white hover:bg-slate-700/50'}`}>
                {tab}
              </button>
            ))}
          </div>
          <button onClick={handleLogout} className="text-slate-400 hover:text-white flex items-center gap-2 text-sm"><LogOut size={16}/> Logout</button>
        </div>
      </nav>

      <main className="max-w-5xl mx-auto p-4 py-8">
        {currentTab === 'dashboard' && (
          !currentRun ? (
            <div className="text-center py-16">
              <Shield size={80} className="text-blue-500 mx-auto mb-6" />
              <h1 className="text-5xl font-extrabold mb-4 bg-gradient-to-r from-blue-400 to-purple-400 text-transparent bg-clip-text">DepShield</h1>
              <p className="text-xl text-slate-400 mb-12 max-w-2xl mx-auto">
                Paste a public GitHub repo URL or Organization name. DepShield scans for vulnerabilities, plans patches, and opens a PR automatically.
              </p>

              <div className="grid md:grid-cols-2 gap-8 max-w-4xl mx-auto text-left">
                <div className="bg-slate-800 p-6 rounded-xl border border-slate-700">
                  <h3 className="text-lg font-bold mb-4 flex items-center gap-2"><Github size={20}/> Single Repository Scan</h3>
                  <div className="flex flex-col gap-3">
                    <input type="text" placeholder="https://github.com/owner/repo" value={repoUrl} onChange={(e) => {setRepoUrl(e.target.value); setError(null);}} disabled={isLoading} className="bg-slate-900 border border-slate-600 rounded px-4 py-3 focus:outline-none focus:border-blue-500 w-full" />
                    <button onClick={() => startScan(false)} disabled={isLoading || !repoUrl} className="bg-blue-600 hover:bg-blue-700 py-3 rounded font-bold flex justify-center items-center gap-2 w-full transition-colors disabled:opacity-50">
                      {isLoading ? <Loader2 className="animate-spin" /> : <><Play size={18} /> Start Scan</>}
                    </button>
                  </div>
                </div>

                <div className="bg-slate-800 p-6 rounded-xl border border-slate-700">
                  <h3 className="text-lg font-bold mb-4 flex items-center gap-2"><Building size={20}/> Organization Scan</h3>
                  <div className="flex flex-col gap-3">
                    <input type="text" placeholder="Enter GitHub Org (e.g. kunaalxoxo)" value={orgName} onChange={(e) => {setOrgName(e.target.value); setError(null);}} disabled={isLoading} className="bg-slate-900 border border-slate-600 rounded px-4 py-3 focus:outline-none focus:border-blue-500 w-full" />
                    <button onClick={startOrgScan} disabled={isLoading || !orgName} className="bg-purple-600 hover:bg-purple-700 py-3 rounded font-bold flex justify-center items-center gap-2 w-full transition-colors disabled:opacity-50">
                      {isLoading ? <Loader2 className="animate-spin" /> : <><Play size={18} /> Scan Entire Org</>}
                    </button>
                  </div>
                </div>
              </div>

              {error && <div className="text-red-500 mt-6">{error}</div>}

              <div className="mt-12">
                <button onClick={() => startScan(true)} disabled={isLoading} className="border border-slate-600 hover:bg-slate-800 text-slate-300 py-2 px-6 rounded transition-colors">
                  Run Demo Scan (Fallback)
                </button>
              </div>
            </div>
          ) : (
            <div className="space-y-6">
              {/* Status Bar */}
              <div className="bg-slate-800/80 backdrop-blur border border-slate-700 rounded-xl p-4 flex flex-wrap justify-between items-center gap-4">
                <div className="flex gap-8">
                  <div>
                    <div className="text-xs text-slate-400 uppercase tracking-widest mb-1">Repository</div>
                    <div className="font-bold text-lg flex items-center gap-2"><Github size={18}/> {currentRun.input.repoName}</div>
                  </div>
                  <div className="border-l border-slate-700 pl-8">
                    <div className="text-xs text-slate-400 uppercase tracking-widest mb-1">Run ID</div>
                    <div className="font-mono">{currentRun.id.substring(0, 8)}</div>
                  </div>
                  <div className="border-l border-slate-700 pl-8">
                    <div className="text-xs text-slate-400 uppercase tracking-widest mb-1">Duration</div>
                    <div className="font-mono flex items-center gap-1"><Clock size={14}/> {duration}s</div>
                  </div>
                </div>
                <div>
                  <span className={`px-3 py-1 rounded-full text-sm font-bold uppercase ${
                    currentRun.status === 'COMPLETED' ? 'bg-green-900 text-green-400 border border-green-700' :
                    currentRun.status === 'FAILED' ? 'bg-red-900 text-red-400 border border-red-700' :
                    currentRun.status === 'RUNNING' ? 'bg-blue-900/50 text-blue-400 animate-pulse' :
                    'bg-slate-700 text-slate-300'
                  }`}>
                    {currentRun.status}
                  </span>
                </div>
              </div>

              {/* Timeline */}
              <div className="bg-slate-800 border border-slate-700 rounded-xl p-6">
                <h2 className="text-xl font-bold mb-6 flex items-center gap-2 border-b border-slate-700 pb-4"><Activity className="text-blue-500" /> Live Agent Timeline</h2>
                <div className="border-l-2 border-slate-700 pl-8 ml-4 relative mt-4">
                  {events.length === 0 && currentRun.status === 'PENDING' ? (
                    <div className="animate-pulse space-y-4">
                      <div className="h-20 bg-slate-700/50 rounded-lg w-full"></div>
                      <div className="h-20 bg-slate-700/50 rounded-lg w-full"></div>
                    </div>
                  ) : (
                    events.map(event => <TimelineEventCard key={event.id} event={event} run={currentRun} />)
                  )}
                  {currentRun.status === 'RUNNING' && (
                    <div className="relative mb-6 flex items-start">
                       <div className="absolute -left-[1.3rem] top-4 bg-slate-900 p-1 rounded-full flex items-center justify-center z-10">
                        <Loader2 size={16} className="animate-spin text-blue-500" />
                      </div>
                      <div className="flex-1 p-4 ml-6 italic text-slate-400">Agents are working...</div>
                    </div>
                  )}
                </div>
              </div>

              {/* Results */}
              {currentRun.status === 'COMPLETED' && (
                <div className="space-y-6 animate-[slideIn_0.5s_ease-out_forwards]">
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    <div className="bg-slate-800 border border-slate-700 p-6 rounded-xl text-center">
                      <div className="text-4xl font-bold mb-2">{currentRun.vulnerabilities.length}</div>
                      <div className="text-xs text-slate-400 uppercase tracking-widest">Vulns Found</div>
                    </div>
                    <div className="bg-slate-800 border border-green-800 p-6 rounded-xl text-center">
                      <div className="text-4xl font-bold mb-2 text-green-500">{currentRun.remediations.filter(r => r.status === 'FIXED').length}</div>
                      <div className="text-xs text-slate-400 uppercase tracking-widest">Fixed</div>
                    </div>
                    <div className="bg-slate-800 border border-red-800 p-6 rounded-xl text-center">
                      <div className="text-4xl font-bold mb-2 text-red-500">{currentRun.remediations.filter(r => r.status === 'FAILED').length}</div>
                      <div className="text-xs text-slate-400 uppercase tracking-widest">Failed</div>
                    </div>
                    <div className="bg-slate-800 border border-slate-700 p-6 rounded-xl text-center">
                      <div className="text-4xl font-bold mb-2">{duration}s</div>
                      <div className="text-xs text-slate-400 uppercase tracking-widest">Duration</div>
                    </div>
                  </div>

                  {currentRun.prUrl && (
                    <div className="bg-gradient-to-b from-green-900/40 to-slate-800 border-2 border-green-600 rounded-xl p-8 text-center shadow-lg">
                      <h2 className="text-3xl font-bold text-green-400 flex justify-center items-center gap-3 mb-4"><CheckCircle2 size={36}/> Pull Request Opened on GitHub</h2>
                      <p className="text-slate-300 text-lg mb-6">DepShield has committed the patched manifest and opened a PR for review.</p>
                      <div className="mb-6 text-sm text-slate-400">Branch: <span className="font-mono bg-slate-900 px-2 py-1 rounded border border-slate-700">{currentRun.prBranch}</span></div>
                      <a href={currentRun.prUrl} target="_blank" rel="noopener noreferrer">
                        <button className="bg-green-600 hover:bg-green-700 text-white text-lg font-bold py-3 px-8 rounded-lg transition-colors flex items-center gap-2 mx-auto">
                          <Github size={24}/> View Pull Request on GitHub <ArrowRight size={24}/>
                        </button>
                      </a>
                    </div>
                  )}

                  {currentRun.vulnerabilities.length > 0 && (
                    <div className="bg-slate-800 border border-slate-700 rounded-xl p-6 overflow-x-auto">
                      <h3 className="text-lg font-bold mb-4 flex items-center gap-2"><Shield size={20}/> Vulnerabilities</h3>
                      <table className="w-full text-left border-collapse">
                        <thead>
                          <tr className="border-b border-slate-700 text-slate-400 text-sm uppercase">
                            <th className="py-3 px-4">Package</th>
                            <th className="py-3 px-4">Version</th>
                            <th className="py-3 px-4">Ecosystem</th>
                            <th className="py-3 px-4">CVE ID</th>
                            <th className="py-3 px-4">Severity</th>
                            <th className="py-3 px-4">Description</th>
                          </tr>
                        </thead>
                        <tbody>
                          {currentRun.vulnerabilities.map(v => (
                            <tr key={v.id} className="border-b border-slate-700/50 hover:bg-slate-700/30">
                              <td className="py-3 px-4 font-bold">{v.pkgName}</td>
                              <td className="py-3 px-4 font-mono text-sm">{v.pkgVersion}</td>
                              <td className="py-3 px-4"><span className="bg-slate-700 px-2 py-1 rounded text-xs">{v.ecosystem || currentRun.input.ecosystem}</span></td>
                              <td className="py-3 px-4">{v.cveId}</td>
                              <td className="py-3 px-4">
                                <span className={`px-2 py-1 rounded text-xs font-bold ${v.severity.toUpperCase() === 'CRITICAL' ? 'bg-red-900 text-red-300' : v.severity.toUpperCase() === 'HIGH' ? 'bg-amber-900 text-amber-300' : 'bg-yellow-900 text-yellow-300'}`}>{v.severity}</span>
                              </td>
                              <td className="py-3 px-4 text-sm text-slate-400 max-w-xs truncate" title={v.description}>{v.description}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}

                  {currentRun.remediations.length > 0 && (
                    <div className="bg-slate-800 border border-slate-700 rounded-xl p-6 overflow-x-auto">
                      <h3 className="text-lg font-bold mb-4 flex items-center gap-2"><Box size={20}/> Remediations</h3>
                      <table className="w-full text-left border-collapse">
                        <thead>
                          <tr className="border-b border-slate-700 text-slate-400 text-sm uppercase">
                            <th className="py-3 px-4">Package</th>
                            <th className="py-3 px-4">Old Version</th>
                            <th className="py-3 px-4">New Version</th>
                            <th className="py-3 px-4">Attempts</th>
                            <th className="py-3 px-4 text-right">Status</th>
                          </tr>
                        </thead>
                        <tbody>
                          {currentRun.remediations.map((r, i) => (
                            <tr key={i} className="border-b border-slate-700/50 hover:bg-slate-700/30">
                              <td className="py-3 px-4 font-bold">{r.pkgName}</td>
                              <td className="py-3 px-4 font-mono text-sm text-slate-400">{r.oldVersion}</td>
                              <td className="py-3 px-4 font-mono text-sm">
                                <span className={r.status === 'FIXED' ? 'text-green-400 font-bold' : 'text-slate-400'}>{r.newVersion}</span>
                              </td>
                              <td className="py-3 px-4 text-sm">{r.attempts}</td>
                              <td className="py-3 px-4 text-right">
                                <span className={`px-2 py-1 rounded text-xs font-bold ${r.status === 'FIXED' ? 'bg-green-900/50 text-green-400 border border-green-800' : 'bg-red-900/50 text-red-400 border border-red-800'}`}>{r.status}</span>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>
              )}

              {currentRun.status === 'FAILED' && (
                <div className="bg-red-950 border border-red-800 rounded-xl p-6">
                   <h3 className="text-red-400 text-xl font-bold flex items-center gap-2"><XCircle/> Workflow Failed</h3>
                   <p className="text-red-300 mt-2">The autonomous remediation encountered a critical error. Check the timeline for details.</p>
                </div>
              )}

              <div className="text-center pt-8">
                <button onClick={() => { setCurrentRun(null); setRepoUrl(''); }} className="border border-slate-600 hover:bg-slate-800 text-slate-300 py-2 px-6 rounded transition-colors">Start Another Scan</button>
              </div>
            </div>
          )
        )}

        {currentTab === 'history' && (
          <div className="space-y-4">
            <h2 className="text-2xl font-bold mb-6 flex items-center gap-2"><History className="text-blue-500"/> Scan History</h2>
            {history.length === 0 ? <p className="text-slate-400">No scans found.</p> : history.map((scan: any) => (
              <div key={scan.id} onClick={() => loadRun(scan.runId)} className="bg-slate-800 border border-slate-700 hover:border-blue-500 p-4 rounded-xl cursor-pointer transition-colors flex justify-between items-center group">
                <div>
                  <div className="font-bold text-lg mb-1">{scan.repo}</div>
                  <div className="text-xs text-slate-400 font-mono">{new Date(scan.createdAt).toLocaleString()} • {scan.vulnCount} Vulns • {scan.fixedCount} Fixed</div>
                </div>
                <div className="flex items-center gap-4">
                  {scan.status === 'COMPLETED' && scan.fixedCount > 0 && <Github size={20} className="text-green-500" />}
                  <span className={`px-2 py-1 rounded text-xs font-bold ${scan.status === 'COMPLETED' ? 'bg-green-900/50 text-green-400' : scan.status === 'FAILED' ? 'bg-red-900/50 text-red-400' : 'bg-blue-900/50 text-blue-400'}`}>{scan.status}</span>
                  <ArrowRight size={16} className="text-slate-600 group-hover:text-blue-500" />
                </div>
              </div>
            ))}
          </div>
        )}

        {currentTab === 'schedules' && (
          <div>
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-2xl font-bold flex items-center gap-2"><Calendar className="text-blue-500"/> Scheduled Scans</h2>
              <button onClick={() => setShowScheduleModal(true)} className="bg-blue-600 hover:bg-blue-700 px-4 py-2 rounded font-bold text-sm">Add Schedule</button>
            </div>
            
            {showScheduleModal && (
              <div className="fixed inset-0 bg-slate-900/80 backdrop-blur flex items-center justify-center z-50 p-4">
                <div className="bg-slate-800 border border-slate-700 rounded-xl p-6 w-full max-w-md shadow-2xl">
                  <h3 className="text-xl font-bold mb-4">Schedule a Scan</h3>
                  <div className="space-y-4">
                    <div>
                      <label className="block text-sm text-slate-400 mb-1">GitHub Repo URL</label>
                      <input type="text" value={scheduleRepo} onChange={e => setScheduleRepo(e.target.value)} className="w-full bg-slate-900 border border-slate-600 rounded px-3 py-2 focus:border-blue-500 outline-none" placeholder="https://github.com/owner/repo" />
                    </div>
                    <div>
                      <label className="block text-sm text-slate-400 mb-1">Frequency</label>
                      <select value={cronExp} onChange={e => setCronExp(e.target.value)} className="w-full bg-slate-900 border border-slate-600 rounded px-3 py-2 outline-none">
                        <option value="0 0 * * *">Daily (Midnight)</option>
                        <option value="0 0 * * 0">Weekly (Sunday)</option>
                        <option value="0 0 * * 1">Every Monday</option>
                      </select>
                    </div>
                    <div className="flex justify-end gap-2 mt-6">
                      <button onClick={() => setShowScheduleModal(false)} className="px-4 py-2 text-slate-400 hover:text-white">Cancel</button>
                      <button onClick={saveSchedule} className="bg-blue-600 hover:bg-blue-700 px-4 py-2 rounded font-bold text-white">Save</button>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {schedules.length === 0 ? <p className="text-slate-400">No scheduled scans.</p> : (
              <div className="grid gap-4">
                {schedules.map(s => (
                  <div key={s.repo} className="bg-slate-800 border border-slate-700 p-4 rounded-xl flex justify-between items-center">
                    <div>
                      <div className="font-bold text-lg mb-1 flex items-center gap-2"><Github size={16}/> {s.repo}</div>
                      <div className="text-sm text-slate-400 font-mono">Cron: {s.cronExpression}</div>
                    </div>
                    <button onClick={() => deleteSchedule(s.repo)} className="text-red-400 hover:bg-red-900/30 p-2 rounded transition-colors"><XCircle size={20}/></button>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {currentTab === 'settings' && (
          <div className="max-w-2xl">
            <h2 className="text-2xl font-bold mb-6 flex items-center gap-2"><Settings className="text-blue-500"/> Settings & Alerts</h2>
            <form onSubmit={saveSettings} className="space-y-6 bg-slate-800 border border-slate-700 rounded-xl p-6">
              <div>
                <h3 className="text-lg font-bold mb-2 flex items-center gap-2"><Bell size={18}/> Notifications</h3>
                <p className="text-sm text-slate-400 mb-4">Get alerted when a scan completes with vulnerabilities.</p>
                
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm text-slate-300 mb-1">Email Address</label>
                    <input type="email" value={settings.email} onChange={e => setSettings({...settings, email: e.target.value})} className="w-full bg-slate-900 border border-slate-600 rounded px-4 py-2 focus:border-blue-500 outline-none" placeholder="alerts@company.com" />
                  </div>
                  <div>
                    <label className="block text-sm text-slate-300 mb-1">Webhook URL (Slack, Discord)</label>
                    <input type="url" value={settings.webhookUrl} onChange={e => setSettings({...settings, webhookUrl: e.target.value})} className="w-full bg-slate-900 border border-slate-600 rounded px-4 py-2 focus:border-blue-500 outline-none" placeholder="https://hooks.slack.com/services/..." />
                  </div>
                </div>
              </div>
              <button type="submit" className="bg-blue-600 hover:bg-blue-700 px-6 py-2 rounded font-bold text-white transition-colors">Save Settings</button>
            </form>
          </div>
        )}
      </main>
    </div>
  );
}
