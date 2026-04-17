import express, { Request, Response } from 'express';
import cors from 'cors';
import crypto from 'crypto';
import { v4 as uuidv4 } from 'uuid';
import { db } from './db/store';
import { DependencyInput, Run } from './types';
import { WorkflowOrchestrator } from './services/orchestrator';
import { RepoFetcher } from './services/repoFetcher';
import { Logger } from './services/logger';
import * as cron from 'node-cron';

const app = express();
app.use(cors());

// Raw body needed for webhook signature verification
app.use(
  express.json({
    verify: (req: any, _res, buf) => {
      req.rawBody = buf;
    },
  })
);

// Health Check
app.get('/health', (_req: Request, res: Response) =>
  res.status(200).json({ status: 'ok', timestamp: new Date().toISOString() })
);

const triggerScan = async (repoUrl: string) => {
  const input = await RepoFetcher.fetchDependencies(repoUrl);
  const run: Run = {
    id: uuidv4(),
    status: 'PENDING',
    startTime: new Date().toISOString(),
    input,
    vulnerabilities: [],
    remediations: [],
  };
  await db.saveRun(run);
  const orchestrator = new WorkflowOrchestrator(run);
  orchestrator.execute(); // fire-and-forget async
  return run;
};

// POST /api/run-scan
app.post('/api/run-scan', async (req: Request, res: Response) => {
  try {
    if (req.body.repoUrl) {
      const run = await triggerScan(req.body.repoUrl);
      res.status(202).json({
        message: 'Scan started',
        runId: run.id,
        repoName: run.input.repoName,
      });
    } else {
      const input: DependencyInput = req.body.input || {
        repoName: 'my-demo-project',
        manifestType: 'package.json',
        ecosystem: 'npm',
        dependencies: [
          { name: 'lodash', version: '4.17.15' },
          { name: 'axios', version: '0.21.1' },
          { name: 'react', version: '18.2.0' },
        ],
      };
      const run: Run = {
        id: uuidv4(),
        status: 'PENDING',
        startTime: new Date().toISOString(),
        input,
        vulnerabilities: [],
        remediations: [],
      };
      await db.saveRun(run);
      const orchestrator = new WorkflowOrchestrator(run);
      orchestrator.execute();
      res.status(202).json({
        message: 'Demo scan started',
        runId: run.id,
        repoName: run.input.repoName,
      });
    }
  } catch (error: any) {
    res.status(400).json({ error: error.message });
  }
});

// POST /api/run-org-scan
app.post('/api/run-org-scan', async (req: Request, res: Response) => {
  try {
    const orgName = req.body.org;
    if (!orgName) return res.status(400).json({ error: 'org is required' });
    RepoFetcher.fetchOrgRepos(`https://github.com/${orgName}`)
      .then(async (repos) => {
        for (const repo of repos) {
          try { await triggerScan(repo); } catch (e) { console.error(`Failed to scan ${repo}`, e); }
        }
      })
      .catch(console.error);
    res.status(202).json({ message: `Started scanning organization ${orgName}` });
  } catch (error: any) {
    res.status(400).json({ error: error.message });
  }
});

/**
 * POST /api/webhook
 * Accepts GitHub App push/pull_request webhook events.
 * Validates the HMAC-SHA256 signature when GITHUB_WEBHOOK_SECRET is set.
 */
app.post('/api/webhook', async (req: any, res: Response) => {
  try {
    // ── Signature verification ───────────────────────────────────────────────
    const secret = process.env.GITHUB_WEBHOOK_SECRET;
    if (secret) {
      const sigHeader = req.headers['x-hub-signature-256'] as string | undefined;
      if (!sigHeader) {
        return res.status(401).json({ error: 'Missing X-Hub-Signature-256 header' });
      }
      const hmac = crypto.createHmac('sha256', secret);
      hmac.update(req.rawBody);
      const expected = `sha256=${hmac.digest('hex')}`;
      const safe = crypto.timingSafeEqual(
        Buffer.from(sigHeader),
        Buffer.from(expected)
      );
      if (!safe) {
        return res.status(401).json({ error: 'Invalid webhook signature' });
      }
    }

    // ── Event routing ────────────────────────────────────────────────────────
    const event = req.headers['x-github-event'] as string | undefined;
    const payload = req.body;

    const isDepFileChanged = (commits: any[]): boolean => {
      const depFiles = [
        'package.json',
        'package-lock.json',
        'yarn.lock',
        'requirements.txt',
        'Pipfile',
        'Pipfile.lock',
        'go.mod',
        'go.sum',
        'pom.xml',
        'build.gradle',
      ];
      return commits.some((c: any) =>
        [...(c.added || []), ...(c.modified || [])].some((f: string) =>
          depFiles.some(d => f.endsWith(d))
        )
      );
    };

    if (event === 'push' && payload.repository) {
      const commits: any[] = payload.commits || [];
      // Only scan if a dependency file was actually touched
      if (commits.length === 0 || isDepFileChanged(commits)) {
        const repoUrl =
          payload.repository.html_url ||
          `https://github.com/${payload.repository.full_name}`;
        const run = await triggerScan(repoUrl);
        return res.status(200).json({ message: 'Scan triggered', runId: run.id });
      }
      return res.status(200).json({ message: 'No dependency files changed — skipped' });
    }

    if (event === 'pull_request' && payload.repository) {
      const action: string = payload.action || '';
      if (['opened', 'synchronize', 'reopened'].includes(action)) {
        const repoUrl =
          payload.repository.html_url ||
          `https://github.com/${payload.repository.full_name}`;
        const run = await triggerScan(repoUrl);
        return res.status(200).json({ message: 'Scan triggered on PR', runId: run.id });
      }
    }

    res.status(200).json({ message: 'Webhook received — no action taken' });
  } catch (error: any) {
    console.error('Webhook error:', error);
    res.status(500).json({ error: 'Internal server error processing webhook' });
  }
});

