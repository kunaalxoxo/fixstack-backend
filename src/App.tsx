import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { fixstackApi } from './api';
import { Run, RunEvent } from './types';
import {
  Shield, Loader2, CheckCircle2, AlertCircle, Clock, History,
  GitBranch as Github, ArrowRight, Activity, XCircle, LogOut,
  Settings as SettingsIcon, Calendar, Building, Bell,
  LayoutDashboard, Brain, Flame, Info, Search, Trash2,
  Copy, PlayCircle, Zap, Check, Skull, AlertTriangle,
  RefreshCw, Menu, Lock, Eye, EyeOff, ChevronRight,
  Sparkles, Moon, Sun, Terminal, Play, ArrowUpRight
} from 'lucide-react';

/* ─── motion presets ─────────────────────────────── */
const ease = [0.22, 1, 0.36, 1] as const;
const fadeUp  = { hidden: { opacity: 0, y: 20 }, visible: { opacity: 1, y: 0, transition: { duration: 0.5, ease } } };
const fadeIn  = { hidden: { opacity: 0 }, visible: { opacity: 1, transition: { duration: 0.4 } } };
const scaleIn = { hidden: { opacity: 0, scale: 0.92 }, visible: { opacity: 1, scale: 1, transition: { duration: 0.4, ease } } };
const stagger = { visible: { transition: { staggerChildren: 0.07, delayChildren: 0.05 } } };

/* ─── animated number ────────────────────────────── */
const Num = ({ val }: { val: number }) => {
  const [n, setN] = useState(0);
  useEffect(() => {
    if (val === 0) { setN(0); return; }
    const steps = 40, inc = val / steps;
    let cur = 0;
    const t = setInterval(() => {
      cur += inc;
      if (cur >= val) { clearInterval(t); setN(val); } else setN(Math.floor(cur));
    }, 18);
    return () => clearInterval(t);
  }, [val]);
  return <>{n}</>;
};

/* ─── agent meta ─────────────────────────────────── */
const AGENTS: Record<string, { abbr: string; color: string }> = {
  'Repo Scanner':      { abbr: 'RS', color: '#2563EB' },
  'CVE Lookup':        { abbr: 'CV', color: '#7C3AED' },
  'CVE Lookup Agent':  { abbr: 'CV', color: '#7C3AED' },
  'Context Analyst':   { abbr: 'CA', color: '#0891B2' },
  'Patch Planner':     { abbr: 'PP', color: '#4338CA' },
  'Validator':         { abbr: 'VA', color: '#D97706' },
  'Retry Controller':  { abbr: 'RC', color: '#DC2626' },
  'GitHub PR Agent':   { abbr: 'GP', color: '#059669' },
  'Alert Agent':       { abbr: 'AL', color: '#B45309' },
  'Orchestrator':      { abbr: 'OR', color: '#374151' },
  'Remediation Output Agent': { abbr: 'RO', color: '#059669' },
};
const agentMeta = (n: string) => AGENTS[n] || { abbr: n.slice(0, 2).toUpperCase(), color: '#374151' };

/* ─── severity helpers ───────────────────────────── */
const sevClass = (s: string) => {
  const u = s.toUpperCase();
  if (u === 'CRITICAL') return 'tag-red sev-critical';
  if (u === 'HIGH')     return 'tag-orange sev-high';
  if (u === 'MEDIUM')   return 'tag-amber sev-medium';
  return 'sev-low';
};
const SevIcon = ({ s }: { s: string }) => {
  const u = s.toUpperCase();
  if (u === 'CRITICAL') return <Skull size={11} />;
  if (u === 'HIGH')     return <Flame size={11} />;
  if (u === 'MEDIUM')   return <AlertTriangle size={11} />;
  return <Info size={11} />;
};

/* ─── run duration hook ──────────────────────────── */
const useDuration = (run: Run | null) => {
  const [secs, setSecs] = useState(0);
  useEffect(() => {
    if (!run) return void setSecs(0);
    if (run.status === 'COMPLETED' || run.status === 'FAILED') {
      const end = run.endTime ? new Date(run.endTime).getTime() : Date.now();
      return void setSecs(Math.floor((end - new Date(run.startTime).getTime()) / 1000));
    }
    const start = new Date(run.startTime).getTime();
    const iv = setInterval(() => setSecs(Math.floor((Date.now() - start) / 1000)), 1000);
    return () => clearInterval(iv);
  }, [run]);
  return secs;
};

/* ─── GH repo type ───────────────────────────────── */
type GhRepo = { id: number; full_name: string; html_url: string; private: boolean };
type SectionTab = 'dashboard' | 'history' | 'schedules' | 'settings';
type AiCommandResult = { command: string; details: string; answer: string };

const DEMO_FILES = [
  'package.json',
  'src/services/scanner.ts',
  'src/services/planner.ts',
  'src/services/githubPR.ts',
];

const AI_COMMANDS: Array<AiCommandResult & { keywords: string[] }> = [
  {
    command: 'run demo',
    details: 'Triggers a synthetic security scan using demo dependencies and streams file discovery with 0.5–1.2s gaps.',
    answer: 'Click "Run Demo" to simulate an end-to-end FixStack run with staged file discovery.',
    keywords: ['run demo', 'demo', 'simulate'],
  },
  {
    command: 'scan repository',
    details: 'Scans one selected GitHub repository for vulnerable dependencies and generates remediation data.',
    answer: 'Choose a repository from "Repository Scan" and FixStack will start a full scan.',
    keywords: ['scan repo', 'scan repository', 'scan project'],
  },
  {
    command: 'view history',
    details: 'Shows previous runs, status, vulnerability counts, and linked PR outcomes.',
    answer: 'Open the History section to inspect all past scans and reload any run.',
    keywords: ['history', 'past scans', 'previous runs'],
  },
  {
    command: 'schedule scan',
    details: 'Creates cron-based automated scans for continuous dependency monitoring.',
    answer: 'Open Schedules and add a cron schedule for a repository URL.',
    keywords: ['schedule', 'cron', 'automate'],
  },
  {
    command: 'configure settings',
    details: 'Stores tokens, webhook URL, alert email, and webhook secret for integrations.',
    answer: 'Use Settings to save credentials and test webhook connectivity.',
    keywords: ['settings', 'configure', 'token', 'webhook'],
  },
];

/* ═══════════════════════════════════════════════════
   SUB-COMPONENTS
═══════════════════════════════════════════════════ */

/* Ambient orbs */
const Orbs = () => (
  <div className="fixed inset-0 overflow-hidden pointer-events-none" style={{ zIndex: 0 }}>
    {[
      { w: 700, h: 600, top: '-20%', left: '-8%',  c: 'rgba(0,255,135,0.06)', dur: '22s' },
      { w: 500, h: 450, top: '40%',  right: '-5%', c: 'rgba(0,212,255,0.04)', dur: '17s' },
      { w: 380, h: 350, top: '60%',  left: '15%',  c: 'rgba(157,120,247,0.035)', dur: '19s' },
    ].map((o, i) => (
      <motion.div
        key={i}
        className="orb"
        style={{ width: o.w, height: o.h, top: o.top, left: (o as any).left, right: (o as any).right, background: o.c }}
        animate={{ x: [0, 50, -20, 0], y: [0, -30, 20, 0] }}
        transition={{ duration: parseFloat(o.dur), repeat: Infinity, ease: 'easeInOut' }}
      />
    ))}
  </div>
);

/* Timeline event row */
const EventRow = ({ ev, run, i }: { ev: RunEvent; run: Run; i: number }) => {
  const isPR      = ev.agentName === 'GitHub PR Agent' && ev.toolName === 'PR Created';
  const isRetryW  = ev.agentName === 'Retry Controller' && ev.status === 'WARNING';
  const isRetryOK = ev.agentName === 'Retry Controller' && ev.status === 'SUCCESS';
  const meta      = agentMeta(ev.agentName);

  const evClass = isPR ? 'pr-hero' :
    isRetryW  ? 'event-card ev-warning' :
    isRetryOK ? 'event-card ev-success' :
    `event-card ev-${ev.status.toLowerCase()}`;

  const age = () => {
    const s = Math.floor((Date.now() - new Date(ev.timestamp).getTime()) / 1000);
    return s < 60 ? `${s}s` : `${Math.floor(s / 60)}m`;
  };

  return (
    <motion.div
      className="flex items-start gap-4 mb-4"
      initial={{ opacity: 0, x: -16 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ delay: i * 0.04, duration: 0.4, ease }}
    >
      <motion.div
        className="agent-pip"
        style={{ background: meta.color }}
        whileHover={{ scale: 1.12 }}
        transition={{ type: 'spring', stiffness: 400, damping: 17 }}
      >
        {meta.abbr}
      </motion.div>

      <motion.div
        className={`flex-1 ${evClass}`}
        whileHover={{ x: 3 }}
        transition={{ type: 'spring', stiffness: 400, damping: 28 }}
      >
        {isPR ? (
          <div className="relative z-10">
            <motion.p
              className="display text-2xl font-extrabold mb-2"
              style={{ color: 'var(--lime)' }}
              initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}
            >
              <Sparkles className="inline mr-2" size={20} />Pull Request Created
            </motion.p>
            <p className="text-sm mb-5" style={{ color: 'var(--t1)' }}>{ev.message}</p>
            {run.prUrl && (
              <motion.a href={run.prUrl} target="_blank" rel="noopener noreferrer"
                whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}>
                <button className="btn btn-primary text-xs px-4 py-2 rounded-xl">
                  <Github size={14} />View on GitHub<ArrowUpRight size={13} />
                </button>
              </motion.a>
            )}
          </div>
        ) : (
          <>
            <div className="flex items-center gap-2 mb-2 flex-wrap">
              <span className="tag text-[10px]" style={{ background: meta.color + '22', borderColor: meta.color + '44', color: 'var(--t0)', fontFamily: 'var(--f-display)' }}>
                {ev.agentName}
              </span>
              <span className="mono text-xs" style={{ color: 'var(--t2)' }}>›</span>
              <span className="mono text-xs" style={{ color: 'var(--t1)' }}>{ev.toolName}</span>
              <span className="ml-auto mono text-[11px]" style={{ color: 'var(--t3)' }}>{age()}</span>
            </div>
            <p className="text-sm leading-relaxed" style={{
              color: isRetryW ? 'var(--red)' : isRetryOK ? 'var(--lime)' : 'var(--t0)',
              fontFamily: isRetryW || isRetryOK ? 'var(--f-mono)' : 'var(--f-body)',
              fontSize: isRetryW || isRetryOK ? '12px' : '13.5px',
            }}>
              {ev.message}
            </p>
            {ev.metadata?.confidence && (
              <div className="flex items-center gap-2 mt-2">
                <span className={`tag text-[10px] ${ev.metadata.confidence === 'HIGH' ? 'tag-lime' : ev.metadata.confidence === 'MEDIUM' ? 'tag-amber' : 'tag-orange'}`}>
                  {ev.metadata.confidence} CONF
                </span>
                {ev.metadata.affectedFiles?.length > 0 && (
                  <span className="tag text-[10px]">{ev.metadata.affectedFiles.length} files</span>
                )}
              </div>
            )}
          </>
        )}
      </motion.div>
    </motion.div>
  );
};

