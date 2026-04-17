import axios from 'axios';
import { Logger } from './logger';
import { db } from '../db/store';

// Static known-safe patches for demo reliability and offline use
const KNOWN_PATCHES: Record<string, string[]> = {
  lodash: ['4.17.19', '4.17.21'],   // attempt 1 → fail (demo), attempt 2 → pass
  axios: ['0.21.4'],
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
    if (groqSuggestion && groqSuggestion !== version) {
      await this.logger.log(
        'Patch Planner',
        'Groq LLM',
        'SUCCESS',
        `Groq suggested safe version ${groqSuggestion} for ${pkgName}@${version} (attempt ${attempt})`
      );
      return groqSuggestion;
    }

    // Fallback to static map
    const patches = KNOWN_PATCHES[normalizedPkgName];
    if (patches) {
      const idx = Math.min(attempt - 1, patches.length - 1);
      const candidate = patches[idx];
      if (candidate !== version) return candidate;

      const alternative = patches.find(v => v !== version);
      if (alternative) return alternative;
    }

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
}
