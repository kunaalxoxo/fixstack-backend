import axios from 'axios';
import { Run, RunEvent } from './types';

const BASE_URL = 'https://fixstack-backend.onrender.com';

const api = axios.create({
  baseURL: BASE_URL,
});

export const fixstackApi = {
  health: () => api.get('/health'),
  
  startScan: (repoUrl?: string, input?: any) => api.post('/api/run-scan', { repoUrl, input }),
  
  getRun: (id: string) => api.get<Run>(`/api/runs/${id}`),
  
  getEvents: (id: string) => api.get<RunEvent[]>(`/api/runs/${id}/events`),
  
  getAllRuns: () => api.get<Run[]>('/api/runs'),
};
