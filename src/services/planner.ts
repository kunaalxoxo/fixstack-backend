import axios from 'axios';
import { Logger } from './logger';
import { db } from '../db/store';

// Static known-safe patches for demo reliability and offline use
const KNOWN_PATCHES: Record<string, string[]> = {
  lodash: ['4.17.19', '4.17.21'],   // attempt 1 → fail (demo), attempt 2 → pass
  express: ['4.18.2'],
  minimist: ['1.2.8'],
  'node-fetch': ['2.6.7'],
  flask: ['3.1.2'],
  requests: ['2.32.3'],
  gunicorn: ['22.0.0'],
};

export class PlannerAgent {
  constructor(private logger: Logger) {}

  async suggestPatch(pkgName: string, version: string, attempt: number): Promise<string> {
    const normalizedPkgName = pkgName.trim().toLowerCase();

    await this.logger.log(
      'Patch Planner',
      'Groq LLM',
      'INFO',
      `Planning patch for ${pkgName}@${version} (Attempt ${attempt})`
    );

    // Try Groq first
    const groqSuggestion = await this.askGroq(pkgName, version, attempt);
    if (groqSuggestion && this.isSemverSafeUpgrade(groqSuggestion, version)) {
      await this.logger.log(
        'Patch Planner',
        'Groq LLM',
        'SUCCESS',
        `Groq suggested safe version ${groqSuggestion} for ${pkgName}@${version} (attempt ${attempt})`
      );
      return groqSuggestion;
    } else if (groqSuggestion) {
      await this.logger.log(
        'Patch Planner',
        'Groq LLM',
        'WARNING',
        `Ignoring Groq suggestion ${groqSuggestion} for ${pkgName}@${version} because it is not a semver-safe upgrade`
      );
    }

    // Fallback to static map
    const patches = KNOWN_PATCHES[normalizedPkgName];
    if (patches) {
      const idx = Math.min(attempt - 1, patches.length - 1);
      const candidate = patches[idx];
      if (this.isSemverSafeUpgrade(candidate, version)) return candidate;

      const alternative = patches.find(v => this.isSemverSafeUpgrade(v, version));
      if (alternative) return alternative;
    }

    // Fallback to npm registry to find a newer safe version
    const npmSuggestion = await this.suggestFromNpmRegistry(pkgName, version, attempt);
    if (npmSuggestion) return npmSuggestion;

    return version; // No known patch — will be marked FAILED
  }

  private async askGroq(pkgName: string, version: string, attempt: number): Promise<string | null> {
    const groqApiKey = (process.env.GROQ_API_KEY || db.getSetting('groqApiKey') || '').trim();
    if (!groqApiKey) return null;

    const prompt = `You are a Node.js dependency security expert.
A package named "${pkgName}" at version "${version}" has a known CVE.
This is patch attempt number ${attempt}.
Suggest the single best semver-safe patched version that fixes the CVE and is least likely to break existing code.
If attempt > 1, suggest a more conservative (lower) version than you previously suggested.
Reply ONLY with the version string. Example: 4.17.21
Do NOT include any explanation, markdown, or extra text.`;

    try {
      const response = await axios.post(
        'https://api.groq.com/openai/v1/chat/completions',
        {
          model: 'llama3-8b-8192',
          messages: [{ role: 'user', content: prompt }],
          temperature: 0.1,
          max_tokens: 20,
        },
        {
          headers: {
            Authorization: `Bearer ${groqApiKey}`,
            'Content-Type': 'application/json',
          },
          timeout: 8000,
        }
      );

      const raw = response.data.choices[0].message.content.trim();
      // Validate it looks like a semver
      if (/^\d+\.\d+\.\d+/.test(raw)) return raw;
      return null;
    } catch (_) {
      return null;
    }
  }

  private parseSemver(version: string): [number, number, number] | null {
    const match = version.trim().match(/^(\d+)\.(\d+)\.(\d+)/);
    if (!match) return null;
    return [Number(match[1]), Number(match[2]), Number(match[3])];
  }

  private compareSemver(a: string, b: string): number {
    const parsedA = this.parseSemver(a);
    const parsedB = this.parseSemver(b);
    if (!parsedA || !parsedB) return 0;

    if (parsedA[0] !== parsedB[0]) return parsedA[0] - parsedB[0];
    if (parsedA[1] !== parsedB[1]) return parsedA[1] - parsedB[1];
    return parsedA[2] - parsedB[2];
  }

  private isSemverSafeUpgrade(candidate: string, current: string): boolean {
    const parsedCandidate = this.parseSemver(candidate);
    const parsedCurrent = this.parseSemver(current);
    if (!parsedCandidate || !parsedCurrent) return false;

    const sameMajor = parsedCandidate[0] === parsedCurrent[0];
    return sameMajor && this.compareSemver(candidate, current) > 0;
  }

  private async suggestFromNpmRegistry(
    pkgName: string,
    currentVersion: string,
    attempt: number
  ): Promise<string | null> {
    try {
      const response = await axios.get(
        `https://registry.npmjs.org/${encodeURIComponent(pkgName)}`,
        { timeout: 8000 }
      );

      const versions = Object.keys(response.data?.versions || {});
      const safeUpgrades = versions
        .filter(v => this.isSemverSafeUpgrade(v, currentVersion))
        .sort((a, b) => this.compareSemver(b, a));

      if (safeUpgrades.length === 0) return null;

      const idx = Math.min(attempt - 1, safeUpgrades.length - 1);
      const suggested = safeUpgrades[idx];

      await this.logger.log(
        'Patch Planner',
        'npm Registry',
        'INFO',
        `Using npm registry fallback for ${pkgName}@${currentVersion}: ${suggested} (attempt ${attempt})`
      );

      return suggested;
    } catch (error: any) {
      await this.logger.log(
        'Patch Planner',
        'npm Registry',
        'WARNING',
        `npm registry fallback failed for ${pkgName}@${currentVersion}: ${error?.message || 'unknown error'}`
      );
      return null;
    }
  }
}
