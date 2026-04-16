import { Run, RunEvent } from '../types';

// Simple in-memory store, easy to swap for Supabase later
class Store {
  private runs: Map<string, Run> = new Map();
  private events: Map<string, RunEvent[]> = new Map();

  async saveRun(run: Run): Promise<void> {
    this.runs.set(run.id, run);
  }

  async getRun(id: string): Promise<Run | undefined> {
    return this.runs.get(id);
  }

  async addEvent(event: RunEvent): Promise<void> {
    const runEvents = this.events.get(event.runId) || [];
    runEvents.push(event);
    this.events.set(event.runId, runEvents);
  }

  async getEvents(runId: string): Promise<RunEvent[]> {
    return this.events.get(runId) || [];
  }

  async getAllRuns(): Promise<Run[]> {
    return Array.from(this.runs.values());
  }
}

export const db = new Store();
