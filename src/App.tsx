import React, { useState, useEffect, useRef } from 'react';
import { fixstackApi } from './api';
import { Run, RunEvent } from './types';
import { 
  Shield, Play, Loader2, CheckCircle2, AlertCircle, Clock, History, GitBranch as Github, 
  ArrowRight, Activity, Box, XCircle, LogOut, Settings as SettingsIcon, 
  Calendar, Building, Bell, LayoutDashboard, Brain, Flame, Info, Search, 
  Trash2, Copy, PlayCircle, Zap, Check, Skull, AlertTriangle, RefreshCw 
} from 'lucide-react';

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

const AnimatedNumber = ({ value }: { value: number }) => {
  const [displayValue, setDisplayValue] = useState(0);
  
  useEffect(() => {
    let start = 0;
    const end = value;
    if (start === end) {
      setDisplayValue(end);
      return;
    }
    const duration = 1000;
    const incrementTime = 30;
    const steps = duration / incrementTime;
    const increment = end / steps;
    
    const timer = setInterval(() => {
      start += increment;
      if (start >= end) {
        clearInterval(timer);
        setDisplayValue(end);
      } else {
        setDisplayValue(Math.floor(start));
      }
    }, incrementTime);
    
    return () => clearInterval(timer);
  }, [value]);

  return <span>{displayValue}</span>;
};

type GithubRepo = {
  id: number;
  full_name: string;
  html_url: string;
  private: boolean;
};

const getAgentAvatar = (name: string) => {
  const map: Record<string, { initials: string, color: string }> = {
    'Repo Scanner': { initials: 'RS', color: 'bg-blue-600' },
    'CVE Lookup': { initials: 'CV', color: 'bg-purple-600' },
    'Context Analyst': { initials: 'CA', color: 'bg-cyan-600' },
    'Patch Planner': { initials: 'PP', color: 'bg-indigo-600' },
    'Validator': { initials: 'VA', color: 'bg-orange-600' },
    'Retry Controller': { initials: 'RC', color: 'bg-rose-600' },
    'GitHub PR Agent': { initials: 'GP', color: 'bg-green-600' },
    'Alert Agent': { initials: 'AL', color: 'bg-yellow-600' },
  };
  return map[name] || { initials: name.substring(0, 2).toUpperCase(), color: 'bg-slate-600' };
};

