import axios from 'axios';
import { Vulnerability } from '../types';
import { Logger } from './logger';

export class LookupAgent {
  constructor(private logger: Logger) {}

  async lookup(pkgName: string, version: string, ecosystem: string = 'npm'): Promise<Vulnerability[]> {
    await this.logger.log(
      'CVE Lookup Agent',
      'OSV.dev API',
      'INFO',
      `Looking up vulnerabilities for ${pkgName}@${version} (${ecosystem})`
    );

    const osvVulns = await this.queryOSV(pkgName, version, ecosystem);
    const nvdVulns = await this.queryNVD(pkgName, version, ecosystem);

    // Merge: prefer OSV entries but supplement with any NVD-only CVEs
    const merged = [...osvVulns];
    for (const nvd of nvdVulns) {
      const alreadyPresent = merged.some(
        v => v.cveId === nvd.cveId || v.id === nvd.id
      );
      if (!alreadyPresent) merged.push(nvd);
    }

    if (merged.length > 0) {
      await this.logger.log(
        'CVE Lookup Agent',
        'OSV + NVD',
        'WARNING',
        `Found ${merged.length} vulnerabilities for ${pkgName}@${version} (${osvVulns.length} OSV, ${nvdVulns.length} NVD)`
      );
    } else {
      await this.logger.log(
        'CVE Lookup Agent',
        'OSV + NVD',
        'SUCCESS',
        `No known vulnerabilities found for ${pkgName}@${version}`
      );
    }

    return merged;
  }

  private async queryOSV(pkgName: string, version: string, ecosystem: string): Promise<Vulnerability[]> {
    try {
      const payload: any = { package: { name: pkgName, ecosystem } };
      if (version && version !== 'unknown') payload.version = version;

      const response = await axios.post('https://api.osv.dev/v1/query', payload, { timeout: 8000 });

      if (response.data?.vulns?.length > 0) {
        return response.data.vulns.map((vuln: any) => ({
          id: vuln.id,
          pkgName,
          pkgVersion: version,
          cveId: vuln.aliases?.find((a: string) => a.startsWith('CVE')) || vuln.id,
          severity: vuln.database_specific?.severity || 'HIGH',
          description: vuln.summary || vuln.details || 'Vulnerability found via OSV.dev',
          ecosystem,
          source: 'OSV',
        }));
      }
    } catch (error: any) {
      await this.logger.log(
        'CVE Lookup Agent',
        'OSV.dev API',
        'WARNING',
        `OSV API call failed for ${pkgName}@${version}: ${error.message}`
      );
    }

    // Hardcoded demo fallback so the demo still works without network
    if (pkgName === 'lodash' && version === '4.17.15') {
      return [{
        id: 'GHSA-v88g-c8rk-3gr7',
        pkgName,
        pkgVersion: version,
        cveId: 'CVE-2019-10744',
        severity: 'HIGH',
        description: 'Prototype pollution vulnerability in lodash defaultsDeep',
        ecosystem: 'npm',
        source: 'OSV-fallback',
      } as any];
    }
    if (pkgName === 'axios' && version === '0.21.1') {
      return [{
        id: 'GHSA-4w66-9hp6-7v29',
        pkgName,
        pkgVersion: version,
        cveId: 'CVE-2021-3749',
        severity: 'MEDIUM',
        description: 'Regular Expression Denial of Service (ReDoS) in axios',
        ecosystem: 'npm',
        source: 'OSV-fallback',
      } as any];
    }

    return [];
  }

  private async queryNVD(pkgName: string, version: string, ecosystem: string): Promise<Vulnerability[]> {
    await this.logger.log(
      'CVE Lookup Agent',
      'NVD REST API',
      'INFO',
      `Querying NVD for ${pkgName}@${version}`
    );

    try {
      const headers: Record<string, string> = {};
      if (process.env.NVD_API_KEY) {
        headers['apiKey'] = process.env.NVD_API_KEY;
      }

      const keyword = `${pkgName} ${version}`;
      const url = `https://services.nvd.nist.gov/rest/json/cves/2.0?keywordSearch=${encodeURIComponent(keyword)}&resultsPerPage=5`;

      const response = await axios.get(url, { headers, timeout: 10000 });
      const items: any[] = response.data?.vulnerabilities || [];

      return items.map((item: any) => {
        const cve = item.cve;
        const cvssData =
          cve.metrics?.cvssMetricV31?.[0]?.cvssData ||
          cve.metrics?.cvssMetricV30?.[0]?.cvssData ||
          cve.metrics?.cvssMetricV2?.[0]?.cvssData;
        const severity = cvssData?.baseSeverity || 'MEDIUM';
        const description =
          cve.descriptions?.find((d: any) => d.lang === 'en')?.value ||
          'No description available';

        return {
          id: cve.id,
          pkgName,
          pkgVersion: version,
          cveId: cve.id,
          severity,
          description,
          ecosystem,
          source: 'NVD',
        };
      });
    } catch (error: any) {
      await this.logger.log(
        'CVE Lookup Agent',
        'NVD REST API',
        'WARNING',
        `NVD API call failed for ${pkgName}@${version}: ${error.message}`
      );
      return [];
    }
  }
}
