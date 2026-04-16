import express, { Request, Response } from 'express';
import cors from 'cors';
import { v4 as uuidv4 } from 'uuid';
import { db } from './db/store';
import { DependencyInput, Run } from './types';
import { WorkflowOrchestrator } from './services/orchestrator';
import { RepoFetcher } from './services/repoFetcher';
import { Logger } from './services/logger';

const app = express();
app.use(cors());
app.use(express.json());

// Health Check
app.get('/health', (req: Request, res: Response) => res.status(200).json({ status: 'ok', timestamp: new Date().toISOString() }));

// POST /api/run-scan
app.post('/api/run-scan', async (req: Request, res: Response) => {
  let input: DependencyInput;

  try {
    if (req.body.repoUrl) {
      input = await RepoFetcher.fetchPackageJson(req.body.repoUrl);
    } else {
      input = req.body.input || {
        repoName: 'my-demo-project',
        manifestType: 'package.json',
        dependencies: [
          { name: 'lodash', version: '4.17.15' },
          { name: 'axios', version: '0.21.1' },
          { name: 'react', version: '18.2.0' }
        ]
      };
    }

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
      message: 'Scan started',
      runId: run.id,
      repoName: input.repoName
    });
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

      const packageJsonModified = payload.commits.some((commit: any) => {
        const modifiedFiles = [...(commit.added || []), ...(commit.modified || [])];
        return modifiedFiles.includes('package.json');
      });

      if (packageJsonModified) {
        const input = await RepoFetcher.fetchPackageJson(repoUrl);
        const run: Run = {
          id: uuidv4(),
          status: 'PENDING',
          startTime: new Date().toISOString(),
          input,
          vulnerabilities: [],
          remediations: []
        };

        await db.saveRun(run);

        const logger = new Logger(run.id);
        await logger.log('Webhook', 'GitHub Event', 'INFO', `GitHub webhook received for repo ${input.repoName}`);

        const orchestrator = new WorkflowOrchestrator(run);
        orchestrator.execute();
      }
    }

    res.status(200).json({ message: 'Webhook received' });
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
app.get('/api/runs', async (req: Request, res: Response) => {
  const runs = await db.getAllRuns();
  res.json(runs);
});

export default app;