// GET /api/runs/:id
app.get('/api/runs/:id', async (req: Request, res: Response) => {
  const run = await db.getRun(req.params.id);
  if (!run) return res.status(404).json({ error: 'Run not found' });
  res.json(run);
});

// GET /api/runs/:id/events
app.get('/api/runs/:id/events', async (req: Request, res: Response) => {
  const events = await db.getEvents(req.params.id);
  res.json(events);
});

// GET /api/runs
app.get('/api/runs', async (_req: Request, res: Response) => {
  const runs = await db.getAllRuns();
  res.json(runs);
});

// GET /api/scans
app.get('/api/scans', (_req: Request, res: Response) => {
  const runs = db.getScans();
  res.json(runs.map(r => ({
    id: r.id,
    runId: r.id,
    repo: r.input.repoName,
    createdAt: r.startTime,
    vulnCount: r.vulnerabilities.length,
    fixedCount: r.remediations.filter(x => x.status === 'FIXED').length,
    status: r.status,
    prUrl: r.prUrl || null,
    ecosystem: r.input.ecosystem,
    remediations: r.remediations,
    vulnerabilities: r.vulnerabilities,
  })));
});

app.delete('/api/scans/:runId', (req: Request, res: Response) => {
  const runId = decodeURIComponent(req.params.runId);
  db.deleteScan(runId);
  res.json({ message: 'Scan deleted' });
});

// Settings
app.post('/api/settings', (req: Request, res: Response) => {
  if (req.body.webhookUrl !== undefined) db.saveSetting('webhookUrl', req.body.webhookUrl);
  if (req.body.email !== undefined) db.saveSetting('email', req.body.email);
  if (req.body.githubToken !== undefined) db.saveSetting('githubToken', req.body.githubToken);
  if (req.body.groqApiKey !== undefined) db.saveSetting('groqApiKey', req.body.groqApiKey);
  if (req.body.webhookSecret !== undefined) db.saveSetting('webhookSecret', req.body.webhookSecret);
  res.json({ message: 'Settings saved' });
});

app.get('/api/settings', (_req: Request, res: Response) => {
  res.json({
    webhookUrl: db.getSetting('webhookUrl') || '',
    email: db.getSetting('email') || '',
    githubToken: db.getSetting('githubToken') || '',
    groqApiKey: db.getSetting('groqApiKey') || '',
    webhookSecret: db.getSetting('webhookSecret') || '',
  });
});

// Schedules
app.post('/api/schedules', (req: Request, res: Response) => {
  const { repoUrl, cronExpression } = req.body;
  if (!repoUrl || !cronExpression) return res.status(400).json({ error: 'Missing params' });
  db.saveSchedule(repoUrl, cronExpression);
  setupCronJobs();
  res.json({ message: 'Schedule saved' });
});

app.get('/api/schedules', (_req: Request, res: Response) => {
  res.json(db.getSchedules());
});

app.delete('/api/schedules/:repoUrl', (req: Request, res: Response) => {
  const repoUrl = decodeURIComponent(req.params.repoUrl);
  db.deleteSchedule(repoUrl);
  setupCronJobs();
  res.json({ message: 'Schedule deleted' });
});

app.post('/api/schedules/:repoUrl/run-now', async (req: Request, res: Response) => {
  const repoUrl = decodeURIComponent(req.params.repoUrl);
  try {
    const run = await triggerScan(repoUrl);
    res.status(202).json({ message: 'Scan triggered immediately', runId: run.id });
  } catch (error: any) {
    res.status(400).json({ error: error.message });
  }
});

app.post('/api/test-webhook', async (req: Request, res: Response) => {
  const webhookUrl = db.getSetting('webhookUrl');
  if (!webhookUrl) return res.status(400).json({ error: 'Webhook URL not configured' });
  
  try {
    const payload = {
      event: 'test',
      message: 'This is a test webhook from FixStack',
      timestamp: new Date().toISOString()
    };
    
    const secret = db.getSetting('webhookSecret');
    const headers: Record<string, string> = { 'Content-Type': 'application/json' };
    
    if (secret) {
      const hmac = crypto.createHmac('sha256', secret);
      hmac.update(JSON.stringify(payload));
      headers['X-Hub-Signature-256'] = `sha256=${hmac.digest('hex')}`;
    }
    
    // Can't use axios here without importing it. I'll just use fetch API which is native in Node 18+
    const response = await fetch(webhookUrl, {
      method: 'POST',
      headers,
      body: JSON.stringify(payload)
    });
    
    if (response.ok) {
      res.json({ message: 'Test webhook sent successfully' });
    } else {
      res.status(400).json({ error: `Webhook failed with status ${response.status}` });
    }
  } catch (error: any) {
    res.status(500).json({ error: `Failed to send webhook: ${error.message}` });
  }
});

let cronTasks: cron.ScheduledTask[] = [];

export const setupCronJobs = () => {
  cronTasks.forEach(task => task.stop());
  cronTasks = [];
  const schedules = db.getSchedules() as any[];
  for (const schedule of schedules) {
    if (cron.validate(schedule.cronExpression)) {
      const task = cron.schedule(schedule.cronExpression, async () => {
        console.log(`Running scheduled scan for ${schedule.repo}`);
        try { await triggerScan(schedule.repo); } catch (e) { console.error(`Scheduled scan failed for ${schedule.repo}`, e); }
      });
      cronTasks.push(task);
    }
  }
};

setupCronJobs();
export default app;
