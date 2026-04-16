import express, { Request, Response } from 'express';
import cors from 'cors';
import { v4 as uuidv4 } from 'uuid';
import { db } from './db/store';
import { DependencyInput, Run } from './types';
import { WorkflowOrchestrator } from './services/orchestrator';
import { RepoFetcher } from './services/repoFetcher';
import { Logger } from './services/logger';
import * as cron from 'node-cron';

const app = express();
app.use(cors());
app.use(express.json());

// Health Check
app.get('/health', (req: Request, res: Response) => res.status(200).json({ status: 'ok', timestamp: new Date().toISOString() }));

const triggerScan = async (repoUrl: string) => {
  const input = await RepoFetcher.fetchDependencies(repoUrl);
  const run: Run = {
    id: uuidv4(),
    status: 'PENDING',
    startTime: new Date().toISOString(),
    input,
    vulnerabilities: [],
    remediations: []
  };
  await db.saveRun(run);
  const orchestrator = new WorkflowOrchestrator(run);
  orchestrator.execute(); // async
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
        repoName: run.input.repoName
      });
    } else {
      const input = req.body.input || {
        repoName: 'my-demo-project',
        manifestType: 'package.json',
        ecosystem: 'npm',
        dependencies: [
          { name: 'lodash', version: '4.17.15' },
          { name: 'axios', version: '0.21.1' },
          { name: 'react', version: '18.2.0' }
        ]
      };
      const run: Run = {
        id: uuidv4(),
        status: 'PENDING',
        startTime: new Date().toISOString(),
        input,
        vulnerabilities: [],
        remediations: []
      };
      await db.saveRun(run);
      const orchestrator = new WorkflowOrchestrator(run);
      orchestrator.execute();
      res.status(202).json({
        message: 'Demo scan started',
        runId: run.id,
        repoName: run.input.repoName
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
    
    // Fire and forget
    RepoFetcher.fetchOrgRepos(`https://github.com/${orgName}`)
      .then(async (repos) => {
        for (const repo of repos) {
          try {
            await triggerScan(repo);
          } catch (e) {
             console.error(`Failed to scan ${repo}`, e);
          }
        }
      })
      .catch(console.error);

    res.status(202).json({ message: `Started scanning organization ${orgName}` });
  } catch (error: any) {
    res.status(400).json({ error: error.message });
  }
});

// POST /api/webhook
app.post('/api/webhook', async (req: Request, res: Response) => {
  try {
    const payload = req.body;
    if (payload.commits && payload.repository) {
      const repoUrl = payload.repository.html_url || `https://github.com/${payload.repository.full_name}`;
      await triggerScan(repoUrl);
    }
    res.status(200).json({ message: 'Webhook received' });
  } catch (error: any) {
    console.error('Webhook error:', error);
    res.status(500).json({ error: 'Internal server error processing webhook' });
  }
});

// GET /api/runs/:id
app.get('/api/runs/:id', async (req: Request, res: Response) => {
  const run = await db.getRun(req.params.id as string);
  if (!run) return res.status(404).json({ error: 'Run not found' });
  res.json(run);
});

// GET /api/runs/:id/events
app.get('/api/runs/:id/events', async (req: Request, res: Response) => {
  const events = await db.getEvents(req.params.id as string);
  res.json(events);
});

// GET /api/runs
app.get('/api/runs', async (req: Request, res: Response) => {
  const runs = await db.getAllRuns();
  res.json(runs);
});

// GET /api/scans
app.get('/api/scans', (req: Request, res: Response) => {
  res.json(db.getScans());
});

// Settings endpoints
app.post('/api/settings', (req: Request, res: Response) => {
  if (req.body.webhookUrl !== undefined) db.saveSetting('webhookUrl', req.body.webhookUrl);
  if (req.body.email !== undefined) db.saveSetting('email', req.body.email);
  res.json({ message: 'Settings saved' });
});

app.get('/api/settings', (req: Request, res: Response) => {
  res.json({
    webhookUrl: db.getSetting('webhookUrl') || '',
    email: db.getSetting('email') || ''
  });
});

// Schedule endpoints
app.post('/api/schedules', (req: Request, res: Response) => {
  const { repoUrl, cronExpression } = req.body;
  if (!repoUrl || !cronExpression) return res.status(400).json({ error: 'Missing params' });
  db.saveSchedule(repoUrl, cronExpression);
  setupCronJobs(); // Refresh
  res.json({ message: 'Schedule saved' });
});

app.get('/api/schedules', (req: Request, res: Response) => {
  res.json(db.getSchedules());
});

app.delete('/api/schedules/:repoUrl', (req: Request, res: Response) => {
  const repoUrl = decodeURIComponent(req.params.repoUrl as string);
  db.deleteSchedule(repoUrl);
  setupCronJobs(); // Refresh
  res.json({ message: 'Schedule deleted' });
});

let cronTasks: cron.ScheduledTask[] = [];

export const setupCronJobs = () => {
  cronTasks.forEach(task => task.stop());
  cronTasks = [];
  
  const schedules = db.getSchedules();
  for (const schedule of schedules as any[]) {
    if (cron.validate(schedule.cronExpression)) {
      const task = cron.schedule(schedule.cronExpression, async () => {
        console.log(`Running scheduled scan for ${schedule.repo}`);
        try {
          await triggerScan(schedule.repo);
        } catch (e) {
          console.error(`Scheduled scan failed for ${schedule.repo}`, e);
        }
      });
      cronTasks.push(task);
    }
  }
};

setupCronJobs();

export default app;
