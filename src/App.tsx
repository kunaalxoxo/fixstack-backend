import React, { useState, useEffect, useRef } from 'react';
import { fixstackApi } from './api';
import { Run, RunEvent } from './types';
import {
  Shield, Play, Loader2, CheckCircle2, AlertCircle, Clock, History, GitBranch as Github,
  ArrowRight, Activity, Box, XCircle, LogOut, Settings as SettingsIcon,
  Calendar, Building, Bell, LayoutDashboard, Brain, Flame, Info, Search,
  Trash2, Copy, PlayCircle, Zap, Check, Skull, AlertTriangle, RefreshCw, Menu, Lock, Eye, EyeOff
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
  return map[name] || { initials: name.substring(0, 2).toUpperCase(), color: 'bg-[var(--bg-highlight)]' };
};

const TimelineEventCard = ({ event, run }: { event: RunEvent, run: Run }) => {
  const isRetryWarn = event.agentName === 'Retry Controller' && event.status === 'WARNING';
  const isRetrySuccess = event.agentName === 'Retry Controller' && event.status === 'SUCCESS';
  const isPRCreated = event.agentName === 'GitHub PR Agent' && event.toolName === 'PR Created';
  const isContextAnalyst = event.agentName === 'Context Analyst';

  let eventClass = `relative mb-6 animate-slide-up flex items-start`;

  const getRelativeTime = (timestamp: string) => {
    const seconds = Math.floor((new Date().getTime() - new Date(timestamp).getTime()) / 1000);
    if (seconds < 60) return `${seconds}s ago`;
    const mins = Math.floor(seconds / 60);
    return `${mins}m ago`;
  };

  const avatar = getAgentAvatar(event.agentName);

  let contentClass = 'flex-1 p-4 rounded-2xl border ml-6 backdrop-blur-sm ';
  if (isRetryWarn) {
    contentClass += 'bg-[color:rgba(239,68,68,0.1)] border-[var(--severity-critical)] border-l-4 animate-pulse';
  } else if (isRetrySuccess) {
    contentClass += 'bg-[color:rgba(34,197,94,0.1)] border-[var(--success)] border-l-4';
  } else if (isPRCreated) {
    contentClass += 'bg-[color:rgba(34,197,94,0.08)] border-[var(--success)] text-center py-8 relative overflow-hidden';
  } else {
    contentClass += 'bg-[var(--bg-raised)] border-[var(--border-default)] border-l-4 ';
    if (event.status === 'INFO') contentClass += 'border-l-[var(--severity-low)]';
    else if (event.status === 'SUCCESS') contentClass += 'border-l-[var(--success)]';
    else if (event.status === 'WARNING') contentClass += 'border-l-[var(--warning)]';
    else if (event.status === 'ERROR') contentClass += 'border-l-[var(--severity-critical)]';
  }

  return (
    <div className={eventClass}>
      <div className={`absolute -left-[1.2rem] top-4 w-10 h-10 rounded-full flex items-center justify-center z-10 text-white font-bold text-sm shadow-lg border-2 border-[var(--bg-base)] ${avatar.color}`}>
        {avatar.initials}
      </div>
      <div className={contentClass}>
        {isPRCreated ? (
          <>
            <h3 className="text-[var(--success)] text-2xl font-bold mb-4 flex justify-center items-center gap-2 relative z-10">
              Pull Request Created
            </h3>
            <p className="text-[var(--text-primary)] mb-6 relative z-10">{event.message}</p>
            {run.prUrl && (
              <a href={run.prUrl} target="_blank" rel="noopener noreferrer" className="relative z-10">
                <button className="bg-[var(--success)]/90 hover:bg-[var(--success)] text-white font-bold py-3 px-6 rounded-xl inline-flex items-center gap-2 shadow-lg transition-transform hover:scale-[1.02]">
                  <Github size={20} /> View PR: <span className="font-mono text-sm bg-black/20 px-2 py-1 rounded">{run.prBranch}</span> <ArrowRight size={18} />
                </button>
              </a>
            )}
          </>
        ) : (
          <>
            <div className="flex items-center gap-3 mb-2 flex-wrap">
              <span className="bg-[var(--bg-highlight)] text-[var(--text-primary)] px-2 py-1 rounded-md text-xs font-bold uppercase">{event.agentName}</span>
              <span className="text-sm text-[var(--text-secondary)] font-mono">{event.toolName}</span>
              <span className="text-xs text-[var(--text-muted)] ml-auto">{getRelativeTime(event.timestamp)}</span>
            </div>

            <div className={`text-base font-medium ${isRetryWarn ? 'text-red-300 font-mono' : isRetrySuccess ? 'text-green-300' : 'text-[var(--text-primary)]'}`}>
              {isRetryWarn && event.metadata?.attempt ? `⚠ Attempt ${event.metadata.attempt} of 3 FAILED: ` : ''}
              {isRetrySuccess && event.metadata?.attempt ? `✅ Fixed on Attempt ${event.metadata.attempt}` : event.message}
            </div>

            {isContextAnalyst && event.metadata?.confidence && (
              <div className="mt-3 flex items-center gap-2">
                <span className={`px-2 py-1 rounded text-xs font-bold ${
                  event.metadata.confidence === 'HIGH' ? 'bg-green-900/50 text-green-300' :
                    event.metadata.confidence === 'MEDIUM' ? 'bg-amber-900/50 text-amber-300' :
                      'bg-red-900/50 text-red-300'
                }`}>
                  {event.metadata.confidence} CONFIDENCE
                </span>
                {event.metadata.affectedFiles && Array.isArray(event.metadata.affectedFiles) && event.metadata.affectedFiles.length > 0 && (
                  <span className="text-xs text-[var(--text-secondary)] font-mono">
                    Files: {event.metadata.affectedFiles.join(', ')}
                  </span>
                )}
              </div>
            )}

            {event.metadata && typeof event.metadata === 'object' && !isContextAnalyst && (
              <div className="mt-3 pt-3 border-t border-[var(--border-default)] border-dashed flex gap-4 text-sm text-[var(--text-secondary)] flex-wrap">
                {Object.entries(event.metadata).filter(([k]) => k !== 'attempt').map(([key, val]) => (
                  <span key={key}>{key}: <strong className="text-[var(--text-primary)]">{String(val)}</strong></span>
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
  const [toasts, setToasts] = useState<{ id: string, message: string, type: 'info' | 'success' | 'error' }[]>([]);
  const [expandedRows, setExpandedRows] = useState<Record<string, boolean>>({});

  const [scheduleRepo, setScheduleRepo] = useState('');
  const [scheduleTime, setScheduleTime] = useState('00:00');
  const [scheduleDayOfMonth, setScheduleDayOfMonth] = useState('*');
  const [scheduleMonth, setScheduleMonth] = useState('*');
  const [scheduleWeekday, setScheduleWeekday] = useState('*');
  const [showScheduleModal, setShowScheduleModal] = useState(false);
  const [searchFilter, setSearchFilter] = useState('');
  const [showHelpModal, setShowHelpModal] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [showGithubSettingToken, setShowGithubSettingToken] = useState(false);
  const [showGroqKey, setShowGroqKey] = useState(false);
  const [showWebhookSecret, setShowWebhookSecret] = useState(false);
  const [showLoginPat, setShowLoginPat] = useState(false);
  const [copiedWebhook, setCopiedWebhook] = useState(false);

  const pollInterval = useRef<number | null>(null);
  const duration = useRunDuration(currentRun);

  const addToast = (message: string, type: 'info' | 'success' | 'error' = 'info') => {
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

  const getScheduleHourMinute = () => {
    const [hour = '00', minute = '00'] = scheduleTime.includes(':') ? scheduleTime.split(':') : ['00', '00'];
    return { hour, minute };
  };

  const saveSchedule = async () => {
    if (!validateUrl(scheduleRepo)) {
      addToast('Invalid GitHub URL', 'error');
      return;
    }
    const { hour, minute } = getScheduleHourMinute();
    const cronExpression = `${minute} ${hour} ${scheduleDayOfMonth} ${scheduleMonth} ${scheduleWeekday}`;
    try {
      await fixstackApi.addSchedule(scheduleRepo, cronExpression);
      setShowScheduleModal(false);
      setScheduleRepo('');
      setScheduleTime('00:00');
      setScheduleDayOfMonth('*');
      setScheduleMonth('*');
      setScheduleWeekday('*');
      fetchData();
      addToast('Schedule saved', 'success');
    } catch (e) {
      addToast('Failed to save schedule', 'error');
    }
  };

  const deleteScan = async (runId: string) => {
    try {
      await fixstackApi.deleteScan(runId);
      setHistory(prev => prev.filter(scan => scan.runId !== runId));
      addToast('Completed scan deleted', 'info');
    } catch (e) {
      addToast('Failed to delete scan', 'error');
    }
  };

  const deleteSchedule = async (url: string) => {
    try {
      await fixstackApi.deleteSchedule(url);
      fetchData();
      addToast('Schedule deleted', 'info');
    } catch (e) {
      addToast('Failed to delete schedule', 'error');
    }
  };

  const runScheduleNow = async (url: string) => {
    try {
      await fixstackApi.runNowSchedule(url);
      addToast('Scheduled scan triggered immediately', 'success');
      setCurrentTab('history');
      setTimeout(fetchData, 1000);
    } catch (e) {
      addToast('Failed to trigger scan', 'error');
    }
  };

  const saveSettings = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await fixstackApi.saveSettings(settings.webhookUrl, settings.email, settings.githubToken, settings.groqApiKey, settings.webhookSecret);
      addToast('Settings saved successfully', 'success');
    } catch (e) {
      addToast('Failed to save settings', 'error');
    }
  };

  const testWebhook = async () => {
    try {
      await fixstackApi.testWebhook();
      addToast('Test webhook sent successfully', 'success');
    } catch (e: any) {
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
    if (s === 'CRITICAL') return 'bg-red-900/40 text-red-300 border-red-700';
    if (s === 'HIGH') return 'bg-orange-900/40 text-orange-300 border-orange-700';
    if (s === 'MEDIUM') return 'bg-yellow-900/40 text-yellow-300 border-yellow-700';
    return 'bg-blue-900/40 text-blue-300 border-blue-700';
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

  const tabs = [
    { id: 'dashboard', icon: LayoutDashboard, label: 'Dashboard' },
    { id: 'history', icon: History, label: 'History' },
    { id: 'schedules', icon: Calendar, label: 'Schedules' },
    { id: 'settings', icon: SettingsIcon, label: 'Settings' }
  ] as const;
  const scheduleParts = getScheduleHourMinute();

  if (!isAuthenticated) {
    return (
      <div className="min-h-screen text-[var(--text-primary)] bg-[radial-gradient(90%_70%_at_50%_0%,rgba(99,102,241,0.22),transparent_60%),var(--bg-base)] flex items-center justify-center p-4">
        <div className="w-full max-w-xl border border-[var(--border-default)] rounded-3xl bg-[color:rgba(17,17,24,0.85)] backdrop-blur-xl shadow-2xl p-8 md:p-10 animate-fade-in">
          <h1 className="text-4xl font-extrabold text-center mb-2 gradient-text flex items-center justify-center gap-2"><Shield className="text-[var(--accent-primary)]" size={30} /> FixStack</h1>
          <p className="text-[var(--text-secondary)] text-center mb-8">Autonomous dependency security for modern teams.</p>
          <form onSubmit={handleGithubLogin} className="space-y-5">
            <div className="relative">
              <Lock size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-[var(--text-muted)]" />
              <input
                type={showLoginPat ? 'text' : 'password'}
                value={githubToken}
                onChange={e => setGithubToken(e.target.value)}
                placeholder="GitHub Personal Access Token"
                className="w-full bg-[var(--bg-overlay)] border border-[var(--border-default)] rounded-xl pl-12 pr-12 py-3.5 focus:outline-none focus:ring-2 focus:ring-[var(--border-focus)] text-[var(--text-primary)] font-mono text-sm"
                autoFocus
              />
              <button type="button" onClick={() => setShowLoginPat(v => !v)} className="absolute right-3 top-1/2 -translate-y-1/2 p-2 text-[var(--text-secondary)] hover:text-[var(--text-primary)]">
                {showLoginPat ? <EyeOff size={16} /> : <Eye size={16} />}
              </button>
            </div>
            <button type="submit" disabled={isRepoLoading} className="w-full rounded-xl py-3.5 font-bold text-white bg-gradient-to-r from-indigo-500 via-violet-500 to-blue-500 hover:opacity-95 disabled:opacity-50 shadow-lg shadow-[var(--accent-glow)]">
              {isRepoLoading ? 'Connecting...' : 'Connect GitHub'}
            </button>
          </form>
          <div className="mt-6 flex flex-wrap justify-center gap-2">
            <span className="px-3 py-1 rounded-full text-xs border border-[var(--border-default)] bg-[var(--bg-overlay)] text-[var(--text-secondary)]">CVE Detection</span>
            <span className="px-3 py-1 rounded-full text-xs border border-[var(--border-default)] bg-[var(--bg-overlay)] text-[var(--text-secondary)]">AI Context</span>
            <span className="px-3 py-1 rounded-full text-xs border border-[var(--border-default)] bg-[var(--bg-overlay)] text-[var(--text-secondary)]">Auto PRs</span>
          </div>
          <p className="mt-5 text-xs text-center text-[var(--text-muted)]">
            Use a PAT with <span className="font-mono text-[var(--text-secondary)]">repo</span> scope.{' '}
            <a
              href="https://github.com/settings/personal-access-tokens/new"
              target="_blank"
              rel="noopener noreferrer"
              className="text-indigo-300 hover:text-indigo-200 underline"
            >
              Generate one here
            </a>.
          </p>
        </div>

        <div className="fixed top-6 right-6 z-[70] flex flex-col gap-2">
          {toasts.map(t => (
            <div key={t.id} className={`px-4 py-3 rounded-xl border shadow-xl text-sm font-medium flex items-center gap-2 animate-slide-up ${t.type === 'error' ? 'bg-red-950/95 border-red-700 text-red-200' : t.type === 'success' ? 'bg-green-950/95 border-green-700 text-green-200' : 'bg-[var(--bg-overlay)] border-[var(--border-default)] text-[var(--text-primary)]'}`}>
              {t.type === 'error' ? <AlertCircle size={16} /> : t.type === 'success' ? <CheckCircle2 size={16} /> : <Info size={16} />}
              {t.message}
            </div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[var(--bg-base)] text-[var(--text-primary)]">
      <div className="md:hidden sticky top-0 z-40 h-14 px-4 border-b border-[var(--border-subtle)] bg-[color:rgba(10,10,15,0.9)] backdrop-blur-xl flex items-center justify-between">
        <button onClick={() => setSidebarOpen(true)} className="p-2 rounded-lg border border-[var(--border-default)] bg-[var(--bg-overlay)]"><Menu size={18} /></button>
        <button onClick={() => { setCurrentRun(null); setCurrentTab('dashboard'); }} className="font-semibold gradient-text flex items-center gap-2"><Shield size={16} className="text-[var(--accent-primary)]" /> FixStack</button>
        <button onClick={handleLogout} className="text-[var(--text-secondary)]"><LogOut size={18} /></button>
      </div>

      {sidebarOpen && <button className="fixed inset-0 bg-black/60 z-40 md:hidden" onClick={() => setSidebarOpen(false)} aria-label="Close sidebar" />}

      <aside className={`fixed inset-y-0 left-0 z-50 md:z-30 border-r border-[var(--border-subtle)] bg-[var(--bg-elevated)] transition-transform duration-200 ${sidebarOpen ? 'translate-x-0' : '-translate-x-full'} md:translate-x-0 w-72 md:w-20 lg:w-72`}>
        <div className="h-full flex flex-col">
          <div className="h-16 px-4 border-b border-[var(--border-subtle)] flex items-center justify-between md:justify-center lg:justify-between">
            <button onClick={() => { setCurrentRun(null); setCurrentTab('dashboard'); setSidebarOpen(false); }} className="flex items-center gap-2 font-bold">
              <Shield size={18} className="text-[var(--accent-primary)]" />
              <span className="hidden lg:inline gradient-text">FixStack</span>
            </button>
            <button onClick={() => setSidebarOpen(false)} className="md:hidden text-[var(--text-secondary)]"><XCircle size={20} /></button>
          </div>

          <nav className="p-3 space-y-2 flex-1">
            {tabs.map(tab => (
              <button
                key={tab.id}
                onClick={() => { setCurrentTab(tab.id); setSidebarOpen(false); }}
                className={`w-full rounded-xl px-3 py-3 flex items-center gap-3 transition-all ${currentTab === tab.id ? 'bg-[var(--accent-glow)] border border-[var(--accent-primary)] text-[var(--text-primary)]' : 'border border-transparent text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-overlay)]'}`}
              >
                <tab.icon size={18} className="shrink-0" />
                <span className="md:hidden lg:inline">{tab.label}</span>
              </button>
            ))}
          </nav>

          <div className="p-3 border-t border-[var(--border-subtle)]">
            {currentRun?.status === 'RUNNING' && (
              <div className="mb-3 rounded-xl border border-green-700/50 bg-green-900/20 px-3 py-2 text-xs font-semibold text-green-300 flex items-center gap-2 md:justify-center lg:justify-start">
                <span className="w-2 h-2 rounded-full bg-green-400 animate-pulse" />
                <span className="md:hidden lg:inline">Scan Running</span>
              </div>
            )}
            <button onClick={handleLogout} className="w-full rounded-xl border border-[var(--border-default)] bg-[var(--bg-overlay)] hover:bg-[var(--bg-highlight)] px-3 py-2.5 text-[var(--text-secondary)] hover:text-[var(--text-primary)] flex items-center gap-2 md:justify-center lg:justify-start">
              <LogOut size={16} />
              <span className="md:hidden lg:inline">Disconnect GitHub</span>
            </button>
          </div>
        </div>
      </aside>

      <main className="md:ml-20 lg:ml-72 p-4 md:p-6 lg:p-8 animate-fade-in">
        {currentTab === 'dashboard' && (
          !currentRun ? (
            <div className="space-y-8">
              <section className="rounded-3xl border border-[var(--border-default)] bg-[radial-gradient(90%_100%_at_10%_0%,rgba(99,102,241,0.2),transparent_55%),var(--bg-elevated)] p-7 md:p-10">
                <h1 className="text-4xl md:text-5xl font-extrabold leading-tight max-w-3xl">See every dependency risk in real time, prioritize what matters, and ship fixes confidently.</h1>
                <p className="mt-3 text-[var(--text-secondary)] max-w-2xl">Scan repos, analyze exploitability with AI context, and ship remediation PRs with a single action.</p>
                <div className="mt-6 flex flex-wrap gap-2">
                  <span className="px-3 py-1 rounded-full text-xs border border-[var(--border-default)] bg-[var(--bg-overlay)] text-[var(--text-secondary)] flex items-center gap-1"><Search size={12} /> CVE scanner</span>
                  <span className="px-3 py-1 rounded-full text-xs border border-[var(--border-default)] bg-[var(--bg-overlay)] text-[var(--text-secondary)] flex items-center gap-1"><Brain size={12} /> Context-aware AI</span>
                  <span className="px-3 py-1 rounded-full text-xs border border-[var(--border-default)] bg-[var(--bg-overlay)] text-[var(--text-secondary)] flex items-center gap-1"><RefreshCw size={12} /> Self-correcting patches</span>
                </div>
              </section>

              <section className="grid xl:grid-cols-2 gap-6">
                <div className="rounded-2xl border border-[var(--border-default)] bg-[var(--bg-elevated)] p-6 space-y-4">
                  <h3 className="text-xl font-bold flex items-center gap-2"><Github size={20} /> Run repository scan</h3>
                  {githubRepos.length > 0 ? (
                    <>
                      <select
                        className="w-full rounded-xl border border-[var(--border-default)] bg-[var(--bg-overlay)] px-4 py-3 text-sm outline-none focus:ring-2 focus:ring-[var(--border-focus)]"
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
                      <button onClick={() => loginWithGithubToken(githubToken)} disabled={isRepoLoading} className="w-full rounded-xl border border-[var(--border-default)] bg-[var(--bg-overlay)] hover:bg-[var(--bg-highlight)] py-3 font-semibold flex items-center justify-center gap-2 disabled:opacity-50">
                        {isRepoLoading ? <Loader2 className="animate-spin" /> : <><RefreshCw size={16} /> Refresh repositories</>}
                      </button>
                    </>
                  ) : (
                    <div className="rounded-xl border border-[var(--border-default)] bg-[var(--bg-overlay)] p-4 text-sm text-[var(--text-secondary)]">No repositories found for this account.</div>
                  )}
                </div>

                <div className="rounded-2xl border border-[var(--border-default)] bg-[var(--bg-elevated)] p-6 space-y-4">
                  <h3 className="text-xl font-bold flex items-center gap-2"><Building size={20} /> Queue org scan</h3>
                  <input type="text" placeholder="Enter GitHub org (e.g. facebook)" value={orgName} onChange={(e) => { setOrgName(e.target.value); setError(null); }} disabled={isLoading} className="w-full rounded-xl border border-[var(--border-default)] bg-[var(--bg-overlay)] px-4 py-3 text-sm outline-none focus:ring-2 focus:ring-[var(--border-focus)]" />
                  <button onClick={startOrgScan} disabled={isLoading || !orgName} className="w-full rounded-xl py-3 font-semibold text-white bg-gradient-to-r from-violet-500 to-indigo-500 disabled:opacity-50 flex items-center justify-center gap-2">
                    {isLoading ? <Loader2 className="animate-spin" /> : <><Play size={16} /> Queue Organization Scan</>}
                  </button>
                </div>
              </section>

              <section className="rounded-2xl border border-[var(--border-default)] bg-[var(--bg-elevated)] p-6">
                <h3 className="text-xl font-bold mb-4">How it works</h3>
                <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
                  {[
                    { title: 'Fetch Deps', icon: Box },
                    { title: 'Scan CVEs', icon: Search },
                    { title: 'AI Analysis', icon: Brain },
                    { title: 'Open PR', icon: Github }
                  ].map((s, i) => (
                    <div key={i} className="rounded-xl border border-[var(--border-default)] bg-[var(--bg-overlay)] p-4">
                      <div className="w-10 h-10 rounded-lg bg-[var(--accent-glow)] border border-[var(--border-default)] flex items-center justify-center mb-3"><s.icon size={16} className="text-[var(--accent-primary)]" /></div>
                      <p className="font-semibold">{s.title}</p>
                    </div>
                  ))}
                </div>
              </section>

              {error && <div className="rounded-xl border border-red-700 bg-red-950/30 px-4 py-3 text-red-300">{error}</div>}

              <div className="max-w-md">
                <button onClick={() => startScan(true)} disabled={isLoading} className="w-full rounded-xl border border-[var(--accent-primary)] bg-[var(--accent-glow)] px-6 py-3.5 font-semibold text-[var(--text-primary)] hover:brightness-110 flex items-center justify-center gap-2">
                  <Zap size={18} /> Run Live Demo (lodash + axios CVEs)
                </button>
              </div>
            </div>
          ) : (
            <div className="space-y-6">
              <div className="sticky top-3 z-20 rounded-2xl border border-[var(--border-default)] bg-[color:rgba(17,17,24,0.92)] backdrop-blur-xl p-4 md:p-5">
                <div className="flex flex-wrap items-center justify-between gap-4">
                  <div className="flex flex-wrap gap-5">
                    <div>
                      <div className="text-[10px] uppercase tracking-[0.2em] text-[var(--text-muted)]">Repository</div>
                      <div className="font-semibold flex items-center gap-2"><Github size={14} /> {currentRun.input.repoName}</div>
                    </div>
                    <div>
                      <div className="text-[10px] uppercase tracking-[0.2em] text-[var(--text-muted)]">Run ID</div>
                      <div className="font-mono text-sm">{currentRun.id.substring(0, 8)}</div>
                    </div>
                    <div>
                      <div className="text-[10px] uppercase tracking-[0.2em] text-[var(--text-muted)]">Duration</div>
                      <div className="font-mono text-sm text-[var(--accent-primary)] flex items-center gap-1"><Clock size={12} /> {duration}s</div>
                    </div>
                  </div>
                  <span className={`px-3 py-1.5 rounded-lg text-xs font-bold uppercase border ${
                    currentRun.status === 'COMPLETED' ? 'bg-green-900/40 text-green-300 border-green-700' :
                      currentRun.status === 'FAILED' ? 'bg-red-900/40 text-red-300 border-red-700' :
                        currentRun.status === 'RUNNING' ? 'bg-indigo-900/40 text-indigo-300 border-indigo-700' :
                          'bg-[var(--bg-overlay)] text-[var(--text-secondary)] border-[var(--border-default)]'
                  }`}>
                    {currentRun.status}
                  </span>
                </div>
                <div className="mt-4 grid grid-cols-2 md:grid-cols-5 gap-2">
                  {scanSteps.map((step, i) => {
                    const currentStep = getScanStep();
                    const isActive = i === currentStep && currentRun.status !== 'COMPLETED';
                    const isDone = i < currentStep || currentRun.status === 'COMPLETED';
                    return (
                      <div key={step} className={`rounded-lg border px-3 py-2 text-center text-xs ${isDone ? 'border-indigo-500/50 bg-indigo-500/10 text-indigo-200' : isActive ? 'border-[var(--accent-primary)] bg-[var(--accent-glow)] text-[var(--text-primary)]' : 'border-[var(--border-default)] bg-[var(--bg-overlay)] text-[var(--text-secondary)]'}`}>
                        <div className="mb-1 font-semibold">{isDone ? <Check size={14} className="inline" /> : i + 1}</div>
                        {step}
                      </div>
                    );
                  })}
                </div>
              </div>

              <div className="rounded-2xl border border-[var(--border-default)] bg-[var(--bg-elevated)] p-5 md:p-6">
                <h2 className="text-xl font-bold mb-6 flex items-center gap-2"><Activity className="text-[var(--accent-primary)]" size={18} /> Live Agent Timeline</h2>
                <div className="border-l-2 border-[var(--border-default)] pl-8 ml-3">
                  {events.length === 0 && currentRun.status === 'PENDING' ? (
                    <div className="space-y-4 animate-pulse">
                      <div className="h-20 rounded-xl bg-[var(--bg-overlay)] border border-[var(--border-default)]" />
                      <div className="h-20 rounded-xl bg-[var(--bg-overlay)] border border-[var(--border-default)]" />
                    </div>
                  ) : (
                    events.map(event => <TimelineEventCard key={event.id} event={event} run={currentRun!} />)
                  )}
                  {currentRun.status === 'RUNNING' && (
                    <div className="relative mb-6 flex items-start">
                      <div className="absolute -left-[1.3rem] top-4 bg-[var(--bg-base)] p-1 rounded-full flex items-center justify-center z-10">
                        <Loader2 size={18} className="animate-spin text-[var(--accent-primary)]" />
                      </div>
                      <div className="flex-1 p-4 ml-6 italic text-[var(--text-secondary)] flex items-center gap-2">
                        Agents are working <span className="flex gap-1"><span className="animate-bounce">.</span><span className="animate-bounce delay-75">.</span><span className="animate-bounce delay-150">.</span></span>
                      </div>
                    </div>
                  )}
                </div>
              </div>

              {currentRun.status === 'COMPLETED' && (
                <div className="space-y-6 animate-slide-up">
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    <div className="rounded-2xl border border-[var(--border-default)] bg-[var(--bg-elevated)] p-5 text-center">
                      <div className="text-4xl font-bold"><AnimatedNumber value={currentRun.vulnerabilities.length} /></div>
                      <div className="text-xs text-[var(--text-muted)] uppercase">Vulns Found</div>
                    </div>
                    <div className="rounded-2xl border border-green-700/50 bg-green-900/15 p-5 text-center">
                      <div className="text-4xl font-bold text-green-300"><AnimatedNumber value={currentRun.remediations.filter(r => r.status === 'FIXED').length} /></div>
                      <div className="text-xs text-green-200 uppercase">Fixed</div>
                    </div>
                    <div className="rounded-2xl border border-red-700/50 bg-red-900/15 p-5 text-center">
                      <div className="text-4xl font-bold text-red-300"><AnimatedNumber value={currentRun.remediations.filter(r => r.status === 'FAILED').length} /></div>
                      <div className="text-xs text-red-200 uppercase">Failed</div>
                    </div>
                    <div className="rounded-2xl border border-[var(--border-default)] bg-[var(--bg-elevated)] p-5 text-center">
                      <div className="text-4xl font-bold text-indigo-300"><AnimatedNumber value={duration} />s</div>
                      <div className="text-xs text-[var(--text-muted)] uppercase">Duration</div>
                    </div>
                  </div>

                  {currentRun.vulnerabilities.length > 0 && (
                    <div className="rounded-2xl border border-[var(--border-default)] bg-[var(--bg-elevated)] p-5 overflow-x-auto">
                      <h3 className="text-lg font-bold mb-4 flex items-center gap-2"><Shield size={20} className="text-red-300" /> Vulnerabilities Discovered</h3>
                      <table className="w-full text-left border-collapse text-sm">
                        <thead>
                          <tr className="border-b border-[var(--border-default)] text-[var(--text-secondary)] uppercase text-xs">
                            <th className="py-3 px-3">Package</th>
                            <th className="py-3 px-3">Severity</th>
                            <th className="py-3 px-3">Source</th>
                            <th className="py-3 px-3">Context</th>
                            <th className="py-3 px-3">Description</th>
                          </tr>
                        </thead>
                        <tbody>
                          {currentRun.vulnerabilities.map(v => (
                            <React.Fragment key={v.id}>
                              <tr className={`border-b border-[var(--border-subtle)] hover:bg-[var(--bg-overlay)] cursor-pointer ${expandedRows[v.id] ? 'bg-[var(--bg-overlay)]' : ''}`} onClick={() => toggleRow(v.id)}>
                                <td className="py-4 px-3">
                                  <div className="font-semibold">{v.pkgName}</div>
                                  <div className="font-mono text-xs text-[var(--text-secondary)]">{v.pkgVersion} • {v.ecosystem || currentRun.input.ecosystem}</div>
                                </td>
                                <td className="py-4 px-3">
                                  <span className={`px-3 py-1 rounded-md text-xs font-bold border flex items-center w-max ${getSeverityBadge(v.severity)}`}>
                                    {getSeverityIcon(v.severity)} {v.severity}
                                  </span>
                                </td>
                                <td className="py-4 px-3"><span className="px-2 py-1 rounded-md text-xs font-mono bg-[var(--bg-overlay)] border border-[var(--border-default)]">OSV.dev</span></td>
                                <td className="py-4 px-3">
                                  {(v as any).contextNote || (v as any).affectedFiles ? (
                                    <div className="flex items-center gap-2 text-indigo-300" title={(v as any).contextNote || 'Context analyzed'}>
                                      <Brain size={16} />
                                      <span className="text-xs font-bold">{(v as any).affectedFiles?.length || 1} files</span>
                                    </div>
                                  ) : (
                                    <span className="text-[var(--text-muted)] text-xs">—</span>
                                  )}
                                </td>
                                <td className="py-4 px-3">
                                  <div className="max-w-md truncate pr-4">{v.description}</div>
                                  <div className="text-xs text-indigo-300 mt-1">Click to expand</div>
                                </td>
                              </tr>
                              {expandedRows[v.id] && (
                                <tr className="bg-[var(--bg-overlay)] border-b border-[var(--border-subtle)]">
                                  <td colSpan={5} className="p-5">
                                    <div className="space-y-3">
                                      <div>
                                        <h4 className="text-xs uppercase text-[var(--text-muted)] mb-2">Full Description</h4>
                                        <p className="text-sm leading-relaxed bg-[var(--bg-raised)] border border-[var(--border-default)] rounded-lg p-4">{v.description}</p>
                                      </div>
                                      <div className="flex gap-4 flex-wrap">
                                        <div className="bg-[var(--bg-raised)] border border-[var(--border-default)] rounded-lg p-3 min-w-[220px]">
                                          <div className="text-xs text-[var(--text-muted)] uppercase mb-1">CVE ID</div>
                                          <div className="font-mono text-sm">{v.cveId}</div>
                                        </div>
                                        {(v as any).contextNote && (
                                          <div className="bg-indigo-900/20 border border-indigo-700/50 rounded-lg p-3 flex-1 min-w-[220px]">
                                            <div className="text-xs text-indigo-300 uppercase mb-1 flex items-center gap-1"><Brain size={12} /> AI Context Analysis</div>
                                            <div className="text-sm text-indigo-100">{(v as any).contextNote}</div>
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
                    <div className="rounded-2xl border border-[var(--border-default)] bg-[var(--bg-elevated)] p-5 overflow-x-auto">
                      <h3 className="text-lg font-bold mb-4 flex items-center gap-2"><RefreshCw size={20} className="text-green-300" /> Remediations Applied</h3>
                      <table className="w-full text-left border-collapse text-sm">
                        <thead>
                          <tr className="border-b border-[var(--border-default)] text-[var(--text-secondary)] uppercase text-xs">
                            <th className="py-3 px-3">Package</th>
                            <th className="py-3 px-3">Version Update</th>
                            <th className="py-3 px-3">Resolution</th>
                            <th className="py-3 px-3 text-right">Status</th>
                          </tr>
                        </thead>
                        <tbody>
                          {currentRun.remediations.map((r, i) => (
                            <tr key={i} className="border-b border-[var(--border-subtle)] hover:bg-[var(--bg-overlay)]">
                              <td className="py-4 px-3 font-semibold">{r.pkgName}</td>
                              <td className="py-4 px-3">
                                <div className="flex items-center gap-3 font-mono text-sm">
                                  <span className="text-red-300 line-through">{r.oldVersion}</span>
                                  <ArrowRight size={14} className="text-[var(--text-muted)]" />
                                  <span className={r.status === 'FIXED' ? 'text-green-300 font-bold bg-green-900/30 px-2 py-0.5 rounded' : 'text-[var(--text-secondary)]'}>{r.newVersion}</span>
                                </div>
                              </td>
                              <td className="py-4 px-3">
                                <div className="flex items-center gap-2">
                                  <div className="flex gap-1">
                                    {Array.from({ length: Math.max(1, r.attempts || 1) }).map((_, idx) => (
                                      <div key={idx} className={`w-3 h-3 rounded-full ${r.status === 'FIXED' && idx === (r.attempts || 1) - 1 ? 'bg-green-500' : 'bg-red-500'}`} title={`Attempt ${idx + 1}`}></div>
                                    ))}
                                  </div>
                                  {(r.attempts || 0) > 1 && r.status === 'FIXED' && (
                                    <span className="bg-amber-900/50 text-amber-200 border border-amber-700 text-[10px] px-2 py-0.5 rounded font-bold uppercase">Self-Corrected</span>
                                  )}
                                </div>
                              </td>
                              <td className="py-4 px-3 text-right">
                                <span className={`px-3 py-1.5 rounded-md text-xs font-bold border inline-block ${r.status === 'FIXED' ? 'bg-green-900/40 text-green-300 border-green-700' : 'bg-red-900/40 text-red-300 border-red-700'}`}>
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
                <div className="rounded-2xl border border-red-700 bg-red-950/40 p-8 text-center">
                  <AlertTriangle size={44} className="text-red-400 mx-auto mb-3" />
                  <h3 className="text-red-300 text-2xl font-bold mb-2">Workflow Failed</h3>
                  <p className="text-red-200">The autonomous remediation encountered a critical error during execution. Check the timeline above for details.</p>
                </div>
              )}

              <div className="text-center pt-4 pb-8">
                <button onClick={() => { setCurrentRun(null); setRepoUrl(''); }} className="rounded-xl border border-[var(--border-default)] bg-[var(--bg-overlay)] hover:bg-[var(--bg-highlight)] px-8 py-3 font-semibold inline-flex items-center gap-2">
                  <RefreshCw size={16} /> Start Another Scan
                </button>
              </div>
            </div>
          )
        )}

        {currentTab === 'history' && (
          <div className="space-y-5">
            <div className="rounded-2xl border border-[var(--border-default)] bg-[var(--bg-elevated)] p-5 flex flex-col lg:flex-row justify-between gap-4 lg:items-center">
              <h2 className="text-2xl font-bold flex items-center gap-2"><History className="text-[var(--accent-primary)]" size={20} /> Scan History</h2>
              <div className="flex flex-wrap gap-3">
                <div className="relative">
                  <Search size={16} className="absolute left-3 top-2.5 text-[var(--text-muted)]" />
                  <input
                    type="text"
                    placeholder="Search repo..."
                    value={searchFilter}
                    onChange={(e) => setSearchFilter(e.target.value)}
                    className="w-64 rounded-xl border border-[var(--border-default)] bg-[var(--bg-overlay)] pl-9 pr-4 py-2 text-sm outline-none focus:ring-2 focus:ring-[var(--border-focus)]"
                  />
                </div>
                <button onClick={clearHistory} className="rounded-xl border border-[var(--border-default)] bg-[var(--bg-overlay)] hover:border-red-700 hover:text-red-200 px-4 py-2 text-sm flex items-center gap-2">
                  <Trash2 size={14} /> Clear
                </button>
              </div>
            </div>

            <div className="grid gap-3">
              {history.filter(s => s.repo?.toLowerCase().includes(searchFilter.toLowerCase())).length === 0 ?
                <div className="text-center py-16 rounded-2xl border border-dashed border-[var(--border-default)] bg-[var(--bg-elevated)]">
                  <History size={44} className="text-[var(--text-muted)] mx-auto mb-3" />
                  <p className="text-[var(--text-secondary)]">No scan history found.</p>
                </div> :
                history.filter(s => s.repo?.toLowerCase().includes(searchFilter.toLowerCase())).map((scan: any) => (
                  <div key={scan.id} onClick={() => loadRun(scan.runId)} className="rounded-2xl border border-[var(--border-default)] hover:border-[var(--accent-primary)] bg-[var(--bg-elevated)] p-4 md:p-5 cursor-pointer transition-colors flex flex-col md:flex-row md:items-center justify-between gap-3">
                    <div className="space-y-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        <Github size={17} className="text-[var(--text-secondary)]" />
                        <div className="font-semibold">{scan.repo}</div>
                        <span className="px-2 py-0.5 rounded-md text-[10px] font-mono border border-[var(--border-default)] bg-[var(--bg-overlay)] text-[var(--text-secondary)] uppercase">{scan.ecosystem || 'NPM'}</span>
                      </div>
                      <div className="text-xs text-[var(--text-secondary)] font-mono flex flex-wrap items-center gap-2">
                        <span>{new Date(scan.createdAt).toLocaleString()}</span>
                        <span className="text-[var(--text-muted)]">•</span>
                        <span className="flex gap-2">
                          {scan.vulnerabilities?.filter((v: any) => v.severity === 'CRITICAL').length > 0 && <span className="text-red-300 flex items-center gap-1"><Skull size={12} /> {scan.vulnerabilities.filter((v: any) => v.severity === 'CRITICAL').length}</span>}
                          {scan.vulnerabilities?.filter((v: any) => v.severity === 'HIGH').length > 0 && <span className="text-orange-300 flex items-center gap-1"><Flame size={12} /> {scan.vulnerabilities.filter((v: any) => v.severity === 'HIGH').length}</span>}
                          {scan.vulnerabilities?.filter((v: any) => v.severity === 'MEDIUM').length > 0 && <span className="text-yellow-300 flex items-center gap-1"><AlertTriangle size={12} /> {scan.vulnerabilities.filter((v: any) => v.severity === 'MEDIUM').length}</span>}
                          {(!scan.vulnerabilities || scan.vulnerabilities.length === 0) && <span>0 Vulns</span>}
                        </span>
                        <span className="text-[var(--text-muted)]">•</span>
                        <span className="text-green-300 font-bold">{scan.fixedCount} Fixed</span>
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      {scan.status === 'COMPLETED' && (
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            deleteScan(scan.runId);
                          }}
                          className="rounded-lg border border-[var(--border-default)] bg-[var(--bg-overlay)] hover:border-red-700 hover:text-red-200 px-3 py-1.5 text-xs font-semibold flex items-center gap-1"
                          title="Delete completed scan"
                        >
                          <Trash2 size={12} /> Delete
                        </button>
                      )}
                      {scan.prUrl && (
                        <span className="bg-green-900/30 text-green-300 border border-green-700 px-2.5 py-1 rounded-full text-xs font-semibold flex items-center gap-1.5">
                          <CheckCircle2 size={12} /> PR Opened
                        </span>
                      )}
                      <span className={`px-3 py-1.5 rounded-lg text-xs font-bold uppercase border ${scan.status === 'COMPLETED' ? 'bg-green-900/30 text-green-300 border-green-700' : scan.status === 'FAILED' ? 'bg-red-900/30 text-red-300 border-red-700' : 'bg-indigo-900/30 text-indigo-300 border-indigo-700'}`}>
                        {scan.status}
                      </span>
                      <div className="w-9 h-9 rounded-full border border-[var(--border-default)] bg-[var(--bg-overlay)] flex items-center justify-center">
                        <ArrowRight size={16} className="text-[var(--text-secondary)]" />
                      </div>
                    </div>
                  </div>
                ))}
            </div>
          </div>
        )}

        {currentTab === 'schedules' && (
          <div className="space-y-6">
            <div className="rounded-2xl border border-[var(--border-default)] bg-[var(--bg-elevated)] p-5 flex flex-col lg:flex-row justify-between lg:items-center gap-4">
              <div>
                <h2 className="text-2xl font-bold flex items-center gap-2"><Calendar className="text-[var(--accent-primary)]" size={20} /> Scheduled Scans</h2>
                <p className="text-sm text-[var(--text-secondary)] mt-1">Automate vulnerability checks with cron schedules.</p>
              </div>
              <button onClick={() => setShowScheduleModal(true)} className="rounded-xl bg-gradient-to-r from-indigo-500 to-blue-500 px-5 py-2.5 text-sm font-semibold text-white flex items-center gap-2">
                <Calendar size={16} /> Add Schedule
              </button>
            </div>

            {showScheduleModal && (
              <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4">
                <div className="w-full max-w-md rounded-2xl border border-[var(--border-default)] bg-[var(--bg-elevated)] p-6 animate-slide-up">
                  <div className="flex items-center justify-between mb-5">
                    <h3 className="text-xl font-bold">New Schedule</h3>
                    <button onClick={() => setShowScheduleModal(false)} className="text-[var(--text-secondary)] hover:text-[var(--text-primary)]"><XCircle size={22} /></button>
                  </div>
                  <div className="space-y-4">
                    <div>
                      <label className="block text-sm font-semibold text-[var(--text-secondary)] mb-2">GitHub Repo URL</label>
                      <div className="relative">
                        <Github size={16} className="absolute left-3 top-3.5 text-[var(--text-muted)]" />
                        <input type="text" value={scheduleRepo} onChange={e => setScheduleRepo(e.target.value)} className="w-full rounded-xl border border-[var(--border-default)] bg-[var(--bg-overlay)] pl-9 pr-4 py-3 text-sm outline-none focus:ring-2 focus:ring-[var(--border-focus)]" placeholder="https://github.com/facebook/react" />
                      </div>
                    </div>
                    <div>
                      <label className="block text-sm font-semibold text-[var(--text-secondary)] mb-2">Schedule Configuration</label>
                      <div className="grid grid-cols-2 gap-3">
                        <div>
                          <label className="block text-xs text-[var(--text-secondary)] mb-1">Time</label>
                          <input type="time" value={scheduleTime} onChange={e => setScheduleTime(e.target.value)} className="w-full rounded-xl border border-[var(--border-default)] bg-[var(--bg-overlay)] px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-[var(--border-focus)]" />
                        </div>
                        <div>
                          <label className="block text-xs text-[var(--text-secondary)] mb-1">Weekday</label>
                          <select value={scheduleWeekday} onChange={e => setScheduleWeekday(e.target.value)} className="w-full rounded-xl border border-[var(--border-default)] bg-[var(--bg-overlay)] px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-[var(--border-focus)]">
                            <option value="*">Any</option>
                            <option value="0">Sunday</option>
                            <option value="1">Monday</option>
                            <option value="2">Tuesday</option>
                            <option value="3">Wednesday</option>
                            <option value="4">Thursday</option>
                            <option value="5">Friday</option>
                            <option value="6">Saturday</option>
                          </select>
                        </div>
                        <div>
                          <label className="block text-xs text-[var(--text-secondary)] mb-1">Day of Month</label>
                          <input type="text" value={scheduleDayOfMonth} onChange={e => setScheduleDayOfMonth(e.target.value || '*')} className="w-full rounded-xl border border-[var(--border-default)] bg-[var(--bg-overlay)] px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-[var(--border-focus)]" placeholder="* or 1-31" />
                        </div>
                        <div>
                          <label className="block text-xs text-[var(--text-secondary)] mb-1">Month</label>
                          <input type="text" value={scheduleMonth} onChange={e => setScheduleMonth(e.target.value || '*')} className="w-full rounded-xl border border-[var(--border-default)] bg-[var(--bg-overlay)] px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-[var(--border-focus)]" placeholder="* or 1-12" />
                        </div>
                      </div>
                      <p className="mt-2 text-xs text-[var(--text-secondary)] font-mono">
                        Cron preview: {scheduleParts.minute} {scheduleParts.hour} {scheduleDayOfMonth} {scheduleMonth} {scheduleWeekday}
                      </p>
                    </div>
                    <div className="pt-2 flex gap-3">
                      <button onClick={() => setShowScheduleModal(false)} className="flex-1 rounded-xl border border-[var(--border-default)] bg-[var(--bg-overlay)] py-2.5">Cancel</button>
                      <button onClick={saveSchedule} className="flex-1 rounded-xl bg-gradient-to-r from-indigo-500 to-blue-500 text-white py-2.5 font-semibold">Create</button>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {schedules.length === 0 ? (
              <div className="text-center py-16 rounded-2xl border border-dashed border-[var(--border-default)] bg-[var(--bg-elevated)]">
                <Calendar size={54} className="text-[var(--text-muted)] mx-auto mb-3" />
                <h3 className="text-xl font-bold mb-1">No active schedules</h3>
                <p className="text-[var(--text-secondary)]">Set up a schedule to continuously monitor your repositories.</p>
              </div>
            ) : (
              <div className="grid md:grid-cols-2 gap-4">
                {schedules.map(s => (
                  <div key={s.repo} className="rounded-2xl border border-[var(--border-default)] bg-[var(--bg-elevated)] p-5 relative">
                    <button onClick={() => deleteSchedule(s.repo)} className="absolute top-4 right-4 p-2 rounded-full border border-[var(--border-default)] bg-[var(--bg-overlay)] text-[var(--text-secondary)] hover:text-red-300" title="Delete Schedule"><Trash2 size={15} /></button>
                    <div className="font-semibold text-lg mb-4 pr-12 flex items-center gap-2 truncate">
                      <Github size={18} className="text-[var(--text-secondary)] shrink-0" /> {s.repo.replace('https://github.com/', '')}
                    </div>
                    <div className="rounded-xl border border-[var(--border-default)] bg-[var(--bg-overlay)] p-4 space-y-2 mb-4 text-sm">
                      <div className="flex justify-between"><span className="text-[var(--text-secondary)]">Frequency</span><span className="font-semibold">{formatCron(s.cronExpression)}</span></div>
                      <div className="flex justify-between"><span className="text-[var(--text-secondary)]">Cron</span><span className="font-mono text-xs">{s.cronExpression}</span></div>
                      <div className="pt-1 text-indigo-300 flex items-center gap-1"><Clock size={13} /> {calculateNextRun(s.cronExpression)}</div>
                    </div>
                    <button onClick={() => runScheduleNow(s.repo)} className="w-full rounded-xl border border-[var(--border-default)] bg-[var(--bg-overlay)] hover:bg-[var(--bg-highlight)] py-2.5 font-semibold flex items-center justify-center gap-2">
                      <PlayCircle size={16} /> Run Now
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {currentTab === 'settings' && (
          <div className="max-w-4xl space-y-6">
            <div>
              <h2 className="text-3xl font-bold flex items-center gap-2"><SettingsIcon className="text-[var(--accent-primary)]" size={26} /> Settings</h2>
              <p className="text-[var(--text-secondary)] mt-1">Manage tokens, AI keys, notifications, and integration endpoints.</p>
            </div>

            <form onSubmit={saveSettings} className="space-y-5">
              <div className="rounded-2xl border border-[var(--border-default)] bg-[var(--bg-elevated)] p-5">
                <h3 className="font-semibold mb-3">GitHub Token</h3>
                <div className="relative">
                  <input type={showGithubSettingToken ? 'text' : 'password'} value={settings.githubToken || ''} onChange={e => setSettings({ ...settings, githubToken: e.target.value })} className="w-full rounded-xl border border-[var(--border-default)] bg-[var(--bg-overlay)] px-4 py-3 pr-11 font-mono text-sm outline-none focus:ring-2 focus:ring-[var(--border-focus)]" placeholder="ghp_xxxxxxxxxxxxxxxxxxxx" />
                  <button type="button" onClick={() => setShowGithubSettingToken(v => !v)} className="absolute right-2 top-2 p-2 text-[var(--text-secondary)]">{showGithubSettingToken ? <EyeOff size={16} /> : <Eye size={16} />}</button>
                </div>
              </div>

              <div className="rounded-2xl border border-[var(--border-default)] bg-[var(--bg-elevated)] p-5">
                <h3 className="font-semibold mb-3">Groq Key</h3>
                <div className="relative">
                  <input type={showGroqKey ? 'text' : 'password'} value={settings.groqApiKey || ''} onChange={e => setSettings({ ...settings, groqApiKey: e.target.value })} className="w-full rounded-xl border border-[var(--border-default)] bg-[var(--bg-overlay)] px-4 py-3 pr-11 font-mono text-sm outline-none focus:ring-2 focus:ring-[var(--border-focus)]" placeholder="gsk_xxxxxxxxxxxxxxxxxxxx" />
                  <button type="button" onClick={() => setShowGroqKey(v => !v)} className="absolute right-2 top-2 p-2 text-[var(--text-secondary)]">{showGroqKey ? <EyeOff size={16} /> : <Eye size={16} />}</button>
                </div>
              </div>

              <div className="rounded-2xl border border-[var(--border-default)] bg-[var(--bg-elevated)] p-5">
                <h3 className="font-semibold mb-3">Webhook URL</h3>
                <input type="url" value={settings.webhookUrl || ''} onChange={e => setSettings({ ...settings, webhookUrl: e.target.value })} className="w-full rounded-xl border border-[var(--border-default)] bg-[var(--bg-overlay)] px-4 py-3 text-sm outline-none focus:ring-2 focus:ring-[var(--border-focus)]" placeholder="https://hooks.slack.com/services/..." />
              </div>

              <div className="rounded-2xl border border-[var(--border-default)] bg-[var(--bg-elevated)] p-5">
                <h3 className="font-semibold mb-3">Webhook Secret</h3>
                <div className="relative">
                  <input type={showWebhookSecret ? 'text' : 'password'} value={settings.webhookSecret || ''} onChange={e => setSettings({ ...settings, webhookSecret: e.target.value })} className="w-full rounded-xl border border-[var(--border-default)] bg-[var(--bg-overlay)] px-4 py-3 pr-11 text-sm outline-none focus:ring-2 focus:ring-[var(--border-focus)]" placeholder="Optional secret for signature verification" />
                  <button type="button" onClick={() => setShowWebhookSecret(v => !v)} className="absolute right-2 top-2 p-2 text-[var(--text-secondary)]">{showWebhookSecret ? <EyeOff size={16} /> : <Eye size={16} />}</button>
                </div>
              </div>

              <div className="rounded-2xl border border-[var(--border-default)] bg-[var(--bg-elevated)] p-5">
                <h3 className="font-semibold mb-3">Email</h3>
                <input type="email" value={settings.email || ''} onChange={e => setSettings({ ...settings, email: e.target.value })} className="w-full rounded-xl border border-[var(--border-default)] bg-[var(--bg-overlay)] px-4 py-3 text-sm outline-none focus:ring-2 focus:ring-[var(--border-focus)]" placeholder="security@company.com" />
              </div>

              <div className="rounded-2xl border border-indigo-700/40 bg-indigo-900/10 p-5">
                <h3 className="font-semibold mb-3 flex items-center gap-2"><Github size={16} /> GitHub App Webhook Endpoint</h3>
                <div className="flex flex-col sm:flex-row gap-2 items-stretch">
                  <code className="flex-1 rounded-xl border border-[var(--border-default)] bg-[var(--bg-overlay)] px-4 py-3 text-sm font-mono overflow-x-auto">https://fixstack-backend.onrender.com/api/webhook</code>
                  <button
                    type="button"
                    onClick={() => {
                      navigator.clipboard.writeText('https://fixstack-backend.onrender.com/api/webhook');
                      setCopiedWebhook(true);
                      addToast('Copied to clipboard', 'success');
                      setTimeout(() => setCopiedWebhook(false), 2000);
                    }}
                    className="rounded-xl border border-[var(--border-default)] bg-[var(--bg-overlay)] px-4 py-3 text-sm font-semibold flex items-center justify-center gap-2 min-w-[120px]"
                  >
                    <Copy size={14} /> {copiedWebhook ? 'Copied ✓' : 'Copy'}
                  </button>
                </div>
                <div className="mt-4 flex flex-wrap justify-end gap-2">
                  <button type="button" onClick={testWebhook} className="rounded-xl border border-[var(--border-default)] bg-[var(--bg-overlay)] px-4 py-2.5 text-sm font-semibold flex items-center gap-2"><Zap size={14} /> Test Webhook</button>
                  <button type="submit" className="rounded-xl bg-gradient-to-r from-indigo-500 to-blue-500 px-6 py-2.5 text-sm font-semibold text-white flex items-center gap-2"><CheckCircle2 size={16} /> Save Settings</button>
                </div>
              </div>
            </form>
          </div>
        )}
      </main>

      <button
        onClick={() => setShowHelpModal(true)}
        className="fixed bottom-6 right-6 w-14 h-14 rounded-full bg-gradient-to-r from-indigo-500 to-blue-500 text-white shadow-2xl shadow-[var(--accent-glow)] flex items-center justify-center z-40 hover:scale-105 transition-transform"
      >
        <span className="font-bold text-xl">?</span>
      </button>

      {showHelpModal && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 p-4 flex items-center justify-center">
          <div className="w-full max-w-2xl rounded-2xl border border-[var(--border-default)] bg-[var(--bg-elevated)] p-7 relative animate-slide-up">
            <button onClick={() => setShowHelpModal(false)} className="absolute top-4 right-4 text-[var(--text-secondary)] hover:text-[var(--text-primary)]"><XCircle size={24} /></button>
            <h3 className="text-2xl font-bold mb-6 flex items-center gap-2"><Info className="text-[var(--accent-primary)]" /> How to setup GitHub App Webhook</h3>
            <div className="space-y-4 text-[var(--text-secondary)] text-sm leading-relaxed">
              <p>To have FixStack automatically scan your repositories on every push or Pull Request, you need to configure a GitHub Webhook.</p>
              <ol className="list-decimal pl-5 space-y-2">
                <li>Go to your GitHub Repository (or Organization) Settings {'>'} Webhooks {'>'} Add webhook.</li>
                <li>Set the <strong>Payload URL</strong> to: <code className="bg-[var(--bg-overlay)] px-2 py-1 rounded border border-[var(--border-default)] text-indigo-300 mx-1">https://fixstack-backend.onrender.com/api/webhook</code></li>
                <li>Set <strong>Content type</strong> to <code className="bg-[var(--bg-overlay)] px-2 py-1 rounded">application/json</code>.</li>
                <li>In the <strong>Secret</strong> field, enter the <em>Webhook Secret</em> you configured in the Settings tab.</li>
                <li>Under "Which events would you like to trigger this webhook?", select <strong>Let me select individual events</strong>.</li>
                <li>Check the boxes for <strong>Pushes</strong> and <strong>Pull requests</strong>.</li>
                <li>Ensure the webhook is <strong>Active</strong> and click <strong>Add webhook</strong>.</li>
              </ol>
              <div className="mt-4 rounded-xl border border-indigo-700/50 bg-indigo-900/20 p-4 text-indigo-100">
                <p className="font-bold mb-1">Important Note:</p>
                <p>FixStack will ignore pushes that do not modify dependency files (like package.json or go.mod) to save resources.</p>
              </div>
            </div>
          </div>
        </div>
      )}

      <div className="fixed top-6 right-6 z-[70] flex flex-col gap-2 pointer-events-none">
        {toasts.map(t => (
          <div key={t.id} className={`px-4 py-3 rounded-xl border shadow-xl text-sm font-medium flex items-center gap-2 animate-slide-up pointer-events-auto ${t.type === 'error' ? 'bg-red-950/95 border-red-700 text-red-200' : t.type === 'success' ? 'bg-green-950/95 border-green-700 text-green-200' : 'bg-[var(--bg-overlay)] border-[var(--border-default)] text-[var(--text-primary)]'}`}>
            {t.type === 'error' ? <AlertCircle size={16} /> : t.type === 'success' ? <CheckCircle2 size={16} /> : <Info size={16} />}
            {t.message}
          </div>
        ))}
      </div>
    </div>
  );
}
