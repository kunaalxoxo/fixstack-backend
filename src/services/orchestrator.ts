import { db } from '../db/store';
import { DependencyInput, Run, RemediationResult, Vulnerability } from '../types';
import { Logger } from './logger';
import { ScannerAgent } from './scanner';
import { LookupAgent } from './lookup';
import { PlannerAgent } from './planner';
import { Validator } from './validator';
import { GitHubPRService } from './githubPR';

export class WorkflowOrchestrator {
  private logger: Logger;
  private scanner: ScannerAgent;
  private lookup: LookupAgent;
  private planner: PlannerAgent;
  private validator: Validator;

  constructor(private run: Run) {
    this.logger = new Logger(run.id);
    this.scanner = new ScannerAgent(this.logger);
    this.lookup = new LookupAgent(this.logger);
    this.planner = new PlannerAgent(this.logger);
    this.validator = new Validator(this.logger);
  }

  async execute() {
    this.run.status = 'RUNNING';
    await db.saveRun(this.run);

    try {
      // 1. Scan
      const dependencies = await this.scanner.scan(this.run.input);

      // 2. Lookup & Patch
      const vulnerabilities: Vulnerability[] = [];
      const remediations: RemediationResult[] = [];

      for (const dep of dependencies) {
        const vulns = await this.lookup.lookup(dep.name, dep.version);
        if (vulns.length > 0) {
          vulnerabilities.push(...vulns);

          // 3. Retry Loop
          let attempt = 1;
          let success = false;
          let finalVersion = dep.version;

          while (attempt <= 2 && !success) {
            const suggested = await this.planner.suggestPatch(dep.name, dep.version, attempt);
            const validation = await this.validator.validate(dep.name, suggested);

            if (validation.success) {
              success = true;
              finalVersion = suggested;
              await this.logger.log('Retry Controller', 'Workflow Logic', 'SUCCESS', `Successfully patched ${dep.name} to ${suggested} on attempt ${attempt}`);
            } else {
              await this.logger.log('Retry Controller', 'Workflow Logic', 'WARNING', `Attempt ${attempt} for ${dep.name} failed. Retrying...`);
              attempt++;
            }
          }

          remediations.push({
            pkgName: dep.name,
            oldVersion: dep.version,
            newVersion: finalVersion,
            status: success && finalVersion !== dep.version ? 'FIXED' : 'FAILED',
            attempts: attempt > 2 ? 2 : attempt,
          });
        }
      }

      this.run.vulnerabilities = vulnerabilities;
      this.run.remediations = remediations;

      // 4. Create PR if there are fixed remediations and repoUrl is available
      if (this.run.input.repoUrl && remediations.some(r => r.status === 'FIXED')) {
        const prResult = await GitHubPRService.createPR(this.run.input.repoUrl, remediations, this.run.id, this.logger);
        if (prResult) {
          this.run.prUrl = prResult.prUrl;
          this.run.prBranch = prResult.prBranch;
        }
      }

      // 5. Wrap up
      this.run.status = 'COMPLETED';
      this.run.endTime = new Date().toISOString();

      await this.logger.log('Remediation Output Agent', 'Finalizer', 'SUCCESS', `Workflow completed for ${this.run.input.repoName}. Total fixes: ${remediations.filter(r => r.status === 'FIXED').length}`);

    } catch (error: any) {
      this.run.status = 'FAILED';
      await this.logger.log('Orchestrator', 'Main Loop', 'ERROR', `Fatal error: ${error.message}`);
    }

    await db.saveRun(this.run);
  }
}
