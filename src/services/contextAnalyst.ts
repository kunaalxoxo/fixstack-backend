import axios from 'axios';
import { Logger } from './logger';
import { Vulnerability } from '../types';

interface ExposureResult {
  isReachable: boolean;
  confidence: 'HIGH' | 'MEDIUM' | 'LOW';
  reasoning: string;
  affectedFiles: string[];
}

export class ContextAnalystAgent {
  constructor(private logger: Logger) {}

  async analyzeExposure(
    vuln: Vulnerability,
    repoUrl: string
  ): Promise<ExposureResult> {
    await this.logger.log(
      'Context Analyst',
      'Call Graph Analyzer',
      'INFO',
      `Analyzing exploitability of ${vuln.cveId} (${vuln.pkgName}) in ${repoUrl}`
    );

    // 1. Fetch source files from the repo via GitHub API
    const sourceSnippet = await this.fetchSourceContext(repoUrl, vuln.pkgName);

    // 2. Ask Groq to reason about reachability
    const result = await this.askGroq(vuln, sourceSnippet);

    await this.logger.log(
      'Context Analyst',
      'Groq LLM',
      result.isReachable ? 'WARNING' : 'SUCCESS',
      `Exploitability for ${vuln.cveId}: ${result.isReachable ? 'REACHABLE' : 'NOT REACHABLE'} (${result.confidence} confidence). ${result.reasoning}`,
      { affectedFiles: result.affectedFiles }
    );

    return result;
  }

  private async fetchSourceContext(repoUrl: string, pkgName: string): Promise<string> {
    try {
      const urlObj = new URL(repoUrl);
      const parts = urlObj.pathname.split('/').filter(Boolean);
      const owner = parts[0];
      const repo = parts[1];
      if (!owner || !repo) return 'Could not parse repo URL.';

      const headers: Record<string, string> = {
        Accept: 'application/vnd.github.v3+json',
      };
      if (process.env.GITHUB_TOKEN) {
        headers['Authorization'] = `Bearer ${process.env.GITHUB_TOKEN}`;
      }

      // Search for files that import/require the vulnerable package
      const searchRes = await axios.get(
        `https://api.github.com/search/code?q=${encodeURIComponent(`"${pkgName}"`)}+repo:${owner}/${repo}`,
        { headers }
      );

      const items: any[] = searchRes.data?.items?.slice(0, 4) || [];
      const snippets: string[] = [];

      for (const item of items) {
        try {
          const fileRes = await axios.get(item.url, { headers });
          const content = Buffer.from(fileRes.data.content, 'base64').toString('utf-8');
          // Send only first 500 chars per file to keep token count low
          snippets.push(`=== ${item.path} ===\n${content.slice(0, 500)}`);
        } catch (_) {}
      }

      return snippets.length > 0
        ? snippets.join('\n\n')
        : `No source files found that import '${pkgName}'. Package may be an indirect/dev dependency.`;
    } catch (err: any) {
      return `Could not fetch source context: ${err.message}`;
    }
  }

  private async askGroq(vuln: Vulnerability, sourceContext: string): Promise<ExposureResult> {
    const groqApiKey = process.env.GROQ_API_KEY;
    if (!groqApiKey) {
      // Fallback: mark as potentially reachable with LOW confidence
      return {
        isReachable: true,
        confidence: 'LOW',
        reasoning: 'GROQ_API_KEY not set — defaulting to reachable. Set GROQ_API_KEY for context-aware analysis.',
        affectedFiles: [],
      };
    }

    const prompt = `You are a security analyst. Given a CVE and source code snippets from the affected repository, determine if the vulnerable code path is actually reachable.

CVE ID: ${vuln.cveId}
Package: ${vuln.pkgName}@${vuln.pkgVersion}
Description: ${vuln.description}

Source code snippets from the repository that reference this package:
${sourceContext}

Answer ONLY in this exact JSON format (no markdown, no explanation outside JSON):
{
  "isReachable": true or false,
  "confidence": "HIGH" or "MEDIUM" or "LOW",
  "reasoning": "one sentence explanation",
  "affectedFiles": ["list", "of", "file", "paths", "that", "use", "the", "vulnerable", "api"]
}`;

    try {
      const response = await axios.post(
        'https://api.groq.com/openai/v1/chat/completions',
        {
          model: 'llama3-8b-8192',
          messages: [{ role: 'user', content: prompt }],
          temperature: 0.1,
          max_tokens: 300,
        },
        {
          headers: {
            Authorization: `Bearer ${groqApiKey}`,
            'Content-Type': 'application/json',
          },
        }
      );

      const raw = response.data.choices[0].message.content.trim();
      // Strip possible markdown code fences
      const jsonStr = raw.replace(/^```json?\n?/i, '').replace(/```$/, '').trim();
      const parsed = JSON.parse(jsonStr);
      return {
        isReachable: Boolean(parsed.isReachable),
        confidence: parsed.confidence || 'MEDIUM',
        reasoning: parsed.reasoning || '',
        affectedFiles: Array.isArray(parsed.affectedFiles) ? parsed.affectedFiles : [],
      };
    } catch (err: any) {
      return {
        isReachable: true,
        confidence: 'LOW',
        reasoning: `Groq call failed (${err.message}) — defaulting to reachable.`,
        affectedFiles: [],
      };
    }
  }
}
