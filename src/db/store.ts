import Database from 'better-sqlite3';
import { Run, RunEvent } from '../types';

const sqlite = new Database('database.sqlite');

sqlite.exec(`
  CREATE TABLE IF NOT EXISTS scans (
    id TEXT PRIMARY KEY,
    repo TEXT,
    runId TEXT,
    status TEXT,
    vulnCount INTEGER,
    fixedCount INTEGER,
    createdAt TEXT,
    runData TEXT
  );
`);

sqlite.exec(`
  CREATE TABLE IF NOT EXISTS events (
    id TEXT PRIMARY KEY,
    runId TEXT,
    eventData TEXT,
    timestamp TEXT
  );
`);

sqlite.exec(`
  CREATE TABLE IF NOT EXISTS schedules (
    repo TEXT PRIMARY KEY,
    cronExpression TEXT,
    lastRun TEXT,
    nextRun TEXT
  );
`);

sqlite.exec(`
  CREATE TABLE IF NOT EXISTS settings (
    key TEXT PRIMARY KEY,
    value TEXT
  );
`);

class Store {
  private runs: Map<string, Run> = new Map();
  private events: Map<string, RunEvent[]> = new Map();

  async saveRun(run: Run): Promise<void> {
    this.runs.set(run.id, run);
    if (run.status === 'COMPLETED' || run.status === 'FAILED') {
      const stmt = sqlite.prepare(`
        INSERT OR REPLACE INTO scans (id, repo, runId, status, vulnCount, fixedCount, createdAt, runData)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?)
      `);
      stmt.run(
        run.id,
        run.input.repoName,
        run.id,
        run.status,
        run.vulnerabilities.length,
        run.remediations.filter(r => r.status === 'FIXED').length,
        new Date().toISOString(),
        JSON.stringify(run)
      );
    }
  }

  async getRun(id: string): Promise<Run | undefined> {
    if (this.runs.has(id)) return this.runs.get(id);
    const row = sqlite.prepare('SELECT runData FROM scans WHERE id = ?').get(id) as any;
    if (row) return JSON.parse(row.runData);
    return undefined;
  }

  async addEvent(event: RunEvent): Promise<void> {
    const runEvents = this.events.get(event.runId) || [];
    runEvents.push(event);
    this.events.set(event.runId, runEvents);
    
    const stmt = sqlite.prepare(`
      INSERT OR REPLACE INTO events (id, runId, eventData, timestamp)
      VALUES (?, ?, ?, ?)
    `);
    stmt.run(event.id, event.runId, JSON.stringify(event), event.timestamp);
  }

  async getEvents(runId: string): Promise<RunEvent[]> {
    const memEvents = this.events.get(runId);
    if (memEvents && memEvents.length > 0) return memEvents;
    
    const stmt = sqlite.prepare('SELECT eventData FROM events WHERE runId = ? ORDER BY timestamp ASC');
    return stmt.all(runId).map((row: any) => JSON.parse(row.eventData));
  }

  async getAllRuns(): Promise<Run[]> {
    const stmt = sqlite.prepare('SELECT runData FROM scans ORDER BY createdAt DESC');
    const dbRuns = stmt.all().map((row: any) => JSON.parse(row.runData)) as Run[];
    
    const activeRuns = Array.from(this.runs.values()).filter(r => r.status === 'PENDING' || r.status === 'RUNNING');
    
    const all = [...activeRuns];
    for (const dbr of dbRuns) {
      if (!all.find(r => r.id === dbr.id)) {
        all.push(dbr);
      }
    }
    return all.sort((a, b) => new Date(b.startTime).getTime() - new Date(a.startTime).getTime());
  }

  // Feature 3: /api/scans
  getScans() {
    return sqlite.prepare('SELECT * FROM scans ORDER BY createdAt DESC').all();
  }

  // Feature 5: Schedules
  getSchedules() {
    return sqlite.prepare('SELECT * FROM schedules').all();
  }

  saveSchedule(repo: string, cronExpression: string) {
    sqlite.prepare('INSERT OR REPLACE INTO schedules (repo, cronExpression) VALUES (?, ?)').run(repo, cronExpression);
  }

  deleteSchedule(repo: string) {
    sqlite.prepare('DELETE FROM schedules WHERE repo = ?').run(repo);
  }

  // Feature 6: Settings
  getSetting(key: string): string | undefined {
    const row = sqlite.prepare('SELECT value FROM settings WHERE key = ?').get(key) as any;
    return row ? row.value : undefined;
  }

  saveSetting(key: string, value: string) {
    sqlite.prepare('INSERT OR REPLACE INTO settings (key, value) VALUES (?, ?)').run(key, value);
  }
}

export const db = new Store();
