import React, { useState, useEffect, useRef } from 'react';
import {
  Shield, LayoutDashboard, Box, AlertTriangle, Activity, Play,
  Send, ChevronRight, Check, Loader2, Menu, X, Mail, User, MessageSquare
} from 'lucide-react';

// ─── Types ─────────────────────────────────────────────────────────────────────

type Section = 'overview' | 'how-it-works' | 'about' | 'contact' | 'demo' | 'dependencies' | 'vulnerabilities' | 'agents' | 'activity';

interface DemoFile {
  name: string;
  status: 'pending' | 'scanning' | 'fixed';
  message?: string;
}

interface ChatMessage {
  role: 'user' | 'assistant';
  content: string;
}

// ─── Demo Data ─────────────────────────────────────────────────────────────────

const DEMO_FILES: { name: string; message: string; delay: number }[] = [
  { name: 'package.json', message: 'Scanned 47 dependencies. Found 3 vulnerabilities.', delay: 800 },
  { name: 'lodash@4.17.19', message: 'CVE-2021-23337 detected. Upgrading to 4.17.21...', delay: 1200 },
  { name: 'axios@0.21.0', message: 'CVE-2021-3749 detected. Upgrading to 0.21.4...', delay: 900 },
  { name: 'node-fetch@2.6.0', message: 'CVE-2022-0235 detected. Upgrading to 2.6.7...', delay: 1100 },
  { name: 'package-lock.json', message: 'Lock file regenerated with secure versions.', delay: 600 },
  { name: 'Pull Request', message: 'PR #142 created: "fix: patch 3 security vulnerabilities"', delay: 500 },
];

const AI_RESPONSES: Record<string, string> = {
  'scan my package.json': `Scanning package.json...

Found 47 dependencies total:
- 3 direct dependencies with known CVEs
- 12 transitive dependencies flagged

Vulnerabilities detected:
1. lodash@4.17.19 → CVE-2021-23337 (Command Injection, High)
2. axios@0.21.0 → CVE-2021-3749 (ReDoS, Medium)
3. node-fetch@2.6.0 → CVE-2022-0235 (Information Exposure, Medium)

Recommended action: Run "fix all vulnerabilities" to auto-patch.`,

  'fix cve-2024-1234': `Analyzing CVE-2024-1234...

This CVE affects: example-package@1.2.3
Severity: High (CVSS 8.1)
Type: Remote Code Execution

Fix available: Upgrade to example-package@1.2.5

I will:
1. Update package.json with the patched version
2. Regenerate lock file
3. Run tests to verify compatibility
4. Create a pull request with the changes

Proceed? (This is a demo - no actual changes will be made)`,

  'show vulnerable dependencies': `Current vulnerability summary:

Critical (1):
└── minimist@1.2.5 → CVE-2021-44906 (Prototype Pollution)

High (2):
├── lodash@4.17.19 → CVE-2021-23337 (Command Injection)
└── tar@6.1.0 → CVE-2021-37701 (Arbitrary File Creation)

Medium (4):
├── axios@0.21.0 → CVE-2021-3749 (ReDoS)
├── node-fetch@2.6.0 → CVE-2022-0235 (Information Exposure)
├── glob-parent@5.1.1 → CVE-2020-28469 (ReDoS)
└── hosted-git-info@2.8.8 → CVE-2021-23362 (ReDoS)

Low (1):
└── debug@4.3.1 → CVE-2017-16137 (ReDoS)

Total: 8 vulnerabilities across 8 packages.`,

  'list agents': `FixStack Autonomous Agents:

1. Repo Scanner
   Status: Ready
   Role: Analyzes repository structure and dependencies

2. CVE Lookup Agent
   Status: Ready
   Role: Queries NVD database for vulnerability data

3. Context Analyst
   Status: Ready
   Role: Uses AI to understand code context and impact

4. Patch Planner
   Status: Ready
   Role: Plans optimal patching strategy

5. Validator
   Status: Ready
   Role: Tests patches for compatibility

6. GitHub PR Agent
   Status: Ready
   Role: Creates pull requests with fixes

All agents operational and ready for deployment.`,

  'help': `Available commands:

scan my package.json — Analyze dependencies for vulnerabilities
fix cve-2024-1234 — Patch a specific CVE
show vulnerable dependencies — List all detected vulnerabilities
list agents — Show available autonomous agents
fix all vulnerabilities — Auto-patch all detected issues
explain [cve-id] — Get detailed info about a CVE

You can also ask questions in natural language about:
- Dependency security
- CVE details and severity
- Patching strategies
- Agent capabilities`,
};

