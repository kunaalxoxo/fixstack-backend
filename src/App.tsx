import React, { useState, useEffect, useRef } from 'react';
import { fixstackApi } from './api';
import { Run, RunEvent } from './types';
import './App.css';
import { Shield, Play, Loader2, CheckCircle2, AlertCircle, Clock, History, Github, ArrowRight, Activity, Box, XCircle } from 'lucide-react';

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

  let eventClass = `event event-${event.id}`;
  if (isRetryWarn) eventClass += ' event-retry-warn';
  if (isRetrySuccess) eventClass += ' event-retry-success';
  if (isPRCreated) eventClass += ' event-pr-created';

  const getRelativeTime = (timestamp: string) => {
    const seconds = Math.floor((new Date().getTime() - new Date(timestamp).getTime()) / 1000);
    if (seconds < 60) return `${seconds}s ago`;
    const mins = Math.floor(seconds / 60);
    return `${mins}m ago`;
  };

  const getIcon = () => {
    if (isPRCreated) return <Github size={20} className="text-success" />;
    switch (event.status) {
      case 'SUCCESS': return <CheckCircle2 size={16} className={isRetrySuccess ? '' : 'text-success'} />;
      case 'ERROR': return <AlertCircle size={16} className="text-error" />;
      case 'WARNING': return <AlertCircle size={16} className={isRetryWarn ? '' : 'text-warning'} />;
      default: return <div className="dot-info" />;
    }
  };

  return (
    <div className={eventClass}>
      <div className="event-icon">{getIcon()}</div>
      <div className={`event-content status-${event.status}`}>
        {isPRCreated ? (
          <>
            <h3>🎉 Pull Request Created</h3>
            <p style={{ color: 'var(--text)', marginBottom: '1.5rem' }}>{event.message}</p>
            {run.prUrl && (
              <a href={run.prUrl} target="_blank" rel="noopener noreferrer">
                <button><Github size={18} /> View Pull Request <ArrowRight size={18} /></button>
              </a>
            )}
          </>
        ) : (
          <>
            <div className="event-header">
              <span className="agent-badge">{event.agentName}</span>
              <span className="tool-name">{event.toolName}</span>
              <span className="timestamp">{getRelativeTime(event.timestamp)}</span>
            </div>
            <div className="event-msg">
              {isRetryWarn ? '⚠ Attempt Failed — Retrying...' : isRetrySuccess ? '✅ Retry Succeeded' : event.message}
            </div>
            {event.metadata && typeof event.metadata === 'object' && (
              <div className="event-metadata">
                {Object.entries(event.metadata).map(([key, val]) => (
                  <span key={key}>{key}: <strong>{String(val)}</strong></span>
                ))}
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
};

function App() {
  const [currentRun, setCurrentRun] = useState<Run | null>(null);
  const [repoUrl, setRepoUrl] = useState('');
  const [events, setEvents] = useState<RunEvent[]>([]);
  const [history, setHistory] = useState<Run[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const pollInterval = useRef<number | null>(null);

  const duration = useRunDuration(currentRun);

  useEffect(() => {
    fetchHistory();
  }, []);

  const fetchHistory = async () => {
    try {
      const res = await fixstackApi.getAllRuns();
      setHistory(res.data.sort((a, b) => new Date(b.startTime).getTime() - new Date(a.startTime).getTime()));
    } catch (e) {
      console.error('Failed to fetch history', e);
    }
  };

  const validateUrl = (url: string) => {
    if (url && !url.startsWith('https://github.com/')) {
      return false;
    }
    return true;
  };

  const startScan = async (isDemo = false) => {
    if (!isDemo && !validateUrl(repoUrl)) {
      setError('Please enter a valid GitHub URL starting with https://github.com/');
      return;
    }

    setIsLoading(true);
    setError(null);
    setCurrentRun(null);
    setEvents([]);
    
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

  const loadRun = (id: string) => {
    window.scrollTo({ top: 0, behavior: 'smooth' });
    setCurrentRun(null);
    setEvents([]);
    fetchRun(id);
    startPolling(id);
  };

  const fetchRun = async (id: string) => {
    try {
      const runRes = await fixstackApi.getRun(id);
      setCurrentRun(runRes.data);
      
      const evRes = await fixstackApi.getEvents(id);
      setEvents(evRes.data);

      if (runRes.data.status === 'COMPLETED' || runRes.data.status === 'FAILED') {
        stopPolling();
        fetchHistory();
      }
    } catch (err) {
      console.error('Error fetching run details:', err);
    }
  };

  const startPolling = (id: string) => {
    stopPolling();
    pollInterval.current = window.setInterval(() => {
      fetchRun(id);
    }, 2500);
  };

  const stopPolling = () => {
    if (pollInterval.current) {
      clearInterval(pollInterval.current);
      pollInterval.current = null;
      setIsLoading(false);
    }
  };

  useEffect(() => {
    return () => stopPolling();
  }, []);

  return (
    <div className="container">
      {!currentRun ? (
        <div className="hero-section">
          <Shield size={80} color="var(--primary)" style={{ marginBottom: '1.5rem' }} />
          <h1>DepShield</h1>
          <p>Autonomous Dependency Remediation</p>
          <p style={{ fontSize: '1rem', marginBottom: '3rem' }}>
            Paste a public GitHub repo URL. DepShield scans for vulnerabilities, plans patches, and opens a PR automatically.
          </p>

          <div className="input-container">
            <input 
              type="text" 
              placeholder="https://github.com/owner/repo" 
              value={repoUrl}
              onChange={(e) => {
                setRepoUrl(e.target.value);
                if (error) setError(null);
              }}
              disabled={isLoading}
            />
            <button onClick={() => startScan(false)} disabled={isLoading || !repoUrl}>
              {isLoading ? <Loader2 className="animate-spin" /> : <><Play size={18} /> Start Scan</>}
            </button>
          </div>
          {error && <div className="error-text">{error}</div>}

          <div style={{ marginTop: '2rem' }}>
            <button className="btn-secondary" onClick={() => startScan(true)} disabled={isLoading}>
              Run Demo Scan
            </button>
          </div>
        </div>
      ) : (
        <>
          <div className="status-bar">
            <div className="status-bar-left">
              <div>
                <div style={{ fontSize: '0.8rem', color: 'var(--muted)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Repository</div>
                <div style={{ fontWeight: 600, fontSize: '1.1rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  <Github size={18} /> {currentRun.input.repoName}
                </div>
              </div>
              <div style={{ paddingLeft: '1.5rem', borderLeft: '1px solid var(--border)' }}>
                <div style={{ fontSize: '0.8rem', color: 'var(--muted)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Run ID</div>
                <div style={{ fontFamily: 'monospace' }}>{currentRun.id.substring(0, 8)}</div>
              </div>
              <div style={{ paddingLeft: '1.5rem', borderLeft: '1px solid var(--border)' }}>
                <div style={{ fontSize: '0.8rem', color: 'var(--muted)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Duration</div>
                <div style={{ fontFamily: 'monospace', display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
                  <Clock size={14} /> {duration}s
                </div>
              </div>
            </div>
            <div>
              <div className={`badge badge-${currentRun.status.toLowerCase()}`}>
                {currentRun.status}
              </div>
            </div>
          </div>

          <div className="card">
            <h2 style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <Activity size={24} color="var(--primary)" /> Live Agent Timeline
            </h2>
            <div className="timeline">
              {events.length === 0 && currentRun.status === 'PENDING' ? (
                <div className="skeleton-timeline">
                  {[1, 2].map(i => <div key={i} className="skeleton-event" />)}
                </div>
              ) : (
                events.map((event) => (
                  <TimelineEventCard key={event.id} event={event} run={currentRun} />
                ))
              )}
              {currentRun.status === 'RUNNING' && (
                <div className="event" style={{ border: 'none' }}>
                  <div className="event-icon"><Loader2 size={16} className="animate-spin text-primary" /></div>
                  <div className="event-content" style={{ background: 'transparent', border: 'none', fontStyle: 'italic', color: 'var(--muted)' }}>
                    Agents are working...
                  </div>
                </div>
              )}
            </div>
          </div>

          {currentRun.status === 'COMPLETED' && (
            <>
              <h2 style={{ marginTop: '3rem', marginBottom: '1rem' }}>Scan Results</h2>
              
              <div className="stats-grid">
                <div className="stat-card">
                  <div className="stat-value">{currentRun.vulnerabilities.length}</div>
                  <div className="stat-label">Total Vulnerabilities Found</div>
                </div>
                <div className="stat-card" style={{ borderBottomColor: 'var(--success)' }}>
                  <div className="stat-value text-success">{currentRun.remediations.filter(r => r.status === 'FIXED').length}</div>
                  <div className="stat-label">Packages Fixed</div>
                </div>
                <div className="stat-card" style={{ borderBottomColor: 'var(--error)' }}>
                  <div className="stat-value text-error">{currentRun.remediations.filter(r => r.status === 'FAILED').length}</div>
                  <div className="stat-label">Packages Failed</div>
                </div>
                <div className="stat-card">
                  <div className="stat-value">{duration}s</div>
                  <div className="stat-label">Run Duration</div>
                </div>
              </div>

              {currentRun.prUrl && (
                <div className="card pr-action-card">
                  <h2 style={{ fontSize: '2rem', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem', marginBottom: '1rem' }}>
                    <CheckCircle2 size={32} /> Pull Request Opened on GitHub
                  </h2>
                  <p style={{ fontSize: '1.1rem', marginBottom: '1.5rem', color: '#cbd5e1' }}>
                    DepShield has committed the patched package.json and opened a PR for review.
                  </p>
                  <div style={{ marginBottom: '2rem' }}>
                    Branch: <span className="code-tag">{currentRun.prBranch}</span>
                  </div>
                  <a href={currentRun.prUrl} target="_blank" rel="noopener noreferrer">
                    <button style={{ fontSize: '1.1rem', padding: '1rem 2rem' }}>
                      <Github size={20} /> View Pull Request on GitHub <ArrowRight size={20} />
                    </button>
                  </a>
                </div>
              )}

              {currentRun.vulnerabilities.length > 0 && (
                <div className="card" style={{ overflowX: 'auto' }}>
                  <h3><Shield size={20} style={{ verticalAlign: 'middle', marginRight: '0.5rem' }}/> Vulnerabilities</h3>
                  <table>
                    <thead>
                      <tr>
                        <th>Package</th>
                        <th>Version</th>
                        <th>CVE ID</th>
                        <th>Severity</th>
                        <th>Description</th>
                      </tr>
                    </thead>
                    <tbody>
                      {currentRun.vulnerabilities.map(v => (
                        <tr key={v.id}>
                          <td><strong>{v.pkgName}</strong></td>
                          <td><span className="code-tag">{v.pkgVersion}</span></td>
                          <td>{v.cveId}</td>
                          <td><span className={`severity-badge severity-${v.severity.toUpperCase()}`}>{v.severity}</span></td>
                          <td style={{ fontSize: '0.9rem', color: 'var(--muted)', maxWidth: '300px' }}>{v.description}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}

              {currentRun.remediations.length > 0 && (
                <div className="card" style={{ overflowX: 'auto' }}>
                  <h3><Box size={20} style={{ verticalAlign: 'middle', marginRight: '0.5rem' }}/> Remediations</h3>
                  <table>
                    <thead>
                      <tr>
                        <th>Package</th>
                        <th>Old Version</th>
                        <th>New Version</th>
                        <th>Attempts</th>
                        <th>Status</th>
                      </tr>
                    </thead>
                    <tbody>
                      {currentRun.remediations.map((r, i) => (
                        <tr key={i}>
                          <td><strong>{r.pkgName}</strong></td>
                          <td><span className="code-tag">{r.oldVersion}</span></td>
                          <td>
                            {r.status === 'FIXED' ? (
                              <span className="code-tag" style={{ color: 'var(--success)' }}>{r.newVersion}</span>
                            ) : (
                              <span className="code-tag" style={{ color: 'var(--muted)' }}>{r.newVersion}</span>
                            )}
                          </td>
                          <td>{r.attempts}</td>
                          <td>
                            {r.status === 'FIXED' ? (
                              <span className="badge badge-completed">FIXED</span>
                            ) : (
                              <span className="badge badge-failed">FAILED</span>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </>
          )}

          {currentRun.status === 'FAILED' && (
            <div className="card" style={{ borderColor: 'var(--error)', background: 'var(--error-bg)' }}>
              <h3 style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: '#fca5a5' }}>
                <XCircle size={24} /> Workflow Failed
              </h3>
              <p style={{ color: '#fecaca' }}>The autonomous remediation encountered a critical error and could not proceed. Check the timeline for details.</p>
            </div>
          )}

          <div style={{ textAlign: 'center', marginTop: '3rem', marginBottom: '2rem' }}>
            <button className="btn-secondary" onClick={() => { setCurrentRun(null); setRepoUrl(''); }}>
              Start a New Scan
            </button>
          </div>
        </>
      )}

      {history.length > 0 && (
        <div style={{ marginTop: '4rem' }}>
          <h3 style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: 'var(--muted)' }}>
            <History size={20} /> Recent Scans
          </h3>
          <div className="history-list">
            {history.slice(0, 10).map(run => (
              <div key={run.id} className="history-item" onClick={() => loadRun(run.id)}>
                <div>
                  <div style={{ fontWeight: 600 }}>{run.input.repoName}</div>
                  <div style={{ fontSize: '0.8rem', color: 'var(--muted)' }}>
                    {new Date(run.startTime).toLocaleString()} • {run.vulnerabilities?.length || 0} Vulns
                  </div>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                  {run.prUrl && <Github size={18} className="text-success" />}
                  <span className={`badge badge-${run.status.toLowerCase()}`}>{run.status}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

export default App;
