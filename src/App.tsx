import React, { useState, useEffect, useRef } from 'react';
import { fixstackApi } from './api';
import { Run, RunEvent } from './types';
import {
  Shield, Play, Loader2, CheckCircle2, AlertCircle, Clock, History, GitBranch as Github,
  ArrowRight, Activity, Box, XCircle, LogOut, Settings as SettingsIcon,
  Calendar, Building, Bell, LayoutDashboard, Brain, Flame, Info, Search,
  Trash2, Copy, PlayCircle, Zap, Check, Skull, AlertTriangle, RefreshCw, Menu, Lock, Eye, EyeOff,
  ChevronRight, Terminal, Sparkles, Shield as ShieldIcon
} from 'lucide-react';

// ─── Hooks ────────────────────────────────────────────────────────────────────

const useRunDuration = (run: Run | null) => {
  const [duration, setDuration] = useState<number>(0);
  useEffect(() => {
    if (!run) { setDuration(0); return; }
    if (run.status === 'COMPLETED' || run.status === 'FAILED') {
      const end = run.endTime ? new Date(run.endTime).getTime() : Date.now();
      setDuration(Math.floor((end - new Date(run.startTime).getTime()) / 1000));
      return;
    }
    const start = new Date(run.startTime).getTime();
    const iv = setInterval(() => setDuration(Math.floor((Date.now() - start) / 1000)), 1000);
    return () => clearInterval(iv);
  }, [run]);
  return duration;
};

// ─── Sub-components ───────────────────────────────────────────────────────────

const AnimatedNumber = ({ value }: { value: number }) => {
  const [disp, setDisp] = useState(0);
  useEffect(() => {
    let start = 0;
    if (start === value) { setDisp(value); return; }
    const steps = 1000 / 30;
    const inc = value / steps;
    const t = setInterval(() => {
      start += inc;
      if (start >= value) { clearInterval(t); setDisp(value); }
      else setDisp(Math.floor(start));
    }, 30);
    return () => clearInterval(t);
  }, [value]);
  return <span>{disp}</span>;
};

type GithubRepo = { id: number; full_name: string; html_url: string; private: boolean };

const AGENT_META: Record<string, { initials: string; bg: string }> = {
  'Repo Scanner':      { initials: 'RS', bg: '#2563EB' },
  'CVE Lookup':        { initials: 'CV', bg: '#7C3AED' },
  'CVE Lookup Agent':  { initials: 'CV', bg: '#7C3AED' },
  'Context Analyst':   { initials: 'CA', bg: '#0891B2' },
  'Patch Planner':     { initials: 'PP', bg: '#4338CA' },
  'Validator':         { initials: 'VA', bg: '#D97706' },
  'Retry Controller':  { initials: 'RC', bg: '#DC2626' },
  'GitHub PR Agent':   { initials: 'GP', bg: '#059669' },
  'Alert Agent':       { initials: 'AL', bg: '#B45309' },
  'Orchestrator':      { initials: 'OR', bg: '#374151' },
  'Remediation Output Agent': { initials: 'RO', bg: '#059669' },
};
const getAgentMeta = (name: string) => AGENT_META[name] || { initials: name.slice(0, 2).toUpperCase(), bg: '#374151' };

// ─── Timeline Event Card ───────────────────────────────────────────────────────

