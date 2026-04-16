import axios from 'axios';
import { DependencyInput } from '../types';

export class RepoFetcher {
  static parseUrl(url: string) {
    try {
      const urlObj = new URL(url);
      const parts = urlObj.pathname.split('/').filter(Boolean);
      const owner = parts[0];
      const repo = parts[1];
      if (!owner || !repo) throw new Error('Invalid GitHub URL');
      return { owner, repo };
    } catch (e) {
      throw new Error('Could not parse GitHub URL. Expected format: https://github.com/owner/repo');
    }
  }

  static async fetchPackageJson(repoUrl: string): Promise<DependencyInput> {
    const { owner, repo } = this.parseUrl(repoUrl);

    try {
      const apiUrl = `https://api.github.com/repos/${owner}/${repo}/contents/package.json`;
      const headers: Record<string, string> = {
        'Accept': 'application/vnd.github.v3+json'
      };

      if (process.env.GITHUB_TOKEN) {
        headers['Authorization'] = `Bearer ${process.env.GITHUB_TOKEN}`;
      }

      const response = await axios.get(apiUrl, { headers });

      if (!response.data.content) {
        throw new Error('package.json not found or empty');
      }

      const content = Buffer.from(response.data.content, 'base64').toString('utf-8');
      const pkg = JSON.parse(content);

      const dependencies = Object.entries(pkg.dependencies || {}).map(([name, version]) => ({
        name,
        version: (version as string).replace(/[\^~]/g, '')
      }));

      return {
        repoName: `${owner}/${repo}`,
        repoUrl,
        manifestType: 'package.json',
        dependencies
      };
    } catch (error: any) {
      if (error.response?.status === 404) {
        throw new Error(`package.json not found in ${owner}/${repo}`);
      }
      throw new Error(`GitHub Fetch Error: ${error.message}`);
    }
  }
}
