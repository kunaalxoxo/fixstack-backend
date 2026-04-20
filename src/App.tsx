import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence, useMotionValue, useTransform, useSpring } from 'framer-motion';
import { fixstackApi } from './api';
import { Run, RunEvent } from './types';
import {
  Shield, Play, Loader2, CheckCircle2, AlertCircle, Clock, History, GitBranch as Github,
  ArrowRight, Activity, Box, XCircle, LogOut, Settings as SettingsIcon,
  Calendar, Building, Bell, LayoutDashboard, Brain, Flame, Info, Search,
  Trash2, Copy, PlayCircle, Zap, Check, Skull, AlertTriangle, RefreshCw, Menu, Lock, Eye, EyeOff,
  ChevronRight, Terminal, Sparkles
} from 'lucide-react';

// ─── Animation Variants ────────────────────────────────────────────────────────

const fadeInUp = {
  hidden: { opacity: 0, y: 20 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.5, ease: [0.22, 1, 0.36, 1] } }
};

const staggerContainer = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: { staggerChildren: 0.08, delayChildren: 0.1 }
  }
};

const scaleIn = {
  hidden: { opacity: 0, scale: 0.9 },
  visible: { opacity: 1, scale: 1, transition: { duration: 0.4, ease: [0.22, 1, 0.36, 1] } }
};

const slideInRight = {
  hidden: { opacity: 0, x: -20 },
  visible: { opacity: 1, x: 0, transition: { duration: 0.4, ease: [0.22, 1, 0.36, 1] } }
};

const glowPulse = {
  animate: {
    boxShadow: [
      '0 0 20px -5px rgba(0, 255, 140, 0.3)',
      '0 0 40px -5px rgba(0, 255, 140, 0.5)',
      '0 0 20px -5px rgba(0, 255, 140, 0.3)',
    ],
    transition: { duration: 2, repeat: Infinity, ease: 'easeInOut' }
  }
};

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
  return <motion.span initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5 }}>{disp}</motion.span>;
};

// Animated background orbs
const BackgroundOrbs = () => (
  <div className="fixed inset-0 overflow-hidden pointer-events-none">
    <motion.div
      className="orb-glow"
      style={{ width: 600, height: 600, background: 'var(--lime)', top: '-20%', left: '-10%' }}
      animate={{ x: [0, 50, 0], y: [0, 30, 0] }}
      transition={{ duration: 20, repeat: Infinity, ease: 'easeInOut' }}
    />
    <motion.div
      className="orb-glow"
      style={{ width: 400, height: 400, background: 'var(--cyan)', bottom: '10%', right: '-5%' }}
      animate={{ x: [0, -30, 0], y: [0, -50, 0] }}
      transition={{ duration: 15, repeat: Infinity, ease: 'easeInOut' }}
    />
    <motion.div
      className="orb-glow"
      style={{ width: 300, height: 300, background: 'var(--violet)', top: '40%', right: '20%' }}
      animate={{ x: [0, 40, 0], y: [0, -20, 0] }}
      transition={{ duration: 18, repeat: Infinity, ease: 'easeInOut' }}
    />
  </div>
);

