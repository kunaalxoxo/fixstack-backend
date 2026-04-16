import { v4 as uuidv4 } from 'uuid';
import { db } from '../db/store';
import { RunEvent } from '../types';

export class Logger {
  constructor(private runId: string) {}

  async log(
    agentName: string,
    toolName: string,
    status: RunEvent['status'],
    message: string,
    metadata?: any
  ) {
    const event: RunEvent = {
      id: uuidv4(),
      runId: this.runId,
      timestamp: new Date().toISOString(),
      agentName,
      toolName,
      status,
      message,
      metadata,
    };
    await db.addEvent(event);
    console.log(`[${agentName}] ${message}`);
  }
}