const QUICK_COMMANDS = [
  'scan my package.json',
  'show vulnerable dependencies',
  'fix cve-2024-1234',
  'list agents',
  'help',
];

// ─── Components ────────────────────────────────────────────────────────────────

function Loader() {
  return (
    <div className="flex items-center justify-center py-16">
      <div className="loader" />
    </div>
  );
}

function MetricCard({ label, value, trend }: { label: string; value: string | number; trend?: string }) {
  return (
    <div className="border border-[var(--border)] rounded-lg p-6 bg-[var(--bg)]">
      <p className="text-xs uppercase tracking-wider text-[var(--fg-muted)] mb-2">{label}</p>
      <p className="text-3xl font-semibold text-[var(--fg)]">{value}</p>
      {trend && <p className="text-sm text-[var(--fg-secondary)] mt-1">{trend}</p>}
    </div>
  );
}

function SidebarItem({ 
  icon: Icon, 
  label, 
  active, 
  onClick 
}: { 
  icon: React.ElementType; 
  label: string; 
  active: boolean; 
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      className={`w-full flex items-center gap-3 px-4 py-2.5 rounded-md text-sm transition-colors ${
        active 
          ? 'bg-[var(--fg)] text-[var(--bg)] font-medium' 
          : 'text-[var(--fg-secondary)] hover:bg-[var(--bg-tertiary)] hover:text-[var(--fg)]'
      }`}
    >
      <Icon size={18} />
      <span>{label}</span>
    </button>
  );
}

// ─── Sections ──────────────────────────────────────────────────────────────────

