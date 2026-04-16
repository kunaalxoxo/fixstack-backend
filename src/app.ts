import express from 'express';
import cors from 'cors';
import { v4 as uuidv4 } from 'uuid';
import { db } from './db/store';
import { DependencyInput, Run } from './types';
import { WorkflowOrchestrator } from './services/orchestrator';

const app = express();
app.use(cors());
app.use(express.json());

// Health Check
app.get('/health', (req, res) => res.status(200).json({ status: 'ok', timestamp: new Date().toISOString() }));

// POST /api/run-scan
app.post('/api/run-scan', async (req, res) => {
  const input: DependencyInput = req.body.input || {
    repoName: 'my-demo-project',
    manifestType: 'package.json',
    dependencies: [
      { name: 'lodash', version: '4.17.15' },
      { name: 'axios', version: '0.21.1' },
      { name: 'react', version: '18.2.0' } // Safe version
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

  // Trigger asynchronously
  const orchestrator = new WorkflowOrchestrator(run);
  orchestrator.execute();

  res.status(202).json({
    message: 'Scan started',
    runId: run.id
  });
});

// GET /api/runs/:id
app.get('/api/runs/:id', async (req, res) => {
  const run = await db.getRun(req.params.id);
  if (!run) return res.status(404).json({ error: 'Run not found' });
  res.json(run);
});

// GET /api/runs/:id/events
app.get('/api/runs/:id/events', async (req, res) => {
  const events = await db.getEvents(req.params.id);
  res.json(events);
});

// GET /api/runs
app.get('/api/runs', async (req, res) => {
  const runs = await db.getAllRuns();
  res.json(runs);
});

export default app;