// Severity gauge visualization
const SeverityGauge = ({ critical, high, medium, low }: { critical: number; high: number; medium: number; low: number }) => {
  const total = critical + high + medium + low || 1;
  const radius = 60;
  const circumference = 2 * Math.PI * radius;
  
  const segments = [
    { value: critical, color: 'var(--red)', label: 'Critical' },
    { value: high, color: 'var(--orange)', label: 'High' },
    { value: medium, color: 'var(--amber)', label: 'Medium' },
    { value: low, color: 'var(--blue)', label: 'Low' },
  ];

  let offset = 0;
  
  return (
    <div className="flex items-center gap-8">
      <div className="relative" style={{ width: 150, height: 150 }}>
        <svg width="150" height="150" viewBox="0 0 150 150">
          <circle cx="75" cy="75" r={radius} fill="none" stroke="var(--border-dim)" strokeWidth="12" />
          {segments.map((seg, i) => {
            const segLength = (seg.value / total) * circumference;
            const currentOffset = offset;
            offset += segLength;
            return (
              <motion.circle
                key={i}
                cx="75"
                cy="75"
                r={radius}
                fill="none"
                stroke={seg.color}
                strokeWidth="12"
                strokeLinecap="round"
                strokeDasharray={`${segLength} ${circumference}`}
                strokeDashoffset={-currentOffset}
                style={{ transformOrigin: 'center', transform: 'rotate(-90deg)' }}
                initial={{ strokeDasharray: `0 ${circumference}` }}
                animate={{ strokeDasharray: `${segLength} ${circumference}` }}
                transition={{ duration: 1, delay: i * 0.15, ease: [0.22, 1, 0.36, 1] }}
              />
            );
          })}
        </svg>
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <motion.span
            className="display text-3xl font-extrabold"
            style={{ color: 'var(--fg)' }}
            initial={{ scale: 0.5, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ delay: 0.3, duration: 0.5 }}
          >
            {total}
          </motion.span>
          <span className="text-xs uppercase tracking-wider" style={{ color: 'var(--fg-3)' }}>Total</span>
        </div>
      </div>
      <div className="flex flex-col gap-2">
        {segments.map((seg, i) => (
          <motion.div
            key={i}
            className="flex items-center gap-3"
            initial={{ opacity: 0, x: -10 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.5 + i * 0.1 }}
          >
            <div className="w-3 h-3 rounded-full" style={{ background: seg.color, boxShadow: `0 0 10px ${seg.color}40` }} />
            <span className="text-sm" style={{ color: 'var(--fg-2)' }}>{seg.label}</span>
            <span className="font-mono font-bold" style={{ color: seg.color }}>{seg.value}</span>
          </motion.div>
        ))}
      </div>
    </div>
  );
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

const TimelineEventCard = ({ event, run, index }: { event: RunEvent; run: Run; index: number }) => {
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

  const cardClass = isPR ? 'pr-card' :
    isRetryWarn ? 'event-card retry-warn' :
    isRetryOk   ? 'event-card retry-success' :
    `event-card status-${event.status.toLowerCase()}`;

  return (
    <motion.div
      className="relative flex items-start gap-4 mb-5"
      initial={{ opacity: 0, x: -20 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ delay: index * 0.05, duration: 0.4, ease: [0.22, 1, 0.36, 1] }}
    >
      {/* Avatar */}
      <motion.div
        className="agent-avatar shrink-0"
        style={{ background: meta.bg }}
        whileHover={{ scale: 1.1 }}
        transition={{ type: 'spring', stiffness: 400, damping: 17 }}
      >
        {meta.initials}
      </motion.div>

      {/* Card */}
      <motion.div
        className={`flex-1 ${cardClass} p-4`}
        style={{ borderRadius: '14px' }}
        whileHover={{ x: 4 }}
        transition={{ type: 'spring', stiffness: 400, damping: 25 }}
      >
        {isPR ? (
          <div style={{ position: 'relative', zIndex: 1 }}>
            <motion.p
              className="display"
              style={{ fontSize: '20px', fontWeight: 800, color: 'var(--lime)', marginBottom: '8px' }}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2 }}
            >
              <Sparkles className="inline mr-2" size={18} /> Pull Request Created
            </motion.p>
            <p style={{ color: 'var(--fg-2)', marginBottom: '20px', fontSize: '14px' }}>{event.message}</p>
            {run.prUrl && (
              <motion.a
                href={run.prUrl}
                target="_blank"
                rel="noopener noreferrer"
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
              >
                <button className="btn-lime" style={{ display: 'inline-flex', alignItems: 'center', gap: '8px', padding: '12px 24px', borderRadius: '12px', fontSize: '13px' }}>
                  <Github size={16} /> View PR on GitHub
                  <ArrowRight size={14} />
                </button>
              </motion.a>
            )}
          </div>
        ) : (
          <>
            {/* Header row */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px', flexWrap: 'wrap' }}>
              <span className="chip display" style={{ fontFamily: 'var(--font-display)', fontSize: '10px', letterSpacing: '0.08em', background: meta.bg + '22', color: 'var(--fg)', borderColor: meta.bg + '44' }}>
                {event.agentName}
              </span>
              <span className="mono" style={{ fontSize: '12px', color: 'var(--fg-3)' }}>-&gt;</span>
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
              <motion.div
                style={{ marginTop: '10px', display: 'flex', alignItems: 'center', gap: '8px' }}
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.3 }}
              >
                <span className={`chip ${event.metadata.confidence === 'HIGH' ? 'badge-lime' : event.metadata.confidence === 'MEDIUM' ? 'badge-medium' : 'badge-high'}`}>
                  {event.metadata.confidence} CONF
                </span>
                {event.metadata.affectedFiles?.length > 0 && (
                  <span className="chip">{event.metadata.affectedFiles.length} files</span>
                )}
              </motion.div>
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
      </motion.div>
    </motion.div>
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

  // Mouse tracking for interactive effects
  const mouseX = useMotionValue(0);
  const mouseY = useMotionValue(0);
  const springConfig = { damping: 25, stiffness: 150 };
  const mouseXSpring = useSpring(mouseX, springConfig);
  const mouseYSpring = useSpring(mouseY, springConfig);

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      mouseX.set(e.clientX);
      mouseY.set(e.clientY);
    };
    window.addEventListener('mousemove', handleMouseMove);
    return () => window.removeEventListener('mousemove', handleMouseMove);
  }, []);

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
      setError('Enter a valid GitHub URL (https://github.com/...)');
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
    if (!isWildcardOrInRange(dom, 1, 31)) { addToast('Day must be * or 1-31', 'error'); return; }
    if (!isWildcardOrInRange(mon, 1, 12)) { addToast('Month must be * or 1-12', 'error'); return; }
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

  const formatCron = (c: string) => ({ '0 0 * * *': 'Daily at midnight', '0 0 * * 0': 'Weekly - Sunday', '0 0 * * 1': 'Weekly - Monday', '0 * * * *': 'Every hour' }[c] || c);

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
        <BackgroundOrbs />
        
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
          style={{ width: '100%', maxWidth: '440px', position: 'relative', zIndex: 10 }}
        >

          {/* Logo */}
          <motion.div
            style={{ textAlign: 'center', marginBottom: '40px' }}
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: 0.2, duration: 0.5 }}
          >
            <motion.div
              style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center', width: '64px', height: '64px', borderRadius: '18px', background: 'var(--lime-dim)', border: '1px solid var(--border-lime)', marginBottom: '24px' }}
              animate={{ 
                boxShadow: ['0 0 30px var(--lime-glow)', '0 0 50px var(--lime-glow-strong)', '0 0 30px var(--lime-glow)'],
                y: [0, -8, 0]
              }}
              transition={{ duration: 3, repeat: Infinity, ease: 'easeInOut' }}
            >
              <Shield size={28} style={{ color: 'var(--lime)' }} />
            </motion.div>
            <h1 className="display" style={{ fontSize: '36px', fontWeight: 800, margin: 0, letterSpacing: '-0.03em' }}>
              <span className="gradient-text">FixStack</span>
            </h1>
            <p style={{ color: 'var(--fg-3)', marginTop: '8px', fontSize: '14px' }}>
              Autonomous dependency security agent
            </p>
          </motion.div>

          {/* Card */}
          <motion.div
            className="glass-card gradient-border"
            style={{ borderRadius: '24px', padding: '36px' }}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3, duration: 0.5 }}
          >
            <p className="section-heading" style={{ marginBottom: '24px' }}>Connect GitHub</p>

            <form onSubmit={handleGithubLogin} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
              <div style={{ position: 'relative' }}>
                <Lock size={15} style={{ position: 'absolute', left: '16px', top: '50%', transform: 'translateY(-50%)', color: 'var(--fg-3)' }} />
                <motion.input
                  type={showLoginPat ? 'text' : 'password'}
                  value={githubToken}
                  onChange={e => setGithubToken(e.target.value)}
                  placeholder="ghp_xxxxxxxxxxxxxxxxxxxx"
                  autoFocus
                  className="input-void input-mono"
                  style={{ width: '100%', padding: '14px 48px', borderRadius: '12px', fontSize: '13px' }}
                  whileFocus={{ scale: 1.01 }}
                />
                <button type="button" onClick={() => setShowLoginPat(v => !v)} style={{ position: 'absolute', right: '14px', top: '50%', transform: 'translateY(-50%)', color: 'var(--fg-3)', background: 'none', border: 'none', cursor: 'pointer', padding: '4px' }}>
                  {showLoginPat ? <EyeOff size={15} /> : <Eye size={15} />}
                </button>
              </div>

              <motion.button
                type="submit"
                disabled={isRepoLoading}
                className="btn-lime"
                style={{ padding: '15px', borderRadius: '12px', fontSize: '14px', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '10px', cursor: isRepoLoading ? 'not-allowed' : 'pointer', opacity: isRepoLoading ? 0.7 : 1 }}
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
              >
                {isRepoLoading ? <><Loader2 size={16} className="animate-spin" /> Connecting...</> : <><Github size={16} /> Connect GitHub</>}
              </motion.button>
            </form>

            {/* Features */}
            <motion.div
              style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', marginTop: '28px', justifyContent: 'center' }}
              variants={staggerContainer}
              initial="hidden"
              animate="visible"
            >
              {['CVE Detection', 'AI Context', 'Auto PRs', 'Self-Correcting'].map((f, i) => (
                <motion.span
                  key={f}
                  className="chip"
                  style={{ fontSize: '11px' }}
                  variants={fadeInUp}
                >
                  <span style={{ color: 'var(--lime)', fontSize: '8px' }}>●</span> {f}
                </motion.span>
              ))}
            </motion.div>
          </motion.div>

          <motion.p
            style={{ textAlign: 'center', marginTop: '20px', fontSize: '12px', color: 'var(--fg-3)' }}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.5 }}
          >
            Requires a PAT with <code style={{ color: 'var(--fg-2)', fontSize: '11px', background: 'var(--surface)', padding: '2px 6px', borderRadius: '4px' }}>repo</code> scope.{' '}
            <a href="https://github.com/settings/personal-access-tokens/new" target="_blank" rel="noopener noreferrer" style={{ color: 'var(--lime)', textDecoration: 'none' }}>
              Generate one -&gt;
            </a>
          </motion.p>
        </motion.div>

        {/* Toasts */}
        <div style={{ position: 'fixed', top: '20px', right: '20px', zIndex: 9999, display: 'flex', flexDirection: 'column', gap: '8px' }}>
          <AnimatePresence>
            {toasts.map(t => (
              <motion.div
                key={t.id}
                className={`toast toast-${t.type}`}
                initial={{ opacity: 0, x: 50 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: 50 }}
                transition={{ duration: 0.3 }}
              >
                {t.type === 'error' ? <AlertCircle size={14} /> : t.type === 'success' ? <CheckCircle2 size={14} /> : <Info size={14} />}
                {t.message}
              </motion.div>
            ))}
          </AnimatePresence>
        </div>
      </div>
    );
  }

  // ─────────────────────────────────────────────────────────────────────────────
  // ─── AUTHENTICATED LAYOUT ─────────────────────────────────────────────────────
  // ─────────────────────────────────────────────────────────────────────────────
  return (
    <div style={{ minHeight: '100vh', background: 'var(--void)', display: 'flex' }}>
      <BackgroundOrbs />

      {/* Mobile overlay */}
      <AnimatePresence>
        {sidebarOpen && (
          <motion.div
            onClick={() => setSidebarOpen(false)}
            style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.8)', zIndex: 40, backdropFilter: 'blur(8px)' }}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
          />
        )}
      </AnimatePresence>

      {/* ─── SIDEBAR ─────────────────────────────────────────────────────── */}
      <motion.aside
        style={{
          position: 'fixed', inset: '0 auto 0 0',
          width: sidebarOpen ? '280px' : '0',
          zIndex: 50,
          background: 'linear-gradient(180deg, rgba(4, 6, 16, 0.98) 0%, rgba(8, 12, 26, 0.98) 100%)',
          backdropFilter: 'blur(40px)',
          borderRight: '1px solid var(--border-dim)',
          display: 'flex', flexDirection: 'column',
          transition: 'width 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
          overflow: 'hidden',
        }}
        className="md-sidebar"
      >
        <style>{`
          @media (min-width: 768px) {
            .md-sidebar { width: 80px !important; }
          }
          @media (min-width: 1200px) {
            .md-sidebar { width: 280px !important; }
          }
          @media (max-width: 767px) {
            .md-sidebar { width: ${sidebarOpen ? '280px' : '0'} !important; }
          }
          .sidebar-label { display: none; }
          @media (min-width: 1200px) { .sidebar-label { display: inline; } }
          @media (max-width: 767px) { .sidebar-label { display: ${sidebarOpen ? 'inline' : 'none'}; } }
        `}</style>

        {/* Logo */}
        <div style={{ padding: '24px 20px', borderBottom: '1px solid var(--border-void)', display: 'flex', alignItems: 'center', gap: '14px', minHeight: '72px' }}>
          <motion.div
            style={{ width: '40px', height: '40px', borderRadius: '12px', background: 'var(--lime-dim)', border: '1px solid var(--border-lime)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}
            whileHover={{ scale: 1.05 }}
            animate={{ boxShadow: ['0 0 20px var(--lime-glow)', '0 0 30px var(--lime-glow-strong)', '0 0 20px var(--lime-glow)'] }}
            transition={{ duration: 2, repeat: Infinity }}
          >
            <Shield size={18} style={{ color: 'var(--lime)' }} />
          </motion.div>
          <span className="display sidebar-label" style={{ fontWeight: 800, fontSize: '18px', color: 'var(--fg)', letterSpacing: '-0.01em', whiteSpace: 'nowrap' }}>
            Fix<span style={{ color: 'var(--lime)' }}>Stack</span>
          </span>
        </div>

        {/* Nav */}
        <nav style={{ flex: 1, padding: '16px 12px', display: 'flex', flexDirection: 'column', gap: '4px' }}>
          {tabs.map((tab, i) => (
            <motion.button
              key={tab.id}
              onClick={() => { setCurrentTab(tab.id); setSidebarOpen(false); }}
              className={`nav-item ${currentTab === tab.id ? 'active' : ''}`}
              whileHover={{ x: 4 }}
              whileTap={{ scale: 0.98 }}
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: i * 0.05 }}
            >
              <tab.icon size={18} style={{ flexShrink: 0 }} />
              <span className="sidebar-label" style={{ whiteSpace: 'nowrap', fontSize: '14px' }}>{tab.label}</span>
            </motion.button>
          ))}
        </nav>

        {/* Running indicator */}
        <AnimatePresence>
          {currentRun?.status === 'RUNNING' && (
            <motion.div
              style={{ margin: '0 12px 10px', padding: '12px 14px', borderRadius: '12px', background: 'var(--lime-dim)', border: '1px solid var(--border-lime)', display: 'flex', alignItems: 'center', gap: '12px' }}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 10 }}
            >
              <div className="running-dot" />
              <span className="sidebar-label mono" style={{ fontSize: '11px', color: 'var(--lime)', whiteSpace: 'nowrap' }}>Scan running...</span>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Logout */}
        <div style={{ padding: '12px', borderTop: '1px solid var(--border-void)' }}>
          <motion.button
            onClick={handleLogout}
            className="nav-item"
            style={{ width: '100%' }}
            whileHover={{ x: 4 }}
            whileTap={{ scale: 0.98 }}
          >
            <LogOut size={17} style={{ flexShrink: 0 }} />
            <span className="sidebar-label" style={{ whiteSpace: 'nowrap' }}>Disconnect</span>
          </motion.button>
        </div>
      </motion.aside>

      {/* ─── MAIN CONTENT ────────────────────────────────────────────────── */}
      <main style={{
        flex: 1,
        marginLeft: 0,
        padding: '24px 20px',
        minHeight: '100vh',
        position: 'relative',
        zIndex: 10,
      }} className="main-content">
        <style>{`
          @media (min-width: 768px) { .main-content { margin-left: 80px !important; padding: 32px 36px !important; } }
          @media (min-width: 1200px) { .main-content { margin-left: 280px !important; padding: 36px 48px !important; } }
        `}</style>

        {/* Mobile top bar */}
        <div className="mobile-bar" style={{ display: 'none', alignItems: 'center', justifyContent: 'space-between', marginBottom: '24px' }}>
          <style>{`.mobile-bar { display: flex !important; } @media (min-width: 768px) { .mobile-bar { display: none !important; } }`}</style>
          <motion.button
            onClick={() => setSidebarOpen(true)}
            style={{ padding: '10px', borderRadius: '10px', border: '1px solid var(--border-dim)', background: 'var(--raised)', color: 'var(--fg-2)' }}
            whileTap={{ scale: 0.95 }}
          >
            <Menu size={18} />
          </motion.button>
          <span className="display" style={{ fontWeight: 700, fontSize: '17px' }}>Fix<span style={{ color: 'var(--lime)' }}>Stack</span></span>
          <motion.button onClick={handleLogout} style={{ padding: '10px', background: 'none', border: 'none', color: 'var(--fg-3)' }} whileTap={{ scale: 0.95 }}><LogOut size={18} /></motion.button>
        </div>

        {/* ══════════════════════════════ DASHBOARD ══════════════════════════════ */}
        <AnimatePresence mode="wait">
          {currentTab === 'dashboard' && !currentRun && (
            <motion.div
              key="dashboard-home"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              style={{ maxWidth: '960px' }}
            >

              {/* Hero */}
              <motion.div
                style={{ marginBottom: '40px' }}
                variants={staggerContainer}
                initial="hidden"
                animate="visible"
              >
                <motion.div variants={fadeInUp} style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '16px' }}>
                  <span className="chip badge-lime"><Sparkles size={10} /> v1.0 LIVE</span>
                  <span className="chip">Groq + OSV.dev + NVD</span>
                </motion.div>
                <motion.h1
                  className="display"
                  style={{ fontSize: 'clamp(32px, 5vw, 52px)', fontWeight: 800, lineHeight: 1.1, letterSpacing: '-0.03em', margin: 0 }}
                  variants={fadeInUp}
                >
                  Autonomous Dependency<br />
                  <span className="gradient-text">Security Agent</span>
                </motion.h1>
                <motion.p
                  style={{ color: 'var(--fg-2)', marginTop: '16px', fontSize: '16px', maxWidth: '560px', lineHeight: 1.7 }}
                  variants={fadeInUp}
                >
                  Scans repos, analyzes exploitability with AI context, and ships remediation PRs - automatically.
                </motion.p>
              </motion.div>

              {/* Scan cards */}
              <motion.div
                style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '20px', marginBottom: '28px' }}
                variants={staggerContainer}
                initial="hidden"
                animate="visible"
              >

                {/* Repo scan */}
                <motion.div className="glass-card" style={{ borderRadius: '20px', padding: '28px' }} variants={scaleIn} whileHover={{ y: -4 }} transition={{ type: 'spring', stiffness: 300 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '24px' }}>
                    <div style={{ width: '36px', height: '36px', borderRadius: '10px', background: 'rgba(37,99,235,0.15)', border: '1px solid rgba(37,99,235,0.25)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                      <Github size={16} style={{ color: '#3b82f6' }} />
                    </div>
                    <div>
                      <p style={{ fontWeight: 600, fontSize: '15px', margin: 0 }}>Repository Scan</p>
                      <p style={{ fontSize: '12px', color: 'var(--fg-3)', margin: 0 }}>Select from your GitHub repos</p>
                    </div>
                  </div>

                  {githubRepos.length > 0 ? (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                      <select
                        value={selectedRepo}
                        onChange={e => { const url = e.target.value; setSelectedRepo(url); if (url) { setRepoUrl(url); setError(null); startScan(false, url); } }}
                        disabled={isLoading}
                        className="input-void"
                        style={{ width: '100%', padding: '13px 16px', borderRadius: '10px', fontSize: '13px', cursor: 'pointer' }}
                      >
                        <option value="">Select a repository...</option>
                        {githubRepos.map(r => <option key={r.id} value={r.html_url}>{r.full_name}{r.private ? ' [private]' : ''}</option>)}
                      </select>
                      <motion.button
                        onClick={() => loginWithGithubToken(githubToken)}
                        disabled={isRepoLoading}
                        className="btn-ghost"
                        style={{ padding: '11px', borderRadius: '10px', fontSize: '12px', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', cursor: 'pointer' }}
                        whileHover={{ scale: 1.01 }}
                        whileTap={{ scale: 0.99 }}
                      >
                        {isRepoLoading ? <Loader2 size={13} className="animate-spin" /> : <RefreshCw size={13} />} Refresh repos
                      </motion.button>
                    </div>
                  ) : (
                    <div style={{ padding: '20px', borderRadius: '10px', background: 'var(--surface)', color: 'var(--fg-3)', fontSize: '13px', textAlign: 'center' }}>
                      No repositories found.
                    </div>
                  )}
                </motion.div>

                {/* Org scan */}
                <motion.div className="glass-card" style={{ borderRadius: '20px', padding: '28px' }} variants={scaleIn} whileHover={{ y: -4 }} transition={{ type: 'spring', stiffness: 300 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '24px' }}>
                    <div style={{ width: '36px', height: '36px', borderRadius: '10px', background: 'rgba(167,139,250,0.15)', border: '1px solid rgba(167,139,250,0.25)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                      <Building size={16} style={{ color: 'var(--violet)' }} />
                    </div>
                    <div>
                      <p style={{ fontWeight: 600, fontSize: '15px', margin: 0 }}>Organization Scan</p>
                      <p style={{ fontSize: '12px', color: 'var(--fg-3)', margin: 0 }}>Queue all public repos</p>
                    </div>
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                    <input
                      type="text"
                      placeholder="e.g. facebook"
                      value={orgName}
                      onChange={e => { setOrgName(e.target.value); setError(null); }}
                      disabled={isLoading}
                      className="input-void"
                      style={{ width: '100%', padding: '13px 16px', borderRadius: '10px', fontSize: '13px' }}
                    />
                    <motion.button
                      onClick={startOrgScan}
                      disabled={isLoading || !orgName}
                      className="btn-ghost"
                      style={{ padding: '12px', borderRadius: '10px', fontSize: '13px', fontWeight: 600, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', cursor: isLoading || !orgName ? 'not-allowed' : 'pointer', opacity: isLoading || !orgName ? 0.5 : 1 }}
                      whileHover={!isLoading && orgName ? { scale: 1.01 } : {}}
                      whileTap={!isLoading && orgName ? { scale: 0.99 } : {}}
                    >
                      {isLoading ? <Loader2 size={14} className="animate-spin" /> : <Play size={14} />} Queue Org Scan
                    </motion.button>
                  </div>
                </motion.div>
              </motion.div>

              {/* Error */}
              <AnimatePresence>
                {error && (
                  <motion.div
                    style={{ padding: '14px 18px', borderRadius: '12px', background: 'var(--red-dim)', border: '1px solid rgba(255,68,102,0.3)', color: 'var(--red)', fontSize: '13px', marginBottom: '24px', display: 'flex', alignItems: 'center', gap: '10px' }}
                    initial={{ opacity: 0, y: -10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -10 }}
                  >
                    <AlertCircle size={15} /> {error}
                  </motion.div>
                )}
              </AnimatePresence>

              {/* Demo + How it works */}
              <motion.div
                style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}
                variants={staggerContainer}
                initial="hidden"
                animate="visible"
              >
                <motion.button
                  onClick={() => startScan(true)}
                  disabled={isLoading}
                  className="btn-lime"
                  style={{ padding: '16px 28px', borderRadius: '14px', fontSize: '15px', display: 'inline-flex', alignItems: 'center', gap: '12px', cursor: isLoading ? 'not-allowed' : 'pointer', width: 'fit-content', opacity: isLoading ? 0.7 : 1 }}
                  variants={fadeInUp}
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                >
                  <Zap size={18} /> Run Live Demo - lodash + axios CVEs
                </motion.button>

                <motion.div className="glass-card" style={{ borderRadius: '20px', padding: '28px' }} variants={fadeInUp}>
                  <p className="section-heading">How it works</p>
                  <motion.div
                    style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '14px' }}
                    variants={staggerContainer}
                  >
                    {[
                      { icon: Box,      label: 'Fetch Deps',  desc: 'Parses manifests',     color: '#2563EB' },
                      { icon: Search,   label: 'Scan CVEs',   desc: 'OSV.dev + NVD',        color: '#7C3AED' },
                      { icon: Brain,    label: 'AI Context',  desc: 'Call graph analysis',  color: '#0891B2' },
                      { icon: Github,   label: 'Open PR',     desc: 'Automated patch',       color: '#059669' },
                    ].map((s, i) => (
                      <motion.div
                        key={s.label}
                        variants={scaleIn}
                        style={{ padding: '20px', borderRadius: '14px', background: 'var(--surface)', border: '1px solid var(--border-void)' }}
                        whileHover={{ y: -4, borderColor: s.color + '44' }}
                        transition={{ type: 'spring', stiffness: 300 }}
                      >
                        <div style={{ width: '32px', height: '32px', borderRadius: '9px', background: s.color + '22', border: `1px solid ${s.color}44`, display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: '12px' }}>
                          <s.icon size={15} style={{ color: s.color }} />
                        </div>
                        <p style={{ fontWeight: 600, fontSize: '14px', margin: '0 0 4px' }}>{s.label}</p>
                        <p style={{ fontSize: '12px', color: 'var(--fg-3)', margin: 0 }}>{s.desc}</p>
                      </motion.div>
                    ))}
                  </motion.div>
                </motion.div>
              </motion.div>
            </motion.div>
          )}

          {/* ══════════════════════════════ SCAN RUNNING / DONE ══════════════════════════════ */}
          {currentTab === 'dashboard' && currentRun && (
            <motion.div
              key="dashboard-run"
              style={{ maxWidth: '960px' }}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
            >

              {/* Sticky run header */}
              <motion.div
                className="glass-card-raised"
                style={{ position: 'sticky', top: 0, zIndex: 20, borderRadius: '18px', padding: '20px 24px', marginBottom: '28px' }}
                initial={{ opacity: 0, y: -20 }}
                animate={{ opacity: 1, y: 0 }}
              >
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '16px', marginBottom: '18px' }}>
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: '24px' }}>
                    <div>
                      <p style={{ fontSize: '10px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.12em', color: 'var(--fg-3)', margin: '0 0 4px' }}>Repository</p>
                      <p style={{ fontWeight: 600, margin: 0, display: 'flex', alignItems: 'center', gap: '8px', fontSize: '14px' }}>
                        <Github size={14} style={{ color: 'var(--fg-3)' }} /> {currentRun.input.repoName}
                      </p>
                    </div>
                    <div>
                      <p style={{ fontSize: '10px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.12em', color: 'var(--fg-3)', margin: '0 0 4px' }}>Run ID</p>
                      <p className="mono" style={{ margin: 0, fontSize: '12px', color: 'var(--fg-2)' }}>{currentRun.id.slice(0, 10)}</p>
                    </div>
                    <div>
                      <p style={{ fontSize: '10px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.12em', color: 'var(--fg-3)', margin: '0 0 4px' }}>Duration</p>
                      <p className="mono" style={{ margin: 0, fontSize: '13px', color: 'var(--lime)', display: 'flex', alignItems: 'center', gap: '6px' }}>
                        <Clock size={12} /> {duration}s
                      </p>
                    </div>
                  </div>
                  <motion.span
                    className={`chip ${currentRun.status === 'COMPLETED' ? 'badge-lime' : currentRun.status === 'FAILED' ? 'badge-critical' : 'badge-info'}`}
                    style={{ fontSize: '11px', padding: '6px 14px', borderRadius: '99px' }}
                    animate={currentRun.status === 'RUNNING' ? { scale: [1, 1.02, 1] } : {}}
                    transition={{ duration: 1.5, repeat: Infinity }}
                  >
                    {currentRun.status === 'RUNNING' && <span className="running-dot" style={{ width: '6px', height: '6px', marginRight: '8px' }} />}
                    {currentRun.status}
                  </motion.span>
                </div>

                {/* Steps */}
                <div style={{ display: 'flex', gap: '8px' }}>
                  {STEPS.map((step, i) => {
                    const cur = getScanStep();
                    return (
                      <motion.div
                        key={step}
                        className={`scan-step ${i < cur || currentRun.status === 'COMPLETED' ? 'done' : i === cur && currentRun.status !== 'COMPLETED' ? 'active' : ''}`}
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: i * 0.1 }}
                      >
                        {(i < cur || currentRun.status === 'COMPLETED') ? <Check size={11} style={{ display: 'inline', verticalAlign: 'middle', marginRight: '4px' }} /> : null}
                        {step}
                      </motion.div>
                    );
                  })}
                </div>
              </motion.div>

              {/* Timeline */}
              <motion.div
                className="glass-card"
                style={{ borderRadius: '20px', padding: '28px', marginBottom: '28px' }}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.2 }}
              >
                <p style={{ display: 'flex', alignItems: 'center', gap: '10px', fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: '16px', margin: '0 0 28px', color: 'var(--fg)' }}>
                  <Activity size={18} style={{ color: 'var(--lime)' }} /> Live Agent Timeline
                </p>

                <div style={{ position: 'relative', paddingLeft: '28px' }}>
                  {/* Timeline line */}
                  {events.length > 0 && (
                    <motion.div
                      style={{ position: 'absolute', left: '20px', top: '4px', bottom: '20px', width: '2px', background: 'linear-gradient(to bottom, var(--lime), var(--lime-glow), transparent)', borderRadius: '2px' }}
                      initial={{ scaleY: 0 }}
                      animate={{ scaleY: 1 }}
                      transition={{ duration: 0.5 }}
                    />
                  )}

                  {events.length === 0 && currentRun.status === 'PENDING' ? (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
                      {[1,2,3].map(i => <div key={i} className="skeleton" style={{ height: '80px' }} />)}
                    </div>
                  ) : (
                    events.map((ev, idx) => (
                      <TimelineEventCard key={ev.id} event={ev} run={currentRun} index={idx} />
                    ))
                  )}

                  {currentRun.status === 'RUNNING' && (
                    <motion.div
                      style={{ display: 'flex', alignItems: 'center', gap: '14px', marginTop: '12px' }}
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                    >
                      <div style={{ width: '42px', height: '42px', borderRadius: '12px', border: '1px solid var(--border-dim)', background: 'var(--surface)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                        <Loader2 size={18} className="animate-spin" style={{ color: 'var(--lime)' }} />
                      </div>
                      <p style={{ color: 'var(--fg-3)', fontStyle: 'italic', fontSize: '13px' }}>Agents processing...</p>
                    </motion.div>
                  )}
                </div>
              </motion.div>

              {/* ── Results ── */}
              {currentRun.status === 'COMPLETED' && (
                <motion.div
                  style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}
                  variants={staggerContainer}
                  initial="hidden"
                  animate="visible"
                >

                  {/* Severity Gauge + Stats */}
                  <motion.div
                    className="glass-card"
                    style={{ borderRadius: '20px', padding: '32px' }}
                    variants={fadeInUp}
                  >
                    <p className="section-heading" style={{ marginBottom: '24px' }}>Vulnerability Overview</p>
                    <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-8">
                      <SeverityGauge
                        critical={currentRun.vulnerabilities.filter((v: any) => v.severity.toUpperCase() === 'CRITICAL').length}
                        high={currentRun.vulnerabilities.filter((v: any) => v.severity.toUpperCase() === 'HIGH').length}
                        medium={currentRun.vulnerabilities.filter((v: any) => v.severity.toUpperCase() === 'MEDIUM').length}
                        low={currentRun.vulnerabilities.filter((v: any) => v.severity.toUpperCase() === 'LOW').length}
                      />
                      
                      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '14px' }}>
                        <motion.div className="stat-card" variants={scaleIn}>
                          <div className="stat-value" style={{ color: 'var(--fg)' }}><AnimatedNumber value={currentRun.vulnerabilities.length} /></div>
                          <div className="stat-label">Vulns Found</div>
                        </motion.div>
                        <motion.div className="stat-card" style={{ borderColor: 'rgba(0, 255, 140, 0.15)' }} variants={scaleIn}>
                          <div className="stat-value gradient-text"><AnimatedNumber value={currentRun.remediations.filter((r: any) => r.status === 'FIXED').length} /></div>
                          <div className="stat-label" style={{ color: 'var(--lime)' }}>Patched</div>
                        </motion.div>
                        <motion.div className="stat-card" style={{ borderColor: 'rgba(255,68,102,0.1)' }} variants={scaleIn}>
                          <div className="stat-value gradient-text-hot"><AnimatedNumber value={currentRun.remediations.filter((r: any) => r.status === 'FAILED').length} /></div>
                          <div className="stat-label" style={{ color: 'var(--red)' }}>Failed</div>
                        </motion.div>
                        <motion.div className="stat-card" variants={scaleIn}>
                          <div className="stat-value gradient-text-cool mono">{duration}s</div>
                          <div className="stat-label">Duration</div>
                        </motion.div>
                      </div>
                    </div>
                  </motion.div>

                  {/* Vulnerabilities table */}
                  {currentRun.vulnerabilities.length > 0 && (
                    <motion.div className="glass-card" style={{ borderRadius: '20px', overflow: 'hidden' }} variants={fadeInUp}>
                      <div style={{ padding: '24px 24px 18px', borderBottom: '1px solid var(--border-void)', display: 'flex', alignItems: 'center', gap: '10px' }}>
                        <Shield size={18} style={{ color: 'var(--red)' }} />
                        <span style={{ fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: '15px' }}>Vulnerabilities Discovered</span>
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
                            {currentRun.vulnerabilities.map((v: any, i: number) => (
                              <React.Fragment key={v.id}>
                                <motion.tr
                                  style={{ cursor: 'pointer' }}
                                  onClick={() => toggleRow(v.id)}
                                  initial={{ opacity: 0, x: -10 }}
                                  animate={{ opacity: 1, x: 0 }}
                                  transition={{ delay: i * 0.05 }}
                                  whileHover={{ backgroundColor: 'rgba(0, 255, 140, 0.03)' }}
                                >
                                  <td>
                                    <p style={{ fontWeight: 600, margin: '0 0 2px', fontSize: '13px' }}>{v.pkgName}</p>
                                    <p className="mono" style={{ fontSize: '11px', color: 'var(--fg-3)', margin: 0 }}>{v.pkgVersion}</p>
                                  </td>
                                  <td>
                                    <span className={`chip ${sevBadgeClass(v.severity)}`} style={{ gap: '6px' }}>
                                      {sevIcon(v.severity)} {v.severity}
                                    </span>
                                  </td>
                                  <td>
                                    {(v as any).contextNote ? (
                                      <span className="chip badge-info" style={{ gap: '6px' }}>
                                        <Brain size={10} /> AI
                                      </span>
                                    ) : <span style={{ color: 'var(--fg-4)' }}>-</span>}
                                  </td>
                                  <td style={{ maxWidth: '300px' }}>
                                    <p style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', margin: 0, fontSize: '12px', color: 'var(--fg-2)' }}>{v.description}</p>
                                    <p style={{ fontSize: '10px', color: 'var(--lime)', margin: '3px 0 0', fontFamily: 'var(--font-mono)' }}>Click to expand</p>
                                  </td>
                                </motion.tr>
                                <AnimatePresence>
                                  {expandedRows[v.id] && (
                                    <motion.tr
                                      style={{ background: 'var(--surface)' }}
                                      initial={{ opacity: 0, height: 0 }}
                                      animate={{ opacity: 1, height: 'auto' }}
                                      exit={{ opacity: 0, height: 0 }}
                                    >
                                      <td colSpan={4} style={{ padding: '20px 24px' }}>
                                        <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
                                          <div style={{ padding: '16px', borderRadius: '12px', background: 'var(--raised)', border: '1px solid var(--border-void)', fontSize: '13px', lineHeight: 1.7, color: 'var(--fg-2)' }}>
                                            {v.description}
                                          </div>
                                          <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap' }}>
                                            <div style={{ padding: '12px 16px', borderRadius: '10px', background: 'var(--raised)', border: '1px solid var(--border-void)' }}>
                                              <p style={{ fontSize: '10px', color: 'var(--fg-3)', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.12em', margin: '0 0 6px' }}>CVE</p>
                                              <p className="mono" style={{ fontSize: '12px', margin: 0, color: 'var(--blue)' }}>{v.cveId}</p>
                                            </div>
                                            {(v as any).contextNote && (
                                              <div style={{ flex: 1, padding: '12px 16px', borderRadius: '10px', background: 'rgba(0, 255, 140, 0.04)', border: '1px solid var(--border-lime)' }}>
                                                <p style={{ fontSize: '10px', color: 'var(--lime)', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.12em', margin: '0 0 6px', display: 'flex', alignItems: 'center', gap: '6px' }}><Brain size={10} /> AI Analysis</p>
                                                <p style={{ fontSize: '12px', color: 'var(--fg-2)', margin: 0 }}>{(v as any).contextNote}</p>
                                              </div>
                                            )}
                                          </div>
                                        </div>
                                      </td>
                                    </motion.tr>
                                  )}
                                </AnimatePresence>
                              </React.Fragment>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </motion.div>
                  )}

                  {/* Remediations table */}
                  {currentRun.remediations.length > 0 && (
                    <motion.div className="glass-card" style={{ borderRadius: '20px', overflow: 'hidden' }} variants={fadeInUp}>
                      <div style={{ padding: '24px 24px 18px', borderBottom: '1px solid var(--border-void)', display: 'flex', alignItems: 'center', gap: '10px' }}>
                        <RefreshCw size={18} style={{ color: 'var(--lime)' }} />
                        <span style={{ fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: '15px' }}>Remediations Applied</span>
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
                            {currentRun.remediations.map((r: any, i: number) => (
                              <motion.tr
                                key={i}
                                initial={{ opacity: 0, x: -10 }}
                                animate={{ opacity: 1, x: 0 }}
                                transition={{ delay: i * 0.05 }}
                              >
                                <td style={{ fontWeight: 600, fontSize: '13px' }}>{r.pkgName}</td>
                                <td>
                                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                                    <span className="mono" style={{ fontSize: '12px', color: 'var(--red)', textDecoration: 'line-through' }}>{r.oldVersion}</span>
                                    <ArrowRight size={12} style={{ color: 'var(--fg-3)', flexShrink: 0 }} />
                                    <span className="mono" style={{ fontSize: '12px', color: r.status === 'FIXED' ? 'var(--lime)' : 'var(--fg-2)', fontWeight: r.status === 'FIXED' ? 600 : 400 }}>{r.newVersion}</span>
                                  </div>
                                </td>
                                <td>
                                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                    <div style={{ display: 'flex', gap: '4px' }}>
                                      {Array.from({ length: Math.max(1, r.attempts || 1) }).map((_, idx) => (
                                        <motion.div
                                          key={idx}
                                          style={{ width: '10px', height: '10px', borderRadius: '50%', background: r.status === 'FIXED' && idx === (r.attempts || 1) - 1 ? 'var(--lime)' : 'var(--red)' }}
                                          initial={{ scale: 0 }}
                                          animate={{ scale: 1 }}
                                          transition={{ delay: idx * 0.1 }}
                                          {...(r.status === 'FIXED' && idx === (r.attempts || 1) - 1 ? { style: { width: '10px', height: '10px', borderRadius: '50%', background: 'var(--lime)', boxShadow: '0 0 10px var(--lime-glow)' } } : {})}
                                        />
                                      ))}
                                    </div>
                                    {(r.attempts || 0) > 1 && r.status === 'FIXED' && (
                                      <span className="chip badge-medium" style={{ fontSize: '10px' }}>Self-Corrected</span>
                                    )}
                                  </div>
                                </td>
                                <td style={{ textAlign: 'right' }}>
                                  <span className={`chip ${r.status === 'FIXED' ? 'badge-lime' : 'badge-critical'}`} style={{ fontSize: '11px' }}>
                                    {r.status === 'FIXED' ? 'PATCHED' : 'FAILED'}
                                  </span>
                                </td>
                              </motion.tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </motion.div>
                  )}
                </motion.div>
              )}

              {/* Failed state */}
              {currentRun.status === 'FAILED' && (
                <motion.div
                  style={{ textAlign: 'center', padding: '56px 36px', borderRadius: '20px', background: 'linear-gradient(135deg, rgba(255, 68, 102, 0.1), rgba(255, 68, 102, 0.03))', border: '1px solid rgba(255,68,102,0.2)' }}
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                >
                  <motion.div
                    animate={{ y: [0, -5, 0] }}
                    transition={{ duration: 2, repeat: Infinity }}
                  >
                    <AlertTriangle size={48} style={{ color: 'var(--red)', margin: '0 auto 20px' }} />
                  </motion.div>
                  <p className="display" style={{ fontSize: '22px', fontWeight: 800, color: 'var(--red)', margin: '0 0 10px' }}>Workflow Failed</p>
                  <p style={{ color: 'rgba(255,68,102,0.7)', fontSize: '14px' }}>Check the timeline above for error details.</p>
                </motion.div>
              )}

              {/* Reset button */}
              <motion.div
                style={{ textAlign: 'center', paddingTop: '32px', paddingBottom: '48px' }}
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.3 }}
              >
                <motion.button
                  onClick={() => { setCurrentRun(null); setRepoUrl(''); setSelectedRepo(''); }}
                  className="btn-ghost"
                  style={{ padding: '13px 28px', borderRadius: '12px', fontSize: '14px', cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: '10px' }}
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                >
                  <RefreshCw size={15} /> Start Another Scan
                </motion.button>
              </motion.div>
            </motion.div>
          )}

          {/* ══════════════════════════════ HISTORY ══════════════════════════════ */}
          {currentTab === 'history' && (
            <motion.div
              key="history"
              style={{ maxWidth: '960px' }}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
            >
              <motion.div
                style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '20px', marginBottom: '28px' }}
                variants={staggerContainer}
                initial="hidden"
                animate="visible"
              >
                <motion.div variants={fadeInUp}>
                  <h2 className="display" style={{ fontSize: '26px', fontWeight: 800, margin: '0 0 6px', letterSpacing: '-0.02em' }}>Scan History</h2>
                  <p style={{ color: 'var(--fg-3)', fontSize: '14px', margin: 0 }}>{history.length} total scans</p>
                </motion.div>
                <motion.div variants={fadeInUp} style={{ display: 'flex', gap: '12px', flexWrap: 'wrap' }}>
                  <div style={{ position: 'relative' }}>
                    <Search size={14} style={{ position: 'absolute', left: '14px', top: '50%', transform: 'translateY(-50%)', color: 'var(--fg-3)' }} />
                    <input type="text" placeholder="Search repos..." value={searchFilter} onChange={e => setSearchFilter(e.target.value)} className="input-void" style={{ padding: '11px 14px 11px 38px', borderRadius: '10px', fontSize: '13px', width: '240px' }} />
                  </div>
                  <motion.button onClick={clearHistory} className="btn-ghost" style={{ padding: '11px 16px', borderRadius: '10px', fontSize: '12px', display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer' }} whileHover={{ scale: 1.01 }} whileTap={{ scale: 0.99 }}>
                    <Trash2 size={14} /> Clear
                  </motion.button>
                </motion.div>
              </motion.div>

              <motion.div
                style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}
                variants={staggerContainer}
                initial="hidden"
                animate="visible"
              >
                {history.filter(s => (s.repo || '').toLowerCase().includes(searchFilter.toLowerCase())).length === 0 ? (
                  <motion.div
                    variants={fadeInUp}
                    style={{ textAlign: 'center', padding: '72px 36px', borderRadius: '20px', border: '1px dashed var(--border-dim)', background: 'var(--surface)' }}
                  >
                    <History size={48} style={{ color: 'var(--fg-4)', margin: '0 auto 20px' }} />
                    <p style={{ color: 'var(--fg-3)', fontSize: '15px' }}>No scan history yet.</p>
                  </motion.div>
                ) : (
                  history.filter(s => (s.repo || '').toLowerCase().includes(searchFilter.toLowerCase())).map((scan: any, i: number) => (
                    <motion.div
                      key={scan.id}
                      onClick={() => loadRun(scan.runId)}
                      className="glass-card"
                      style={{ borderRadius: '14px', padding: '18px 24px', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '20px' }}
                      variants={fadeInUp}
                      whileHover={{ x: 4, borderColor: 'var(--border-mid)' }}
                      transition={{ type: 'spring', stiffness: 300 }}
                    >
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '8px', flexWrap: 'wrap' }}>
                          <Github size={14} style={{ color: 'var(--fg-3)', flexShrink: 0 }} />
                          <span style={{ fontWeight: 600, fontSize: '14px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{scan.repo}</span>
                          <span className="chip" style={{ fontSize: '10px' }}>{scan.ecosystem || 'NPM'}</span>
                        </div>
                        <div className="mono" style={{ fontSize: '11px', color: 'var(--fg-3)', display: 'flex', flexWrap: 'wrap', gap: '10px', alignItems: 'center' }}>
                          <span>{new Date(scan.createdAt).toLocaleString()}</span>
                          {scan.vulnerabilities?.filter((v: any) => v.severity === 'CRITICAL').length > 0 && (
                            <span style={{ color: 'var(--red)', display: 'flex', alignItems: 'center', gap: '4px' }}>
                              <Skull size={10} /> {scan.vulnerabilities.filter((v: any) => v.severity === 'CRITICAL').length}
                            </span>
                          )}
                          {scan.vulnerabilities?.filter((v: any) => v.severity === 'HIGH').length > 0 && (
                            <span style={{ color: 'var(--orange)', display: 'flex', alignItems: 'center', gap: '4px' }}>
                              <Flame size={10} /> {scan.vulnerabilities.filter((v: any) => v.severity === 'HIGH').length}
                            </span>
                          )}
                          <span style={{ color: 'var(--lime)', fontWeight: 600 }}>{scan.fixedCount || 0} fixed</span>
                        </div>
                      </div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '12px', flexShrink: 0 }}>
                        {scan.status === 'COMPLETED' && (
                          <motion.button
                            onClick={e => { e.stopPropagation(); deleteScan(scan.runId); }}
                            className="btn-ghost"
                            style={{ padding: '8px 12px', borderRadius: '8px', fontSize: '11px', display: 'flex', alignItems: 'center', gap: '6px', cursor: 'pointer' }}
                            whileHover={{ scale: 1.05 }}
                            whileTap={{ scale: 0.95 }}
                          >
                            <Trash2 size={12} />
                          </motion.button>
                        )}
                        {scan.prUrl && <span className="chip badge-lime" style={{ fontSize: '10px' }}><CheckCircle2 size={10} /> PR</span>}
                        <span className={`chip ${scan.status === 'COMPLETED' ? 'badge-lime' : scan.status === 'FAILED' ? 'badge-critical' : 'badge-info'}`} style={{ fontSize: '10px' }}>{scan.status}</span>
                        <ChevronRight size={16} style={{ color: 'var(--fg-4)' }} />
                      </div>
                    </motion.div>
                  ))
                )}
              </motion.div>
            </motion.div>
          )}

          {/* ══════════════════════════════ SCHEDULES ══════════════════════════════ */}
          {currentTab === 'schedules' && (
            <motion.div
              key="schedules"
              style={{ maxWidth: '960px' }}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
            >
              <motion.div
                style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '20px', marginBottom: '28px' }}
                variants={staggerContainer}
                initial="hidden"
                animate="visible"
              >
                <motion.div variants={fadeInUp}>
                  <h2 className="display" style={{ fontSize: '26px', fontWeight: 800, margin: '0 0 6px', letterSpacing: '-0.02em' }}>Scheduled Scans</h2>
                  <p style={{ color: 'var(--fg-3)', fontSize: '14px', margin: 0 }}>Automate vulnerability checks with cron</p>
                </motion.div>
                <motion.button
                  onClick={() => setShowScheduleModal(true)}
                  className="btn-lime"
                  style={{ padding: '12px 20px', borderRadius: '12px', fontSize: '13px', display: 'inline-flex', alignItems: 'center', gap: '10px', cursor: 'pointer' }}
                  variants={fadeInUp}
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                >
                  <Calendar size={15} /> Add Schedule
                </motion.button>
              </motion.div>

              <AnimatePresence>
                {showScheduleModal && (
                  <motion.div
                    style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.85)', backdropFilter: 'blur(12px)', zIndex: 100, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '24px' }}
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                  >
                    <motion.div
                      className="glass-card-raised"
                      style={{ width: '100%', maxWidth: '480px', borderRadius: '24px', padding: '32px' }}
                      initial={{ opacity: 0, scale: 0.9, y: 20 }}
                      animate={{ opacity: 1, scale: 1, y: 0 }}
                      exit={{ opacity: 0, scale: 0.9, y: 20 }}
                    >
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '28px' }}>
                        <h3 className="display" style={{ fontWeight: 800, fontSize: '20px', margin: 0 }}>New Schedule</h3>
                        <motion.button onClick={() => setShowScheduleModal(false)} style={{ color: 'var(--fg-3)', background: 'none', border: 'none', cursor: 'pointer' }} whileHover={{ scale: 1.1 }}><XCircle size={22} /></motion.button>
                      </div>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '18px' }}>
                        <div>
                          <label style={{ fontSize: '11px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.12em', color: 'var(--fg-3)', display: 'block', marginBottom: '10px' }}>GitHub Repo URL</label>
                          <input type="text" value={scheduleRepo} onChange={e => setScheduleRepo(e.target.value)} className="input-void" style={{ width: '100%', padding: '13px 16px', borderRadius: '10px', fontSize: '13px' }} placeholder="https://github.com/owner/repo" />
                        </div>
                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px' }}>
                          <div>
                            <label style={{ fontSize: '11px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.12em', color: 'var(--fg-3)', display: 'block', marginBottom: '10px' }}>Time (HH:MM)</label>
                            <input type="time" value={scheduleTime} onChange={e => setScheduleTime(e.target.value)} className="input-void" style={{ width: '100%', padding: '13px 16px', borderRadius: '10px', fontSize: '13px' }} />
                          </div>
                          <div>
                            <label style={{ fontSize: '11px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.12em', color: 'var(--fg-3)', display: 'block', marginBottom: '10px' }}>Weekday</label>
                            <select value={scheduleWeekday} onChange={e => setScheduleWeekday(e.target.value)} className="input-void" style={{ width: '100%', padding: '13px 16px', borderRadius: '10px', fontSize: '13px' }}>
                              <option value="*">Any</option><option value="0">Sun</option><option value="1">Mon</option><option value="2">Tue</option><option value="3">Wed</option><option value="4">Thu</option><option value="5">Fri</option><option value="6">Sat</option>
                            </select>
                          </div>
                          <div>
                            <label style={{ fontSize: '11px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.12em', color: 'var(--fg-3)', display: 'block', marginBottom: '10px' }}>Day of Month</label>
                            <input type="text" value={scheduleDayOfMonth} onChange={e => setScheduleDayOfMonth(e.target.value || '*')} className="input-void" style={{ width: '100%', padding: '13px 16px', borderRadius: '10px', fontSize: '13px' }} placeholder="* or 1-31" />
                          </div>
                          <div>
                            <label style={{ fontSize: '11px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.12em', color: 'var(--fg-3)', display: 'block', marginBottom: '10px' }}>Month</label>
                            <input type="text" value={scheduleMonth} onChange={e => setScheduleMonth(e.target.value || '*')} className="input-void" style={{ width: '100%', padding: '13px 16px', borderRadius: '10px', fontSize: '13px' }} placeholder="* or 1-12" />
                          </div>
                        </div>
                        <div className="chip" style={{ fontFamily: 'var(--font-mono)', fontSize: '11px', padding: '10px 14px', borderRadius: '10px', justifyContent: 'center' }}>
                          cron: {pm} {ph} {scheduleDayOfMonth} {scheduleMonth} {scheduleWeekday}
                        </div>
                        <div style={{ display: 'flex', gap: '12px', paddingTop: '8px' }}>
                          <motion.button onClick={() => setShowScheduleModal(false)} className="btn-ghost" style={{ flex: 1, padding: '13px', borderRadius: '12px', cursor: 'pointer' }} whileHover={{ scale: 1.01 }} whileTap={{ scale: 0.99 }}>Cancel</motion.button>
                          <motion.button onClick={saveSchedule} className="btn-lime" style={{ flex: 1, padding: '13px', borderRadius: '12px', cursor: 'pointer' }} whileHover={{ scale: 1.01 }} whileTap={{ scale: 0.99 }}>Create Schedule</motion.button>
                        </div>
                      </div>
                    </motion.div>
                  </motion.div>
                )}
              </AnimatePresence>

              {schedules.length === 0 ? (
                <motion.div
                  style={{ textAlign: 'center', padding: '72px 36px', borderRadius: '20px', border: '1px dashed var(--border-dim)', background: 'var(--surface)' }}
                  variants={fadeInUp}
                  initial="hidden"
                  animate="visible"
                >
                  <Calendar size={48} style={{ color: 'var(--fg-4)', margin: '0 auto 20px' }} />
                  <p style={{ color: 'var(--fg-3)', fontSize: '15px', margin: '0 0 8px' }}>No active schedules</p>
                  <p style={{ color: 'var(--fg-4)', fontSize: '13px', margin: 0 }}>Set up schedules to continuously monitor repositories.</p>
                </motion.div>
              ) : (
                <motion.div
                  style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: '14px' }}
                  variants={staggerContainer}
                  initial="hidden"
                  animate="visible"
                >
                  {schedules.map((s: any) => (
                    <motion.div
                      key={s.repo}
                      className="glass-card"
                      style={{ borderRadius: '18px', padding: '24px', position: 'relative' }}
                      variants={scaleIn}
                      whileHover={{ y: -4 }}
                      transition={{ type: 'spring', stiffness: 300 }}
                    >
                      <motion.button onClick={() => deleteSchedule(s.repo)} style={{ position: 'absolute', top: '18px', right: '18px', padding: '8px', borderRadius: '8px', border: '1px solid var(--border-void)', background: 'var(--raised)', color: 'var(--fg-3)', cursor: 'pointer' }} whileHover={{ scale: 1.1, borderColor: 'var(--red)' }}>
                        <Trash2 size={13} />
                      </motion.button>
                      <p style={{ fontWeight: 600, margin: '0 0 6px', paddingRight: '40px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', fontSize: '15px', display: 'flex', alignItems: 'center', gap: '10px' }}>
                        <Github size={15} style={{ color: 'var(--fg-3)', flexShrink: 0 }} />
                        {s.repo.replace('https://github.com/', '')}
                      </p>
                      <div style={{ padding: '14px', borderRadius: '12px', background: 'var(--surface)', border: '1px solid var(--border-void)', marginBottom: '14px', fontSize: '12px' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
                          <span style={{ color: 'var(--fg-3)' }}>Frequency</span>
                          <span style={{ fontWeight: 600 }}>{formatCron(s.cronExpression)}</span>
                        </div>
                        <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                          <span style={{ color: 'var(--fg-3)' }}>Cron</span>
                          <span className="mono" style={{ fontSize: '11px', color: 'var(--fg-2)' }}>{s.cronExpression}</span>
                        </div>
                      </div>
                      <motion.button onClick={() => runScheduleNow(s.repo)} className="btn-ghost" style={{ width: '100%', padding: '11px', borderRadius: '10px', fontSize: '12px', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', cursor: 'pointer' }} whileHover={{ scale: 1.01 }} whileTap={{ scale: 0.99 }}>
                        <PlayCircle size={14} /> Run Now
                      </motion.button>
                    </motion.div>
                  ))}
                </motion.div>
              )}
            </motion.div>
          )}

          {/* ══════════════════════════════ SETTINGS ══════════════════════════════ */}
          {currentTab === 'settings' && (
            <motion.div
              key="settings"
              style={{ maxWidth: '680px' }}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
            >
              <motion.div
                style={{ marginBottom: '32px' }}
                variants={fadeInUp}
                initial="hidden"
                animate="visible"
              >
                <h2 className="display" style={{ fontSize: '26px', fontWeight: 800, margin: '0 0 6px', letterSpacing: '-0.02em' }}>Settings</h2>
                <p style={{ color: 'var(--fg-3)', fontSize: '14px', margin: 0 }}>Manage tokens, AI keys, and integrations</p>
              </motion.div>

              <motion.form
                onSubmit={saveSettings}
                style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}
                variants={staggerContainer}
                initial="hidden"
                animate="visible"
              >
                {/* GitHub Token */}
                <motion.div className="glass-card" style={{ borderRadius: '18px', padding: '24px' }} variants={fadeInUp}>
                  <label style={{ fontSize: '11px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.12em', color: 'var(--fg-3)', display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '12px' }}>
                    <Github size={13} /> GitHub Token
                  </label>
                  <div style={{ position: 'relative' }}>
                    <input type={showGithubSettingToken ? 'text' : 'password'} value={settings.githubToken || ''} onChange={e => setSettings({ ...settings, githubToken: e.target.value })} className="input-void input-mono" style={{ width: '100%', padding: '13px 48px 13px 16px', borderRadius: '10px', fontSize: '12px' }} placeholder="ghp_xxxxxxxxxxxxxxxxxxxx" />
                    <button type="button" onClick={() => setShowGithubSettingToken(v => !v)} style={{ position: 'absolute', right: '14px', top: '50%', transform: 'translateY(-50%)', color: 'var(--fg-3)', background: 'none', border: 'none', cursor: 'pointer' }}>{showGithubSettingToken ? <EyeOff size={15} /> : <Eye size={15} />}</button>
                  </div>
                </motion.div>

                {/* Groq Key */}
                <motion.div className="glass-card" style={{ borderRadius: '18px', padding: '24px' }} variants={fadeInUp}>
                  <label style={{ fontSize: '11px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.12em', color: 'var(--fg-3)', display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '12px' }}>
                    <Brain size={13} /> Groq API Key
                  </label>
                  <div style={{ position: 'relative' }}>
                    <input type={showGroqKey ? 'text' : 'password'} value={settings.groqApiKey || ''} onChange={e => setSettings({ ...settings, groqApiKey: e.target.value })} className="input-void input-mono" style={{ width: '100%', padding: '13px 48px 13px 16px', borderRadius: '10px', fontSize: '12px' }} placeholder="gsk_xxxxxxxxxxxxxxxxxxxx" />
                    <button type="button" onClick={() => setShowGroqKey(v => !v)} style={{ position: 'absolute', right: '14px', top: '50%', transform: 'translateY(-50%)', color: 'var(--fg-3)', background: 'none', border: 'none', cursor: 'pointer' }}>{showGroqKey ? <EyeOff size={15} /> : <Eye size={15} />}</button>
                  </div>
                </motion.div>

                {/* Webhook URL */}
                <motion.div className="glass-card" style={{ borderRadius: '18px', padding: '24px' }} variants={fadeInUp}>
                  <label style={{ fontSize: '11px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.12em', color: 'var(--fg-3)', display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '12px' }}>
                    <Bell size={13} /> Webhook URL
                  </label>
                  <input type="url" value={settings.webhookUrl || ''} onChange={e => setSettings({ ...settings, webhookUrl: e.target.value })} className="input-void" style={{ width: '100%', padding: '13px 16px', borderRadius: '10px', fontSize: '13px' }} placeholder="https://hooks.slack.com/..." />
                </motion.div>

                {/* Webhook Secret */}
                <motion.div className="glass-card" style={{ borderRadius: '18px', padding: '24px' }} variants={fadeInUp}>
                  <label style={{ fontSize: '11px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.12em', color: 'var(--fg-3)', display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '12px' }}>
                    <Lock size={13} /> Webhook Secret
                  </label>
                  <div style={{ position: 'relative' }}>
                    <input type={showWebhookSecret ? 'text' : 'password'} value={settings.webhookSecret || ''} onChange={e => setSettings({ ...settings, webhookSecret: e.target.value })} className="input-void" style={{ width: '100%', padding: '13px 48px 13px 16px', borderRadius: '10px', fontSize: '13px' }} placeholder="Optional HMAC secret" />
                    <button type="button" onClick={() => setShowWebhookSecret(v => !v)} style={{ position: 'absolute', right: '14px', top: '50%', transform: 'translateY(-50%)', color: 'var(--fg-3)', background: 'none', border: 'none', cursor: 'pointer' }}>{showWebhookSecret ? <EyeOff size={15} /> : <Eye size={15} />}</button>
                  </div>
                </motion.div>

                {/* Email */}
                <motion.div className="glass-card" style={{ borderRadius: '18px', padding: '24px' }} variants={fadeInUp}>
                  <label style={{ fontSize: '11px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.12em', color: 'var(--fg-3)', display: 'block', marginBottom: '12px' }}>Email Alerts</label>
                  <input type="email" value={settings.email || ''} onChange={e => setSettings({ ...settings, email: e.target.value })} className="input-void" style={{ width: '100%', padding: '13px 16px', borderRadius: '10px', fontSize: '13px' }} placeholder="security@company.com" />
                </motion.div>

                {/* Webhook endpoint */}
                <motion.div className="glass-card" style={{ borderRadius: '18px', padding: '24px', borderColor: 'var(--border-lime)', background: 'linear-gradient(135deg, rgba(0, 255, 140, 0.04), transparent)' }} variants={fadeInUp}>
                  <label style={{ fontSize: '11px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.12em', color: 'var(--lime)', display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '12px' }}>
                    <Terminal size={13} /> GitHub App Webhook Endpoint
                  </label>
                  <div style={{ display: 'flex', gap: '10px' }}>
                    <code className="mono" style={{ flex: 1, padding: '12px 16px', borderRadius: '10px', background: 'var(--surface)', border: '1px solid var(--border-void)', fontSize: '12px', color: 'var(--lime)', overflowX: 'auto', display: 'block' }}>
                      https://fixstack-backend.onrender.com/api/webhook
                    </code>
                    <motion.button type="button" onClick={() => { navigator.clipboard.writeText('https://fixstack-backend.onrender.com/api/webhook'); setCopiedWebhook(true); addToast('Copied!', 'success'); setTimeout(() => setCopiedWebhook(false), 2000); }} className="btn-ghost" style={{ padding: '12px 16px', borderRadius: '10px', fontSize: '12px', display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer', flexShrink: 0 }} whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}>
                      {copiedWebhook ? <Check size={14} /> : <Copy size={14} />} {copiedWebhook ? 'Copied' : 'Copy'}
                    </motion.button>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '12px', marginTop: '18px' }}>
                    <motion.button type="button" onClick={testWebhook} className="btn-ghost" style={{ padding: '11px 18px', borderRadius: '10px', fontSize: '12px', display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer' }} whileHover={{ scale: 1.01 }} whileTap={{ scale: 0.99 }}>
                      <Zap size={14} /> Test Webhook
                    </motion.button>
                    <motion.button type="submit" className="btn-lime" style={{ padding: '11px 22px', borderRadius: '10px', fontSize: '13px', display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer' }} whileHover={{ scale: 1.01 }} whileTap={{ scale: 0.99 }}>
                      <Check size={15} /> Save Settings
                    </motion.button>
                  </div>
                </motion.div>
              </motion.form>
            </motion.div>
          )}
        </AnimatePresence>
      </main>

      {/* ─── Help FAB ─────────────────────────────────────────────────────── */}
      <motion.button
        onClick={() => setShowHelpModal(true)}
        className="btn-lime"
        style={{ position: 'fixed', bottom: '28px', right: '28px', width: '52px', height: '52px', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '20px', fontWeight: 800, zIndex: 30, cursor: 'pointer', padding: 0 }}
        whileHover={{ scale: 1.1 }}
        whileTap={{ scale: 0.95 }}
        initial={{ opacity: 0, scale: 0 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ delay: 0.5, type: 'spring', stiffness: 300 }}
      >
        ?
      </motion.button>

      {/* ─── Help Modal ───────────────────────────────────────────────────── */}
      <AnimatePresence>
        {showHelpModal && (
          <motion.div
            style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.85)', backdropFilter: 'blur(12px)', zIndex: 100, padding: '24px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
          >
            <motion.div
              className="glass-card-raised"
              style={{ width: '100%', maxWidth: '600px', borderRadius: '24px', padding: '32px', position: 'relative' }}
              initial={{ opacity: 0, scale: 0.9, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: 20 }}
            >
              <motion.button onClick={() => setShowHelpModal(false)} style={{ position: 'absolute', top: '24px', right: '24px', color: 'var(--fg-3)', background: 'none', border: 'none', cursor: 'pointer' }} whileHover={{ scale: 1.1 }}><XCircle size={24} /></motion.button>
              <h3 className="display" style={{ fontWeight: 800, fontSize: '20px', margin: '0 0 24px', display: 'flex', alignItems: 'center', gap: '12px' }}>
                <Info size={20} style={{ color: 'var(--lime)' }} /> GitHub Webhook Setup
              </h3>
              <div style={{ color: 'var(--fg-2)', fontSize: '14px', lineHeight: 1.75 }}>
                <p style={{ marginBottom: '18px' }}>Configure a GitHub Webhook so FixStack automatically scans on every push or PR.</p>
                <ol style={{ paddingLeft: '22px', display: 'flex', flexDirection: 'column', gap: '10px' }}>
                  {[
                    'Go to your GitHub repo -> Settings -> Webhooks -> Add webhook',
                    <>Set Payload URL to: <code className="mono" style={{ background: 'var(--raised)', padding: '3px 8px', borderRadius: '6px', fontSize: '12px', color: 'var(--lime)' }}>https://fixstack-backend.onrender.com/api/webhook</code></>,
                    <>Content type: <code className="mono" style={{ background: 'var(--raised)', padding: '3px 8px', borderRadius: '6px', fontSize: '12px' }}>application/json</code></>,
                    'Set Secret to match GITHUB_WEBHOOK_SECRET in your Settings',
                    'Events: select Pushes and Pull requests',
                    'Ensure Active is checked and click Add webhook'
                  ].map((item, i) => <li key={i}>{item}</li>)}
                </ol>
                <div style={{ marginTop: '24px', padding: '16px', borderRadius: '12px', background: 'var(--lime-dim)', border: '1px solid var(--border-lime)', color: 'var(--fg-2)', fontSize: '13px' }}>
                  <strong style={{ color: 'var(--lime)' }}>Note:</strong> FixStack ignores pushes that don&apos;t touch dependency files, saving resources.
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ─── Toasts ───────────────────────────────────────────────────────── */}
      <div style={{ position: 'fixed', top: '24px', right: '24px', zIndex: 9999, display: 'flex', flexDirection: 'column', gap: '10px', pointerEvents: 'none' }}>
        <AnimatePresence>
          {toasts.map(t => (
            <motion.div
              key={t.id}
              className={`toast toast-${t.type}`}
              style={{ pointerEvents: 'auto' }}
              initial={{ opacity: 0, x: 50, scale: 0.9 }}
              animate={{ opacity: 1, x: 0, scale: 1 }}
              exit={{ opacity: 0, x: 50, scale: 0.9 }}
              transition={{ type: 'spring', stiffness: 300, damping: 25 }}
            >
              {t.type === 'error' ? <AlertCircle size={15} /> : t.type === 'success' ? <CheckCircle2 size={15} /> : <Info size={15} />}
              {t.message}
            </motion.div>
          ))}
        </AnimatePresence>
      </div>
    </div>
  );
}