/* Severity donut */
const Donut = ({ crit, high, med, low }: { crit: number; high: number; med: number; low: number }) => {
  const total = crit + high + med + low || 1;
  const R = 58, C = 2 * Math.PI * R;
  const segs = [
    { v: crit, c: 'var(--red)',    l: 'Critical' },
    { v: high, c: 'var(--orange)', l: 'High' },
    { v: med,  c: 'var(--amber)',  l: 'Medium' },
    { v: low,  c: 'var(--blue)',   l: 'Low' },
  ];
  let off = 0;
  return (
    <div className="flex items-center gap-10">
      <div className="relative shrink-0" style={{ width: 140, height: 140 }}>
        <svg width="140" height="140" viewBox="0 0 140 140">
          <circle cx="70" cy="70" r={R} fill="none" stroke="var(--b1)" strokeWidth="10" />
          {segs.map((s, i) => {
            const len = (s.v / total) * C;
            const cur = off; off += len;
            return (
              <motion.circle key={i} cx="70" cy="70" r={R} fill="none" stroke={s.c}
                strokeWidth="10" strokeLinecap="round"
                strokeDasharray={`${len} ${C}`} strokeDashoffset={-cur}
                style={{ transformOrigin: 'center', transform: 'rotate(-90deg)' }}
                initial={{ strokeDasharray: `0 ${C}` }}
                animate={{ strokeDasharray: `${len} ${C}` }}
                transition={{ duration: 0.9, delay: i * 0.12, ease }}
              />
            );
          })}
        </svg>
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <motion.span className="display text-3xl font-extrabold" style={{ color: 'var(--t0)' }}
            initial={{ scale: 0.6, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} transition={{ delay: 0.3 }}>
            {total}
          </motion.span>
          <span className="text-[10px] uppercase tracking-widest" style={{ color: 'var(--t2)' }}>total</span>
        </div>
      </div>
      <div className="flex flex-col gap-3">
        {segs.map((s, i) => (
          <motion.div key={i} className="flex items-center gap-3"
            initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.5 + i * 0.08 }}>
            <div className="w-2.5 h-2.5 rounded-full shrink-0" style={{ background: s.c, boxShadow: `0 0 10px ${s.c}60` }} />
            <span className="text-sm" style={{ color: 'var(--t1)' }}>{s.l}</span>
            <span className="mono font-bold text-sm ml-auto" style={{ color: s.c }}>{s.v}</span>
          </motion.div>
        ))}
      </div>
    </div>
  );
};

