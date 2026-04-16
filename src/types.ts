export type RunStatus = 'PENDING' | 'RUNNING' | 'COMPLETED' | 'FAILED';

export interface Run {
  id: string;
  status: RunStatus;
  startTime: string;
  endTime?: string;
  input: DependencyInput;
  vulnerabilities: Vulnerability[];
  remediations: RemediationResult[];
  prUrl?: string;
  prBranch?: string;
}

export interface RunEvent {
  id: string;
  runId: string;
  timestamp: string;
  agentName: string;
  toolName: string;
  status: 'INFO' | 'SUCCESS' | 'WARNING' | 'ERROR';
  message: string;
  metadata?: any;
}

export interface DependencyInput {
  repoName: string;
  repoUrl?: string;
  manifestType: 'package.json' | 'requirements.txt' | 'pom.xml' | 'go.mod' | 'yarn.lock';
  ecosystem: 'npm' | 'PyPI' | 'Maven' | 'Go';
  dependencies: { name: string; version: string }[];
}

export interface Vulnerability {
  id: string;
  pkgName: string;
  pkgVersion: string;
  cveId: string;
  severity: string;
  description: string;
  ecosystem?: string;
}

export interface RemediationResult {
  pkgName: string;
  oldVersion: string;
  newVersion: string;
  status: 'FIXED' | 'FAILED';
  attempts: number;
}

export interface PatchAttempt {
  pkgName: string;
  vulnerableVersion: string;
  suggestedVersion: string;
  attemptNumber: number;
}

export interface ValidationResult {
  success: boolean;
  message: string;
  logs: string[];
}
