import { Vulnerability } from '../types';
import { Logger } from './logger';

export class LookupAgent {
  constructor(private logger: Logger) {}

  async lookup(pkgName: string, version: string): Promise<Vulnerability[]> {
    await this.logger.log(
      'CVE Lookup Agent',
      'OSV.dev API',
      'INFO',
      `Looking up vulnerabilities for ${pkgName}@${version}`
    );

    // Mock logic for the hackathon demo
    if (pkgName === 'lodash' && version === '4.17.15') {
      return [{
        id: 'GHSA-v88g-c8rk-3gr7',
        pkgName,
        pkgVersion: version,
        cveId: 'CVE-2019-10744',
        severity: 'HIGH',
        description: 'Prototype pollution vulnerability in lodash defaultsDeep'
      }];
    }

    if (pkgName === 'axios' && version === '0.21.1') {
      return [{
        id: 'GHSA-4w66-9hp6-7v29',
        pkgName,
        pkgVersion: version,
        cveId: 'CVE-2021-3749',
        severity: 'MEDIUM',
        description: 'Regular Expression Denial of Service (ReDoS) in axios'
      }];
    }

    return [];
  }
}
