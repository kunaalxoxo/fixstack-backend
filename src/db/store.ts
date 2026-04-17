import fs from 'fs';
import path from 'path';
import { Run, RunEvent } from '../types';

const DB_PATH = path.join(process.cwd(), 'data.json');

interface DbShape {
  scans: Record<string, Run>;
  events: Record<string, RunEvent[]>;
  schedules: Record<string, { repo: string; cronExpression: string }>;
  settings: Record<string, string>;
}

const defaultDb: DbShape = { scans: {}, events: {}, schedules: {}, settings: {} };

function readDb(): DbShape {
  try {
    if (fs.existsSync(DB_PATH)) {
      return JSON.parse(fs.readFileSync(DB_PATH, 'utf-8'));
    }
  } catch (_) {}
  return { scans: {}, events: {}, schedules: {}, settings: {} };
}

function writeDb(data: DbShape): void {
  try {
    fs.writeFileSync(DB_PATH, JSON.stringify(data, null, 2), 'utf-8');
  } catch (_) {}
}

class Store {
  private runs: Map<string, Run> = new Map();
  private events: Map<string, RunEvent[]> = new Map();

  async saveRun(run: Run): Promise<void> {
    this.runs.set(run.id, run);
    if (run.status === 'COMPLETED' || run.status === 'FAILED') {
      const db = readDb();
      db.scans[run.id] = run;
      writeDb(db);
    }
  }

  async getRun(id: string): Promise<Run | undefined> {
    if (this.runs.has(id)) return this.runs.get(id);
    const db = readDb();
    return db.scans[id];
  }

  async addEvent(event: RunEvent): Promise<void> {
    const list = this.events.get(event.runId) || [];
    list.push(event);
    this.events.set(event.runId, list);
    const db = readDb();
    if (!db.events[event.runId]) db.events[event.runId] = [];
    db.events[event.runId].push(event);
    writeDb(db);
  }

  async getEvents(runId: string): Promise<RunEvent[]> {
    const mem = this.events.get(runId);
    if (mem && mem.length > 0) return mem;
    const db = readDb();
    return db.events[runId] || [];
  }

  async getAllRuns(): Promise<Run[]> {
    const db = readDb();
    const persisted = Object.values(db.scans) as Run[];
    const active = Array.from(this.runs.values()).filter(
      r => r.status === 'PENDING' || r.status === 'RUNNING'
    );
    const all = [...active];
    for (const r of persisted) {
      if (!all.find(x => x.id === r.id)) all.push(r);
    }
    return all.sort(
      (a, b) => new Date(b.startTime).getTime() - new Date(a.startTime).getTime()
    );
  }

  getScans(): Run[] {
    const db = readDb();
    return Object.values(db.scans).sort(
      (a: any, b: any) => new Date(b.startTime).getTime() - new Date(a.startTime).getTime()
    );
  }

  getSchedules(): { repo: string; cronExpression: string }[] {
    return Object.values(readDb().schedules);
  }

  saveSchedule(repo: string, cronExpression: string): void {
    const db = readDb();
    db.schedules[repo] = { repo, cronExpression };
    writeDb(db);
  }

  deleteSchedule(repo: string): void {
    const db = readDb();
    delete db.schedules[repo];
    writeDb(db);
  }

  getSetting(key: string): string | undefined {
    return readDb().settings[key];
  }

  saveSetting(key: string, value: string): void {
    const db = readDb();
    db.settings[key] = value;
    writeDb(db);
  }
}

export const db = new Store();
