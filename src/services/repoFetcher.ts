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

  static async fetchDependencies(repoUrl: string): Promise<DependencyInput> {
    const { owner, repo } = this.parseUrl(repoUrl);

    const headers: Record<string, string> = {
      'Accept': 'application/vnd.github.v3+json'
    };

    if (process.env.GITHUB_TOKEN) {
      headers['Authorization'] = `Bearer ${process.env.GITHUB_TOKEN}`;
    }

    const manifestFiles = ['package.json', 'yarn.lock', 'requirements.txt', 'pom.xml', 'go.mod'];
    
    for (const manifest of manifestFiles) {
      try {
        const apiUrl = `https://api.github.com/repos/${owner}/${repo}/contents/${manifest}`;
        const response = await axios.get(apiUrl, { headers });

        if (response.data && response.data.content) {
          const content = Buffer.from(response.data.content, 'base64').toString('utf-8');
          const dependencies = this.parseManifest(manifest, content);
          
          if (dependencies.length > 0) {
            let ecosystem: 'npm' | 'PyPI' | 'Maven' | 'Go' = 'npm';
            if (manifest === 'requirements.txt') ecosystem = 'PyPI';
            else if (manifest === 'pom.xml') ecosystem = 'Maven';
            else if (manifest === 'go.mod') ecosystem = 'Go';

            return {
              repoName: `${owner}/${repo}`,
              repoUrl,
              manifestType: manifest as any,
              ecosystem,
              dependencies
            };
          }
        }
      } catch (error: any) {
        // File might not exist, continue to next
        if (error.response?.status !== 404) {
          console.error(`Error fetching ${manifest}:`, error.message);
        }
      }
    }

    throw new Error(`No supported manifest file found in ${owner}/${repo}`);
  }

  static parseManifest(type: string, content: string): { name: string; version: string }[] {
    const deps: { name: string; version: string }[] = [];

    if (type === 'package.json') {
      try {
        const pkg = JSON.parse(content);
        const allDeps = { ...pkg.dependencies, ...pkg.devDependencies };
        for (const [name, version] of Object.entries(allDeps)) {
          deps.push({ name, version: (version as string).replace(/[\^~]/g, '') });
        }
      } catch (e) {}
    } 
    else if (type === 'yarn.lock') {
      const lines = content.split('\n');
      for (const line of lines) {
        const match = line.match(/^"?([a-zA-Z0-9\-@/]+)"?@/);
        if (match && match[1]) {
          deps.push({ name: match[1], version: 'unknown' });
        }
      }
    }
    else if (type === 'requirements.txt') {
      const lines = content.split('\n');
      for (const line of lines) {
        if (line && !line.startsWith('#')) {
          const parts = line.split('==');
          if (parts.length >= 1) {
            deps.push({ name: parts[0].trim(), version: parts[1] ? parts[1].trim() : 'unknown' });
          }
        }
      }
    }
    else if (type === 'pom.xml') {
      const regex = /<dependency>\s*<groupId>([^<]+)<\/groupId>\s*<artifactId>([^<]+)<\/artifactId>\s*<version>([^<]+)<\/version>/g;
      let match;
      while ((match = regex.exec(content)) !== null) {
        deps.push({ name: `${match[1]}:${match[2]}`, version: match[3] });
      }
    }
    else if (type === 'go.mod') {
      const regex = /require\s+([^\s]+)\s+([^\s]+)/g;
      let match;
      while ((match = regex.exec(content)) !== null) {
        deps.push({ name: match[1], version: match[2] });
      }
    }

    return deps.filter((v, i, a) => a.findIndex(t => (t.name === v.name)) === i);
  }

  static async fetchOrgRepos(orgUrl: string): Promise<string[]> {
    const org = orgUrl.replace('https://github.com/', '').split('/')[0];
    const headers: Record<string, string> = {
      'Accept': 'application/vnd.github.v3+json'
    };
    if (process.env.GITHUB_TOKEN) {
      headers['Authorization'] = `Bearer ${process.env.GITHUB_TOKEN}`;
    }

    const response = await axios.get(`https://api.github.com/orgs/${org}/repos?type=public&per_page=10`, { headers });
    return response.data.map((repo: any) => repo.html_url);
  }
}
