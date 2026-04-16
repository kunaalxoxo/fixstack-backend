import axios from 'axios';
import { Run, RunEvent } from './types';

const BASE_URL = 'https://fixstack-backend.onrender.com';

const api = axios.create({
  baseURL: BASE_URL,
});

export const fixstackApi = {
  health: () => api.get('/health'),
  
  startScan: (repoUrl?: string, input?: any) => api.post('/api/run-scan', { repoUrl, input }),
  
  startOrgScan: (org: string) => api.post('/api/run-org-scan', { org }),
  
  getRun: (id: string) => api.get<Run>(`/api/runs/${id}`),
  
  getEvents: (id: string) => api.get<RunEvent[]>(`/api/runs/${id}/events`),
  
  getAllRuns: () => api.get<Run[]>('/api/runs'),

  getScans: () => api.get('/api/scans'),

  getSchedules: () => api.get('/api/schedules'),
  addSchedule: (repoUrl: string, cronExpression: string) => api.post('/api/schedules', { repoUrl, cronExpression }),
  deleteSchedule: (repoUrl: string) => api.delete(`/api/schedules/${encodeURIComponent(repoUrl)}`),

  getSettings: () => api.get('/api/settings'),
  saveSettings: (webhookUrl: string, email: string) => api.post('/api/settings', { webhookUrl, email }),
};