const TimelineEventCard = ({ event, run }: { event: RunEvent, run: Run }) => {
  const isRetryWarn = event.agentName === 'Retry Controller' && event.status === 'WARNING';
  const isRetrySuccess = event.agentName === 'Retry Controller' && event.status === 'SUCCESS';
  const isPRCreated = event.agentName === 'GitHub PR Agent' && event.toolName === 'PR Created';
  const isContextAnalyst = event.agentName === 'Context Analyst';

  let eventClass = `relative mb-6 animate-[slideIn_0.3s_ease-out_forwards] flex items-start`;
  
  const getRelativeTime = (timestamp: string) => {
    const seconds = Math.floor((new Date().getTime() - new Date(timestamp).getTime()) / 1000);
    if (seconds < 60) return `${seconds}s ago`;
    const mins = Math.floor(seconds / 60);
    return `${mins}m ago`;
  };

  const avatar = getAgentAvatar(event.agentName);

  let contentClass = "flex-1 p-4 rounded-lg border ml-6 ";
  if (isRetryWarn) {
    contentClass += "bg-red-950/40 border-red-900 border-l-4 border-l-red-500 animate-pulse";
  } else if (isRetrySuccess) {
    contentClass += "bg-green-950/40 border-green-900 border-l-4 border-l-green-500";
  } else if (isPRCreated) {
    contentClass += "bg-gradient-to-r from-green-900/60 to-emerald-900/60 border-green-500 border-2 text-center py-8 relative overflow-hidden";
  } else {
    contentClass += "bg-slate-800/40 border-slate-700 border-l-4 ";
    if (event.status === 'INFO') contentClass += "border-l-blue-500";
    else if (event.status === 'SUCCESS') contentClass += "border-l-green-500";
    else if (event.status === 'WARNING') contentClass += "border-l-amber-500";
    else if (event.status === 'ERROR') contentClass += "border-l-red-500";
  }

  return (
    <div className={eventClass}>
      <div className={`absolute -left-[1.2rem] top-4 w-10 h-10 rounded-full flex items-center justify-center z-10 text-white font-bold text-sm shadow-lg border-2 border-slate-900 ${avatar.color}`}>
        {avatar.initials}
      </div>
      <div className={contentClass}>
        {isPRCreated ? (
          <>
            <div className="absolute inset-0 opacity-20 pointer-events-none flex justify-around">
              <span className="text-4xl animate-bounce">🎉</span>
              <span className="text-4xl animate-pulse delay-75">✨</span>
              <span className="text-4xl animate-bounce delay-150">🚀</span>
            </div>
            <h3 className="text-green-400 text-2xl font-bold mb-4 flex justify-center items-center gap-2 relative z-10">
              🎉 Pull Request Created
            </h3>
            <p className="text-slate-200 mb-6 relative z-10">{event.message}</p>
            {run.prUrl && (
              <a href={run.prUrl} target="_blank" rel="noopener noreferrer" className="relative z-10">
                <button className="bg-green-600 hover:bg-green-500 text-white font-bold py-3 px-6 rounded-lg inline-flex items-center gap-2 shadow-lg transition-transform hover:scale-105">
                  <Github size={20} /> View PR: <span className="font-mono text-sm bg-green-800 px-2 py-1 rounded">{run.prBranch}</span> <ArrowRight size={18} />
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
            
            <div className={`text-base font-medium ${isRetryWarn ? 'text-red-300 font-mono' : isRetrySuccess ? 'text-green-300' : 'text-slate-200'}`}>
              {isRetryWarn && event.metadata?.attempt ? `⚠ Attempt ${event.metadata.attempt} of 3 FAILED: ` : ''}
              {isRetrySuccess && event.metadata?.attempt ? `✅ Fixed on Attempt ${event.metadata.attempt}` : event.message}
            </div>

            {isContextAnalyst && event.metadata?.confidence && (
              <div className="mt-3 flex items-center gap-2">
                <span className={`px-2 py-1 rounded text-xs font-bold ${
                  event.metadata.confidence === 'HIGH' ? 'bg-green-900/50 text-green-400' :
                  event.metadata.confidence === 'MEDIUM' ? 'bg-amber-900/50 text-amber-400' :
                  'bg-red-900/50 text-red-400'
                }`}>
                  {event.metadata.confidence} CONFIDENCE
                </span>
                {event.metadata.affectedFiles && Array.isArray(event.metadata.affectedFiles) && event.metadata.affectedFiles.length > 0 && (
                  <span className="text-xs text-slate-400 font-mono">
                    Files: {event.metadata.affectedFiles.join(', ')}
                  </span>
                )}
              </div>
            )}

            {event.metadata && typeof event.metadata === 'object' && !isContextAnalyst && (
              <div className="mt-3 pt-3 border-t border-slate-700 border-dashed flex gap-4 text-sm text-slate-400 flex-wrap">
                {Object.entries(event.metadata).filter(([k]) => k !== 'attempt').map(([key, val]) => (
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
  const [githubToken, setGithubToken] = useState('');
  const [githubRepos, setGithubRepos] = useState<GithubRepo[]>([]);
  const [selectedRepo, setSelectedRepo] = useState('');
  const [isRepoLoading, setIsRepoLoading] = useState(false);
  
  const [currentTab, setCurrentTab] = useState<'dashboard' | 'history' | 'schedules' | 'settings'>('dashboard');
  const [currentRun, setCurrentRun] = useState<Run | null>(null);
  const [repoUrl, setRepoUrl] = useState('');
  const [orgName, setOrgName] = useState('');
  const [events, setEvents] = useState<RunEvent[]>([]);
  const [history, setHistory] = useState<any[]>([]);
  const [schedules, setSchedules] = useState<any[]>([]);
  const [settings, setSettings] = useState({ webhookUrl: '', email: '', githubToken: '', groqApiKey: '', webhookSecret: '' });
  
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [toasts, setToasts] = useState<{id: string, message: string, type: 'info'|'success'|'error'}[]>([]);
  const [expandedRows, setExpandedRows] = useState<Record<string, boolean>>({});
  
  const [scheduleRepo, setScheduleRepo] = useState('');
  const [cronExp, setCronExp] = useState('0 0 * * *');
  const [showScheduleModal, setShowScheduleModal] = useState(false);
  const [searchFilter, setSearchFilter] = useState('');
  const [showHelpModal, setShowHelpModal] = useState(false);

  const pollInterval = useRef<number | null>(null);
  const duration = useRunDuration(currentRun);

  const addToast = (message: string, type: 'info'|'success'|'error' = 'info') => {
    const id = Math.random().toString(36).substr(2, 9);
    setToasts(prev => [...prev, { id, message, type }]);
    setTimeout(() => {
      setToasts(prev => prev.filter(t => t.id !== id));
    }, 4000);
  };

  useEffect(() => {
    const savedGithubToken = localStorage.getItem('githubToken');
    if (!savedGithubToken) return;
    setGithubToken(savedGithubToken);
    loginWithGithubToken(savedGithubToken);
  }, []);

  const fetchGithubRepos = async (token: string) => {
    const repos: GithubRepo[] = [];
    let page = 1;
    let hasMore = true;
    try {
      while (hasMore) {
        const response = await fetch(`https://api.github.com/user/repos?per_page=100&sort=updated&page=${page}`, {
          headers: {
            Authorization: `Bearer ${token}`,
            Accept: 'application/vnd.github+json',
          },
        });
        if (!response.ok) {
          throw new Error(
            response.status === 401
              ? 'Invalid GitHub token'
              : `Failed to fetch repositories (HTTP ${response.status})`
          );
        }
        const pageRepos = await response.json();
        repos.push(...pageRepos);
        hasMore = pageRepos.length === 100;
        page += 1;
      }
    } catch (e) {
      if (e instanceof Error) throw e;
      throw new Error('Network error while fetching repositories');
    }
    return repos;
  };

  const loginWithGithubToken = async (token: string) => {
    setIsRepoLoading(true);
    try {
      const repos = await fetchGithubRepos(token);
      setGithubRepos(repos);
      localStorage.setItem('githubToken', token);
      setIsAuthenticated(true);
      fetchData();
      addToast('GitHub connected', 'success');
    } catch (e: unknown) {
      const message = e instanceof Error ? e.message : 'Failed to connect GitHub';
      setIsAuthenticated(false);
      setGithubRepos([]);
      setSelectedRepo('');
      localStorage.removeItem('githubToken');
      addToast(message, 'error');
    } finally {
      setIsRepoLoading(false);
    }
  };

  const handleGithubLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!githubToken.trim()) {
      addToast('Enter a GitHub token to continue', 'error');
      return;
    }
    await loginWithGithubToken(githubToken.trim());
  };

  const handleLogout = () => {
    localStorage.removeItem('githubToken');
    setIsAuthenticated(false);
    setGithubToken('');
    setGithubRepos([]);
    setSelectedRepo('');
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

  const startScan = async (isDemo = false, selectedRepoUrl?: string) => {
    const finalRepoUrl = selectedRepoUrl || repoUrl;
    if (!isDemo && !validateUrl(finalRepoUrl)) {
      setError('Please enter a valid GitHub URL starting with https://github.com/');
      return;
    }
    setIsLoading(true); setError(null); setCurrentRun(null); setEvents([]);
    try {
      const response = await fixstackApi.startScan(isDemo ? undefined : finalRepoUrl);
      const runId = response.data.runId;
      addToast('Scan started successfully', 'success');
      fetchRun(runId);
      startPolling(runId);
    } catch (err: any) {
      setError(err.response?.data?.error || err.message || 'Failed to start scan');
      addToast('Failed to start scan', 'error');
      setIsLoading(false);
    }
  };

  const startOrgScan = async () => {
    if (!orgName) { setError('Please enter an org name'); return; }
    setIsLoading(true); setError(null);
    try {
      await fixstackApi.startOrgScan(orgName);
      addToast(`Started queueing scans for org: ${orgName}`, 'success');
      setOrgName('');
      setIsLoading(false);
      setCurrentTab('history');
    } catch (err: any) {
      setError(err.response?.data?.error || err.message);
      addToast('Failed to queue org scan', 'error');
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
      if (runRes.data.status === 'COMPLETED' || runRes.data.status === 'FAILED') {
        stopPolling();
        if (runRes.data.status === 'COMPLETED' && (!currentRun || currentRun.status !== 'COMPLETED')) {
           addToast('Scan completed!', 'success');
        }
      }
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
    if (!validateUrl(scheduleRepo)) {
      addToast('Invalid GitHub URL', 'error');
      return;
    }
    try {
      await fixstackApi.addSchedule(scheduleRepo, cronExp);
      setShowScheduleModal(false);
      setScheduleRepo('');
      fetchData();
      addToast('Schedule saved', 'success');
    } catch (e) {
      addToast('Failed to save schedule', 'error');
    }
  };

  const deleteSchedule = async (url: string) => {
    try {
      await fixstackApi.deleteSchedule(url);
      fetchData();
      addToast('Schedule deleted', 'info');
    } catch(e) {
      addToast('Failed to delete schedule', 'error');
    }
  };

  const runScheduleNow = async (url: string) => {
    try {
      await fixstackApi.runNowSchedule(url);
      addToast('Scheduled scan triggered immediately', 'success');
      setCurrentTab('history');
      setTimeout(fetchData, 1000);
    } catch(e) {
      addToast('Failed to trigger scan', 'error');
    }
  };

  const saveSettings = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await fixstackApi.saveSettings(settings.webhookUrl, settings.email, settings.githubToken, settings.groqApiKey, settings.webhookSecret);
      addToast('Settings saved successfully', 'success');
    } catch(e) {
      addToast('Failed to save settings', 'error');
    }
  };

  const testWebhook = async () => {
    try {
      await fixstackApi.testWebhook();
      addToast('Test webhook sent successfully', 'success');
    } catch(e: any) {
      addToast(e.response?.data?.error || 'Failed to send test webhook', 'error');
    }
  };

  const clearHistory = () => {
    if (window.confirm('Are you sure you want to clear history? (Note: API endpoint not implemented for clear, this is client side demo)')) {
      setHistory([]);
      addToast('History cleared', 'info');
    }
  };

  const toggleRow = (id: string) => {
    setExpandedRows(prev => ({ ...prev, [id]: !prev[id] }));
  };

  const formatCron = (cron: string) => {
    const map: Record<string, string> = {
      '0 0 * * *': 'Every day at midnight',
      '0 0 * * 0': 'Weekly on Sunday',
      '0 0 * * 1': 'Weekly on Monday',
      '0 * * * *': 'Every hour',
    };
    return map[cron] || cron;
  };

  const calculateNextRun = (cron: string) => {
    // Mock simple next run calculation for demo
    if (cron === '0 * * * *') return 'Next run in: < 1 hour';
    return 'Next run in: < 24 hours';
  };

  const getSeverityIcon = (sev: string) => {
    const s = sev.toUpperCase();
    if (s === 'CRITICAL') return <Skull size={14} className="mr-1" />;
    if (s === 'HIGH') return <Flame size={14} className="mr-1" />;
    if (s === 'MEDIUM') return <AlertTriangle size={14} className="mr-1" />;
    return <Info size={14} className="mr-1" />;
  };

  const getSeverityBadge = (sev: string) => {
    const s = sev.toUpperCase();
    if (s === 'CRITICAL') return 'bg-red-900 text-red-300 border-red-700';
    if (s === 'HIGH') return 'bg-orange-900 text-orange-300 border-orange-700';
    if (s === 'MEDIUM') return 'bg-yellow-900 text-yellow-300 border-yellow-700';
    return 'bg-blue-900 text-blue-300 border-blue-700';
  };

  const getScanStep = () => {
    if (!currentRun || events.length === 0) return 0;
    if (currentRun.status === 'COMPLETED') return 5;
    const lastEvent = events[events.length - 1];
    if (lastEvent.agentName === 'GitHub PR Agent') return 4;
    if (lastEvent.agentName === 'Patch Planner' || lastEvent.agentName === 'Validator' || lastEvent.agentName === 'Retry Controller') return 3;
    if (lastEvent.agentName === 'Context Analyst') return 2;
    if (lastEvent.agentName === 'CVE Lookup') return 1;
    return 0;
  };

  const scanSteps = ['Fetching', 'Scanning CVEs', 'AI Analysis', 'Patching', 'PR Created'];

  if (!isAuthenticated) {
    return (
      <div className="min-h-screen bg-slate-900 text-slate-100 flex flex-col items-center justify-center p-4 relative overflow-hidden">
        <div className="absolute inset-0 z-0 opacity-20">
          <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-blue-600 rounded-full mix-blend-multiply filter blur-3xl animate-blob"></div>
          <div className="absolute top-1/3 right-1/4 w-96 h-96 bg-purple-600 rounded-full mix-blend-multiply filter blur-3xl animate-blob animation-delay-2000"></div>
          <div className="absolute bottom-1/4 left-1/3 w-96 h-96 bg-cyan-600 rounded-full mix-blend-multiply filter blur-3xl animate-blob animation-delay-4000"></div>
        </div>

        <div className="bg-slate-800/80 backdrop-blur-xl p-10 rounded-2xl border border-slate-700 shadow-2xl max-w-md w-full text-center relative z-10 transform transition-all">
          <div className="flex justify-center mb-6">
            <div className="relative">
              <Github size={72} className="text-blue-500 relative z-10" />
              <div className="absolute inset-0 bg-blue-500 blur-xl opacity-50 z-0 animate-pulse"></div>
            </div>
          </div>
          <h1 className="text-4xl font-extrabold mb-2 bg-gradient-to-r from-blue-400 via-cyan-400 to-purple-500 text-transparent bg-clip-text">FixStack</h1>
          <p className="text-slate-400 font-medium tracking-wide uppercase text-sm mb-8">Login with GitHub to continue</p>
          <form onSubmit={handleGithubLogin} className="space-y-6">
            <div className="relative group">
              <div className="absolute -inset-0.5 bg-gradient-to-r from-blue-500 to-purple-600 rounded-lg blur opacity-30 group-focus-within:opacity-100 transition duration-500"></div>
              <input 
                type="password" 
                value={githubToken} 
                onChange={e => setGithubToken(e.target.value)} 
                placeholder="GitHub Personal Access Token" 
                className="relative w-full bg-slate-900 border border-slate-600 rounded-lg px-4 py-4 text-center focus:outline-none text-white shadow-inner font-mono text-sm" 
                autoFocus 
              />
            </div>
            <button type="submit" disabled={isRepoLoading} className="w-full bg-blue-600 hover:bg-blue-500 disabled:opacity-50 text-white font-bold py-4 px-4 rounded-lg transition-all shadow-[0_0_20px_rgba(37,99,235,0.5)] hover:shadow-[0_0_30px_rgba(37,99,235,0.8)]">
              {isRepoLoading ? 'Connecting...' : 'Login with GitHub'}
            </button>
          </form>
          <div className="mt-8 text-xs text-slate-400">
            Use a token with <span className="font-mono text-slate-300">repo</span> scope to list repositories.
          </div>
        </div>

        <div className="fixed bottom-4 right-4 z-50 flex flex-col gap-2">
          {toasts.map(t => (
            <div key={t.id} className={`px-4 py-3 rounded-lg shadow-lg text-white text-sm font-medium flex items-center gap-2 animate-[slideIn_0.3s_ease-out] ${t.type === 'error' ? 'bg-red-600' : t.type === 'success' ? 'bg-green-600' : 'bg-blue-600'}`}>
              {t.type === 'error' ? <AlertCircle size={16}/> : t.type === 'success' ? <CheckCircle2 size={16}/> : <Info size={16}/>}
              {t.message}
            </div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-900 text-slate-100 font-sans">
      {/* Navbar */}
      <nav className={`bg-slate-800 border-b border-slate-700 sticky top-0 z-40 transition-all ${duration > 0 ? 'shadow-[0_4px_30px_rgba(59,130,246,0.15)] border-b-blue-900' : ''}`}>
        <div className="max-w-6xl mx-auto px-4 flex justify-between items-center h-16">
          <div className="flex items-center gap-2 font-bold text-2xl cursor-pointer" onClick={() => {setCurrentRun(null); setCurrentTab('dashboard');}}>
            <Shield className="text-blue-500" /> <span className="text-white">Fix</span><span className="text-blue-400">Stack</span>
          </div>
          <div className="flex gap-2">
            {[
              { id: 'dashboard', icon: LayoutDashboard, label: 'Dashboard' },
              { id: 'history', icon: History, label: 'History' },
              { id: 'schedules', icon: Calendar, label: 'Schedules' },
              { id: 'settings', icon: SettingsIcon, label: 'Settings' }
            ].map(tab => (
              <button 
                key={tab.id} 
                onClick={() => setCurrentTab(tab.id as any)} 
                className={`px-4 py-2 rounded-lg font-medium text-sm flex items-center gap-2 transition-all ${currentTab === tab.id ? 'bg-slate-700 text-white shadow-sm' : 'text-slate-400 hover:text-white hover:bg-slate-700/50'}`}
              >
                <tab.icon size={16} />
                {tab.label}
              </button>
            ))}
          </div>
          <div className="flex items-center gap-4">
            {currentRun?.status === 'RUNNING' && (
              <div className="flex items-center gap-2 text-xs font-bold text-green-400 bg-green-900/30 px-3 py-1.5 rounded-full border border-green-800">
                <div className="w-2 h-2 rounded-full bg-green-500 animate-ping"></div>
                SCAN RUNNING
              </div>
            )}
            <button onClick={handleLogout} className="text-slate-400 hover:text-white flex items-center gap-2 text-sm transition-colors"><LogOut size={16}/> Disconnect GitHub</button>
          </div>
        </div>
      </nav>

      <main className="max-w-5xl mx-auto p-4 py-8 animate-[fadeIn_0.3s_ease-out]">
        {currentTab === 'dashboard' && (
          !currentRun ? (
            <div className="text-center py-12">
              <h1 className="text-5xl md:text-6xl font-extrabold mb-4 flex flex-col items-center justify-center gap-2">
                <span className="text-white">Autonomous Security</span>
                <span className="bg-gradient-to-r from-blue-400 via-purple-400 to-cyan-400 text-transparent bg-clip-text animate-gradient-x">For Every Dependency</span>
              </h1>
              
              <div className="flex justify-center gap-4 my-8">
                <span className="bg-slate-800 border border-slate-700 text-slate-300 px-4 py-2 rounded-full text-sm font-medium flex items-center gap-2"><Search size={16} className="text-blue-400"/> CVE Scanner</span>
                <span className="bg-slate-800 border border-slate-700 text-slate-300 px-4 py-2 rounded-full text-sm font-medium flex items-center gap-2"><Brain size={16} className="text-purple-400"/> Context-Aware AI</span>
                <span className="bg-slate-800 border border-slate-700 text-slate-300 px-4 py-2 rounded-full text-sm font-medium flex items-center gap-2"><RefreshCw size={16} className="text-green-400"/> Self-Correcting Patches</span>
              </div>

              <div className="grid md:grid-cols-2 gap-8 max-w-4xl mx-auto text-left mb-16">
                <div className="bg-slate-800 p-8 rounded-2xl border border-slate-700 shadow-xl relative overflow-hidden group">
                  <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity"><Github size={100}/></div>
                  <h3 className="text-xl font-bold mb-4 flex items-center gap-2 relative z-10"><Github size={24}/> Your Repositories</h3>
                  <div className="flex flex-col gap-4 relative z-10">
                    {githubRepos.length > 0 ? (
                      <>
                        <select
                          className="bg-slate-900 border border-slate-600 rounded-lg px-4 py-3 focus:outline-none focus:border-blue-500 w-full text-sm"
                          value={selectedRepo}
                          onChange={(e) => {
                            const selectedRepoUrl = e.target.value;
                            setSelectedRepo(selectedRepoUrl);
                            if (!selectedRepoUrl) return;
                            setRepoUrl(selectedRepoUrl);
                            setError(null);
                            startScan(false, selectedRepoUrl);
                          }}
                          disabled={isLoading}
                        >
                          <option value="">Select a repository to start scanning</option>
                          {githubRepos.map((repo) => (
                            <option key={repo.id} value={repo.html_url}>
                              {repo.full_name}{repo.private ? ' (private)' : ''}
                            </option>
                          ))}
                        </select>
                        <button onClick={() => loginWithGithubToken(githubToken)} disabled={isRepoLoading} className="bg-slate-700 hover:bg-slate-600 py-3 rounded-lg font-bold flex justify-center items-center gap-2 w-full transition-colors disabled:opacity-50">
                          {isRepoLoading ? <Loader2 className="animate-spin" /> : <><RefreshCw size={18} /> Refresh Repositories</>}
                        </button>
                      </>
                    ) : (
                      <div className="text-sm text-slate-400 bg-slate-900 border border-slate-700 rounded-lg p-4">
                        No repositories found for this account.
                      </div>
                    )}
                  </div>
                </div>

                <div className="bg-slate-800 p-8 rounded-2xl border border-slate-700 shadow-xl">
                  <h3 className="text-xl font-bold mb-4 flex items-center gap-2"><Building size={24}/> Organization Scan</h3>
                  <div className="flex flex-col gap-4">
                    <input type="text" placeholder="Enter GitHub Org (e.g. facebook)" value={orgName} onChange={(e) => {setOrgName(e.target.value); setError(null);}} disabled={isLoading} className="bg-slate-900 border border-slate-600 rounded-lg px-4 py-3 focus:outline-none focus:border-blue-500 w-full text-sm" />
                    <button onClick={startOrgScan} disabled={isLoading || !orgName} className="bg-purple-600 hover:bg-purple-500 py-3 rounded-lg font-bold flex justify-center items-center gap-2 w-full transition-colors disabled:opacity-50 shadow-lg">
                      {isLoading ? <Loader2 className="animate-spin" /> : <><Play size={18} /> Queue Org Scan</>}
                    </button>
                  </div>
                </div>
              </div>

              <div className="max-w-4xl mx-auto mb-16">
                 <h3 className="text-2xl font-bold mb-8 text-slate-300">How it works</h3>
                 <div className="grid grid-cols-4 gap-4 text-center relative">
                   <div className="absolute top-6 left-[10%] right-[10%] h-0.5 bg-slate-700 z-0"></div>
                   {[
                     { step: 1, title: 'Fetch Deps', icon: Box },
                     { step: 2, title: 'Scan CVEs', icon: Search },
                     { step: 3, title: 'AI Context', icon: Brain },
                     { step: 4, title: 'Auto-PR', icon: Github }
                   ].map((s, i) => (
                     <div key={i} className="relative z-10 flex flex-col items-center">
                       <div className="w-12 h-12 rounded-full bg-slate-800 border-2 border-blue-500 flex items-center justify-center mb-3 shadow-[0_0_15px_rgba(59,130,246,0.3)]">
                         <s.icon size={20} className="text-blue-400" />
                       </div>
                       <div className="font-bold text-slate-200">{s.title}</div>
                     </div>
                   ))}
                 </div>
              </div>

              {error && <div className="text-red-500 mt-6 bg-red-900/30 p-4 rounded-lg border border-red-800">{error}</div>}

              <div className="mt-8 max-w-md mx-auto">
                <button onClick={() => startScan(true)} disabled={isLoading} className="w-full border-2 border-blue-600 hover:bg-blue-600/10 text-blue-400 py-4 px-6 rounded-xl font-bold transition-all flex items-center justify-center gap-3">
                  <Zap size={20} /> Run Live Demo (lodash + axios CVEs)
                </button>
              </div>
            </div>
          ) : (
            <div className="space-y-6">
              {/* Status Bar */}
              <div className="bg-slate-800 border border-slate-700 rounded-xl p-5 flex flex-wrap justify-between items-center gap-4 shadow-lg">
                <div className="flex gap-8">
                  <div>
                    <div className="text-xs text-slate-400 uppercase tracking-widest mb-1">Repository</div>
                    <div className="font-bold text-lg flex items-center gap-2"><Github size={18} className="text-slate-400"/> {currentRun.input.repoName}</div>
                  </div>
                  <div className="border-l border-slate-700 pl-8">
                    <div className="text-xs text-slate-400 uppercase tracking-widest mb-1">Run ID</div>
                    <div className="font-mono text-slate-300">{currentRun.id.substring(0, 8)}</div>
                  </div>
                  <div className="border-l border-slate-700 pl-8">
                    <div className="text-xs text-slate-400 uppercase tracking-widest mb-1">Duration</div>
                    <div className="font-mono text-blue-400 flex items-center gap-1"><Clock size={14}/> {duration}s</div>
                  </div>
                </div>
                <div>
                  <span className={`px-4 py-2 rounded-lg text-sm font-bold uppercase shadow-inner ${
                    currentRun.status === 'COMPLETED' ? 'bg-green-900/80 text-green-400 border border-green-700' :
                    currentRun.status === 'FAILED' ? 'bg-red-900/80 text-red-400 border border-red-700' :
                    currentRun.status === 'RUNNING' ? 'bg-blue-900/80 text-blue-400 border border-blue-700 shadow-[0_0_10px_rgba(59,130,246,0.5)]' :
                    'bg-slate-700 text-slate-300'
                  }`}>
                    {currentRun.status}
                  </span>
                </div>
              </div>

              {/* Progress Bar Mini */}
              <div className="bg-slate-800 rounded-lg p-4 border border-slate-700 flex justify-between items-center sticky top-[4.5rem] z-30 shadow-md">
                {scanSteps.map((step, i) => {
                  const currentStep = getScanStep();
                  const isActive = i === currentStep && currentRun.status !== 'COMPLETED';
                  const isDone = i < currentStep || currentRun.status === 'COMPLETED';
                  return (
                    <div key={step} className="flex items-center gap-2 flex-1 justify-center relative">
                      {i !== 0 && <div className={`absolute -left-[50%] right-[50%] h-1 top-1/2 -mt-0.5 -z-10 rounded ${isDone ? 'bg-blue-500' : 'bg-slate-700'}`}></div>}
                      <div className={`flex flex-col items-center gap-1 bg-slate-800 px-2 ${isActive ? 'scale-110' : ''}`}>
                         <div className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold z-10 transition-colors ${
                           isDone ? 'bg-blue-500 text-white' : 
                           isActive ? 'bg-blue-600 outline outline-4 outline-blue-900 text-white animate-pulse' : 
                           'bg-slate-700 text-slate-400'
                         }`}>
                           {isDone ? <Check size={12}/> : (i+1)}
                         </div>
                         <span className={`text-xs font-medium ${isActive ? 'text-blue-400' : isDone ? 'text-slate-300' : 'text-slate-500'}`}>{step}</span>
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Timeline */}
              <div className="bg-slate-800 border border-slate-700 rounded-xl p-6 shadow-lg">
                <h2 className="text-xl font-bold mb-6 flex items-center gap-2 border-b border-slate-700 pb-4"><Activity className="text-blue-500" /> Live Agent Timeline</h2>
                <div className="border-l-2 border-slate-700 pl-8 ml-4 relative mt-4">
                  {events.length === 0 && currentRun.status === 'PENDING' ? (
                    <div className="animate-pulse space-y-6">
                      <div className="h-24 bg-slate-700/50 rounded-lg w-full border border-slate-600"></div>
                      <div className="h-24 bg-slate-700/50 rounded-lg w-full border border-slate-600"></div>
                    </div>
                  ) : (
                    events.map(event => <TimelineEventCard key={event.id} event={event} run={currentRun!} />)
                  )}
                  {currentRun.status === 'RUNNING' && (
                    <div className="relative mb-6 flex items-start">
                       <div className="absolute -left-[1.3rem] top-4 bg-slate-900 p-1 rounded-full flex items-center justify-center z-10">
                        <Loader2 size={18} className="animate-spin text-blue-500" />
                      </div>
                      <div className="flex-1 p-4 ml-6 italic text-slate-400 flex items-center gap-2">
                        Agents are working <span className="flex gap-1"><span className="animate-bounce">.</span><span className="animate-bounce delay-75">.</span><span className="animate-bounce delay-150">.</span></span>
                      </div>
                    </div>
                  )}
                </div>
              </div>

              {/* Results */}
              {currentRun.status === 'COMPLETED' && (
                <div className="space-y-6 animate-[slideIn_0.5s_ease-out_forwards]">
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    <div className="bg-slate-800 border border-slate-700 p-6 rounded-xl text-center shadow-lg">
                      <div className="text-5xl font-bold mb-2 text-white"><AnimatedNumber value={currentRun.vulnerabilities.length} /></div>
                      <div className="text-xs text-slate-400 uppercase tracking-widest font-bold">Vulns Found</div>
                    </div>
                    <div className="bg-slate-800 border border-green-800/50 p-6 rounded-xl text-center shadow-lg relative overflow-hidden">
                      <div className="absolute inset-0 bg-green-500/5"></div>
                      <div className="text-5xl font-bold mb-2 text-green-500 relative z-10"><AnimatedNumber value={currentRun.remediations.filter(r => r.status === 'FIXED').length} /></div>
                      <div className="text-xs text-green-400 uppercase tracking-widest font-bold relative z-10">Fixed</div>
                    </div>
                    <div className="bg-slate-800 border border-red-800/50 p-6 rounded-xl text-center shadow-lg relative overflow-hidden">
                       <div className="absolute inset-0 bg-red-500/5"></div>
                      <div className="text-5xl font-bold mb-2 text-red-500 relative z-10"><AnimatedNumber value={currentRun.remediations.filter(r => r.status === 'FAILED').length} /></div>
                      <div className="text-xs text-red-400 uppercase tracking-widest font-bold relative z-10">Failed</div>
                    </div>
                    <div className="bg-slate-800 border border-slate-700 p-6 rounded-xl text-center shadow-lg">
                      <div className="text-5xl font-bold mb-2 text-blue-400"><AnimatedNumber value={duration} />s</div>
                      <div className="text-xs text-slate-400 uppercase tracking-widest font-bold">Duration</div>
                    </div>
                  </div>

                  {currentRun.vulnerabilities.length > 0 && (
                    <div className="bg-slate-800 border border-slate-700 rounded-xl p-6 overflow-x-auto shadow-lg">
                      <h3 className="text-xl font-bold mb-6 flex items-center gap-2"><Shield size={24} className="text-red-400"/> Vulnerabilities Discovered</h3>
                      <table className="w-full text-left border-collapse">
                        <thead>
                          <tr className="border-b-2 border-slate-700 text-slate-400 text-sm uppercase tracking-wider">
                            <th className="py-3 px-4">Package</th>
                            <th className="py-3 px-4">Severity</th>
                            <th className="py-3 px-4">Source</th>
                            <th className="py-3 px-4">Context</th>
                            <th className="py-3 px-4">Description</th>
                          </tr>
                        </thead>
                        <tbody>
                          {currentRun.vulnerabilities.map(v => (
                            <React.Fragment key={v.id}>
                              <tr className={`border-b border-slate-700/50 hover:bg-slate-700/30 cursor-pointer transition-colors ${expandedRows[v.id] ? 'bg-slate-700/20' : ''}`} onClick={() => toggleRow(v.id)}>
                                <td className="py-4 px-4">
                                  <div className="font-bold text-white text-base">{v.pkgName}</div>
                                  <div className="font-mono text-sm text-slate-400">{v.pkgVersion} • {v.ecosystem || currentRun.input.ecosystem}</div>
                                </td>
                                <td className="py-4 px-4">
                                  <span className={`px-3 py-1.5 rounded-md text-xs font-bold border flex items-center w-max ${getSeverityBadge(v.severity)}`}>
                                    {getSeverityIcon(v.severity)} {v.severity}
                                  </span>
                                </td>
                                <td className="py-4 px-4">
                                   <span className="bg-slate-700 text-slate-300 px-2 py-1 rounded text-xs font-mono border border-slate-600">OSV.dev</span>
                                </td>
                                <td className="py-4 px-4">
                                  {(v as any).contextNote || (v as any).affectedFiles ? (
                                    <div className="flex items-center gap-2 text-indigo-400" title={(v as any).contextNote || 'Context analyzed'}>
                                      <Brain size={16}/> 
                                      <span className="text-xs font-bold">{(v as any).affectedFiles?.length || 1} files</span>
                                    </div>
                                  ) : (
                                    <span className="text-slate-500 text-xs">—</span>
                                  )}
                                </td>
                                <td className="py-4 px-4 text-sm text-slate-300">
                                  <div className="max-w-md truncate pr-4">{v.description}</div>
                                  <div className="text-xs text-blue-400 mt-1">Click to expand</div>
                                </td>
                              </tr>
                              {expandedRows[v.id] && (
                                <tr className="bg-slate-900/50 border-b border-slate-700">
                                  <td colSpan={5} className="p-6">
                                    <div className="flex flex-col gap-4">
                                      <div>
                                        <h4 className="text-xs font-bold text-slate-400 uppercase mb-2">Full Description</h4>
                                        <p className="text-sm text-slate-200 leading-relaxed bg-slate-800 p-4 rounded border border-slate-700">{v.description}</p>
                                      </div>
                                      <div className="flex gap-4">
                                        <div className="bg-slate-800 p-3 rounded border border-slate-700 flex-1">
                                          <div className="text-xs text-slate-400 uppercase mb-1">CVE ID</div>
                                          <div className="font-mono text-white">{v.cveId}</div>
                                        </div>
                                        {(v as any).contextNote && (
                                           <div className="bg-indigo-900/20 p-3 rounded border border-indigo-800/50 flex-[2]">
                                            <div className="text-xs text-indigo-400 uppercase mb-1 flex items-center gap-1"><Brain size={12}/> AI Context Analysis</div>
                                            <div className="text-sm text-indigo-200">{(v as any).contextNote}</div>
                                          </div>
                                        )}
                                      </div>
                                    </div>
                                  </td>
                                </tr>
                              )}
                            </React.Fragment>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}

                  {currentRun.remediations.length > 0 && (
                    <div className="bg-slate-800 border border-slate-700 rounded-xl p-6 overflow-x-auto shadow-lg">
                      <h3 className="text-xl font-bold mb-6 flex items-center gap-2"><RefreshCw size={24} className="text-green-400"/> Remediations Applied</h3>
                      <table className="w-full text-left border-collapse">
                        <thead>
                          <tr className="border-b-2 border-slate-700 text-slate-400 text-sm uppercase tracking-wider">
                            <th className="py-3 px-4">Package</th>
                            <th className="py-3 px-4">Version Update</th>
                            <th className="py-3 px-4">Resolution</th>
                            <th className="py-3 px-4 text-right">Status</th>
                          </tr>
                        </thead>
                        <tbody>
                          {currentRun.remediations.map((r, i) => (
                            <tr key={i} className="border-b border-slate-700/50 hover:bg-slate-700/30">
                              <td className="py-4 px-4 font-bold text-white text-base">{r.pkgName}</td>
                              <td className="py-4 px-4">
                                <div className="flex items-center gap-3 font-mono text-sm">
                                  <span className="text-red-400 line-through decoration-red-500/50">{r.oldVersion}</span>
                                  <ArrowRight size={14} className="text-slate-500" />
                                  <span className={r.status === 'FIXED' ? 'text-green-400 font-bold bg-green-900/30 px-2 py-0.5 rounded' : 'text-slate-400'}>{r.newVersion}</span>
                                </div>
                              </td>
                              <td className="py-4 px-4">
                                <div className="flex items-center gap-2">
                                  <div className="flex gap-1">
                                    {Array.from({length: Math.max(1, r.attempts || 1)}).map((_, idx) => (
                                      <div key={idx} className={`w-3 h-3 rounded-full ${r.status === 'FIXED' && idx === (r.attempts||1)-1 ? 'bg-green-500' : 'bg-red-500'}`} title={`Attempt ${idx+1}`}></div>
                                    ))}
                                  </div>
                                  {(r.attempts || 0) > 1 && r.status === 'FIXED' && (
                                    <span className="bg-amber-900/50 text-amber-400 border border-amber-700 text-[10px] px-2 py-0.5 rounded font-bold uppercase">Self-Corrected</span>
                                  )}
                                </div>
                              </td>
                              <td className="py-4 px-4 text-right">
                                <span className={`px-3 py-1.5 rounded-md text-xs font-bold border inline-block ${r.status === 'FIXED' ? 'bg-green-900/50 text-green-400 border-green-800' : 'bg-red-900/50 text-red-400 border-red-800'}`}>
                                  {r.status === 'FIXED' ? '✅ PATCHED' : '❌ FAILED'}
                                </span>
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
                <div className="bg-red-950/80 border-2 border-red-800 rounded-xl p-8 shadow-lg text-center animate-pulse">
                   <AlertTriangle size={48} className="text-red-500 mx-auto mb-4" />
                   <h3 className="text-red-400 text-2xl font-bold mb-2">Workflow Failed</h3>
                   <p className="text-red-300">The autonomous remediation encountered a critical error during execution. Check the timeline above for details.</p>
                </div>
              )}

              <div className="text-center pt-10 pb-8">
                <button onClick={() => { setCurrentRun(null); setRepoUrl(''); }} className="bg-slate-800 border-2 border-slate-600 hover:border-blue-500 hover:bg-slate-700 text-white font-bold py-3 px-8 rounded-xl transition-all shadow-lg flex items-center gap-2 mx-auto">
                  <RefreshCw size={18}/> Start Another Scan
                </button>
              </div>
            </div>
          )
        )}

        {currentTab === 'history' && (
          <div className="space-y-6 animate-[fadeIn_0.3s_ease-out]">
            <div className="flex justify-between items-center bg-slate-800 p-6 rounded-xl border border-slate-700 shadow-sm">
              <h2 className="text-2xl font-bold flex items-center gap-3"><History className="text-blue-500"/> Scan History</h2>
              <div className="flex gap-4">
                <div className="relative">
                  <Search size={16} className="absolute left-3 top-2.5 text-slate-500"/>
                  <input 
                    type="text" 
                    placeholder="Filter by repo..." 
                    value={searchFilter}
                    onChange={(e) => setSearchFilter(e.target.value)}
                    className="bg-slate-900 border border-slate-600 rounded-lg pl-9 pr-4 py-2 text-sm focus:outline-none focus:border-blue-500 w-64"
                  />
                </div>
                <button onClick={clearHistory} className="flex items-center gap-2 text-slate-400 hover:text-red-400 text-sm font-medium px-3 py-2 rounded border border-transparent hover:border-red-900 hover:bg-red-900/20 transition-all">
                  <Trash2 size={16}/> Clear All
                </button>
              </div>
            </div>

            <div className="grid gap-4">
              {history.filter(s => s.repo?.toLowerCase().includes(searchFilter.toLowerCase())).length === 0 ? 
                <div className="text-center py-12 bg-slate-800 rounded-xl border border-slate-700 border-dashed">
                  <History size={48} className="text-slate-600 mx-auto mb-4" />
                  <p className="text-slate-400 text-lg">No scan history found.</p>
                </div> : 
                history.filter(s => s.repo?.toLowerCase().includes(searchFilter.toLowerCase())).map((scan: any) => (
                <div key={scan.id} onClick={() => loadRun(scan.runId)} className="bg-slate-800 border border-slate-700 hover:border-blue-500 hover:shadow-[0_0_15px_rgba(59,130,246,0.2)] p-5 rounded-xl cursor-pointer transition-all flex flex-col md:flex-row justify-between items-center group gap-4">
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-2">
                      <Github size={20} className="text-slate-400" />
                      <div className="font-bold text-xl text-white">{scan.repo}</div>
                      <span className="bg-slate-700 text-slate-300 px-2 py-0.5 rounded text-xs font-mono border border-slate-600 uppercase">{scan.ecosystem || 'NPM'}</span>
                    </div>
                    <div className="flex items-center gap-4 text-sm text-slate-400 font-mono">
                      <span>{new Date(scan.createdAt).toLocaleString()}</span>
                      <span className="text-slate-600">•</span>
                      <span className="flex gap-2">
                         {scan.vulnerabilities?.filter((v:any) => v.severity === 'CRITICAL').length > 0 && <span className="text-red-400 flex items-center gap-1"><Skull size={12}/> {scan.vulnerabilities.filter((v:any) => v.severity === 'CRITICAL').length}</span>}
                         {scan.vulnerabilities?.filter((v:any) => v.severity === 'HIGH').length > 0 && <span className="text-orange-400 flex items-center gap-1"><Flame size={12}/> {scan.vulnerabilities.filter((v:any) => v.severity === 'HIGH').length}</span>}
                         {scan.vulnerabilities?.filter((v:any) => v.severity === 'MEDIUM').length > 0 && <span className="text-yellow-400 flex items-center gap-1"><AlertTriangle size={12}/> {scan.vulnerabilities.filter((v:any) => v.severity === 'MEDIUM').length}</span>}
                         {(!scan.vulnerabilities || scan.vulnerabilities.length === 0) && <span>0 Vulns</span>}
                      </span>
                      <span className="text-slate-600">•</span>
                      <span className="text-green-400 font-bold">{scan.fixedCount} Fixed</span>
                    </div>
                  </div>
                  <div className="flex items-center gap-4 w-full md:w-auto justify-between md:justify-end">
                    {scan.prUrl && (
                       <span className="bg-green-900/40 text-green-400 border border-green-700 px-3 py-1 rounded-full text-xs font-bold flex items-center gap-2">
                         <CheckCircle2 size={12}/> PR Opened
                       </span>
                    )}
                    <span className={`px-3 py-1.5 rounded-lg text-xs font-bold uppercase border ${scan.status === 'COMPLETED' ? 'bg-green-900/30 text-green-400 border-green-800' : scan.status === 'FAILED' ? 'bg-red-900/30 text-red-400 border-red-800' : 'bg-blue-900/30 text-blue-400 border-blue-800'}`}>
                      {scan.status}
                    </span>
                    <div className="w-10 h-10 rounded-full bg-slate-700 flex items-center justify-center group-hover:bg-blue-600 transition-colors">
                      <ArrowRight size={20} className="text-slate-400 group-hover:text-white" />
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {currentTab === 'schedules' && (
          <div className="animate-[fadeIn_0.3s_ease-out]">
            <div className="flex justify-between items-center mb-8 bg-slate-800 p-6 rounded-xl border border-slate-700 shadow-sm">
              <div>
                <h2 className="text-2xl font-bold flex items-center gap-3"><Calendar className="text-blue-500"/> Scheduled Scans</h2>
                <p className="text-slate-400 text-sm mt-1">Automate vulnerability checks with cron schedules.</p>
              </div>
              <button onClick={() => setShowScheduleModal(true)} className="bg-blue-600 hover:bg-blue-500 px-6 py-3 rounded-lg font-bold text-sm shadow-lg transition-all flex items-center gap-2">
                <Calendar size={18}/> Add Schedule
              </button>
            </div>
            
            {showScheduleModal && (
              <div className="fixed inset-0 bg-slate-900/90 backdrop-blur-sm flex items-center justify-center z-50 p-4">
                <div className="bg-slate-800 border border-slate-600 rounded-2xl p-8 w-full max-w-md shadow-[0_0_50px_rgba(0,0,0,0.5)] animate-[slideIn_0.2s_ease-out]">
                  <div className="flex justify-between items-center mb-6">
                    <h3 className="text-2xl font-bold text-white">New Schedule</h3>
                    <button onClick={() => setShowScheduleModal(false)} className="text-slate-400 hover:text-white"><XCircle size={24}/></button>
                  </div>
                  <div className="space-y-5">
                    <div>
                      <label className="block text-sm font-bold text-slate-300 mb-2">GitHub Repo URL</label>
                      <div className="relative">
                        <Github size={18} className="absolute left-3 top-3 text-slate-500"/>
                        <input type="text" value={scheduleRepo} onChange={e => setScheduleRepo(e.target.value)} className="w-full bg-slate-900 border border-slate-600 rounded-lg pl-10 pr-4 py-3 focus:border-blue-500 outline-none text-white shadow-inner" placeholder="https://github.com/facebook/react" />
                      </div>
                    </div>
                    <div>
                      <label className="block text-sm font-bold text-slate-300 mb-2">Run Frequency</label>
                      <select value={cronExp} onChange={e => setCronExp(e.target.value)} className="w-full bg-slate-900 border border-slate-600 rounded-lg px-4 py-3 outline-none text-white shadow-inner appearance-none">
                        <option value="0 0 * * *">Every day at midnight (0 0 * * *)</option>
                        <option value="0 0 * * 0">Weekly on Sunday (0 0 * * 0)</option>
                        <option value="0 0 * * 1">Every Monday (0 0 * * 1)</option>
                        <option value="0 * * * *">Every hour (0 * * * *)</option>
                      </select>
                    </div>
                    <div className="pt-4 flex gap-3">
                      <button onClick={() => setShowScheduleModal(false)} className="flex-1 px-4 py-3 text-slate-300 hover:bg-slate-700 rounded-lg font-medium transition-colors border border-slate-600">Cancel</button>
                      <button onClick={saveSchedule} className="flex-1 bg-blue-600 hover:bg-blue-500 px-4 py-3 rounded-lg font-bold text-white shadow-lg transition-colors">Create Schedule</button>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {schedules.length === 0 ? (
              <div className="text-center py-16 bg-slate-800 rounded-xl border border-slate-700 border-dashed">
                <Calendar size={64} className="text-slate-600 mx-auto mb-4" />
                <h3 className="text-xl font-bold text-white mb-2">No active schedules</h3>
                <p className="text-slate-400">Set up a schedule to continuously monitor your repositories.</p>
              </div>
            ) : (
              <div className="grid md:grid-cols-2 gap-6">
                {schedules.map(s => (
                  <div key={s.repo} className="bg-slate-800 border border-slate-700 hover:border-slate-500 p-6 rounded-xl transition-colors shadow-lg relative group">
                    <div className="absolute top-6 right-6">
                      <button onClick={() => deleteSchedule(s.repo)} className="text-slate-500 hover:text-red-400 bg-slate-900 p-2 rounded-full transition-colors" title="Delete Schedule"><Trash2 size={18}/></button>
                    </div>
                    <div className="font-bold text-xl mb-4 pr-12 text-white flex items-center gap-2 truncate">
                      <Github size={20} className="text-slate-400 shrink-0"/> {s.repo.replace('https://github.com/', '')}
                    </div>
                    
                    <div className="flex flex-col gap-3 mb-6 bg-slate-900/50 p-4 rounded-lg border border-slate-700/50">
                      <div className="flex justify-between items-center">
                        <span className="text-sm text-slate-400">Frequency</span>
                        <span className="text-sm font-bold text-slate-200">{formatCron(s.cronExpression)}</span>
                      </div>
                      <div className="flex justify-between items-center">
                        <span className="text-sm text-slate-400">Cron</span>
                        <span className="text-xs font-mono bg-slate-800 px-2 py-1 rounded text-slate-300">{s.cronExpression}</span>
                      </div>
                      <div className="flex justify-between items-center pt-2 border-t border-slate-700/50 mt-1">
                        <span className="text-sm text-blue-400 flex items-center gap-1"><Clock size={14}/> {calculateNextRun(s.cronExpression)}</span>
                      </div>
                    </div>
                    
                    <button onClick={() => runScheduleNow(s.repo)} className="w-full bg-slate-700 hover:bg-blue-600 text-white font-bold py-2.5 rounded-lg transition-colors flex items-center justify-center gap-2">
                      <PlayCircle size={18}/> Run Now
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {currentTab === 'settings' && (
          <div className="max-w-3xl mx-auto animate-[fadeIn_0.3s_ease-out]">
            <div className="mb-8">
              <h2 className="text-3xl font-bold flex items-center gap-3 text-white"><SettingsIcon className="text-blue-500" size={28}/> Configuration</h2>
              <p className="text-slate-400 mt-2">Manage your API keys, integrations, and notification preferences.</p>
            </div>
            
            <form onSubmit={saveSettings} className="space-y-8">
              {/* Integrations */}
              <div className="bg-slate-800 border border-slate-700 rounded-2xl overflow-hidden shadow-lg">
                <div className="bg-slate-800/50 border-b border-slate-700 p-5">
                  <h3 className="text-lg font-bold flex items-center gap-2 text-white"><Box size={20} className="text-purple-400"/> Integrations & APIs</h3>
                </div>
                <div className="p-6 space-y-6">
                  <div>
                    <label className="flex items-center justify-between text-sm font-bold text-slate-300 mb-2">
                      <span>GitHub Personal Access Token</span>
                      <span className="text-xs font-normal text-slate-500">Required for opening PRs</span>
                    </label>
                    <input type="password" value={settings.githubToken || ''} onChange={e => setSettings({...settings, githubToken: e.target.value})} className="w-full bg-slate-900 border border-slate-600 rounded-lg px-4 py-3 focus:border-blue-500 outline-none text-white shadow-inner font-mono text-sm placeholder-slate-600" placeholder="ghp_xxxxxxxxxxxxxxxxxxxx" />
                    <p className="text-xs text-slate-500 mt-2">Needs `repo` and `pull_request` scopes to function autonomously.</p>
                  </div>
                  
                  <div className="pt-4 border-t border-slate-700/50">
                    <label className="flex items-center justify-between text-sm font-bold text-slate-300 mb-2">
                      <span>Groq API Key</span>
                      <span className="text-xs font-normal text-slate-500">Required for AI Context Analysis</span>
                    </label>
                    <input type="password" value={settings.groqApiKey || ''} onChange={e => setSettings({...settings, groqApiKey: e.target.value})} className="w-full bg-slate-900 border border-slate-600 rounded-lg px-4 py-3 focus:border-blue-500 outline-none text-white shadow-inner font-mono text-sm placeholder-slate-600" placeholder="gsk_xxxxxxxxxxxxxxxxxxxx" />
                  </div>
                </div>
              </div>

              {/* Webhooks */}
              <div className="bg-slate-800 border border-slate-700 rounded-2xl overflow-hidden shadow-lg">
                <div className="bg-slate-800/50 border-b border-slate-700 p-5">
                  <h3 className="text-lg font-bold flex items-center gap-2 text-white"><Bell size={20} className="text-blue-400"/> Webhook Notifications</h3>
                </div>
                <div className="p-6 space-y-6">
                  <div>
                    <label className="block text-sm font-bold text-slate-300 mb-2">Alert Webhook URL (Slack / Discord)</label>
                    <input type="url" value={settings.webhookUrl || ''} onChange={e => setSettings({...settings, webhookUrl: e.target.value})} className="w-full bg-slate-900 border border-slate-600 rounded-lg px-4 py-3 focus:border-blue-500 outline-none text-white shadow-inner placeholder-slate-600 text-sm" placeholder="https://hooks.slack.com/services/..." />
                  </div>
                  
                  <div>
                    <label className="block text-sm font-bold text-slate-300 mb-2">Webhook Secret (HMAC)</label>
                    <input type="password" value={settings.webhookSecret || ''} onChange={e => setSettings({...settings, webhookSecret: e.target.value})} className="w-full bg-slate-900 border border-slate-600 rounded-lg px-4 py-3 focus:border-blue-500 outline-none text-white shadow-inner placeholder-slate-600 text-sm" placeholder="Optional secret for signature verification" />
                  </div>

                  <div className="flex justify-end pt-2">
                    <button type="button" onClick={testWebhook} className="bg-slate-700 hover:bg-slate-600 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors border border-slate-600 flex items-center gap-2">
                      <Zap size={14}/> Test Webhook
                    </button>
                  </div>
                </div>
              </div>
              
              {/* Email */}
              <div className="bg-slate-800 border border-slate-700 rounded-2xl overflow-hidden shadow-lg">
                <div className="p-6">
                  <label className="block text-sm font-bold text-slate-300 mb-2">Alert Email Address</label>
                  <input type="email" value={settings.email || ''} onChange={e => setSettings({...settings, email: e.target.value})} className="w-full bg-slate-900 border border-slate-600 rounded-lg px-4 py-3 focus:border-blue-500 outline-none text-white shadow-inner placeholder-slate-600 text-sm" placeholder="security@company.com" />
                </div>
              </div>

              {/* GitHub App Setup */}
              <div className="bg-gradient-to-r from-blue-900/30 to-slate-800 border border-blue-800/50 rounded-2xl p-6 shadow-lg relative overflow-hidden">
                <div className="absolute top-0 right-0 w-32 h-32 bg-blue-500/10 rounded-full blur-2xl"></div>
                <h3 className="text-lg font-bold flex items-center gap-2 text-white mb-4"><Github size={20} className="text-blue-400"/> GitHub App Configuration</h3>
                <p className="text-sm text-slate-300 mb-4">To enable automatic scanning on push or PR, configure your GitHub App or Webhook to send payloads to this URL:</p>
                <div className="flex items-center gap-2">
                  <code className="flex-1 bg-slate-900 border border-slate-700 px-4 py-3 rounded-lg text-blue-400 font-mono text-sm overflow-x-auto">
                    https://fixstack-backend.onrender.com/api/webhook
                  </code>
                  <button type="button" onClick={() => {navigator.clipboard.writeText('https://fixstack-backend.onrender.com/api/webhook'); addToast('Copied to clipboard', 'success');}} className="bg-slate-700 hover:bg-slate-600 p-3 rounded-lg border border-slate-600 transition-colors" title="Copy to clipboard">
                    <Copy size={20} className="text-slate-300"/>
                  </button>
                </div>
              </div>

              <div className="pt-4 pb-12 flex justify-end">
                <button type="submit" className="bg-blue-600 hover:bg-blue-500 px-8 py-3.5 rounded-xl font-bold text-white transition-all shadow-[0_0_15px_rgba(37,99,235,0.4)] hover:shadow-[0_0_25px_rgba(37,99,235,0.6)] flex items-center gap-2">
                  <CheckCircle2 size={20}/> Save All Settings
                </button>
              </div>
            </form>
          </div>
        )}
      </main>
      
      {/* Help Button */}
      <button 
        onClick={() => setShowHelpModal(true)}
        className="fixed bottom-6 right-6 w-12 h-12 bg-slate-800 border border-slate-600 rounded-full flex items-center justify-center text-slate-300 hover:text-white hover:bg-slate-700 hover:border-blue-500 shadow-xl transition-all z-40"
      >
        <span className="font-bold text-xl">?</span>
      </button>

      {/* Help Modal */}
      {showHelpModal && (
        <div className="fixed inset-0 bg-slate-900/80 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-slate-800 border border-slate-600 rounded-2xl p-8 w-full max-w-2xl shadow-2xl relative">
            <button onClick={() => setShowHelpModal(false)} className="absolute top-4 right-4 text-slate-400 hover:text-white"><XCircle size={24}/></button>
            <h3 className="text-2xl font-bold text-white mb-6 flex items-center gap-2"><Info className="text-blue-500"/> How to setup GitHub App Webhook</h3>
            <div className="space-y-4 text-slate-300 text-sm leading-relaxed">
              <p>To have FixStack automatically scan your repositories on every push or Pull Request, you need to configure a GitHub Webhook.</p>
              <ol className="list-decimal pl-5 space-y-3">
                <li>Go to your GitHub Repository (or Organization) Settings {'>'} Webhooks {'>'} Add webhook.</li>
                <li>Set the <strong>Payload URL</strong> to: <code className="bg-slate-900 px-2 py-1 rounded border border-slate-700 text-blue-400 mx-1">https://fixstack-backend.onrender.com/api/webhook</code></li>
                <li>Set <strong>Content type</strong> to <code className="bg-slate-900 px-2 py-1 rounded text-slate-400">application/json</code>.</li>
                <li>In the <strong>Secret</strong> field, enter the <em>Webhook Secret</em> you configured in the Settings tab.</li>
                <li>Under "Which events would you like to trigger this webhook?", select <strong>Let me select individual events</strong>.</li>
                <li>Check the boxes for <strong>Pushes</strong> and <strong>Pull requests</strong>.</li>
                <li>Ensure the webhook is <strong>Active</strong> and click <strong>Add webhook</strong>.</li>
              </ol>
              <div className="mt-6 bg-blue-900/20 border border-blue-800/50 p-4 rounded-lg">
                <p className="font-bold text-blue-400 mb-1">Important Note:</p>
                <p>FixStack will ignore pushes that do not modify dependency files (like package.json or go.mod) to save resources.</p>
              </div>
            </div>
          </div>
        </div>
      )}
      
      {/* Toast Container for extra safe overlay */}
      <div className="fixed bottom-6 right-24 z-50 flex flex-col gap-2 pointer-events-none">
        {toasts.map(t => (
          <div key={t.id} className={`px-4 py-3 rounded-lg shadow-xl text-white text-sm font-medium flex items-center gap-2 animate-[slideIn_0.3s_ease-out] pointer-events-auto border ${t.type === 'error' ? 'bg-red-900 border-red-700' : t.type === 'success' ? 'bg-green-900 border-green-700' : 'bg-slate-800 border-slate-600'}`}>
            {t.type === 'error' ? <AlertCircle size={16} className="text-red-400"/> : t.type === 'success' ? <CheckCircle2 size={16} className="text-green-400"/> : <Info size={16} className="text-blue-400"/>}
            {t.message}
          </div>
        ))}
      </div>
    </div>
  );
}