const TimelineEventCard = ({ event, run }: { event: RunEvent; run: Run }) => {
  const isPR = event.agentName === 'GitHub PR Agent' && event.toolName === 'PR Created';
  const isRetryWarn = event.agentName === 'Retry Controller' && event.status === 'WARNING';
  const isRetryOk = event.agentName === 'Retry Controller' && event.status === 'SUCCESS';
  const isContext = event.agentName === 'Context Analyst';
  const meta = getAgentMeta(event.agentName);

  const relativeTime = (ts: string) => {
    const s = Math.floor((Date.now() - new Date(ts).getTime()) / 1000);
    if (s < 60) return `${s}s ago`;
    return `${Math.floor(s / 60)}m ago`;
  };

  const cardClass = isPR ? 'pr-card animate-slide-up' :
    isRetryWarn ? 'event-card retry-warn animate-slide-up' :
    isRetryOk   ? 'event-card retry-success animate-slide-up' :
    `event-card status-${event.status.toLowerCase()} animate-slide-up`;

  return (
    <div className="relative flex items-start gap-4 mb-5">
      {/* Avatar */}
      <div className="agent-avatar shrink-0" style={{ background: meta.bg }}>
        {meta.initials}
      </div>

      {/* Card */}
      <div className={`flex-1 ${cardClass} p-4`} style={{ borderRadius: '12px' }}>
        {isPR ? (
          <div style={{ position: 'relative', zIndex: 1 }}>
            <p className="display" style={{ fontSize: '20px', fontWeight: 800, color: 'var(--lime)', marginBottom: '8px' }}>
              ✦ Pull Request Created
            </p>
            <p style={{ color: 'var(--fg-2)', marginBottom: '20px', fontSize: '14px' }}>{event.message}</p>
            {run.prUrl && (
              <a href={run.prUrl} target="_blank" rel="noopener noreferrer">
                <button className="btn-lime" style={{ display: 'inline-flex', alignItems: 'center', gap: '8px', padding: '10px 20px', borderRadius: '10px', fontSize: '13px' }}>
                  <Github size={16} /> View PR on GitHub
                  <ArrowRight size={14} />
                </button>
              </a>
            )}
          </div>
        ) : (
          <>
            {/* Header row */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px', flexWrap: 'wrap' }}>
              <span className="chip display" style={{ fontFamily: 'var(--font-display)', fontSize: '10px', letterSpacing: '0.08em', background: meta.bg + '22', color: 'var(--fg)', borderColor: meta.bg + '44' }}>
                {event.agentName}
              </span>
              <span className="mono" style={{ fontSize: '12px', color: 'var(--fg-3)' }}>→</span>
              <span className="mono" style={{ fontSize: '12px', color: 'var(--fg-2)' }}>{event.toolName}</span>
              <span style={{ marginLeft: 'auto', fontSize: '11px', color: 'var(--fg-3)', fontFamily: 'var(--font-mono)' }}>{relativeTime(event.timestamp)}</span>
            </div>

            {/* Message */}
            <p style={{
              fontSize: '13.5px',
              color: isRetryWarn ? 'var(--red)' : isRetryOk ? 'var(--lime)' : 'var(--fg)',
              fontFamily: isRetryWarn || isRetryOk ? 'var(--font-mono)' : 'var(--font-body)',
              lineHeight: 1.5
            }}>
              {event.message}
            </p>

            {/* Context analyst confidence */}
            {isContext && event.metadata?.confidence && (
              <div style={{ marginTop: '10px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                <span className={`chip ${event.metadata.confidence === 'HIGH' ? 'badge-lime' : event.metadata.confidence === 'MEDIUM' ? 'badge-medium' : 'badge-high'}`}>
                  {event.metadata.confidence} CONF
                </span>
                {event.metadata.affectedFiles?.length > 0 && (
                  <span className="chip">{event.metadata.affectedFiles.length} files</span>
                )}
              </div>
            )}

            {/* Generic metadata */}
            {event.metadata && typeof event.metadata === 'object' && !isContext && Object.keys(event.metadata).length > 0 && (
              <div style={{ marginTop: '10px', display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                {Object.entries(event.metadata)
                  .filter(([k]) => k !== 'attempt')
                  .map(([k, v]) => (
                    <span key={k} className="chip">
                      {k}: <strong style={{ color: 'var(--fg)' }}>{String(v)}</strong>
                    </span>
                  ))}
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
};

// ─── Main App ─────────────────────────────────────────────────────────────────

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
  const [toasts, setToasts] = useState<{ id: string; message: string; type: 'info' | 'success' | 'error' }[]>([]);
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

  // ─── Toast helper ───────────────────────────────────────────────────────────
  const addToast = (message: string, type: 'info' | 'success' | 'error' = 'info') => {
    const id = Math.random().toString(36).slice(2, 9);
    setToasts(p => [...p, { id, message, type }]);
    setTimeout(() => setToasts(p => p.filter(t => t.id !== id)), 4000);
  };

  // ─── Auth ───────────────────────────────────────────────────────────────────
  useEffect(() => {
    const saved = localStorage.getItem('githubToken');
    if (!saved) return;
    setGithubToken(saved);
    loginWithGithubToken(saved);
  }, []);

  const fetchGithubRepos = async (token: string) => {
    const repos: GithubRepo[] = [];
    let page = 1, hasMore = true;
    while (hasMore) {
      const res = await fetch(`https://api.github.com/user/repos?per_page=100&sort=updated&page=${page}`, {
        headers: { Authorization: `Bearer ${token}`, Accept: 'application/vnd.github+json' }
      });
      if (!res.ok) throw new Error(res.status === 401 ? 'Invalid GitHub token' : `HTTP ${res.status}`);
      const data = await res.json();
      repos.push(...data);
      hasMore = data.length === 100;
      page++;
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
      const msg = e instanceof Error ? e.message : 'Failed to connect';
      setIsAuthenticated(false);
      setGithubRepos([]);
      localStorage.removeItem('githubToken');
      addToast(msg, 'error');
    } finally {
      setIsRepoLoading(false);
    }
  };

  const handleGithubLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!githubToken.trim()) { addToast('Enter a token to continue', 'error'); return; }
    await loginWithGithubToken(githubToken.trim());
  };

  const handleLogout = () => {
    localStorage.removeItem('githubToken');
    setIsAuthenticated(false);
    setGithubToken('');
    setGithubRepos([]);
    setSelectedRepo('');
  };

  // ─── Data fetching ──────────────────────────────────────────────────────────
  useEffect(() => { if (isAuthenticated) fetchData(); }, [isAuthenticated, currentTab]);

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
    } catch {}
  };

  const validateUrl = (url: string) => url && url.startsWith('https://github.com/');
  const isWildcardOrInRange = (v: string, min: number, max: number) => {
    if (v === '*') return true;
    if (!/^\d+$/.test(v)) return false;
    const n = Number(v);
    return n >= min && n <= max;
  };

  // ─── Scan control ───────────────────────────────────────────────────────────
  const startScan = async (isDemo = false, selectedRepoUrl?: string) => {
    const finalUrl = selectedRepoUrl || repoUrl;
    if (!isDemo && !validateUrl(finalUrl)) {
      setError('Enter a valid GitHub URL (https://github.com/…)');
      return;
    }
    setIsLoading(true); setError(null); setCurrentRun(null); setEvents([]);
    try {
      const res = await fixstackApi.startScan(isDemo ? undefined : finalUrl);
      addToast('Scan started', 'success');
      fetchRun(res.data.runId);
      startPolling(res.data.runId);
    } catch (err: any) {
      setError(err.response?.data?.error || err.message || 'Failed to start scan');
      addToast('Failed to start scan', 'error');
      setIsLoading(false);
    }
  };

  const startOrgScan = async () => {
    if (!orgName) { setError('Enter an org name'); return; }
    setIsLoading(true); setError(null);
    try {
      await fixstackApi.startOrgScan(orgName);
      addToast(`Queued scans for ${orgName}`, 'success');
      setOrgName(''); setIsLoading(false); setCurrentTab('history');
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
      const [runRes, evRes] = await Promise.all([fixstackApi.getRun(id), fixstackApi.getEvents(id)]);
      setCurrentRun(runRes.data);
      setEvents(evRes.data);
      if (runRes.data.status === 'COMPLETED' || runRes.data.status === 'FAILED') {
        stopPolling();
        if (runRes.data.status === 'COMPLETED') addToast('Scan completed!', 'success');
      }
    } catch {}
  };

  const startPolling = (id: string) => {
    stopPolling();
    pollInterval.current = window.setInterval(() => fetchRun(id), 2500);
  };
  const stopPolling = () => {
    if (pollInterval.current) { clearInterval(pollInterval.current); pollInterval.current = null; setIsLoading(false); }
  };
  useEffect(() => () => stopPolling(), []);

  // ─── Schedules ──────────────────────────────────────────────────────────────
  const saveSchedule = async () => {
    if (!validateUrl(scheduleRepo)) { addToast('Invalid GitHub URL', 'error'); return; }
    const dom = scheduleDayOfMonth.trim() || '*', mon = scheduleMonth.trim() || '*';
    if (!isWildcardOrInRange(dom, 1, 31)) { addToast('Day must be * or 1–31', 'error'); return; }
    if (!isWildcardOrInRange(mon, 1, 12)) { addToast('Month must be * or 1–12', 'error'); return; }
    if (!/^([01]\d|2[0-3]):([0-5]\d)$/.test(scheduleTime)) { addToast('Time must be HH:MM', 'error'); return; }
    const [h = '00', m = '00'] = scheduleTime.split(':');
    try {
      await fixstackApi.addSchedule(scheduleRepo, `${m} ${h} ${dom} ${mon} ${scheduleWeekday}`);
      setShowScheduleModal(false);
      setScheduleRepo(''); setScheduleTime('00:00'); setScheduleDayOfMonth('*'); setScheduleMonth('*'); setScheduleWeekday('*');
      fetchData(); addToast('Schedule saved', 'success');
    } catch { addToast('Failed to save schedule', 'error'); }
  };

  const deleteScan = async (runId: string) => {
    try {
      await fixstackApi.deleteScan(runId);
      setHistory(p => p.filter(s => s.runId !== runId));
      addToast('Scan deleted', 'info');
    } catch { addToast('Failed to delete scan', 'error'); }
  };

  const deleteSchedule = async (url: string) => {
    try { await fixstackApi.deleteSchedule(url); fetchData(); addToast('Schedule deleted', 'info'); }
    catch { addToast('Failed to delete schedule', 'error'); }
  };

  const runScheduleNow = async (url: string) => {
    try {
      await fixstackApi.runNowSchedule(url);
      addToast('Triggered immediately', 'success');
      setCurrentTab('history'); setTimeout(fetchData, 1000);
    } catch { addToast('Failed to trigger scan', 'error'); }
  };

  const saveSettings = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await fixstackApi.saveSettings(settings.webhookUrl, settings.email, settings.githubToken, settings.groqApiKey, settings.webhookSecret);
      addToast('Settings saved', 'success');
    } catch { addToast('Failed to save settings', 'error'); }
  };

  const testWebhook = async () => {
    try { await fixstackApi.testWebhook(); addToast('Test webhook sent', 'success'); }
    catch (e: any) { addToast(e.response?.data?.error || 'Failed to send', 'error'); }
  };

  const clearHistory = () => { if (confirm('Clear all history?')) { setHistory([]); addToast('History cleared', 'info'); } };
  const toggleRow = (id: string) => setExpandedRows(p => ({ ...p, [id]: !p[id] }));

  // ─── Scan steps ─────────────────────────────────────────────────────────────
  const getScanStep = () => {
    if (!currentRun || events.length === 0) return 0;
    if (currentRun.status === 'COMPLETED') return 5;
    const last = events[events.length - 1];
    if (last.agentName === 'GitHub PR Agent') return 4;
    if (['Patch Planner', 'Validator', 'Retry Controller'].includes(last.agentName)) return 3;
    if (last.agentName === 'Context Analyst') return 2;
    if (last.agentName?.includes('CVE')) return 1;
    return 0;
  };
  const STEPS = ['Fetching', 'CVE Scan', 'AI Analysis', 'Patching', 'PR Created'];

  // ─── Severity helpers ────────────────────────────────────────────────────────
  const sevBadgeClass = (s: string) => {
    const u = s.toUpperCase();
    if (u === 'CRITICAL') return 'badge-critical';
    if (u === 'HIGH') return 'badge-high';
    if (u === 'MEDIUM') return 'badge-medium';
    return 'badge-low';
  };
  const sevIcon = (s: string) => {
    const u = s.toUpperCase();
    if (u === 'CRITICAL') return <Skull size={12} />;
    if (u === 'HIGH') return <Flame size={12} />;
    if (u === 'MEDIUM') return <AlertTriangle size={12} />;
    return <Info size={12} />;
  };

  const formatCron = (c: string) => ({ '0 0 * * *': 'Daily at midnight', '0 0 * * 0': 'Weekly — Sunday', '0 0 * * 1': 'Weekly — Monday', '0 * * * *': 'Every hour' }[c] || c);

  const tabs = [
    { id: 'dashboard', icon: LayoutDashboard, label: 'Dashboard' },
    { id: 'history',   icon: History,         label: 'History'   },
    { id: 'schedules', icon: Calendar,         label: 'Schedules' },
    { id: 'settings',  icon: SettingsIcon,     label: 'Settings'  },
  ] as const;

  const [ph = '00', pm = '00'] = scheduleTime.split(':');

  // ─────────────────────────────────────────────────────────────────────────────
  // ─── LOGIN SCREEN ─────────────────────────────────────────────────────────────
  // ─────────────────────────────────────────────────────────────────────────────
  if (!isAuthenticated) {
    return (
      <div className="login-bg bg-grid scanline-effect" style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '24px' }}>
        <div className="animate-fade-in" style={{ width: '100%', maxWidth: '440px' }}>

          {/* Logo */}
          <div style={{ textAlign: 'center', marginBottom: '40px' }}>
            <div style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center', width: '56px', height: '56px', borderRadius: '16px', background: 'var(--lime-dim)', border: '1px solid var(--border-lime)', marginBottom: '20px', boxShadow: '0 0 32px var(--lime-glow)' }} className="animate-float">
              <Shield size={26} style={{ color: 'var(--lime)' }} />
            </div>
            <h1 className="display gradient-text" style={{ fontSize: '32px', fontWeight: 800, margin: 0, letterSpacing: '-0.02em' }}>
              FixStack
            </h1>
            <p style={{ color: 'var(--fg-3)', marginTop: '6px', fontSize: '13px' }}>
              Autonomous dependency security agent
            </p>
          </div>

          {/* Card */}
          <div className="glass-card" style={{ borderRadius: '20px', padding: '32px' }}>
            <p className="section-heading" style={{ marginBottom: '20px' }}>Connect GitHub</p>

            <form onSubmit={handleGithubLogin} style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              <div style={{ position: 'relative' }}>
                <Lock size={15} style={{ position: 'absolute', left: '14px', top: '50%', transform: 'translateY(-50%)', color: 'var(--fg-3)' }} />
                <input
                  type={showLoginPat ? 'text' : 'password'}
                  value={githubToken}
                  onChange={e => setGithubToken(e.target.value)}
                  placeholder="ghp_xxxxxxxxxxxxxxxxxxxx"
                  autoFocus
                  className="input-void input-mono"
                  style={{ width: '100%', padding: '12px 44px', borderRadius: '10px', fontSize: '13px' }}
                />
                <button type="button" onClick={() => setShowLoginPat(v => !v)} style={{ position: 'absolute', right: '12px', top: '50%', transform: 'translateY(-50%)', color: 'var(--fg-3)', background: 'none', border: 'none', cursor: 'pointer', padding: '4px' }}>
                  {showLoginPat ? <EyeOff size={15} /> : <Eye size={15} />}
                </button>
              </div>

              <button type="submit" disabled={isRepoLoading} className="btn-lime" style={{ padding: '13px', borderRadius: '10px', fontSize: '14px', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', cursor: isRepoLoading ? 'not-allowed' : 'pointer', opacity: isRepoLoading ? 0.7 : 1 }}>
                {isRepoLoading ? <><Loader2 size={15} className="animate-spin" /> Connecting…</> : <><Github size={15} /> Connect GitHub</>}
              </button>
            </form>

            {/* Features */}
            <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', marginTop: '24px', justifyContent: 'center' }}>
              {['CVE Detection', 'AI Context', 'Auto PRs', 'Self-Correcting'].map(f => (
                <span key={f} className="chip" style={{ fontSize: '11px' }}>
                  <span style={{ color: 'var(--lime)', fontSize: '8px' }}>●</span> {f}
                </span>
              ))}
            </div>
          </div>

          <p style={{ textAlign: 'center', marginTop: '16px', fontSize: '12px', color: 'var(--fg-3)' }}>
            Requires a PAT with <code style={{ color: 'var(--fg-2)', fontSize: '11px' }}>repo</code> scope.{' '}
            <a href="https://github.com/settings/personal-access-tokens/new" target="_blank" rel="noopener noreferrer" style={{ color: 'var(--lime)', textDecoration: 'none' }}>
              Generate one →
            </a>
          </p>
        </div>

        {/* Toasts */}
        <div style={{ position: 'fixed', top: '20px', right: '20px', zIndex: 9999, display: 'flex', flexDirection: 'column', gap: '8px' }}>
          {toasts.map(t => (
            <div key={t.id} className={`toast toast-${t.type} animate-slide-up`}>
              {t.type === 'error' ? <AlertCircle size={14} /> : t.type === 'success' ? <CheckCircle2 size={14} /> : <Info size={14} />}
              {t.message}
            </div>
          ))}
        </div>
      </div>
    );
  }

  // ─────────────────────────────────────────────────────────────────────────────
  // ─── AUTHENTICATED LAYOUT ─────────────────────────────────────────────────────
  // ─────────────────────────────────────────────────────────────────────────────
  return (
    <div style={{ minHeight: '100vh', background: 'var(--void)', display: 'flex' }}>

      {/* Mobile overlay */}
      {sidebarOpen && <div onClick={() => setSidebarOpen(false)} style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.7)', zIndex: 40, backdropFilter: 'blur(4px)' }} />}

      {/* ─── SIDEBAR ─────────────────────────────────────────────────────── */}
      <aside style={{
        position: 'fixed', inset: '0 auto 0 0',
        width: sidebarOpen ? '264px' : '0',
        zIndex: 50,
        background: 'rgba(6, 8, 16, 0.95)',
        backdropFilter: 'blur(24px)',
        borderRight: '1px solid var(--border-dim)',
        display: 'flex', flexDirection: 'column',
        transition: 'width 0.25s cubic-bezier(0.4, 0, 0.2, 1)',
        overflow: 'hidden',
      }} className="md-sidebar">
        {/* Desktop: always show, 72px or 264px */}
        <style>{`
          @media (min-width: 768px) {
            .md-sidebar { width: 72px !important; }
          }
          @media (min-width: 1200px) {
            .md-sidebar { width: 264px !important; }
          }
          @media (max-width: 767px) {
            .md-sidebar { width: ${sidebarOpen ? '264px' : '0'} !important; }
          }
          .sidebar-label { display: none; }
          @media (min-width: 1200px) { .sidebar-label { display: inline; } }
          @media (max-width: 767px) { .sidebar-label { display: ${sidebarOpen ? 'inline' : 'none'}; } }
        `}</style>

        {/* Logo */}
        <div style={{ padding: '20px 16px', borderBottom: '1px solid var(--border-void)', display: 'flex', alignItems: 'center', gap: '12px', minHeight: '64px' }}>
          <div style={{ width: '36px', height: '36px', borderRadius: '10px', background: 'var(--lime-dim)', border: '1px solid var(--border-lime)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, boxShadow: '0 0 16px var(--lime-glow)' }}>
            <Shield size={17} style={{ color: 'var(--lime)' }} />
          </div>
          <span className="display sidebar-label" style={{ fontWeight: 800, fontSize: '17px', color: 'var(--fg)', letterSpacing: '-0.01em', whiteSpace: 'nowrap' }}>
            Fix<span style={{ color: 'var(--lime)' }}>Stack</span>
          </span>
        </div>

        {/* Nav */}
        <nav style={{ flex: 1, padding: '12px 10px', display: 'flex', flexDirection: 'column', gap: '3px' }}>
          {tabs.map(tab => (
            <button key={tab.id} onClick={() => { setCurrentTab(tab.id); setSidebarOpen(false); }} className={`nav-item ${currentTab === tab.id ? 'active' : ''}`}>
              <tab.icon size={17} style={{ flexShrink: 0 }} />
              <span className="sidebar-label" style={{ whiteSpace: 'nowrap', fontSize: '13.5px' }}>{tab.label}</span>
            </button>
          ))}
        </nav>

        {/* Running indicator */}
        {currentRun?.status === 'RUNNING' && (
          <div style={{ margin: '0 10px 8px', padding: '10px 12px', borderRadius: '10px', background: 'var(--lime-dim)', border: '1px solid var(--border-lime)', display: 'flex', alignItems: 'center', gap: '10px' }}>
            <div className="running-dot" />
            <span className="sidebar-label mono" style={{ fontSize: '11px', color: 'var(--lime)', whiteSpace: 'nowrap' }}>Scan running…</span>
          </div>
        )}

        {/* Logout */}
        <div style={{ padding: '10px', borderTop: '1px solid var(--border-void)' }}>
          <button onClick={handleLogout} className="nav-item" style={{ width: '100%' }}>
            <LogOut size={16} style={{ flexShrink: 0 }} />
            <span className="sidebar-label" style={{ whiteSpace: 'nowrap' }}>Disconnect</span>
          </button>
        </div>
      </aside>

      {/* ─── MAIN CONTENT ────────────────────────────────────────────────── */}
      <main style={{
        flex: 1,
        marginLeft: 0,
        padding: '24px 20px',
        minHeight: '100vh',
      }} className="main-content">
        <style>{`
          @media (min-width: 768px) { .main-content { margin-left: 72px !important; padding: 28px 32px !important; } }
          @media (min-width: 1200px) { .main-content { margin-left: 264px !important; padding: 32px 40px !important; } }
        `}</style>

        {/* Mobile top bar */}
        <div className="mobile-bar" style={{ display: 'none', alignItems: 'center', justifyContent: 'space-between', marginBottom: '20px' }}>
          <style>{`.mobile-bar { display: flex !important; } @media (min-width: 768px) { .mobile-bar { display: none !important; } }`}</style>
          <button onClick={() => setSidebarOpen(true)} style={{ padding: '8px', borderRadius: '8px', border: '1px solid var(--border-dim)', background: 'var(--raised)', color: 'var(--fg-2)' }}>
            <Menu size={17} />
          </button>
          <span className="display" style={{ fontWeight: 700, fontSize: '16px' }}>Fix<span style={{ color: 'var(--lime)' }}>Stack</span></span>
          <button onClick={handleLogout} style={{ padding: '8px', background: 'none', border: 'none', color: 'var(--fg-3)' }}><LogOut size={17} /></button>
        </div>

        {/* ══════════════════════════════ DASHBOARD ══════════════════════════════ */}
        {currentTab === 'dashboard' && !currentRun && (
          <div className="animate-fade-in" style={{ maxWidth: '900px' }}>

            {/* Hero */}
            <div style={{ marginBottom: '32px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '12px' }}>
                <span className="chip badge-lime"><Sparkles size={10} /> v1.0 LIVE</span>
                <span className="chip">Groq + OSV.dev + NVD</span>
              </div>
              <h1 className="display" style={{ fontSize: 'clamp(28px, 4vw, 42px)', fontWeight: 800, lineHeight: 1.15, letterSpacing: '-0.025em', margin: 0 }}>
                Autonomous Dependency<br />
                <span className="gradient-text">Security Agent</span>
              </h1>
              <p style={{ color: 'var(--fg-2)', marginTop: '12px', fontSize: '15px', maxWidth: '540px', lineHeight: 1.65 }}>
                Scans repos, analyzes exploitability with AI context, and ships remediation PRs — automatically.
              </p>
            </div>

            {/* Scan cards */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '16px', marginBottom: '24px' }}>

              {/* Repo scan */}
              <div className="glass-card" style={{ borderRadius: '16px', padding: '24px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '20px' }}>
                  <div style={{ width: '32px', height: '32px', borderRadius: '8px', background: 'rgba(37,99,235,0.15)', border: '1px solid rgba(37,99,235,0.25)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <Github size={15} style={{ color: '#4D9EFF' }} />
                  </div>
                  <div>
                    <p style={{ fontWeight: 600, fontSize: '14px', margin: 0 }}>Repository Scan</p>
                    <p style={{ fontSize: '11px', color: 'var(--fg-3)', margin: 0 }}>Select from your GitHub repos</p>
                  </div>
                </div>

                {githubRepos.length > 0 ? (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                    <select
                      value={selectedRepo}
                      onChange={e => { const url = e.target.value; setSelectedRepo(url); if (url) { setRepoUrl(url); setError(null); startScan(false, url); } }}
                      disabled={isLoading}
                      className="input-void"
                      style={{ width: '100%', padding: '11px 14px', borderRadius: '9px', fontSize: '13px', cursor: 'pointer' }}
                    >
                      <option value="">Select a repository…</option>
                      {githubRepos.map(r => <option key={r.id} value={r.html_url}>{r.full_name}{r.private ? ' 🔒' : ''}</option>)}
                    </select>
                    <button onClick={() => loginWithGithubToken(githubToken)} disabled={isRepoLoading} className="btn-ghost" style={{ padding: '9px', borderRadius: '9px', fontSize: '12px', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px', cursor: 'pointer' }}>
                      {isRepoLoading ? <Loader2 size={13} className="animate-spin" /> : <RefreshCw size={13} />} Refresh repos
                    </button>
                  </div>
                ) : (
                  <div style={{ padding: '16px', borderRadius: '8px', background: 'var(--surface)', color: 'var(--fg-3)', fontSize: '13px', textAlign: 'center' }}>
                    No repositories found.
                  </div>
                )}
              </div>

              {/* Org scan */}
              <div className="glass-card" style={{ borderRadius: '16px', padding: '24px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '20px' }}>
                  <div style={{ width: '32px', height: '32px', borderRadius: '8px', background: 'rgba(124,58,237,0.15)', border: '1px solid rgba(124,58,237,0.25)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <Building size={15} style={{ color: 'var(--violet)' }} />
                  </div>
                  <div>
                    <p style={{ fontWeight: 600, fontSize: '14px', margin: 0 }}>Organization Scan</p>
                    <p style={{ fontSize: '11px', color: 'var(--fg-3)', margin: 0 }}>Queue all public repos</p>
                  </div>
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                  <input
                    type="text"
                    placeholder="e.g. facebook"
                    value={orgName}
                    onChange={e => { setOrgName(e.target.value); setError(null); }}
                    disabled={isLoading}
                    className="input-void"
                    style={{ width: '100%', padding: '11px 14px', borderRadius: '9px', fontSize: '13px' }}
                  />
                  <button onClick={startOrgScan} disabled={isLoading || !orgName} className="btn-ghost" style={{ padding: '10px', borderRadius: '9px', fontSize: '13px', fontWeight: 600, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', cursor: isLoading || !orgName ? 'not-allowed' : 'pointer', opacity: isLoading || !orgName ? 0.5 : 1 }}>
                    {isLoading ? <Loader2 size={14} className="animate-spin" /> : <Play size={14} />} Queue Org Scan
                  </button>
                </div>
              </div>
            </div>

            {/* Error */}
            {error && (
              <div style={{ padding: '12px 16px', borderRadius: '10px', background: 'var(--red-dim)', border: '1px solid rgba(255,59,92,0.3)', color: 'var(--red)', fontSize: '13px', marginBottom: '20px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                <AlertCircle size={14} /> {error}
              </div>
            )}

            {/* Demo + How it works */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              <button onClick={() => startScan(true)} disabled={isLoading} className="btn-lime" style={{ padding: '14px 24px', borderRadius: '12px', fontSize: '14px', display: 'inline-flex', alignItems: 'center', gap: '10px', cursor: isLoading ? 'not-allowed' : 'pointer', width: 'fit-content', opacity: isLoading ? 0.7 : 1 }}>
                <Zap size={16} /> Run Live Demo — lodash + axios CVEs
              </button>

              <div className="glass-card" style={{ borderRadius: '16px', padding: '24px' }}>
                <p className="section-heading">How it works</p>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: '12px' }}>
                  {[
                    { icon: Box,      label: 'Fetch Deps',  desc: 'Parses manifests',     color: '#2563EB' },
                    { icon: Search,   label: 'Scan CVEs',   desc: 'OSV.dev + NVD',        color: '#7C3AED' },
                    { icon: Brain,    label: 'AI Context',  desc: 'Call graph analysis',  color: '#0891B2' },
                    { icon: Github,   label: 'Open PR',     desc: 'Automated patch',       color: '#059669' },
                  ].map((s, i) => (
                    <div key={s.label} className={`animate-slide-up stagger-${i + 1}`} style={{ padding: '16px', borderRadius: '10px', background: 'var(--surface)', border: '1px solid var(--border-void)' }}>
                      <div style={{ width: '28px', height: '28px', borderRadius: '7px', background: s.color + '22', border: `1px solid ${s.color}44`, display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: '10px' }}>
                        <s.icon size={14} style={{ color: s.color }} />
                      </div>
                      <p style={{ fontWeight: 600, fontSize: '13px', margin: '0 0 2px' }}>{s.label}</p>
                      <p style={{ fontSize: '11px', color: 'var(--fg-3)', margin: 0 }}>{s.desc}</p>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ══════════════════════════════ SCAN RUNNING / DONE ══════════════════════════════ */}
        {currentTab === 'dashboard' && currentRun && (
          <div style={{ maxWidth: '900px' }}>

            {/* Sticky run header */}
            <div className="glass-card-raised" style={{ position: 'sticky', top: 0, zIndex: 20, borderRadius: '14px', padding: '16px 20px', marginBottom: '24px' }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '12px', marginBottom: '14px' }}>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '20px' }}>
                  <div>
                    <p style={{ fontSize: '10px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.1em', color: 'var(--fg-3)', margin: '0 0 3px' }}>Repository</p>
                    <p style={{ fontWeight: 600, margin: 0, display: 'flex', alignItems: 'center', gap: '6px', fontSize: '14px' }}>
                      <Github size={13} style={{ color: 'var(--fg-3)' }} /> {currentRun.input.repoName}
                    </p>
                  </div>
                  <div>
                    <p style={{ fontSize: '10px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.1em', color: 'var(--fg-3)', margin: '0 0 3px' }}>Run ID</p>
                    <p className="mono" style={{ margin: 0, fontSize: '12px', color: 'var(--fg-2)' }}>{currentRun.id.slice(0, 10)}</p>
                  </div>
                  <div>
                    <p style={{ fontSize: '10px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.1em', color: 'var(--fg-3)', margin: '0 0 3px' }}>Duration</p>
                    <p className="mono" style={{ margin: 0, fontSize: '13px', color: 'var(--lime)', display: 'flex', alignItems: 'center', gap: '5px' }}>
                      <Clock size={12} /> {duration}s
                    </p>
                  </div>
                </div>
                <span className={`chip ${currentRun.status === 'COMPLETED' ? 'badge-lime' : currentRun.status === 'FAILED' ? 'badge-critical' : 'badge-info'}`} style={{ fontSize: '11px', padding: '4px 12px', borderRadius: '99px' }}>
                  {currentRun.status === 'RUNNING' && <span className="running-dot" style={{ width: '6px', height: '6px', marginRight: '6px' }} />}
                  {currentRun.status}
                </span>
              </div>

              {/* Steps */}
              <div style={{ display: 'flex', gap: '6px' }}>
                {STEPS.map((step, i) => {
                  const cur = getScanStep();
                  return (
                    <div key={step} className={`scan-step ${i < cur || currentRun.status === 'COMPLETED' ? 'done' : i === cur && currentRun.status !== 'COMPLETED' ? 'active' : ''}`}>
                      {(i < cur || currentRun.status === 'COMPLETED') ? <Check size={11} style={{ display: 'inline', verticalAlign: 'middle', marginRight: '4px' }} /> : null}
                      {step}
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Timeline */}
            <div className="glass-card" style={{ borderRadius: '16px', padding: '24px', marginBottom: '24px' }}>
              <p style={{ display: 'flex', alignItems: 'center', gap: '8px', fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: '15px', margin: '0 0 24px', color: 'var(--fg)' }}>
                <Activity size={16} style={{ color: 'var(--lime)' }} /> Live Agent Timeline
              </p>

              <div style={{ position: 'relative', paddingLeft: '24px' }}>
                {/* Timeline line */}
                {events.length > 0 && (
                  <div style={{ position: 'absolute', left: '19px', top: '4px', bottom: '20px', width: '1px', background: 'linear-gradient(to bottom, var(--lime-glow), transparent)' }} />
                )}

                {events.length === 0 && currentRun.status === 'PENDING' ? (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                    {[1,2,3].map(i => <div key={i} className="skeleton" style={{ height: '72px' }} />)}
                  </div>
                ) : (
                  events.map((ev, idx) => (
                    <div key={ev.id} style={{ animationDelay: `${idx * 0.04}s` }}>
                      <TimelineEventCard event={ev} run={currentRun} />
                    </div>
                  ))
                )}

                {currentRun.status === 'RUNNING' && (
                  <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginTop: '8px' }}>
                    <div style={{ width: '38px', height: '38px', borderRadius: '50%', border: '1px solid var(--border-dim)', background: 'var(--surface)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                      <Loader2 size={16} className="animate-spin" style={{ color: 'var(--lime)' }} />
                    </div>
                    <p style={{ color: 'var(--fg-3)', fontStyle: 'italic', fontSize: '13px' }}>Agents processing…</p>
                  </div>
                )}
              </div>
            </div>

            {/* ── Results ── */}
            {currentRun.status === 'COMPLETED' && (
              <div className="animate-slide-up" style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>

                {/* Stats */}
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '12px' }} className="stats-grid">
                  <style>{`@media (min-width: 640px) { .stats-grid { grid-template-columns: repeat(4, 1fr) !important; } }`}</style>

                  <div className="stat-card">
                    <div className="stat-value" style={{ color: 'var(--fg)' }}><AnimatedNumber value={currentRun.vulnerabilities.length} /></div>
                    <div className="stat-label">Vulns Found</div>
                  </div>
                  <div className="stat-card" style={{ borderColor: 'rgba(5,226,122,0.2)' }}>
                    <div className="stat-value gradient-text"><AnimatedNumber value={currentRun.remediations.filter(r => r.status === 'FIXED').length} /></div>
                    <div className="stat-label" style={{ color: 'var(--lime)' }}>Patched</div>
                  </div>
                  <div className="stat-card" style={{ borderColor: 'rgba(255,59,92,0.15)' }}>
                    <div className="stat-value gradient-text-hot"><AnimatedNumber value={currentRun.remediations.filter(r => r.status === 'FAILED').length} /></div>
                    <div className="stat-label" style={{ color: 'var(--red)' }}>Failed</div>
                  </div>
                  <div className="stat-card">
                    <div className="stat-value" style={{ color: 'var(--blue)', fontFamily: 'var(--font-mono)' }}>{duration}s</div>
                    <div className="stat-label">Duration</div>
                  </div>
                </div>

                {/* Vulnerabilities table */}
                {currentRun.vulnerabilities.length > 0 && (
                  <div className="glass-card" style={{ borderRadius: '16px', overflow: 'hidden' }}>
                    <div style={{ padding: '20px 20px 16px', borderBottom: '1px solid var(--border-void)', display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <Shield size={16} style={{ color: 'var(--red)' }} />
                      <span style={{ fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: '14px' }}>Vulnerabilities Discovered</span>
                      <span className="chip" style={{ marginLeft: 'auto' }}>{currentRun.vulnerabilities.length}</span>
                    </div>
                    <div style={{ overflowX: 'auto' }}>
                      <table className="data-table">
                        <thead>
                          <tr>
                            <th>Package</th>
                            <th>Severity</th>
                            <th>Context</th>
                            <th>Description</th>
                          </tr>
                        </thead>
                        <tbody>
                          {currentRun.vulnerabilities.map(v => (
                            <React.Fragment key={v.id}>
                              <tr style={{ cursor: 'pointer' }} onClick={() => toggleRow(v.id)}>
                                <td>
                                  <p style={{ fontWeight: 600, margin: '0 0 2px', fontSize: '13px' }}>{v.pkgName}</p>
                                  <p className="mono" style={{ fontSize: '11px', color: 'var(--fg-3)', margin: 0 }}>{v.pkgVersion}</p>
                                </td>
                                <td>
                                  <span className={`chip ${sevBadgeClass(v.severity)}`} style={{ gap: '5px' }}>
                                    {sevIcon(v.severity)} {v.severity}
                                  </span>
                                </td>
                                <td>
                                  {(v as any).contextNote ? (
                                    <span className="chip badge-info" style={{ gap: '5px' }}>
                                      <Brain size={10} /> AI
                                    </span>
                                  ) : <span style={{ color: 'var(--fg-4)' }}>—</span>}
                                </td>
                                <td style={{ maxWidth: '280px' }}>
                                  <p style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', margin: 0, fontSize: '12px', color: 'var(--fg-2)' }}>{v.description}</p>
                                  <p style={{ fontSize: '10px', color: 'var(--lime)', margin: '2px 0 0', fontFamily: 'var(--font-mono)' }}>Click to expand ↓</p>
                                </td>
                              </tr>
                              {expandedRows[v.id] && (
                                <tr style={{ background: 'var(--surface)' }}>
                                  <td colSpan={4} style={{ padding: '16px 20px' }}>
                                    <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                                      <div style={{ padding: '14px', borderRadius: '10px', background: 'var(--raised)', border: '1px solid var(--border-void)', fontSize: '13px', lineHeight: 1.6, color: 'var(--fg-2)' }}>
                                        {v.description}
                                      </div>
                                      <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
                                        <div style={{ padding: '10px 14px', borderRadius: '8px', background: 'var(--raised)', border: '1px solid var(--border-void)' }}>
                                          <p style={{ fontSize: '10px', color: 'var(--fg-3)', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.1em', margin: '0 0 4px' }}>CVE</p>
                                          <p className="mono" style={{ fontSize: '12px', margin: 0, color: 'var(--blue)' }}>{v.cveId}</p>
                                        </div>
                                        {(v as any).contextNote && (
                                          <div style={{ flex: 1, padding: '10px 14px', borderRadius: '8px', background: 'rgba(5,226,122,0.05)', border: '1px solid var(--border-lime)' }}>
                                            <p style={{ fontSize: '10px', color: 'var(--lime)', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.1em', margin: '0 0 4px', display: 'flex', alignItems: 'center', gap: '5px' }}><Brain size={10} /> AI Analysis</p>
                                            <p style={{ fontSize: '12px', color: 'var(--fg-2)', margin: 0 }}>{(v as any).contextNote}</p>
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
                  </div>
                )}

                {/* Remediations table */}
                {currentRun.remediations.length > 0 && (
                  <div className="glass-card" style={{ borderRadius: '16px', overflow: 'hidden' }}>
                    <div style={{ padding: '20px 20px 16px', borderBottom: '1px solid var(--border-void)', display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <RefreshCw size={16} style={{ color: 'var(--lime)' }} />
                      <span style={{ fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: '14px' }}>Remediations Applied</span>
                    </div>
                    <div style={{ overflowX: 'auto' }}>
                      <table className="data-table">
                        <thead>
                          <tr>
                            <th>Package</th>
                            <th>Update</th>
                            <th>Attempts</th>
                            <th style={{ textAlign: 'right' }}>Result</th>
                          </tr>
                        </thead>
                        <tbody>
                          {currentRun.remediations.map((r, i) => (
                            <tr key={i}>
                              <td style={{ fontWeight: 600, fontSize: '13px' }}>{r.pkgName}</td>
                              <td>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                  <span className="mono" style={{ fontSize: '12px', color: 'var(--red)', textDecoration: 'line-through' }}>{r.oldVersion}</span>
                                  <ArrowRight size={12} style={{ color: 'var(--fg-3)', flexShrink: 0 }} />
                                  <span className="mono" style={{ fontSize: '12px', color: r.status === 'FIXED' ? 'var(--lime)' : 'var(--fg-2)', fontWeight: r.status === 'FIXED' ? 600 : 400 }}>{r.newVersion}</span>
                                </div>
                              </td>
                              <td>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                                  <div style={{ display: 'flex', gap: '4px' }}>
                                    {Array.from({ length: Math.max(1, r.attempts || 1) }).map((_, idx) => (
                                      <div key={idx} style={{ width: '8px', height: '8px', borderRadius: '50%', background: r.status === 'FIXED' && idx === (r.attempts || 1) - 1 ? 'var(--lime)' : 'var(--red)', boxShadow: r.status === 'FIXED' && idx === (r.attempts || 1) - 1 ? '0 0 6px var(--lime-glow)' : 'none' }} />
                                    ))}
                                  </div>
                                  {(r.attempts || 0) > 1 && r.status === 'FIXED' && (
                                    <span className="chip badge-medium" style={{ fontSize: '10px' }}>Self-Corrected</span>
                                  )}
                                </div>
                              </td>
                              <td style={{ textAlign: 'right' }}>
                                <span className={`chip ${r.status === 'FIXED' ? 'badge-lime' : 'badge-critical'}`} style={{ fontSize: '11px' }}>
                                  {r.status === 'FIXED' ? '✓ PATCHED' : '✗ FAILED'}
                                </span>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Failed state */}
            {currentRun.status === 'FAILED' && (
              <div style={{ textAlign: 'center', padding: '48px 32px', borderRadius: '16px', background: 'var(--red-dim)', border: '1px solid rgba(255,59,92,0.25)' }}>
                <AlertTriangle size={40} style={{ color: 'var(--red)', margin: '0 auto 16px' }} />
                <p className="display" style={{ fontSize: '20px', fontWeight: 800, color: 'var(--red)', margin: '0 0 8px' }}>Workflow Failed</p>
                <p style={{ color: 'rgba(255,59,92,0.7)', fontSize: '13px' }}>Check the timeline above for error details.</p>
              </div>
            )}

            {/* Reset button */}
            <div style={{ textAlign: 'center', paddingTop: '24px', paddingBottom: '40px' }}>
              <button onClick={() => { setCurrentRun(null); setRepoUrl(''); setSelectedRepo(''); }} className="btn-ghost" style={{ padding: '11px 24px', borderRadius: '10px', fontSize: '13px', cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: '8px' }}>
                <RefreshCw size={14} /> Start Another Scan
              </button>
            </div>
          </div>
        )}

        {/* ══════════════════════════════ HISTORY ══════════════════════════════ */}
        {currentTab === 'history' && (
          <div style={{ maxWidth: '900px' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '16px', marginBottom: '24px' }}>
              <div>
                <h2 className="display" style={{ fontSize: '22px', fontWeight: 800, margin: '0 0 4px', letterSpacing: '-0.01em' }}>Scan History</h2>
                <p style={{ color: 'var(--fg-3)', fontSize: '13px', margin: 0 }}>{history.length} total scans</p>
              </div>
              <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
                <div style={{ position: 'relative' }}>
                  <Search size={14} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: 'var(--fg-3)' }} />
                  <input type="text" placeholder="Search repos…" value={searchFilter} onChange={e => setSearchFilter(e.target.value)} className="input-void" style={{ padding: '9px 12px 9px 34px', borderRadius: '9px', fontSize: '13px', width: '220px' }} />
                </div>
                <button onClick={clearHistory} className="btn-ghost" style={{ padding: '9px 14px', borderRadius: '9px', fontSize: '12px', display: 'flex', alignItems: 'center', gap: '6px', cursor: 'pointer' }}>
                  <Trash2 size={13} /> Clear
                </button>
              </div>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              {history.filter(s => (s.repo || '').toLowerCase().includes(searchFilter.toLowerCase())).length === 0 ? (
                <div style={{ textAlign: 'center', padding: '64px 32px', borderRadius: '16px', border: '1px dashed var(--border-dim)', background: 'var(--surface)' }}>
                  <History size={40} style={{ color: 'var(--fg-4)', margin: '0 auto 16px' }} />
                  <p style={{ color: 'var(--fg-3)', fontSize: '14px' }}>No scan history yet.</p>
                </div>
              ) : (
                history.filter(s => (s.repo || '').toLowerCase().includes(searchFilter.toLowerCase())).map((scan: any) => (
                  <div key={scan.id} onClick={() => loadRun(scan.runId)} className="glass-card animate-slide-up" style={{ borderRadius: '12px', padding: '16px 20px', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '16px', transition: 'border-color 0.2s ease' }}
                    onMouseEnter={e => (e.currentTarget as HTMLDivElement).style.borderColor = 'var(--border-mid)'}
                    onMouseLeave={e => (e.currentTarget as HTMLDivElement).style.borderColor = 'var(--border-dim)'}
                  >
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '6px', flexWrap: 'wrap' }}>
                        <Github size={14} style={{ color: 'var(--fg-3)', flexShrink: 0 }} />
                        <span style={{ fontWeight: 600, fontSize: '13.5px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{scan.repo}</span>
                        <span className="chip" style={{ fontSize: '10px' }}>{scan.ecosystem || 'NPM'}</span>
                      </div>
                      <div className="mono" style={{ fontSize: '11px', color: 'var(--fg-3)', display: 'flex', flexWrap: 'wrap', gap: '8px', alignItems: 'center' }}>
                        <span>{new Date(scan.createdAt).toLocaleString()}</span>
                        {scan.vulnerabilities?.filter((v: any) => v.severity === 'CRITICAL').length > 0 && (
                          <span style={{ color: 'var(--red)', display: 'flex', alignItems: 'center', gap: '3px' }}>
                            <Skull size={10} /> {scan.vulnerabilities.filter((v: any) => v.severity === 'CRITICAL').length}
                          </span>
                        )}
                        {scan.vulnerabilities?.filter((v: any) => v.severity === 'HIGH').length > 0 && (
                          <span style={{ color: 'var(--orange)', display: 'flex', alignItems: 'center', gap: '3px' }}>
                            <Flame size={10} /> {scan.vulnerabilities.filter((v: any) => v.severity === 'HIGH').length}
                          </span>
                        )}
                        <span style={{ color: 'var(--lime)', fontWeight: 600 }}>{scan.fixedCount || 0} fixed</span>
                      </div>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexShrink: 0 }}>
                      {scan.status === 'COMPLETED' && (
                        <button onClick={e => { e.stopPropagation(); deleteScan(scan.runId); }} className="btn-ghost" style={{ padding: '6px 10px', borderRadius: '8px', fontSize: '11px', display: 'flex', alignItems: 'center', gap: '5px', cursor: 'pointer' }}>
                          <Trash2 size={12} />
                        </button>
                      )}
                      {scan.prUrl && <span className="chip badge-lime" style={{ fontSize: '10px' }}><CheckCircle2 size={10} /> PR</span>}
                      <span className={`chip ${scan.status === 'COMPLETED' ? 'badge-lime' : scan.status === 'FAILED' ? 'badge-critical' : 'badge-info'}`} style={{ fontSize: '10px' }}>{scan.status}</span>
                      <ChevronRight size={16} style={{ color: 'var(--fg-4)' }} />
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        )}

        {/* ══════════════════════════════ SCHEDULES ══════════════════════════════ */}
        {currentTab === 'schedules' && (
          <div style={{ maxWidth: '900px' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '16px', marginBottom: '24px' }}>
              <div>
                <h2 className="display" style={{ fontSize: '22px', fontWeight: 800, margin: '0 0 4px', letterSpacing: '-0.01em' }}>Scheduled Scans</h2>
                <p style={{ color: 'var(--fg-3)', fontSize: '13px', margin: 0 }}>Automate vulnerability checks with cron</p>
              </div>
              <button onClick={() => setShowScheduleModal(true)} className="btn-lime" style={{ padding: '10px 18px', borderRadius: '10px', fontSize: '13px', display: 'inline-flex', alignItems: 'center', gap: '8px', cursor: 'pointer' }}>
                <Calendar size={14} /> Add Schedule
              </button>
            </div>

            {showScheduleModal && (
              <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.75)', backdropFilter: 'blur(8px)', zIndex: 100, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '24px' }}>
                <div className="glass-card-raised animate-slide-up" style={{ width: '100%', maxWidth: '460px', borderRadius: '20px', padding: '28px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '24px' }}>
                    <h3 className="display" style={{ fontWeight: 800, fontSize: '18px', margin: 0 }}>New Schedule</h3>
                    <button onClick={() => setShowScheduleModal(false)} style={{ color: 'var(--fg-3)', background: 'none', border: 'none', cursor: 'pointer' }}><XCircle size={20} /></button>
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                    <div>
                      <label style={{ fontSize: '11px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.1em', color: 'var(--fg-3)', display: 'block', marginBottom: '8px' }}>GitHub Repo URL</label>
                      <input type="text" value={scheduleRepo} onChange={e => setScheduleRepo(e.target.value)} className="input-void" style={{ width: '100%', padding: '11px 14px', borderRadius: '9px', fontSize: '13px' }} placeholder="https://github.com/owner/repo" />
                    </div>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                      <div>
                        <label style={{ fontSize: '11px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.1em', color: 'var(--fg-3)', display: 'block', marginBottom: '8px' }}>Time (HH:MM)</label>
                        <input type="time" value={scheduleTime} onChange={e => setScheduleTime(e.target.value)} className="input-void" style={{ width: '100%', padding: '11px 14px', borderRadius: '9px', fontSize: '13px' }} />
                      </div>
                      <div>
                        <label style={{ fontSize: '11px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.1em', color: 'var(--fg-3)', display: 'block', marginBottom: '8px' }}>Weekday</label>
                        <select value={scheduleWeekday} onChange={e => setScheduleWeekday(e.target.value)} className="input-void" style={{ width: '100%', padding: '11px 14px', borderRadius: '9px', fontSize: '13px' }}>
                          <option value="*">Any</option><option value="0">Sun</option><option value="1">Mon</option><option value="2">Tue</option><option value="3">Wed</option><option value="4">Thu</option><option value="5">Fri</option><option value="6">Sat</option>
                        </select>
                      </div>
                      <div>
                        <label style={{ fontSize: '11px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.1em', color: 'var(--fg-3)', display: 'block', marginBottom: '8px' }}>Day of Month</label>
                        <input type="text" value={scheduleDayOfMonth} onChange={e => setScheduleDayOfMonth(e.target.value || '*')} className="input-void" style={{ width: '100%', padding: '11px 14px', borderRadius: '9px', fontSize: '13px' }} placeholder="* or 1-31" />
                      </div>
                      <div>
                        <label style={{ fontSize: '11px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.1em', color: 'var(--fg-3)', display: 'block', marginBottom: '8px' }}>Month</label>
                        <input type="text" value={scheduleMonth} onChange={e => setScheduleMonth(e.target.value || '*')} className="input-void" style={{ width: '100%', padding: '11px 14px', borderRadius: '9px', fontSize: '13px' }} placeholder="* or 1-12" />
                      </div>
                    </div>
                    <div className="chip" style={{ fontFamily: 'var(--font-mono)', fontSize: '11px', padding: '8px 12px', borderRadius: '8px', justifyContent: 'center' }}>
                      cron: {pm} {ph} {scheduleDayOfMonth} {scheduleMonth} {scheduleWeekday}
                    </div>
                    <div style={{ display: 'flex', gap: '10px', paddingTop: '4px' }}>
                      <button onClick={() => setShowScheduleModal(false)} className="btn-ghost" style={{ flex: 1, padding: '11px', borderRadius: '10px', cursor: 'pointer' }}>Cancel</button>
                      <button onClick={saveSchedule} className="btn-lime" style={{ flex: 1, padding: '11px', borderRadius: '10px', cursor: 'pointer' }}>Create Schedule</button>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {schedules.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '64px 32px', borderRadius: '16px', border: '1px dashed var(--border-dim)', background: 'var(--surface)' }}>
                <Calendar size={40} style={{ color: 'var(--fg-4)', margin: '0 auto 16px' }} />
                <p style={{ color: 'var(--fg-3)', fontSize: '14px', margin: '0 0 8px' }}>No active schedules</p>
                <p style={{ color: 'var(--fg-4)', fontSize: '12px', margin: 0 }}>Set up schedules to continuously monitor repositories.</p>
              </div>
            ) : (
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: '12px' }}>
                {schedules.map(s => (
                  <div key={s.repo} className="glass-card" style={{ borderRadius: '14px', padding: '20px', position: 'relative' }}>
                    <button onClick={() => deleteSchedule(s.repo)} style={{ position: 'absolute', top: '16px', right: '16px', padding: '6px', borderRadius: '7px', border: '1px solid var(--border-void)', background: 'var(--raised)', color: 'var(--fg-3)', cursor: 'pointer' }}>
                      <Trash2 size={13} />
                    </button>
                    <p style={{ fontWeight: 600, margin: '0 0 4px', paddingRight: '36px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', fontSize: '14px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <Github size={14} style={{ color: 'var(--fg-3)', flexShrink: 0 }} />
                      {s.repo.replace('https://github.com/', '')}
                    </p>
                    <div style={{ padding: '12px', borderRadius: '9px', background: 'var(--surface)', border: '1px solid var(--border-void)', marginBottom: '12px', fontSize: '12px' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '6px' }}>
                        <span style={{ color: 'var(--fg-3)' }}>Frequency</span>
                        <span style={{ fontWeight: 600 }}>{formatCron(s.cronExpression)}</span>
                      </div>
                      <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                        <span style={{ color: 'var(--fg-3)' }}>Cron</span>
                        <span className="mono" style={{ fontSize: '11px', color: 'var(--fg-2)' }}>{s.cronExpression}</span>
                      </div>
                    </div>
                    <button onClick={() => runScheduleNow(s.repo)} className="btn-ghost" style={{ width: '100%', padding: '9px', borderRadius: '9px', fontSize: '12px', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '7px', cursor: 'pointer' }}>
                      <PlayCircle size={13} /> Run Now
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* ══════════════════════════════ SETTINGS ══════════════════════════════ */}
        {currentTab === 'settings' && (
          <div style={{ maxWidth: '640px' }}>
            <div style={{ marginBottom: '28px' }}>
              <h2 className="display" style={{ fontSize: '22px', fontWeight: 800, margin: '0 0 4px', letterSpacing: '-0.01em' }}>Settings</h2>
              <p style={{ color: 'var(--fg-3)', fontSize: '13px', margin: 0 }}>Manage tokens, AI keys, and integrations</p>
            </div>

            <form onSubmit={saveSettings} style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              {/* GitHub Token */}
              <div className="glass-card" style={{ borderRadius: '14px', padding: '20px' }}>
                <label style={{ fontSize: '11px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.1em', color: 'var(--fg-3)', display: 'block', marginBottom: '10px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <Github size={12} /> GitHub Token
                </label>
                <div style={{ position: 'relative' }}>
                  <input type={showGithubSettingToken ? 'text' : 'password'} value={settings.githubToken || ''} onChange={e => setSettings({ ...settings, githubToken: e.target.value })} className="input-void input-mono" style={{ width: '100%', padding: '11px 44px 11px 14px', borderRadius: '9px', fontSize: '12px' }} placeholder="ghp_xxxxxxxxxxxxxxxxxxxx" />
                  <button type="button" onClick={() => setShowGithubSettingToken(v => !v)} style={{ position: 'absolute', right: '12px', top: '50%', transform: 'translateY(-50%)', color: 'var(--fg-3)', background: 'none', border: 'none', cursor: 'pointer' }}>{showGithubSettingToken ? <EyeOff size={15} /> : <Eye size={15} />}</button>
                </div>
              </div>

              {/* Groq Key */}
              <div className="glass-card" style={{ borderRadius: '14px', padding: '20px' }}>
                <label style={{ fontSize: '11px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.1em', color: 'var(--fg-3)', display: 'block', marginBottom: '10px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <Brain size={12} /> Groq API Key
                </label>
                <div style={{ position: 'relative' }}>
                  <input type={showGroqKey ? 'text' : 'password'} value={settings.groqApiKey || ''} onChange={e => setSettings({ ...settings, groqApiKey: e.target.value })} className="input-void input-mono" style={{ width: '100%', padding: '11px 44px 11px 14px', borderRadius: '9px', fontSize: '12px' }} placeholder="gsk_xxxxxxxxxxxxxxxxxxxx" />
                  <button type="button" onClick={() => setShowGroqKey(v => !v)} style={{ position: 'absolute', right: '12px', top: '50%', transform: 'translateY(-50%)', color: 'var(--fg-3)', background: 'none', border: 'none', cursor: 'pointer' }}>{showGroqKey ? <EyeOff size={15} /> : <Eye size={15} />}</button>
                </div>
              </div>

              {/* Webhook URL */}
              <div className="glass-card" style={{ borderRadius: '14px', padding: '20px' }}>
                <label style={{ fontSize: '11px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.1em', color: 'var(--fg-3)', display: 'block', marginBottom: '10px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <Bell size={12} /> Webhook URL
                </label>
                <input type="url" value={settings.webhookUrl || ''} onChange={e => setSettings({ ...settings, webhookUrl: e.target.value })} className="input-void" style={{ width: '100%', padding: '11px 14px', borderRadius: '9px', fontSize: '13px' }} placeholder="https://hooks.slack.com/…" />
              </div>

              {/* Webhook Secret */}
              <div className="glass-card" style={{ borderRadius: '14px', padding: '20px' }}>
                <label style={{ fontSize: '11px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.1em', color: 'var(--fg-3)', display: 'block', marginBottom: '10px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <Lock size={12} /> Webhook Secret
                </label>
                <div style={{ position: 'relative' }}>
                  <input type={showWebhookSecret ? 'text' : 'password'} value={settings.webhookSecret || ''} onChange={e => setSettings({ ...settings, webhookSecret: e.target.value })} className="input-void" style={{ width: '100%', padding: '11px 44px 11px 14px', borderRadius: '9px', fontSize: '13px' }} placeholder="Optional HMAC secret" />
                  <button type="button" onClick={() => setShowWebhookSecret(v => !v)} style={{ position: 'absolute', right: '12px', top: '50%', transform: 'translateY(-50%)', color: 'var(--fg-3)', background: 'none', border: 'none', cursor: 'pointer' }}>{showWebhookSecret ? <EyeOff size={15} /> : <Eye size={15} />}</button>
                </div>
              </div>

              {/* Email */}
              <div className="glass-card" style={{ borderRadius: '14px', padding: '20px' }}>
                <label style={{ fontSize: '11px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.1em', color: 'var(--fg-3)', display: 'block', marginBottom: '10px' }}>Email Alerts</label>
                <input type="email" value={settings.email || ''} onChange={e => setSettings({ ...settings, email: e.target.value })} className="input-void" style={{ width: '100%', padding: '11px 14px', borderRadius: '9px', fontSize: '13px' }} placeholder="security@company.com" />
              </div>

              {/* Webhook endpoint */}
              <div className="glass-card" style={{ borderRadius: '14px', padding: '20px', borderColor: 'var(--border-lime)', background: 'rgba(5,226,122,0.03)' }}>
                <label style={{ fontSize: '11px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.1em', color: 'var(--lime)', display: 'block', marginBottom: '10px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <Terminal size={12} /> GitHub App Webhook Endpoint
                </label>
                <div style={{ display: 'flex', gap: '8px' }}>
                  <code className="mono" style={{ flex: 1, padding: '10px 14px', borderRadius: '8px', background: 'var(--surface)', border: '1px solid var(--border-void)', fontSize: '12px', color: 'var(--lime)', overflowX: 'auto', display: 'block' }}>
                    https://fixstack-backend.onrender.com/api/webhook
                  </code>
                  <button type="button" onClick={() => { navigator.clipboard.writeText('https://fixstack-backend.onrender.com/api/webhook'); setCopiedWebhook(true); addToast('Copied!', 'success'); setTimeout(() => setCopiedWebhook(false), 2000); }} className="btn-ghost" style={{ padding: '10px 14px', borderRadius: '8px', fontSize: '12px', display: 'flex', alignItems: 'center', gap: '6px', cursor: 'pointer', flexShrink: 0 }}>
                    {copiedWebhook ? <Check size={13} /> : <Copy size={13} />} {copiedWebhook ? 'Copied' : 'Copy'}
                  </button>
                </div>
                <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '14px' }}>
                  <button type="button" onClick={testWebhook} className="btn-ghost" style={{ padding: '9px 16px', borderRadius: '9px', fontSize: '12px', display: 'flex', alignItems: 'center', gap: '7px', cursor: 'pointer' }}>
                    <Zap size={13} /> Test Webhook
                  </button>
                  <button type="submit" className="btn-lime" style={{ padding: '9px 20px', borderRadius: '9px', fontSize: '13px', display: 'flex', alignItems: 'center', gap: '7px', cursor: 'pointer' }}>
                    <Check size={14} /> Save Settings
                  </button>
                </div>
              </div>
            </form>
          </div>
        )}
      </main>

      {/* ─── Help FAB ─────────────────────────────────────────────────────── */}
      <button onClick={() => setShowHelpModal(true)} className="btn-lime" style={{ position: 'fixed', bottom: '24px', right: '24px', width: '48px', height: '48px', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '18px', fontWeight: 800, zIndex: 30, cursor: 'pointer', padding: 0 }}>
        ?
      </button>

      {/* ─── Help Modal ───────────────────────────────────────────────────── */}
      {showHelpModal && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.8)', backdropFilter: 'blur(8px)', zIndex: 100, padding: '24px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <div className="glass-card-raised animate-slide-up" style={{ width: '100%', maxWidth: '580px', borderRadius: '20px', padding: '28px', position: 'relative' }}>
            <button onClick={() => setShowHelpModal(false)} style={{ position: 'absolute', top: '20px', right: '20px', color: 'var(--fg-3)', background: 'none', border: 'none', cursor: 'pointer' }}><XCircle size={22} /></button>
            <h3 className="display" style={{ fontWeight: 800, fontSize: '18px', margin: '0 0 20px', display: 'flex', alignItems: 'center', gap: '10px' }}>
              <Info size={18} style={{ color: 'var(--lime)' }} /> GitHub Webhook Setup
            </h3>
            <div style={{ color: 'var(--fg-2)', fontSize: '13.5px', lineHeight: 1.7 }}>
              <p style={{ marginBottom: '16px' }}>Configure a GitHub Webhook so FixStack automatically scans on every push or PR.</p>
              <ol style={{ paddingLeft: '20px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
                {[
                  'Go to your GitHub repo → Settings → Webhooks → Add webhook',
                  <>Set Payload URL to: <code className="mono" style={{ background: 'var(--raised)', padding: '2px 7px', borderRadius: '5px', fontSize: '12px', color: 'var(--lime)' }}>https://fixstack-backend.onrender.com/api/webhook</code></>,
                  <>Content type: <code className="mono" style={{ background: 'var(--raised)', padding: '2px 7px', borderRadius: '5px', fontSize: '12px' }}>application/json</code></>,
                  'Set Secret to match GITHUB_WEBHOOK_SECRET in your Settings',
                  'Events: select Pushes and Pull requests',
                  'Ensure Active is checked and click Add webhook'
                ].map((item, i) => <li key={i}>{item}</li>)}
              </ol>
              <div style={{ marginTop: '20px', padding: '14px', borderRadius: '10px', background: 'var(--lime-dim)', border: '1px solid var(--border-lime)', color: 'var(--fg-2)', fontSize: '12.5px' }}>
                <strong style={{ color: 'var(--lime)' }}>Note:</strong> FixStack ignores pushes that don't touch dependency files, saving resources.
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ─── Toasts ───────────────────────────────────────────────────────── */}
      <div style={{ position: 'fixed', top: '20px', right: '20px', zIndex: 9999, display: 'flex', flexDirection: 'column', gap: '8px', pointerEvents: 'none' }}>
        {toasts.map(t => (
          <div key={t.id} className={`toast toast-${t.type} animate-slide-up`} style={{ pointerEvents: 'auto' }}>
            {t.type === 'error' ? <AlertCircle size={14} /> : t.type === 'success' ? <CheckCircle2 size={14} /> : <Info size={14} />}
            {t.message}
          </div>
        ))}
      </div>
    </div>
  );
}