/* ═══════════════════════════════════════════════════
   MAIN APP
═══════════════════════════════════════════════════ */
export default function App() {
  /* ── theme ── */
  const [dark, setDark] = useState(() => {
    const s = localStorage.getItem('theme');
    return s ? s === 'dark' : window.matchMedia('(prefers-color-scheme: dark)').matches;
  });
  useEffect(() => {
    localStorage.setItem('theme', dark ? 'dark' : 'light');
    document.documentElement.classList.toggle('light', !dark);
  }, [dark]);

  /* ── auth ── */
  const [authed, setAuthed]   = useState(false);
  const [pat, setPat]         = useState('');
  const [showPat, setShowPat] = useState(false);
  const [repos, setRepos]     = useState<GhRepo[]>([]);
  const [repoLoading, setRepoLoading] = useState(false);

  /* ── nav ── */
  const [tab, setTab] = useState<SectionTab>('dashboard');
  const [tabLoading, setTabLoading] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);

  /* ── scan state ── */
  const [run, setRun]         = useState<Run | null>(null);
  const [events, setEvents]   = useState<RunEvent[]>([]);
  const [repoUrl, setRepoUrl] = useState('');
  const [orgName, setOrgName] = useState('');
  const [selectedRepo, setSelectedRepo] = useState('');
  const [loading, setLoading] = useState(false);
  const [err, setErr]         = useState<string | null>(null);
  const [demoFilesShown, setDemoFilesShown] = useState<string[]>([]);
  const [demoStreaming, setDemoStreaming] = useState(false);

  /* ── other data ── */
  const [history, setHistory]     = useState<any[]>([]);
  const [schedules, setSchedules] = useState<any[]>([]);
  const [settings, setSettings]   = useState({ webhookUrl: '', email: '', githubToken: '', groqApiKey: '', webhookSecret: '' });
  const [toasts, setToasts]       = useState<{ id: string; msg: string; type: 'success' | 'error' | 'info' }[]>([]);
  const [expanded, setExpanded]   = useState<Record<string, boolean>>({});
  const [search, setSearch]       = useState('');
  const [showSchModal, setShowSchModal] = useState(false);
  const [showHelp, setShowHelp]   = useState(false);
  const [aiPrompt, setAiPrompt] = useState('');
  const [aiResult, setAiResult] = useState<AiCommandResult | null>(null);

  /* ── schedule form ── */
  const [schRepo, setSchRepo]   = useState('');
  const [schTime, setSchTime]   = useState('00:00');
  const [schDom, setSchDom]     = useState('*');
  const [schMon, setSchMon]     = useState('*');
  const [schWday, setSchWday]   = useState('*');

  /* ── settings visibility ── */
  const [showGhTok, setShowGhTok]     = useState(false);
  const [showGroq, setShowGroq]       = useState(false);
  const [showWhSec, setShowWhSec]     = useState(false);
  const [copiedWh, setCopiedWh]       = useState(false);

  const pollRef = useRef<number | null>(null);
  const tabLoaderRef = useRef<number | null>(null);
  const demoTimerRef = useRef<number | null>(null);
  const dur = useDuration(run);

  /* ── toast ── */
  const toast = (msg: string, type: 'success' | 'error' | 'info' = 'info') => {
    const id = Math.random().toString(36).slice(2);
    setToasts(p => [...p, { id, msg, type }]);
    setTimeout(() => setToasts(p => p.filter(t => t.id !== id)), 4000);
  };

  const switchTab = (nextTab: SectionTab) => {
    setMobileOpen(false);
    if (nextTab === tab) return;
    setTabLoading(true);
    setTab(nextTab);
  };

  const clearDemoTimer = () => {
    if (demoTimerRef.current) {
      window.clearTimeout(demoTimerRef.current);
      demoTimerRef.current = null;
    }
  };

  const startDemoFileLapse = () => {
    clearDemoTimer();
    setDemoFilesShown([]);
    setDemoStreaming(true);
    let idx = 0;
    const revealNext = () => {
      if (idx >= DEMO_FILES.length) {
        setDemoStreaming(false);
        demoTimerRef.current = null;
        return;
      }
      setDemoFilesShown(prev => [...prev, DEMO_FILES[idx]]);
      idx += 1;
      const delay = Math.floor(Math.random() * 701) + 500;
      demoTimerRef.current = window.setTimeout(revealNext, delay);
    };
    revealNext();
  };

  const runAiAssistant = (command: string) => {
    const normalized = command.trim().toLowerCase();
    if (!normalized) {
      toast('Enter a command for AI Assist', 'info');
      return;
    }
    const match = AI_COMMANDS.find(item => item.keywords.some(k => normalized.includes(k)));
    if (match) {
      setAiResult({ command: match.command, details: match.details, answer: match.answer });
      return;
    }
    setAiResult({
      command: normalized,
      details: 'No exact workflow match found. Try commands like "run demo", "scan repository", "view history", or "schedule scan".',
      answer: 'I can guide you through available FixStack actions once you provide one of the supported intents.',
    });
  };

  /* ── auth ── */
  useEffect(() => {
    const saved = localStorage.getItem('githubToken');
    if (saved) { setPat(saved); authWithPat(saved); }
  }, []);

  const authWithPat = async (token: string) => {
    setRepoLoading(true);
    try {
      const repos: GhRepo[] = [];
      let pg = 1, more = true;
      while (more) {
        const r = await fetch(`https://api.github.com/user/repos?per_page=100&sort=updated&page=${pg}`,
          { headers: { Authorization: `Bearer ${token}`, Accept: 'application/vnd.github+json' } });
        if (!r.ok) throw new Error(r.status === 401 ? 'Invalid token' : `HTTP ${r.status}`);
        const d = await r.json();
        repos.push(...d); more = d.length === 100; pg++;
      }
      setRepos(repos);
      localStorage.setItem('githubToken', token);
      setAuthed(true);
      fetchData();
      toast('GitHub connected', 'success');
    } catch (e: any) {
      toast(e.message || 'Failed to connect', 'error');
      localStorage.removeItem('githubToken');
    } finally { setRepoLoading(false); }
  };

  const handleLogin = (e: React.FormEvent) => { e.preventDefault(); if (pat.trim()) authWithPat(pat.trim()); };
  const logout = () => { localStorage.removeItem('githubToken'); setAuthed(false); setPat(''); setRepos([]); };

  /* ── data ── */
  useEffect(() => { if (authed) fetchData(); }, [authed, tab]);

  useEffect(() => {
    if (!tabLoading) return;
    if (tabLoaderRef.current) window.clearTimeout(tabLoaderRef.current);
    tabLoaderRef.current = window.setTimeout(() => {
      setTabLoading(false);
      tabLoaderRef.current = null;
    }, 700);
    return () => {
      if (tabLoaderRef.current) {
        window.clearTimeout(tabLoaderRef.current);
        tabLoaderRef.current = null;
      }
    };
  }, [tabLoading, tab]);

  const fetchData = async () => {
    try {
      if (tab === 'history' || tab === 'dashboard') { const r = await fixstackApi.getScans(); setHistory(r.data); }
      if (tab === 'schedules') { const r = await fixstackApi.getSchedules(); setSchedules(r.data); }
      if (tab === 'settings')  { const r = await fixstackApi.getSettings();  setSettings(r.data); }
    } catch {} finally { setTabLoading(false); }
  };

  /* ── poll ── */
  const stopPoll = () => { if (pollRef.current) { clearInterval(pollRef.current); pollRef.current = null; setLoading(false); } };
  const fetchRun = async (id: string) => {
    try {
      const [rr, er] = await Promise.all([fixstackApi.getRun(id), fixstackApi.getEvents(id)]);
      setRun(rr.data); setEvents(er.data);
      if (rr.data.status === 'COMPLETED' || rr.data.status === 'FAILED') {
        stopPoll();
        if (rr.data.status === 'COMPLETED') toast('Scan complete!', 'success');
      }
    } catch {}
  };
  const startPoll = (id: string) => { stopPoll(); pollRef.current = window.setInterval(() => fetchRun(id), 2500); };
  useEffect(() => () => {
    stopPoll();
    clearDemoTimer();
    if (tabLoaderRef.current) window.clearTimeout(tabLoaderRef.current);
  }, []);

  /* ── scan ── */
  const scan = async (demo = false, url?: string) => {
    const final = url || repoUrl;
    if (!demo && !final.startsWith('https://github.com/')) { setErr('Enter a valid GitHub URL'); return; }
    if (demo) {
      startDemoFileLapse();
    } else {
      clearDemoTimer();
      setDemoStreaming(false);
      setDemoFilesShown([]);
    }
    setLoading(true); setErr(null); setRun(null); setEvents([]);
    try {
      const r = await fixstackApi.startScan(demo ? undefined : final);
      toast('Scan started', 'success');
      fetchRun(r.data.runId); startPoll(r.data.runId);
    } catch (e: any) {
      setErr(e.response?.data?.error || e.message || 'Failed');
      toast('Failed to start scan', 'error'); setLoading(false);
    }
  };

  const orgScan = async () => {
    if (!orgName) { setErr('Enter org name'); return; }
    setLoading(true); setErr(null);
    try {
      await fixstackApi.startOrgScan(orgName);
      toast(`Queued org: ${orgName}`, 'success');
      setOrgName(''); setLoading(false); switchTab('history');
    } catch (e: any) { setErr(e.message); setLoading(false); }
  };

  const loadRun = (id: string) => {
    switchTab('dashboard'); window.scrollTo({ top: 0, behavior: 'smooth' });
    setRun(null); setEvents([]); fetchRun(id); startPoll(id);
  };

  /* ── schedule ── */
  const saveSchedule = async () => {
    if (!schRepo.startsWith('https://github.com/')) { toast('Invalid URL', 'error'); return; }
    const [h = '00', m = '00'] = schTime.split(':');
    try {
      await fixstackApi.addSchedule(schRepo, `${m} ${h} ${schDom} ${schMon} ${schWday}`);
      setShowSchModal(false); setSchRepo(''); setSchTime('00:00'); setSchDom('*'); setSchMon('*'); setSchWday('*');
      fetchData(); toast('Schedule created', 'success');
    } catch { toast('Failed to save', 'error'); }
  };

  /* ── steps ── */
  const getStep = () => {
    if (!run || events.length === 0) return 0;
    if (run.status === 'COMPLETED') return 5;
    const last = events[events.length - 1];
    if (last.agentName === 'GitHub PR Agent') return 4;
    if (['Patch Planner', 'Validator', 'Retry Controller'].includes(last.agentName)) return 3;
    if (last.agentName === 'Context Analyst') return 2;
    if (last.agentName?.includes('CVE')) return 1;
    return 0;
  };
  const STEPS = ['Fetch', 'CVE Scan', 'AI Analysis', 'Patching', 'PR'];

  /* ── cron label ── */
  const cronLabel = (c: string) => ({ '0 0 * * *': 'Daily midnight', '0 0 * * 0': 'Weekly Sun', '0 0 * * 1': 'Weekly Mon', '0 * * * *': 'Hourly' }[c] || c);
  const [ph = '00', pm = '00'] = schTime.split(':');

  /* ══════════════════════════════════════════════════
     LOGIN
  ══════════════════════════════════════════════════ */
  if (!authed) {
    return (
      <div className="mesh-bg grid-bg noise scanline relative" style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 24 }}>
        <Orbs />

        <motion.div
          className="relative z-10 w-full"
          style={{ maxWidth: 440 }}
          initial={{ opacity: 0, y: 28 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, ease }}
        >
          {/* Logo */}
          <motion.div className="text-center mb-10" initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} transition={{ delay: 0.15, duration: 0.5 }}>
            <motion.div
              className="inline-flex items-center justify-center rounded-2xl mb-6"
              style={{ width: 68, height: 68, background: 'var(--lime-dim)', border: '1px solid var(--b-lime)' }}
              animate={{ boxShadow: ['0 0 30px var(--lime-glow)', '0 0 55px var(--lime-strong)', '0 0 30px var(--lime-glow)'], y: [0, -7, 0] }}
              transition={{ duration: 3.5, repeat: Infinity, ease: 'easeInOut' }}
            >
              <Shield size={30} style={{ color: 'var(--lime)' }} />
            </motion.div>
            <h1 className="display font-extrabold tracking-tight" style={{ fontSize: 42, letterSpacing: '-0.04em', lineHeight: 1 }}>
              Fix<span className="text-grad">Stack</span>
            </h1>
            <p className="mt-3 text-sm" style={{ color: 'var(--t1)' }}>Autonomous dependency security agent</p>
          </motion.div>

          {/* Card */}
          <motion.div
            className="card-raised border-grad relative p-9"
            initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.25, duration: 0.5 }}
          >
            <p className="section-label mb-6">Connect GitHub</p>

            <form onSubmit={handleLogin} className="flex flex-col gap-4">
              <div className="relative">
                <Lock size={14} className="absolute" style={{ left: 16, top: '50%', transform: 'translateY(-50%)', color: 'var(--t2)' }} />
                <input
                  type={showPat ? 'text' : 'password'}
                  value={pat}
                  onChange={e => setPat(e.target.value)}
                  placeholder="ghp_xxxxxxxxxxxxxxxxxxxx"
                  autoFocus
                  className="input input-mono"
                  style={{ paddingLeft: 44, paddingRight: 48 }}
                />
                <button type="button" onClick={() => setShowPat(v => !v)}
                  className="absolute" style={{ right: 14, top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', color: 'var(--t2)', cursor: 'pointer' }}>
                  {showPat ? <EyeOff size={15} /> : <Eye size={15} />}
                </button>
              </div>

              <motion.button
                type="submit"
                disabled={repoLoading}
                className="btn btn-primary w-full justify-center"
                style={{ borderRadius: 12, padding: '15px', fontSize: 14 }}
                whileHover={{ scale: 1.015 }}
                whileTap={{ scale: 0.985 }}
              >
                {repoLoading
                  ? <><Loader2 size={16} className="anim-spin" />Connecting…</>
                  : <><Github size={16} />Connect GitHub</>
                }
              </motion.button>
            </form>

            {/* Feature pills */}
            <motion.div
              className="flex flex-wrap gap-2 mt-8 justify-center"
              variants={stagger} initial="hidden" animate="visible"
            >
              {['CVE Detection', 'AI Context', 'Auto PRs', 'Self-Healing'].map(f => (
                <motion.span key={f} className="tag text-[11px]" variants={fadeUp}>
                  <span style={{ color: 'var(--lime)', fontSize: 7 }}>●</span>{f}
                </motion.span>
              ))}
            </motion.div>
          </motion.div>

          <motion.p className="text-center mt-5 text-xs" style={{ color: 'var(--t2)' }}
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.5 }}>
            Requires a PAT with{' '}
            <code style={{ color: 'var(--t1)', background: 'var(--b1)', padding: '2px 7px', borderRadius: 5, fontSize: 11 }}>repo</code>
            {' '}scope.{' '}
            <a href="https://github.com/settings/personal-access-tokens/new" target="_blank" rel="noopener noreferrer"
              style={{ color: 'var(--lime)', textDecoration: 'none' }}>Generate →</a>
          </motion.p>
        </motion.div>

        {/* Theme toggle */}
        <motion.button
          onClick={() => setDark(d => !d)}
          className="btn btn-ghost"
          style={{ position: 'fixed', bottom: 24, right: 24, width: 46, height: 46, borderRadius: 12, padding: 0 }}
          whileHover={{ scale: 1.07 }} whileTap={{ scale: 0.93 }}
          initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.6 }}
        >
          {dark ? <Sun size={18} /> : <Moon size={18} />}
        </motion.button>

        {/* Toasts */}
        <div style={{ position: 'fixed', top: 20, right: 20, zIndex: 9999, display: 'flex', flexDirection: 'column', gap: 8 }}>
          <AnimatePresence>
            {toasts.map(t => (
              <motion.div key={t.id} className={`toast toast-${t.type}`}
                initial={{ opacity: 0, x: 40 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: 40 }}
                transition={{ duration: 0.3 }}>
                {t.type === 'success' ? <CheckCircle2 size={14} /> : t.type === 'error' ? <AlertCircle size={14} /> : <Info size={14} />}
                {t.msg}
              </motion.div>
            ))}
          </AnimatePresence>
        </div>
      </div>
    );
  }

  /* ══════════════════════════════════════════════════
     AUTHENTICATED LAYOUT
  ══════════════════════════════════════════════════ */
  const navTabs = [
    { id: 'dashboard', icon: LayoutDashboard, label: 'Dashboard' },
    { id: 'history',   icon: History,         label: 'History'   },
    { id: 'schedules', icon: Calendar,         label: 'Schedules' },
    { id: 'settings',  icon: SettingsIcon,     label: 'Settings'  },
  ] as const;

  return (
    <div className="mesh-bg noise relative" style={{ minHeight: '100vh', display: 'flex' }}>
      <Orbs />

      {/* Mobile overlay */}
      <AnimatePresence>
        {mobileOpen && (
          <motion.div onClick={() => setMobileOpen(false)}
            className="fixed inset-0 z-40" style={{ background: 'rgba(0,0,0,0.75)', backdropFilter: 'blur(8px)' }}
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} />
        )}
      </AnimatePresence>

      {/* ─── SIDEBAR ─────────────────────────────────── */}
      <motion.aside
        className={`sidebar ${mobileOpen ? 'mobile-open' : ''}`}
        style={{ zIndex: 50 }}
      >
        {/* Logo */}
        <div style={{ padding: '22px 18px', borderBottom: '1px solid var(--b0)', display: 'flex', alignItems: 'center', gap: 13, minHeight: 70 }}>
          <motion.div
            style={{ width: 38, height: 38, borderRadius: 11, background: 'var(--lime-dim)', border: '1px solid var(--b-lime)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, cursor: 'pointer' }}
            whileHover={{ scale: 1.06 }}
            animate={{ boxShadow: ['0 0 20px var(--lime-glow)', '0 0 35px var(--lime-strong)', '0 0 20px var(--lime-glow)'] }}
            transition={{ duration: 2.5, repeat: Infinity }}
            onClick={() => { setRun(null); switchTab('dashboard'); }}
          >
            <Shield size={17} style={{ color: 'var(--lime)' }} />
          </motion.div>
          <span className="display sidebar-lbl font-extrabold project-title" style={{ fontSize: 18, letterSpacing: '-0.02em' }}>
            Fix<span style={{ color: 'var(--lime)' }}>Stack</span>
          </span>
        </div>

        {/* Nav */}
        <nav style={{ flex: 1, padding: '14px 12px', display: 'flex', flexDirection: 'column', gap: 3 }}>
          {navTabs.map((t, i) => (
            <motion.button
              key={t.id}
               onClick={() => switchTab(t.id)}
              className={`nav-item ${tab === t.id ? 'active' : ''}`}
              whileHover={{ x: 3 }}
              whileTap={{ scale: 0.97 }}
              initial={{ opacity: 0, x: -12 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: i * 0.04 }}
            >
              <t.icon size={17} style={{ flexShrink: 0 }} />
              <span className="sidebar-lbl">{t.label}</span>
            </motion.button>
          ))}
        </nav>

        {/* Running badge */}
        <AnimatePresence>
          {run?.status === 'RUNNING' && (
            <motion.div
              style={{ margin: '0 12px 10px', padding: '11px 13px', borderRadius: 12, background: 'var(--lime-dim)', border: '1px solid var(--b-lime)', display: 'flex', alignItems: 'center', gap: 10 }}
              initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 8 }}
            >
              <div className="running-dot" />
              <span className="sidebar-lbl mono text-[11px]" style={{ color: 'var(--lime)' }}>Scanning…</span>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Footer actions */}
        <div style={{ padding: 12, borderTop: '1px solid var(--b0)', display: 'flex', flexDirection: 'column', gap: 4 }}>
          <motion.button onClick={() => setDark(d => !d)} className="nav-item" whileHover={{ x: 3 }} whileTap={{ scale: 0.97 }}>
            {dark ? <Sun size={16} style={{ flexShrink: 0 }} /> : <Moon size={16} style={{ flexShrink: 0 }} />}
            <span className="sidebar-lbl text-sm">{dark ? 'Light Mode' : 'Dark Mode'}</span>
          </motion.button>
          <motion.button onClick={logout} className="nav-item" style={{ color: 'var(--red)' }} whileHover={{ x: 3 }} whileTap={{ scale: 0.97 }}>
            <LogOut size={16} style={{ flexShrink: 0 }} />
            <span className="sidebar-lbl text-sm">Disconnect</span>
          </motion.button>
        </div>
      </motion.aside>

      {/* ─── MAIN ─────────────────────────────────────── */}
      <main className="main-wrap relative z-10 flex-1">
        <AnimatePresence>
          {tabLoading && (
            <motion.div
              className="absolute inset-0 flex items-center justify-center"
              style={{ background: 'rgba(2,4,9,0.72)', backdropFilter: 'blur(6px)', zIndex: 60 }}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
            >
              <div className="card-raised px-6 py-5 flex items-center gap-3">
                <Loader2 size={18} className="anim-spin" style={{ color: 'var(--lime)' }} />
                <div>
                  <p className="text-sm font-semibold">Switching section…</p>
                  <p className="text-xs" style={{ color: 'var(--t2)' }}>Loading latest data</p>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Mobile top bar */}
        <div className="flex items-center justify-between mb-6 md:hidden">
          <motion.button onClick={() => setMobileOpen(true)}
            className="btn btn-ghost p-2.5 rounded-xl" whileTap={{ scale: 0.93 }}>
            <Menu size={18} />
          </motion.button>
          <span className="display font-bold text-lg">Fix<span style={{ color: 'var(--lime)' }}>Stack</span></span>
          <motion.button onClick={logout} className="btn btn-ghost p-2.5 rounded-xl" whileTap={{ scale: 0.93 }}>
            <LogOut size={18} />
          </motion.button>
        </div>

        <AnimatePresence mode="wait">

          {/* ════════════════ DASHBOARD — HOME ════════════════ */}
          {tab === 'dashboard' && !run && (
            <motion.div key="home" style={{ maxWidth: 960 }}
              initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>

              {/* Hero */}
              <motion.div className="mb-12" variants={stagger} initial="hidden" animate="visible">
                <motion.div className="flex items-center gap-2 mb-5" variants={fadeUp}>
                  <span className="tag tag-lime text-[10px]"><Sparkles size={9} />v1.0 LIVE</span>
                  <span className="tag text-[10px]">OSV.dev + NVD + Groq</span>
                </motion.div>

                <motion.h1
                  className="display dashboard-hero-title font-extrabold leading-none tracking-tighter mb-5"
                  style={{ fontSize: 'clamp(36px,5.5vw,58px)' }}
                  variants={fadeUp}
                >
                  Autonomous<br />
                  <span className="text-grad">Security Agent</span>
                </motion.h1>

                <motion.p className="text-base leading-relaxed mb-8" style={{ color: 'var(--t1)', maxWidth: 520 }} variants={fadeUp}>
                  Scans repos, reasons about exploitability with AI, and ships remediation PRs — without you touching a thing.
                </motion.p>

                <motion.button
                  onClick={() => scan(true)}
                  disabled={loading}
                  className="btn btn-primary"
                  style={{ fontSize: 14, padding: '15px 28px', borderRadius: 14 }}
                  variants={fadeUp}
                  whileHover={{ scale: 1.03 }}
                  whileTap={{ scale: 0.97 }}
                >
                  {loading
                    ? <><Loader2 size={16} className="anim-spin" />Starting…</>
                    : <><Zap size={17} />Run Demo — lodash + axios CVEs</>
                  }
                </motion.button>
              </motion.div>

              {/* Scan input cards */}
              <motion.div
                className="grid gap-5 mb-6"
                style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(290px, 1fr))' }}
                variants={stagger} initial="hidden" animate="visible"
              >
                {/* Repo */}
                <motion.div className="card p-7" variants={scaleIn} whileHover={{ y: -4 }} transition={{ type: 'spring', stiffness: 280 }}>
                  <div className="flex items-center gap-3 mb-6">
                    <div style={{ width: 34, height: 34, borderRadius: 10, background: 'rgba(37,99,235,0.14)', border: '1px solid rgba(37,99,235,0.2)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                      <Github size={15} style={{ color: '#3b82f6' }} />
                    </div>
                    <div>
                      <p className="font-semibold text-sm">Repository Scan</p>
                      <p className="text-xs" style={{ color: 'var(--t2)' }}>Select from your repos</p>
                    </div>
                  </div>

                  {repos.length > 0 ? (
                    <div className="flex flex-col gap-3">
                      <select
                        value={selectedRepo}
                        onChange={e => { const u = e.target.value; setSelectedRepo(u); if (u) { setRepoUrl(u); setErr(null); scan(false, u); } }}
                        disabled={loading}
                        className="input text-sm"
                        style={{ cursor: 'pointer' }}
                      >
                        <option value="">Choose a repository…</option>
                        {repos.map(r => <option key={r.id} value={r.html_url}>{r.full_name}{r.private ? ' 🔒' : ''}</option>)}
                      </select>
                      <motion.button onClick={() => authWithPat(pat)} disabled={repoLoading}
                        className="btn btn-ghost text-xs py-2.5 rounded-xl" whileHover={{ scale: 1.01 }} whileTap={{ scale: 0.99 }}>
                        <RefreshCw size={13} className={repoLoading ? 'anim-spin' : ''} />Refresh
                      </motion.button>
                    </div>
                  ) : (
                    <p className="text-xs text-center py-5 rounded-xl" style={{ color: 'var(--t2)', background: 'var(--b0)' }}>No repos found</p>
                  )}
                </motion.div>

                {/* Org */}
                <motion.div className="card p-7" variants={scaleIn} whileHover={{ y: -4 }} transition={{ type: 'spring', stiffness: 280 }}>
                  <div className="flex items-center gap-3 mb-6">
                    <div style={{ width: 34, height: 34, borderRadius: 10, background: 'rgba(157,120,247,0.14)', border: '1px solid rgba(157,120,247,0.2)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                      <Building size={15} style={{ color: 'var(--violet)' }} />
                    </div>
                    <div>
                      <p className="font-semibold text-sm">Organization Scan</p>
                      <p className="text-xs" style={{ color: 'var(--t2)' }}>Queue all public repos</p>
                    </div>
                  </div>
                  <div className="flex flex-col gap-3">
                    <input type="text" placeholder="e.g. vercel" value={orgName}
                      onChange={e => { setOrgName(e.target.value); setErr(null); }}
                      disabled={loading} className="input text-sm" />
                    <motion.button onClick={orgScan} disabled={loading || !orgName}
                      className="btn btn-ghost text-sm py-3 rounded-xl font-semibold" whileHover={{ scale: 1.01 }} whileTap={{ scale: 0.99 }}>
                      <Play size={14} />Queue Org Scan
                    </motion.button>
                  </div>
                </motion.div>
              </motion.div>

              {/* Error */}
              <AnimatePresence>
                {err && (
                  <motion.div className="flex items-center gap-3 text-sm p-4 rounded-2xl mb-6"
                    style={{ background: 'var(--red-bg)', border: '1px solid rgba(255,58,92,0.25)', color: 'var(--red)' }}
                    initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }}>
                    <AlertCircle size={15} />{err}
                  </motion.div>
                )}
              </AnimatePresence>

              {/* How it works */}
              <motion.div className="card p-7" variants={fadeUp} initial="hidden" animate="visible">
                <p className="section-label">How it works</p>
                <div className="grid gap-4" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(165px, 1fr))' }}>
                  {[
                    { icon: Github,    label: 'Fetch Deps',   desc: 'Parses manifests',    color: '#2563EB' },
                    { icon: Search,    label: 'CVE Scan',     desc: 'OSV.dev + NVD dual',  color: '#7C3AED' },
                    { icon: Brain,     label: 'AI Context',   desc: 'Call graph analysis', color: '#0891B2' },
                    { icon: ArrowRight,label: 'Auto PR',      desc: 'Merged & annotated',  color: '#059669' },
                  ].map((s, i) => (
                    <motion.div key={s.label}
                      className="p-5 rounded-2xl" style={{ background: 'var(--b0)', border: '1px solid var(--b0)' }}
                      whileHover={{ y: -4, borderColor: s.color + '44' }}
                      transition={{ type: 'spring', stiffness: 280 }}
                      initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition2={{ delay: i * 0.07 }}>
                      <div style={{ width: 32, height: 32, borderRadius: 9, background: s.color + '1a', border: `1px solid ${s.color}33`, display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: 12 }}>
                        <s.icon size={14} style={{ color: s.color }} />
                      </div>
                      <p className="font-semibold text-sm mb-1">{s.label}</p>
                      <p className="text-xs" style={{ color: 'var(--t2)' }}>{s.desc}</p>
                    </motion.div>
                  ))}
                </div>
              </motion.div>

              {/* Demo file lapse */}
              <motion.div className="card p-7" variants={fadeUp} initial="hidden" animate="visible">
                <div className="flex items-center justify-between gap-3 mb-4 flex-wrap">
                  <p className="section-label mb-0">Demo file stream</p>
                  {demoStreaming && <span className="tag tag-teal text-[10px]"><Loader2 size={10} className="anim-spin" />Streaming</span>}
                </div>
                <p className="text-xs mb-4" style={{ color: 'var(--t2)' }}>
                  Demo reveals files with a randomized 0.5s–1.2s lapse between entries.
                </p>
                <div className="grid gap-2">
                  {demoFilesShown.length === 0 ? (
                    <div className="p-3 rounded-xl text-xs" style={{ background: 'var(--b0)', border: '1px solid var(--b1)', color: 'var(--t2)' }}>
                      Run demo to watch staged file discovery.
                    </div>
                  ) : (
                    demoFilesShown.map((file, idx) => (
                      <motion.div
                        key={file}
                        className="p-3 rounded-xl flex items-center justify-between"
                        style={{ background: 'var(--b0)', border: '1px solid var(--b1)' }}
                        initial={{ opacity: 0, y: 6 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: idx * 0.04 }}
                      >
                        <span className="mono text-xs" style={{ color: 'var(--t1)' }}>{file}</span>
                        <span className="tag text-[10px]">loaded</span>
                      </motion.div>
                    ))
                  )}
                </div>
              </motion.div>

              {/* More interactive sections */}
              <motion.div className="card p-7" variants={fadeUp} initial="hidden" animate="visible">
                <p className="section-label">Explore FixStack</p>
                <div className="grid gap-4" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))' }}>
                  {[
                    {
                      title: 'About',
                      text: 'FixStack coordinates agents that discover vulnerable dependencies and propose safe upgrades.',
                      image: 'https://images.unsplash.com/photo-1451187580459-43490279c0fa?auto=format&fit=crop&w=900&q=80',
                    },
                    {
                      title: 'Description',
                      text: 'Every run combines CVE intelligence, contextual AI reasoning, and remediation planning.',
                      image: 'https://images.unsplash.com/photo-1518770660439-4636190af475?auto=format&fit=crop&w=900&q=80',
                    },
                    {
                      title: 'Contact',
                      text: 'Need onboarding help? Configure webhook + alert email in Settings and monitor every scan.',
                      image: 'https://images.unsplash.com/photo-1522071820081-009f0129c71c?auto=format&fit=crop&w=900&q=80',
                    },
                  ].map((card, i) => (
                    <motion.div
                      key={card.title}
                      className="rounded-2xl overflow-hidden"
                      style={{ background: 'var(--b0)', border: '1px solid var(--b1)' }}
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: i * 0.06 }}
                      whileHover={{ y: -3 }}
                    >
                      <img
                        src={card.image}
                        alt={card.title}
                        style={{ width: '100%', height: 120, objectFit: 'cover', display: 'block' }}
                        loading="lazy"
                      />
                      <div className="p-4">
                        <p className="font-semibold text-sm mb-1">{card.title}</p>
                        <p className="text-xs leading-relaxed" style={{ color: 'var(--t2)' }}>{card.text}</p>
                      </div>
                    </motion.div>
                  ))}
                </div>
              </motion.div>

              {/* Mini AI command assistant */}
              <motion.div className="card p-7" variants={fadeUp} initial="hidden" animate="visible">
                <p className="section-label">AI Command Assistant</p>
                <p className="text-xs mb-4" style={{ color: 'var(--t2)' }}>
                  Ask what you need; assistant returns command details and a direct action answer.
                </p>
                <div className="flex gap-3 flex-wrap mb-4">
                  {AI_COMMANDS.map(c => (
                    <button
                      key={c.command}
                      onClick={() => { setAiPrompt(c.command); runAiAssistant(c.command); }}
                      className="tag text-[10px]"
                      style={{ cursor: 'pointer' }}
                    >
                      {c.command}
                    </button>
                  ))}
                </div>
                <div className="flex gap-3 flex-wrap">
                  <input
                    className="input text-sm"
                    value={aiPrompt}
                    onChange={e => setAiPrompt(e.target.value)}
                    placeholder='Try "run demo" or "schedule scan"'
                    style={{ flex: 1, minWidth: 240 }}
                  />
                  <motion.button
                    onClick={() => runAiAssistant(aiPrompt)}
                    className="btn btn-primary text-sm"
                    style={{ borderRadius: 11 }}
                    whileHover={{ scale: 1.01 }}
                    whileTap={{ scale: 0.98 }}
                  >
                    <Sparkles size={14} />Ask AI
                  </motion.button>
                </div>
                <AnimatePresence>
                  {aiResult && (
                    <motion.div
                      className="mt-4 p-4 rounded-2xl"
                      style={{ background: 'var(--b0)', border: '1px solid var(--b1)' }}
                      initial={{ opacity: 0, y: 6 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: 6 }}
                    >
                      <p className="text-xs mb-2"><span className="section-label" style={{ marginBottom: 0 }}>command</span> <span className="mono" style={{ color: 'var(--lime)' }}>{aiResult.command}</span></p>
                      <p className="text-xs mb-2" style={{ color: 'var(--t1)' }}>{aiResult.details}</p>
                      <p className="text-sm font-medium" style={{ color: 'var(--t0)' }}>{aiResult.answer}</p>
                    </motion.div>
                  )}
                </AnimatePresence>
              </motion.div>
            </motion.div>
          )}

          {/* ════════════════ DASHBOARD — RUN ════════════════ */}
          {tab === 'dashboard' && run && (
            <motion.div key="run" style={{ maxWidth: 960 }}
              initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>

              {/* Sticky run header */}
              <motion.div className="card-raised p-6 mb-7" style={{ position: 'sticky', top: 0, zIndex: 20 }}
                initial={{ opacity: 0, y: -16 }} animate={{ opacity: 1, y: 0 }}>
                <div className="flex items-center justify-between flex-wrap gap-4 mb-5">
                  <div className="flex flex-wrap gap-6">
                    {[
                      { label: 'Repo', val: run.input.repoName, icon: <Github size={13} style={{ color: 'var(--t2)' }} /> },
                      { label: 'Run ID', val: run.id.slice(0, 10) + '…', mono: true },
                      { label: 'Duration', val: `${dur}s`, mono: true, accent: true },
                    ].map(f => (
                      <div key={f.label}>
                        <p style={{ fontSize: 10, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.12em', color: 'var(--t2)', marginBottom: 4 }}>{f.label}</p>
                        <p className={`text-sm font-semibold flex items-center gap-2 ${f.mono ? 'mono' : ''}`} style={{ color: f.accent ? 'var(--lime)' : 'var(--t0)' }}>
                          {f.icon}{f.val}
                        </p>
                      </div>
                    ))}
                  </div>
                  <motion.span
                    className={`tag text-[11px] px-4 py-1.5 ${run.status === 'COMPLETED' ? 'tag-lime' : run.status === 'FAILED' ? 'tag-red' : 'tag-teal'}`}
                    animate={run.status === 'RUNNING' ? { scale: [1, 1.03, 1] } : {}}
                    transition={{ duration: 1.5, repeat: Infinity }}
                  >
                    {run.status === 'RUNNING' && <span className="running-dot mr-2" style={{ width: 6, height: 6 }} />}
                    {run.status}
                  </motion.span>
                </div>

                {/* Step pills */}
                <div className="flex gap-2">
                  {STEPS.map((s, i) => {
                    const cur = getStep();
                    const done = i < cur || run.status === 'COMPLETED';
                    const active = i === cur && run.status !== 'COMPLETED' && run.status !== 'FAILED';
                    return (
                      <motion.div key={s} className={`step-pill ${done ? 'done' : active ? 'active' : ''}`}
                        initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.08 }}>
                        {done && <Check size={10} className="inline mr-1" />}{s}
                      </motion.div>
                    );
                  })}
                </div>
              </motion.div>

              {/* Timeline */}
              <motion.div className="card p-7 mb-7"
                initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.15 }}>
                <p className="flex items-center gap-3 font-bold text-base mb-7 display" style={{ color: 'var(--t0)' }}>
                  <Activity size={17} style={{ color: 'var(--lime)' }} />Live Agent Timeline
                  {run.status === 'RUNNING' && <span className="running-dot ml-1" />}
                </p>

                <div className="relative pl-7">
                  {/* Vertical line */}
                  {events.length > 0 && (
                    <motion.div
                      style={{ position: 'absolute', left: 19, top: 4, bottom: 20, width: 1.5, background: 'linear-gradient(to bottom, var(--lime), var(--lime-glow), transparent)', borderRadius: 2 }}
                      initial={{ scaleY: 0 }} animate={{ scaleY: 1 }} transition={{ duration: 0.6 }}
                    />
                  )}

                  {events.length === 0
                    ? [1,2,3].map(i => <div key={i} className="skeleton mb-4" style={{ height: 72 }} />)
                    : events.map((ev, idx) => <EventRow key={ev.id} ev={ev} run={run} i={idx} />)
                  }

                  {run.status === 'RUNNING' && (
                    <motion.div className="flex items-center gap-4 mt-2" initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
                      <div style={{ width: 40, height: 40, borderRadius: 11, border: '1px solid var(--b1)', background: 'var(--ink-2)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                        <Loader2 size={17} className="anim-spin" style={{ color: 'var(--lime)' }} />
                      </div>
                      <p className="text-sm italic" style={{ color: 'var(--t2)' }}>Agents processing…</p>
                    </motion.div>
                  )}
                </div>
              </motion.div>

              {/* ── RESULTS ── */}
              {run.status === 'COMPLETED' && (
                <motion.div className="flex flex-col gap-6"
                  variants={stagger} initial="hidden" animate="visible">

                  {/* Stats + donut */}
                  <motion.div className="card p-8" variants={fadeUp}>
                    <p className="section-label mb-6">Vulnerability Overview</p>
                    <div className="flex flex-wrap items-start gap-10 justify-between">
                      <Donut
                        crit={run.vulnerabilities.filter((v: any) => v.severity.toUpperCase() === 'CRITICAL').length}
                        high={run.vulnerabilities.filter((v: any) => v.severity.toUpperCase() === 'HIGH').length}
                        med={run.vulnerabilities.filter((v: any) => v.severity.toUpperCase() === 'MEDIUM').length}
                        low={run.vulnerabilities.filter((v: any) => !['CRITICAL','HIGH','MEDIUM'].includes(v.severity.toUpperCase())).length}
                      />
                      <div className="grid grid-cols-2 gap-3">
                        {[
                          { val: run.vulnerabilities.length, lbl: 'Found', color: 'var(--t0)', cls: '' },
                          { val: run.remediations.filter((r: any) => r.status === 'FIXED').length,  lbl: 'Patched',  color: 'var(--lime)',   cls: 'text-grad' },
                          { val: run.remediations.filter((r: any) => r.status === 'FAILED').length, lbl: 'Failed',   color: 'var(--red)',    cls: 'text-grad-warm' },
                          { val: dur, lbl: 'Seconds', color: 'var(--blue)', cls: 'text-grad-cool' },
                        ].map(s => (
                          <motion.div key={s.lbl} className="stat-card" variants={scaleIn}>
                            <div className={`stat-val ${s.cls}`} style={!s.cls ? { color: s.color } : {}}>
                              <Num val={s.val} />
                            </div>
                            <div className="stat-lbl">{s.lbl}</div>
                          </motion.div>
                        ))}
                      </div>
                    </div>
                  </motion.div>

                  {/* Vulns table */}
                  {run.vulnerabilities.length > 0 && (
                    <motion.div className="card overflow-hidden" variants={fadeUp}>
                      <div className="flex items-center gap-3 px-6 py-5 border-b" style={{ borderColor: 'var(--b1)' }}>
                        <Shield size={16} style={{ color: 'var(--red)' }} />
                        <span className="display font-bold text-sm">Vulnerabilities Discovered</span>
                        <span className="tag text-[10px] ml-auto">{run.vulnerabilities.length}</span>
                      </div>
                      <div className="overflow-x-auto">
                        <table className="data-table">
                          <thead>
                            <tr><th>Package</th><th>Severity</th><th>AI Context</th><th>Description</th></tr>
                          </thead>
                          <tbody>
                            {run.vulnerabilities.map((v: any, i: number) => (
                              <React.Fragment key={v.id}>
                                <motion.tr style={{ cursor: 'pointer' }} onClick={() => setExpanded(p => ({ ...p, [v.id]: !p[v.id] }))}
                                  initial={{ opacity: 0, x: -8 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: i * 0.04 }}>
                                  <td>
                                    <p className="font-semibold text-sm mb-0.5">{v.pkgName}</p>
                                    <p className="mono text-[11px]" style={{ color: 'var(--t2)' }}>{v.pkgVersion}</p>
                                  </td>
                                  <td>
                                    <span className={`tag text-[10px] gap-1.5 ${sevClass(v.severity)}`}>
                                      <SevIcon s={v.severity} />{v.severity}
                                    </span>
                                  </td>
                                  <td>
                                    {v.contextNote
                                      ? <span className="tag tag-violet text-[10px] gap-1.5"><Brain size={10} />AI</span>
                                      : <span style={{ color: 'var(--t3)' }}>—</span>}
                                  </td>
                                  <td style={{ maxWidth: 280 }}>
                                    <p className="text-xs truncate" style={{ color: 'var(--t1)' }}>{v.description}</p>
                                    <p className="text-[10px] mt-0.5" style={{ color: 'var(--lime)' }}>Click to expand</p>
                                  </td>
                                </motion.tr>
                                <AnimatePresence>
                                  {expanded[v.id] && (
                                    <motion.tr initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                                      style={{ background: 'var(--ink-2)' }}>
                                      <td colSpan={4} style={{ padding: '20px 24px' }}>
                                        <div className="flex flex-col gap-3">
                                          <p className="text-sm leading-relaxed" style={{ color: 'var(--t1)' }}>{v.description}</p>
                                          <div className="flex flex-wrap gap-3">
                                            <div className="px-4 py-3 rounded-xl text-xs" style={{ background: 'var(--b0)', border: '1px solid var(--b1)' }}>
                                              <p className="section-label text-[9px] mb-1">CVE ID</p>
                                              <p className="mono" style={{ color: 'var(--blue)' }}>{v.cveId}</p>
                                            </div>
                                            {v.contextNote && (
                                              <div className="flex-1 px-4 py-3 rounded-xl text-xs" style={{ background: 'var(--lime-dim)', border: '1px solid var(--b-lime)' }}>
                                                <p className="section-label text-[9px] mb-1" style={{ color: 'var(--lime)' }}>AI Analysis</p>
                                                <p style={{ color: 'var(--t1)' }}>{v.contextNote}</p>
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

                  {/* Remediations */}
                  {run.remediations.length > 0 && (
                    <motion.div className="card overflow-hidden" variants={fadeUp}>
                      <div className="flex items-center gap-3 px-6 py-5 border-b" style={{ borderColor: 'var(--b1)' }}>
                        <RefreshCw size={16} style={{ color: 'var(--lime)' }} />
                        <span className="display font-bold text-sm">Remediations Applied</span>
                      </div>
                      <div className="overflow-x-auto">
                        <table className="data-table">
                          <thead><tr><th>Package</th><th>Upgrade</th><th>Attempts</th><th className="text-right">Result</th></tr></thead>
                          <tbody>
                            {run.remediations.map((r: any, i: number) => (
                              <motion.tr key={i} initial={{ opacity: 0, x: -8 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: i * 0.05 }}>
                                <td className="font-semibold text-sm">{r.pkgName}</td>
                                <td>
                                  <div className="flex items-center gap-2">
                                    <span className="mono text-xs line-through" style={{ color: 'var(--red)' }}>{r.oldVersion}</span>
                                    <ArrowRight size={11} style={{ color: 'var(--t3)', flexShrink: 0 }} />
                                    <span className="mono text-xs font-bold" style={{ color: r.status === 'FIXED' ? 'var(--lime)' : 'var(--t1)' }}>{r.newVersion}</span>
                                  </div>
                                </td>
                                <td>
                                  <div className="flex items-center gap-1.5">
                                    {Array.from({ length: Math.max(1, r.attempts || 1) }).map((_, idx) => (
                                      <motion.div key={idx}
                                        style={{ width: 9, height: 9, borderRadius: '50%', background: r.status === 'FIXED' && idx === (r.attempts || 1) - 1 ? 'var(--lime)' : 'var(--red)', boxShadow: r.status === 'FIXED' && idx === (r.attempts || 1) - 1 ? '0 0 8px var(--lime-glow)' : 'none' }}
                                        initial={{ scale: 0 }} animate={{ scale: 1 }} transition={{ delay: idx * 0.08 }}
                                      />
                                    ))}
                                    {(r.attempts || 0) > 1 && r.status === 'FIXED' && (
                                      <span className="tag tag-amber text-[10px] ml-1">Self-Corrected</span>
                                    )}
                                  </div>
                                </td>
                                <td className="text-right">
                                  <span className={`tag text-[10px] ${r.status === 'FIXED' ? 'tag-lime' : 'tag-red'}`}>
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

              {/* Failed */}
              {run.status === 'FAILED' && (
                <motion.div className="text-center p-16 rounded-2xl"
                  style={{ background: 'var(--red-bg)', border: '1px solid rgba(255,58,92,0.2)' }}
                  initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }}>
                  <AlertTriangle size={44} style={{ color: 'var(--red)', margin: '0 auto 16px' }} />
                  <p className="display text-xl font-extrabold mb-2" style={{ color: 'var(--red)' }}>Workflow Failed</p>
                  <p className="text-sm" style={{ color: 'rgba(255,58,92,0.6)' }}>Check the timeline above for details.</p>
                </motion.div>
              )}

              {/* Reset */}
              <div className="text-center pt-10 pb-14">
                <motion.button onClick={() => { setRun(null); setRepoUrl(''); setSelectedRepo(''); }}
                  className="btn btn-ghost" style={{ borderRadius: 12 }}
                  whileHover={{ scale: 1.03 }} whileTap={{ scale: 0.97 }}>
                  <RefreshCw size={14} />New Scan
                </motion.button>
              </div>
            </motion.div>
          )}

          {/* ════════════════ HISTORY ════════════════ */}
          {tab === 'history' && (
            <motion.div key="history" style={{ maxWidth: 960 }}
              initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>

              <motion.div className="flex items-end justify-between flex-wrap gap-4 mb-8"
                variants={stagger} initial="hidden" animate="visible">
                <motion.div variants={fadeUp}>
                  <h2 className="display font-extrabold tracking-tight mb-1" style={{ fontSize: 28, letterSpacing: '-0.025em' }}>Scan History</h2>
                  <p className="text-sm" style={{ color: 'var(--t2)' }}>{history.length} runs recorded</p>
                </motion.div>
                <motion.div className="flex gap-3 flex-wrap" variants={fadeUp}>
                  <div className="relative">
                    <Search size={13} className="absolute" style={{ left: 13, top: '50%', transform: 'translateY(-50%)', color: 'var(--t2)' }} />
                    <input type="text" placeholder="Search…" value={search} onChange={e => setSearch(e.target.value)}
                      className="input text-sm" style={{ paddingLeft: 36, width: 220 }} />
                  </div>
                  <motion.button onClick={() => { if (confirm('Clear all?')) { setHistory([]); toast('Cleared', 'info'); } }}
                    className="btn btn-ghost text-xs" style={{ borderRadius: 11 }} whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.97 }}>
                    <Trash2 size={13} />Clear All
                  </motion.button>
                </motion.div>
              </motion.div>

              <div className="flex flex-col gap-3">
                {history.filter(s => (s.repo || '').toLowerCase().includes(search.toLowerCase())).length === 0 ? (
                  <motion.div className="text-center p-20 rounded-2xl" style={{ border: '1px dashed var(--b1)' }}
                    initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
                    <History size={44} style={{ color: 'var(--t3)', margin: '0 auto 16px' }} />
                    <p style={{ color: 'var(--t2)' }}>No scans yet. Run your first scan.</p>
                  </motion.div>
                ) : (
                  history.filter(s => (s.repo || '').toLowerCase().includes(search.toLowerCase())).map((s: any, i: number) => (
                    <motion.div key={s.id} className="card flex items-center justify-between gap-5 p-5"
                      style={{ cursor: 'pointer' }}
                      onClick={() => loadRun(s.runId)}
                      initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.04 }}
                      whileHover={{ x: 4, borderColor: 'var(--b2)' }}
                    >
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-2 flex-wrap">
                          <Github size={13} style={{ color: 'var(--t2)', flexShrink: 0 }} />
                          <span className="font-semibold text-sm truncate">{s.repo}</span>
                          {s.ecosystem && <span className="tag text-[10px]">{s.ecosystem}</span>}
                        </div>
                        <div className="mono text-[11px] flex gap-3 flex-wrap items-center" style={{ color: 'var(--t2)' }}>
                          <span>{new Date(s.createdAt).toLocaleString()}</span>
                          {s.vulnerabilities?.filter((v: any) => v.severity === 'CRITICAL').length > 0 && (
                            <span style={{ color: 'var(--red)', display: 'flex', alignItems: 'center', gap: 3 }}>
                              <Skull size={9} />{s.vulnerabilities.filter((v: any) => v.severity === 'CRITICAL').length}
                            </span>
                          )}
                          <span style={{ color: 'var(--lime)', fontWeight: 600 }}>{s.fixedCount || 0} fixed</span>
                        </div>
                      </div>
                      <div className="flex items-center gap-3 shrink-0">
                        <motion.button onClick={e => { e.stopPropagation(); fixstackApi.deleteScan(s.runId).then(() => { setHistory(p => p.filter(x => x.runId !== s.runId)); toast('Deleted', 'info'); }); }}
                          className="btn btn-danger p-2 rounded-xl text-xs" whileHover={{ scale: 1.08 }} whileTap={{ scale: 0.93 }}>
                          <Trash2 size={13} />
                        </motion.button>
                        {s.prUrl && <span className="tag tag-lime text-[10px]"><Check size={10} />PR</span>}
                        <span className={`tag text-[10px] ${s.status === 'COMPLETED' ? 'tag-lime' : s.status === 'FAILED' ? 'tag-red' : 'tag-teal'}`}>{s.status}</span>
                        <ChevronRight size={16} style={{ color: 'var(--t3)' }} />
                      </div>
                    </motion.div>
                  ))
                )}
              </div>
            </motion.div>
          )}

          {/* ════════════════ SCHEDULES ════════════════ */}
          {tab === 'schedules' && (
            <motion.div key="schedules" style={{ maxWidth: 960 }}
              initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>

              <div className="flex items-end justify-between flex-wrap gap-4 mb-8">
                <div>
                  <h2 className="display font-extrabold tracking-tight mb-1" style={{ fontSize: 28, letterSpacing: '-0.025em' }}>Scheduled Scans</h2>
                  <p className="text-sm" style={{ color: 'var(--t2)' }}>Automated cron-based scanning</p>
                </div>
                <motion.button onClick={() => setShowSchModal(true)} className="btn btn-primary text-sm"
                  style={{ borderRadius: 12 }} whileHover={{ scale: 1.03 }} whileTap={{ scale: 0.97 }}>
                  <Calendar size={15} />Add Schedule
                </motion.button>
              </div>

              {/* Schedule modal */}
              <AnimatePresence>
                {showSchModal && (
                  <motion.div className="fixed inset-0 flex items-center justify-center p-6 z-50"
                    style={{ background: 'rgba(0,0,0,0.85)', backdropFilter: 'blur(14px)' }}
                    initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
                    <motion.div className="card-raised w-full p-9" style={{ maxWidth: 480, borderRadius: 24 }}
                      initial={{ opacity: 0, scale: 0.9, y: 16 }} animate={{ opacity: 1, scale: 1, y: 0 }} exit={{ opacity: 0, scale: 0.9 }}>
                      <div className="flex items-center justify-between mb-7">
                        <h3 className="display font-extrabold text-xl">New Schedule</h3>
                        <motion.button onClick={() => setShowSchModal(false)} style={{ color: 'var(--t2)', background: 'none', border: 'none', cursor: 'pointer' }} whileHover={{ scale: 1.1 }}>
                          <XCircle size={22} />
                        </motion.button>
                      </div>
                      <div className="flex flex-col gap-5">
                        <div>
                          <p className="section-label">Repository URL</p>
                          <input className="input text-sm" value={schRepo} onChange={e => setSchRepo(e.target.value)} placeholder="https://github.com/owner/repo" />
                        </div>
                        <div className="grid grid-cols-2 gap-4">
                          <div><p className="section-label">Time (HH:MM)</p><input type="time" className="input text-sm" value={schTime} onChange={e => setSchTime(e.target.value)} /></div>
                          <div>
                            <p className="section-label">Weekday</p>
                            <select className="input text-sm" value={schWday} onChange={e => setSchWday(e.target.value)} style={{ cursor: 'pointer' }}>
                              <option value="*">Any</option><option value="0">Sun</option><option value="1">Mon</option><option value="2">Tue</option><option value="3">Wed</option><option value="4">Thu</option><option value="5">Fri</option><option value="6">Sat</option>
                            </select>
                          </div>
                          <div><p className="section-label">Day of Month</p><input className="input text-sm" value={schDom} onChange={e => setSchDom(e.target.value || '*')} placeholder="* or 1-31" /></div>
                          <div><p className="section-label">Month</p><input className="input text-sm" value={schMon} onChange={e => setSchMon(e.target.value || '*')} placeholder="* or 1-12" /></div>
                        </div>
                        <div className="tag justify-center mono text-[11px] py-2.5 rounded-xl" style={{ borderRadius: 11 }}>
                          cron: {pm} {ph} {schDom} {schMon} {schWday}
                        </div>
                        <div className="flex gap-3 pt-1">
                          <motion.button onClick={() => setShowSchModal(false)} className="btn btn-ghost flex-1" whileHover={{ scale: 1.01 }}>Cancel</motion.button>
                          <motion.button onClick={saveSchedule} className="btn btn-primary flex-1" whileHover={{ scale: 1.01 }}>Create</motion.button>
                        </div>
                      </div>
                    </motion.div>
                  </motion.div>
                )}
              </AnimatePresence>

              {schedules.length === 0 ? (
                <div className="text-center p-20 rounded-2xl" style={{ border: '1px dashed var(--b1)' }}>
                  <Calendar size={44} style={{ color: 'var(--t3)', margin: '0 auto 16px' }} />
                  <p style={{ color: 'var(--t2)' }}>No schedules yet.</p>
                </div>
              ) : (
                <div className="grid gap-4" style={{ gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))' }}>
                  {schedules.map((s: any) => (
                    <motion.div key={s.repo} className="card p-6 relative" whileHover={{ y: -4 }} transition={{ type: 'spring', stiffness: 280 }}>
                      <motion.button onClick={() => fixstackApi.deleteSchedule(s.repo).then(() => { fetchData(); toast('Deleted', 'info'); })}
                        className="btn btn-danger absolute p-2 rounded-xl" style={{ top: 16, right: 16 }} whileHover={{ scale: 1.1 }}>
                        <Trash2 size={13} />
                      </motion.button>
                      <p className="font-semibold text-sm mb-1 truncate pr-12 flex items-center gap-2">
                        <Github size={14} style={{ color: 'var(--t2)', flexShrink: 0 }} />
                        {s.repo.replace('https://github.com/', '')}
                      </p>
                      <div className="p-3 rounded-xl mt-4 mb-4 text-xs" style={{ background: 'var(--b0)', border: '1px solid var(--b1)' }}>
                        <div className="flex justify-between mb-1.5"><span style={{ color: 'var(--t2)' }}>Frequency</span><span className="font-semibold">{cronLabel(s.cronExpression)}</span></div>
                        <div className="flex justify-between"><span style={{ color: 'var(--t2)' }}>Cron</span><span className="mono text-[11px]">{s.cronExpression}</span></div>
                      </div>
                      <motion.button onClick={() => fixstackApi.runNowSchedule(s.repo).then(() => { toast('Triggered', 'success'); switchTab('history'); setTimeout(fetchData, 1000); })}
                        className="btn btn-ghost w-full justify-center text-xs py-2.5" style={{ borderRadius: 10 }} whileHover={{ scale: 1.01 }}>
                        <PlayCircle size={13} />Run Now
                      </motion.button>
                    </motion.div>
                  ))}
                </div>
              )}
            </motion.div>
          )}

          {/* ════════════════ SETTINGS ════════════════ */}
          {tab === 'settings' && (
            <motion.div key="settings" style={{ maxWidth: 660 }}
              initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>

              <div className="mb-8">
                <h2 className="display font-extrabold tracking-tight mb-1" style={{ fontSize: 28, letterSpacing: '-0.025em' }}>Settings</h2>
                <p className="text-sm" style={{ color: 'var(--t2)' }}>Tokens, keys, and integrations</p>
              </div>

              <form onSubmit={async e => { e.preventDefault(); try { await fixstackApi.saveSettings(settings.webhookUrl, settings.email, settings.githubToken, settings.groqApiKey, settings.webhookSecret); toast('Saved', 'success'); } catch { toast('Failed to save', 'error'); } }}
                className="flex flex-col gap-4">

                {[
                  { key: 'githubToken', label: 'GitHub Token', icon: <Github size={13} />, show: showGhTok, setShow: setShowGhTok, ph: 'ghp_xxxxxxxxxxxxxxxxxxxx', mono: true },
                  { key: 'groqApiKey',  label: 'Groq API Key',  icon: <Brain size={13} />,  show: showGroq,  setShow: setShowGroq,  ph: 'gsk_xxxxxxxxxxxxxxxxxxxx', mono: true },
                  { key: 'webhookSecret', label: 'Webhook Secret', icon: <Lock size={13} />, show: showWhSec, setShow: setShowWhSec, ph: 'Optional HMAC secret' },
                ].map(f => (
                  <motion.div key={f.key} className="card p-6"
                    initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}>
                    <label className="section-label flex items-center gap-2">{f.icon}{f.label}</label>
                    <div className="relative">
                      <input type={f.show ? 'text' : 'password'}
                        value={(settings as any)[f.key] || ''}
                        onChange={e => setSettings({ ...settings, [f.key]: e.target.value })}
                        className={`input ${f.mono ? 'input-mono' : ''}`}
                        style={{ paddingRight: 48 }}
                        placeholder={f.ph}
                      />
                      <button type="button" onClick={() => f.setShow((v: boolean) => !v)}
                        className="absolute" style={{ right: 14, top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', color: 'var(--t2)', cursor: 'pointer' }}>
                        {f.show ? <EyeOff size={15} /> : <Eye size={15} />}
                      </button>
                    </div>
                  </motion.div>
                ))}

                {/* Webhook URL */}
                <motion.div className="card p-6" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}>
                  <label className="section-label flex items-center gap-2"><Bell size={13} />Webhook URL</label>
                  <input type="url" value={settings.webhookUrl || ''} onChange={e => setSettings({ ...settings, webhookUrl: e.target.value })}
                    className="input text-sm" placeholder="https://hooks.slack.com/…" />
                </motion.div>

                {/* Email */}
                <motion.div className="card p-6" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}>
                  <label className="section-label">Email Alerts</label>
                  <input type="email" value={settings.email || ''} onChange={e => setSettings({ ...settings, email: e.target.value })}
                    className="input text-sm" placeholder="security@company.com" />
                </motion.div>

                {/* Webhook endpoint */}
                <motion.div className="card-lime p-6" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}>
                  <label className="section-label flex items-center gap-2" style={{ color: 'var(--lime)' }}><Terminal size={13} />GitHub App Webhook URL</label>
                  <div className="flex gap-3">
                    <code className="mono flex-1 px-4 py-3 rounded-xl text-xs overflow-x-auto block" style={{ background: 'var(--b0)', border: '1px solid var(--b1)', color: 'var(--lime)' }}>
                      https://fixstack-backend.onrender.com/api/webhook
                    </code>
                    <motion.button type="button" onClick={() => { navigator.clipboard.writeText('https://fixstack-backend.onrender.com/api/webhook'); setCopiedWh(true); toast('Copied!', 'success'); setTimeout(() => setCopiedWh(false), 2000); }}
                      className="btn btn-ghost text-xs px-4 rounded-xl shrink-0" whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.97 }}>
                      {copiedWh ? <Check size={14} /> : <Copy size={14} />}{copiedWh ? 'Copied' : 'Copy'}
                    </motion.button>
                  </div>
                  <div className="flex justify-end gap-3 mt-5">
                    <motion.button type="button" onClick={async () => { try { await fixstackApi.testWebhook(); toast('Test sent', 'success'); } catch (e: any) { toast(e.response?.data?.error || 'Failed', 'error'); } }}
                      className="btn btn-ghost text-xs py-2.5 rounded-xl" whileHover={{ scale: 1.02 }}>
                      <Zap size={13} />Test
                    </motion.button>
                    <motion.button type="submit" className="btn btn-primary text-sm px-6 py-2.5 rounded-xl" whileHover={{ scale: 1.02 }}>
                      <Check size={15} />Save Settings
                    </motion.button>
                  </div>
                </motion.div>
              </form>
            </motion.div>
          )}

        </AnimatePresence>
      </main>

      {/* ─── Help FAB ──────────────────────────────── */}
      <motion.button
        onClick={() => setShowHelp(true)}
        className="btn btn-primary"
        style={{ position: 'fixed', bottom: 28, right: 28, width: 50, height: 50, borderRadius: '50%', padding: 0, fontSize: 20, fontWeight: 800, zIndex: 30 }}
        whileHover={{ scale: 1.12 }}
        whileTap={{ scale: 0.93 }}
        initial={{ opacity: 0, scale: 0 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ delay: 0.6, type: 'spring', stiffness: 280 }}
      >
        ?
      </motion.button>

      {/* ─── Help modal ────────────────────────────── */}
      <AnimatePresence>
        {showHelp && (
          <motion.div className="fixed inset-0 flex items-center justify-center p-6 z-50"
            style={{ background: 'rgba(0,0,0,0.85)', backdropFilter: 'blur(14px)' }}
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
            <motion.div className="card-raised w-full p-9 relative" style={{ maxWidth: 560, borderRadius: 24 }}
              initial={{ opacity: 0, scale: 0.9, y: 16 }} animate={{ opacity: 1, scale: 1, y: 0 }} exit={{ opacity: 0, scale: 0.9 }}>
              <motion.button onClick={() => setShowHelp(false)}
                style={{ position: 'absolute', top: 20, right: 20, color: 'var(--t2)', background: 'none', border: 'none', cursor: 'pointer' }}
                whileHover={{ scale: 1.1 }}><XCircle size={22} /></motion.button>
              <h3 className="display font-extrabold text-xl mb-6 flex items-center gap-3">
                <Info size={20} style={{ color: 'var(--lime)' }} />GitHub Webhook Setup
              </h3>
              <div className="text-sm leading-relaxed" style={{ color: 'var(--t1)' }}>
                <p className="mb-5">Configure a GitHub Webhook so FixStack auto-scans on every push.</p>
                <ol className="pl-5 flex flex-col gap-3" style={{ listStyleType: 'decimal' }}>
                  {[
                    'Go to your repo → Settings → Webhooks → Add webhook',
                    <>Payload URL: <code className="mono text-[11px]" style={{ background: 'var(--b1)', padding: '2px 8px', borderRadius: 5, color: 'var(--lime)' }}>https://fixstack-backend.onrender.com/api/webhook</code></>,
                    <>Content type: <code className="mono text-[11px]" style={{ background: 'var(--b1)', padding: '2px 8px', borderRadius: 5 }}>application/json</code></>,
                    'Secret: matches your GITHUB_WEBHOOK_SECRET in Settings',
                    'Events: Pushes + Pull requests',
                    'Check Active and save',
                  ].map((item, i) => <li key={i}>{item}</li>)}
                </ol>
                <div className="mt-6 p-4 rounded-xl text-xs" style={{ background: 'var(--lime-dim)', border: '1px solid var(--b-lime)', color: 'var(--t1)' }}>
                  <strong style={{ color: 'var(--lime)' }}>Note:</strong> FixStack skips pushes that don't touch dependency files.
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ─── Toasts ────────────────────────────────── */}
      <div style={{ position: 'fixed', top: 24, right: 24, zIndex: 9999, display: 'flex', flexDirection: 'column', gap: 10, pointerEvents: 'none' }}>
        <AnimatePresence>
          {toasts.map(t => (
            <motion.div key={t.id} className={`toast toast-${t.type}`}
              style={{ pointerEvents: 'auto' }}
              initial={{ opacity: 0, x: 40, scale: 0.9 }}
              animate={{ opacity: 1, x: 0, scale: 1 }}
              exit={{ opacity: 0, x: 40, scale: 0.9 }}
              transition={{ type: 'spring', stiffness: 280, damping: 24 }}>
              {t.type === 'success' ? <CheckCircle2 size={14} /> : t.type === 'error' ? <AlertCircle size={14} /> : <Info size={14} />}
              {t.msg}
            </motion.div>
          ))}
        </AnimatePresence>
      </div>
    </div>
  );
}
