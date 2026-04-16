import { PatchAttempt } from '../types';
import { Logger } from './logger';

export class PlannerAgent {
  constructor(private logger: Logger) {}

  async suggestPatch(pkgName: string, version: string, attempt: number): Promise<string> {
    await this.logger.log(
      'Patch Planner',
      'Remediation Engine',
      'INFO',
      `Planning patch for ${pkgName}@${version} (Attempt ${attempt})`
    );

    if (pkgName === 'lodash') {
      // First attempt: 4.17.19 (Demo failure)
      // Second attempt: 4.17.21 (Demo success)
      return attempt === 1 ? '4.17.19' : '4.17.21';
    }

    if (pkgName === 'axios') return '0.21.4';
    if (pkgName === 'express') return '4.18.2';
    if (pkgName === 'minimist') return '1.2.8';
    if (pkgName === 'node-fetch') return '2.6.7';

    return version; // No known patch — will be marked FAILED
  }
}