function OverviewSection() {
  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-semibold text-[var(--fg)] mb-2">Overview</h1>
        <p className="text-[var(--fg-secondary)]">Real-time security metrics for your repositories.</p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <MetricCard label="Dependencies Scanned" value="1,247" trend="+23 this week" />
        <MetricCard label="Vulnerabilities Fixed" value="89" trend="12 pending" />
        <MetricCard label="Active Agents" value="6" trend="All operational" />
        <MetricCard label="Risk Score" value="A" trend="Low risk" />
      </div>

      <div className="border border-[var(--border)] rounded-lg p-6 bg-[var(--bg)]">
        <h2 className="text-lg font-medium text-[var(--fg)] mb-4">Recent Activity</h2>
        <div className="space-y-3">
          {[
            { time: '2 min ago', event: 'CVE-2024-1234 patched in repo/frontend' },
            { time: '15 min ago', event: 'Scan completed for repo/backend — 0 issues' },
            { time: '1 hour ago', event: 'PR #142 merged: security patches' },
            { time: '3 hours ago', event: 'New vulnerability detected in lodash@4.17.19' },
          ].map((item, i) => (
            <div key={i} className="flex items-start gap-4 py-2 border-b border-[var(--border-light)] last:border-0">
              <span className="text-xs text-[var(--fg-muted)] w-20 shrink-0">{item.time}</span>
              <span className="text-sm text-[var(--fg-secondary)]">{item.event}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function HowItWorksSection() {
  const steps = [
    { title: 'Connect Repository', description: 'Link your GitHub repository to FixStack. We support public and private repos.' },
    { title: 'Automatic Scanning', description: 'Our agents continuously monitor your dependencies for known CVEs and security issues.' },
    { title: 'AI Analysis', description: 'Context-aware AI analyzes the impact of each vulnerability on your specific codebase.' },
    { title: 'Auto-Patching', description: 'Validated patches are applied automatically, with tests run to ensure compatibility.' },
    { title: 'Pull Request', description: 'A clean PR is created with all fixes, ready for your review and merge.' },
  ];

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-semibold text-[var(--fg)] mb-2">How It Works</h1>
        <p className="text-[var(--fg-secondary)]">FixStack automates dependency security from detection to remediation.</p>
      </div>

      <div className="space-y-6">
        {steps.map((step, i) => (
          <div key={i} className="flex gap-6">
            <div className="flex flex-col items-center">
              <div className="w-8 h-8 rounded-full bg-[var(--fg)] text-[var(--bg)] flex items-center justify-center text-sm font-medium">
                {i + 1}
              </div>
              {i < steps.length - 1 && <div className="w-px h-full bg-[var(--border)] mt-2" />}
            </div>
            <div className="pb-8">
              <h3 className="font-medium text-[var(--fg)] mb-1">{step.title}</h3>
              <p className="text-sm text-[var(--fg-secondary)]">{step.description}</p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function DemoSection() {
  const [isRunning, setIsRunning] = useState(false);
  const [files, setFiles] = useState<DemoFile[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);

  const runDemo = () => {
    setIsRunning(true);
    setFiles([]);
    setCurrentIndex(0);
  };

  useEffect(() => {
    if (!isRunning || currentIndex >= DEMO_FILES.length) {
      if (currentIndex >= DEMO_FILES.length) {
        setIsRunning(false);
      }
      return;
    }

    const file = DEMO_FILES[currentIndex];
    
    // Add file as scanning
    setFiles(prev => [...prev, { name: file.name, status: 'scanning' }]);

    // After delay, mark as fixed
    const timer = setTimeout(() => {
      setFiles(prev => 
        prev.map((f, i) => 
          i === prev.length - 1 ? { ...f, status: 'fixed', message: file.message } : f
        )
      );
      setCurrentIndex(prev => prev + 1);
    }, file.delay);

    return () => clearTimeout(timer);
  }, [isRunning, currentIndex]);

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-semibold text-[var(--fg)] mb-2">Demo</h1>
        <p className="text-[var(--fg-secondary)]">See FixStack in action with a sample repository.</p>
      </div>

      <button
        onClick={runDemo}
        disabled={isRunning}
        className="inline-flex items-center gap-2 px-5 py-2.5 bg-[var(--fg)] text-[var(--bg)] rounded-md font-medium text-sm hover:opacity-90 disabled:opacity-50 disabled:cursor-not-allowed"
      >
        <Play size={16} />
        Run Demo with Sample File
      </button>

      {files.length > 0 && (
        <div className="border border-[var(--border)] rounded-lg overflow-hidden bg-[var(--bg)]">
          <div className="px-4 py-3 border-b border-[var(--border)] bg-[var(--bg-secondary)]">
            <p className="text-sm font-medium text-[var(--fg)]">Scan Progress</p>
          </div>
          <div className="divide-y divide-[var(--border-light)]">
            {files.map((file, i) => (
              <div key={i} className="px-4 py-3 flex items-start gap-3">
                <div className="mt-0.5">
                  {file.status === 'scanning' ? (
                    <Loader2 size={16} className="animate-spin text-[var(--fg-muted)]" />
                  ) : (
                    <Check size={16} className="text-[var(--success)]" />
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-[var(--fg)]">{file.name}</p>
                  {file.status === 'scanning' ? (
                    <p className="text-sm text-[var(--fg-muted)]">Scanning...</p>
                  ) : (
                    <p className="text-sm text-[var(--fg-secondary)]">{file.message}</p>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

function AboutSection() {
  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-semibold text-[var(--fg)] mb-2">About FixStack</h1>
        <p className="text-[var(--fg-secondary)]">Autonomous dependency security for modern teams.</p>
      </div>

      <div className="prose prose-sm max-w-none">
        <p className="text-[var(--fg-secondary)] leading-relaxed">
          FixStack is an autonomous security agent that continuously monitors your GitHub repositories 
          for vulnerable dependencies. Unlike traditional scanners that just report issues, FixStack 
          takes action — analyzing context, planning patches, validating fixes, and creating pull 
          requests automatically.
        </p>
        <p className="text-[var(--fg-secondary)] leading-relaxed mt-4">
          Built for engineering teams who value security but don&apos;t want to spend hours manually 
          triaging CVEs. FixStack uses AI to understand the actual impact of vulnerabilities in 
          your specific codebase, prioritizing what matters and ignoring noise.
        </p>
        <p className="text-[var(--fg-secondary)] leading-relaxed mt-4">
          Our multi-agent system includes specialized agents for scanning, CVE lookup, context 
          analysis, patch planning, validation, and PR creation — working together to keep your 
          dependencies secure with minimal human intervention.
        </p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="border border-[var(--border)] rounded-lg p-4 bg-[var(--bg)]">
          <p className="text-2xl font-semibold text-[var(--fg)]">6</p>
          <p className="text-sm text-[var(--fg-secondary)]">Autonomous Agents</p>
        </div>
        <div className="border border-[var(--border)] rounded-lg p-4 bg-[var(--bg)]">
          <p className="text-2xl font-semibold text-[var(--fg)]">24/7</p>
          <p className="text-sm text-[var(--fg-secondary)]">Continuous Monitoring</p>
        </div>
        <div className="border border-[var(--border)] rounded-lg p-4 bg-[var(--bg)]">
          <p className="text-2xl font-semibold text-[var(--fg)]">&lt;5min</p>
          <p className="text-sm text-[var(--fg-secondary)]">Avg. Response Time</p>
        </div>
      </div>
    </div>
  );
}

function ContactSection() {
  const [submitted, setSubmitted] = useState(false);
  const [form, setForm] = useState({ name: '', email: '', message: '' });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitted(true);
  };

  if (submitted) {
    return (
      <div className="space-y-8">
        <div>
          <h1 className="text-2xl font-semibold text-[var(--fg)] mb-2">Contact</h1>
        </div>
        <div className="border border-[var(--border)] rounded-lg p-8 bg-[var(--bg)] text-center">
          <Check size={32} className="mx-auto mb-4 text-[var(--success)]" />
          <h2 className="text-lg font-medium text-[var(--fg)] mb-2">Message Sent</h2>
          <p className="text-sm text-[var(--fg-secondary)]">Thank you for reaching out. We&apos;ll get back to you shortly.</p>
          <button
            onClick={() => { setSubmitted(false); setForm({ name: '', email: '', message: '' }); }}
            className="mt-4 text-sm text-[var(--fg-secondary)] underline hover:text-[var(--fg)]"
          >
            Send another message
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-semibold text-[var(--fg)] mb-2">Contact</h1>
        <p className="text-[var(--fg-secondary)]">Get in touch with the FixStack team.</p>
      </div>

      <form onSubmit={handleSubmit} className="max-w-md space-y-4">
        <div>
          <label className="block text-sm font-medium text-[var(--fg)] mb-1.5">Name</label>
          <div className="relative">
            <User size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--fg-muted)]" />
            <input
              type="text"
              required
              value={form.name}
              onChange={e => setForm({ ...form, name: e.target.value })}
              className="w-full pl-10 pr-4 py-2.5 border border-[var(--border)] rounded-md bg-[var(--bg)] text-[var(--fg)] placeholder:text-[var(--fg-muted)] focus:outline-none focus:border-[var(--fg)]"
              placeholder="Your name"
            />
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-[var(--fg)] mb-1.5">Email</label>
          <div className="relative">
            <Mail size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--fg-muted)]" />
            <input
              type="email"
              required
              value={form.email}
              onChange={e => setForm({ ...form, email: e.target.value })}
              className="w-full pl-10 pr-4 py-2.5 border border-[var(--border)] rounded-md bg-[var(--bg)] text-[var(--fg)] placeholder:text-[var(--fg-muted)] focus:outline-none focus:border-[var(--fg)]"
              placeholder="you@example.com"
            />
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-[var(--fg)] mb-1.5">Message</label>
          <div className="relative">
            <MessageSquare size={16} className="absolute left-3 top-3 text-[var(--fg-muted)]" />
            <textarea
              required
              rows={4}
              value={form.message}
              onChange={e => setForm({ ...form, message: e.target.value })}
              className="w-full pl-10 pr-4 py-2.5 border border-[var(--border)] rounded-md bg-[var(--bg)] text-[var(--fg)] placeholder:text-[var(--fg-muted)] focus:outline-none focus:border-[var(--fg)] resize-none"
              placeholder="How can we help?"
            />
          </div>
        </div>

        <button
          type="submit"
          className="inline-flex items-center gap-2 px-5 py-2.5 bg-[var(--fg)] text-[var(--bg)] rounded-md font-medium text-sm hover:opacity-90"
        >
          Send Message
          <ChevronRight size={16} />
        </button>
      </form>
    </div>
  );
}

function AIAssistantSection() {
  const [messages, setMessages] = useState<ChatMessage[]>([
    { role: 'assistant', content: 'Hello! I\'m the FixStack AI assistant. Ask me anything about dependency security, or try one of the quick commands below.' }
  ]);
  const [input, setInput] = useState('');
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const handleSend = (text?: string) => {
    const message = text || input;
    if (!message.trim()) return;

    setMessages(prev => [...prev, { role: 'user', content: message }]);
    setInput('');

    // Simulate response
    setTimeout(() => {
      const lowerMessage = message.toLowerCase().trim();
      let response = AI_RESPONSES[lowerMessage] || 
        `I understand you're asking about "${message}". In a production environment, I would analyze your request and provide detailed information about dependencies, vulnerabilities, or patching strategies.\n\nTry commands like "help" to see what I can do.`;

      setMessages(prev => [...prev, { role: 'assistant', content: response }]);
    }, 300);
  };

  return (
    <div className="space-y-6 h-full flex flex-col">
      <div>
        <h1 className="text-2xl font-semibold text-[var(--fg)] mb-2">AI Assistant</h1>
        <p className="text-[var(--fg-secondary)]">Ask questions about your dependencies and security.</p>
      </div>

      <div className="flex-1 flex flex-col border border-[var(--border)] rounded-lg overflow-hidden bg-[var(--bg)]">
        {/* Messages */}
        <div className="flex-1 overflow-y-auto p-4 space-y-4 min-h-[300px] max-h-[400px]">
          {messages.map((msg, i) => (
            <div key={i} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
              <div
                className={`max-w-[85%] px-4 py-3 rounded-lg text-sm whitespace-pre-wrap ${
                  msg.role === 'user'
                    ? 'bg-[var(--fg)] text-[var(--bg)]'
                    : 'bg-[var(--bg-secondary)] text-[var(--fg)] border border-[var(--border)]'
                }`}
              >
                {msg.content}
              </div>
            </div>
          ))}
          <div ref={messagesEndRef} />
        </div>

        {/* Quick commands */}
        <div className="px-4 py-3 border-t border-[var(--border)] bg-[var(--bg-secondary)]">
          <p className="text-xs text-[var(--fg-muted)] mb-2">Quick commands:</p>
          <div className="flex flex-wrap gap-2">
            {QUICK_COMMANDS.map((cmd, i) => (
              <button
                key={i}
                onClick={() => handleSend(cmd)}
                className="px-3 py-1.5 text-xs border border-[var(--border)] rounded-full text-[var(--fg-secondary)] hover:bg-[var(--bg-tertiary)] hover:text-[var(--fg)]"
              >
                {cmd}
              </button>
            ))}
          </div>
        </div>

        {/* Input */}
        <div className="p-4 border-t border-[var(--border)]">
          <form
            onSubmit={e => { e.preventDefault(); handleSend(); }}
            className="flex gap-2"
          >
            <input
              type="text"
              value={input}
              onChange={e => setInput(e.target.value)}
              placeholder="Ask about dependencies, CVEs, or security..."
              className="flex-1 px-4 py-2.5 border border-[var(--border)] rounded-md bg-[var(--bg)] text-[var(--fg)] placeholder:text-[var(--fg-muted)] focus:outline-none focus:border-[var(--fg)]"
            />
            <button
              type="submit"
              className="px-4 py-2.5 bg-[var(--fg)] text-[var(--bg)] rounded-md hover:opacity-90"
            >
              <Send size={16} />
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}

// Placeholder sections
function DependenciesSection() {
  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-semibold text-[var(--fg)] mb-2">Dependencies</h1>
        <p className="text-[var(--fg-secondary)]">View and manage your project dependencies.</p>
      </div>
      <div className="border border-[var(--border)] rounded-lg p-6 bg-[var(--bg)]">
        <p className="text-sm text-[var(--fg-muted)]">Connect a repository to view dependencies.</p>
      </div>
    </div>
  );
}

function VulnerabilitiesSection() {
  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-semibold text-[var(--fg)] mb-2">Vulnerabilities</h1>
        <p className="text-[var(--fg-secondary)]">Track and remediate security vulnerabilities.</p>
      </div>
      <div className="border border-[var(--border)] rounded-lg p-6 bg-[var(--bg)]">
        <p className="text-sm text-[var(--fg-muted)]">No vulnerabilities detected. Run a scan to check.</p>
      </div>
    </div>
  );
}

function AgentsSection() {
  const agents = [
    { name: 'Repo Scanner', status: 'Ready', description: 'Analyzes repository structure and dependencies' },
    { name: 'CVE Lookup', status: 'Ready', description: 'Queries NVD database for vulnerability data' },
    { name: 'Context Analyst', status: 'Ready', description: 'AI-powered code impact analysis' },
    { name: 'Patch Planner', status: 'Ready', description: 'Plans optimal patching strategy' },
    { name: 'Validator', status: 'Ready', description: 'Tests patches for compatibility' },
    { name: 'GitHub PR Agent', status: 'Ready', description: 'Creates pull requests with fixes' },
  ];

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-semibold text-[var(--fg)] mb-2">Agents</h1>
        <p className="text-[var(--fg-secondary)]">Autonomous agents powering FixStack.</p>
      </div>
      <div className="grid gap-4">
        {agents.map((agent, i) => (
          <div key={i} className="border border-[var(--border)] rounded-lg p-4 bg-[var(--bg)] flex items-center justify-between">
            <div>
              <p className="font-medium text-[var(--fg)]">{agent.name}</p>
              <p className="text-sm text-[var(--fg-secondary)]">{agent.description}</p>
            </div>
            <span className="text-xs px-2 py-1 rounded-full bg-[var(--bg-tertiary)] text-[var(--success)]">
              {agent.status}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}

function ActivitySection() {
  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-semibold text-[var(--fg)] mb-2">Activity</h1>
        <p className="text-[var(--fg-secondary)]">Recent agent activity and events.</p>
      </div>
      <div className="border border-[var(--border)] rounded-lg p-6 bg-[var(--bg)]">
        <p className="text-sm text-[var(--fg-muted)]">No recent activity. Start a scan to see agent events.</p>
      </div>
    </div>
  );
}

// ─── Main App ──────────────────────────────────────────────────────────────────

export default function App() {
  const [currentSection, setCurrentSection] = useState<Section>('overview');
  const [isLoading, setIsLoading] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const navigateTo = (section: Section) => {
    if (section === currentSection) return;
    setIsLoading(true);
    setMobileMenuOpen(false);
    
    // Simulate minimal loading delay
    setTimeout(() => {
      setCurrentSection(section);
      setIsLoading(false);
    }, 350);
  };

  const renderSection = () => {
    if (isLoading) return <Loader />;

    switch (currentSection) {
      case 'overview': return <OverviewSection />;
      case 'how-it-works': return <HowItWorksSection />;
      case 'demo': return <DemoSection />;
      case 'about': return <AboutSection />;
      case 'contact': return <ContactSection />;
      case 'dependencies': return <DependenciesSection />;
      case 'vulnerabilities': return <VulnerabilitiesSection />;
      case 'agents': return <AgentsSection />;
      case 'activity': return <ActivitySection />;
      default: return <OverviewSection />;
    }
  };

  const navLinks: { section: Section; label: string }[] = [
    { section: 'overview', label: 'Overview' },
    { section: 'how-it-works', label: 'How it Works' },
    { section: 'about', label: 'About' },
    { section: 'contact', label: 'Contact' },
  ];

  const sidebarLinks: { section: Section; icon: React.ElementType; label: string }[] = [
    { section: 'overview', icon: LayoutDashboard, label: 'Overview' },
    { section: 'dependencies', icon: Box, label: 'Dependencies' },
    { section: 'vulnerabilities', icon: AlertTriangle, label: 'Vulnerabilities' },
    { section: 'agents', icon: Activity, label: 'Agents' },
    { section: 'activity', icon: Activity, label: 'Activity' },
    { section: 'demo', icon: Play, label: 'Demo' },
  ];

  return (
    <div className="min-h-screen bg-[var(--bg)]">
      {/* Top Navbar */}
      <header className="sticky top-0 z-50 bg-[var(--bg)] border-b border-[var(--border)]">
        <div className="flex items-center justify-between px-4 lg:px-8 h-14">
          {/* Logo */}
          <div className="flex items-center gap-3">
            <Shield size={24} className="text-[var(--fg)]" />
            <div>
              <span className="font-semibold text-[var(--fg)]">FixStack</span>
              <span className="hidden sm:inline text-[var(--fg-muted)] ml-2 text-sm">
                Autonomous Dependency Security
              </span>
            </div>
          </div>

          {/* Desktop Nav */}
          <nav className="hidden md:flex items-center gap-6">
            {navLinks.map(link => (
              <button
                key={link.section}
                onClick={() => navigateTo(link.section)}
                className={`text-sm ${
                  currentSection === link.section
                    ? 'text-[var(--fg)] font-medium'
                    : 'text-[var(--fg-secondary)] hover:text-[var(--fg)]'
                }`}
              >
                {link.label}
              </button>
            ))}
          </nav>

          {/* Mobile menu button */}
          <button
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            className="md:hidden p-2 text-[var(--fg)]"
          >
            {mobileMenuOpen ? <X size={20} /> : <Menu size={20} />}
          </button>
        </div>

        {/* Mobile Nav */}
        {mobileMenuOpen && (
          <nav className="md:hidden px-4 py-4 border-t border-[var(--border)] bg-[var(--bg)]">
            <div className="space-y-2">
              {[...navLinks, ...sidebarLinks.filter(s => !navLinks.some(n => n.section === s.section))].map(link => (
                <button
                  key={link.section}
                  onClick={() => navigateTo(link.section)}
                  className={`block w-full text-left px-4 py-2 rounded-md text-sm ${
                    currentSection === link.section
                      ? 'bg-[var(--fg)] text-[var(--bg)]'
                      : 'text-[var(--fg-secondary)] hover:bg-[var(--bg-tertiary)]'
                  }`}
                >
                  {link.label}
                </button>
              ))}
            </div>
          </nav>
        )}
      </header>

      <div className="flex">
        {/* Sidebar - Desktop only */}
        <aside className="hidden lg:block w-60 shrink-0 border-r border-[var(--border)] min-h-[calc(100vh-56px)] p-4">
          <nav className="space-y-1">
            {sidebarLinks.map(link => (
              <SidebarItem
                key={link.section}
                icon={link.icon}
                label={link.label}
                active={currentSection === link.section}
                onClick={() => navigateTo(link.section)}
              />
            ))}
          </nav>
        </aside>

        {/* Main Content */}
        <main className="flex-1 p-6 lg:p-10 max-w-5xl">
          {renderSection()}

          {/* AI Assistant - Always visible at bottom */}
          {currentSection !== 'contact' && (
            <div className="mt-12 pt-8 border-t border-[var(--border)]">
              <AIAssistantSection />
            </div>
          )}
        </main>
      </div>
    </div>
  );
}
