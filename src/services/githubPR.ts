import axios from 'axios';
import { RemediationResult } from '../types';
import { Logger } from './logger';
import { db } from '../db/store';

function parseGitHubRepo(repoUrl: string): { owner: string; repo: string } {
  try {
    // Supports:
    // - https://github.com/owner/repo
    // - https://github.com/owner/repo.git
    // - git@github.com:owner/repo.git
    // - ssh://git@github.com/owner/repo.git
    let normalized = repoUrl.trim();
    if (normalized.startsWith('git@github.com:')) {
      normalized = normalized.replace('git@github.com:', 'https://github.com/');
    }

    const urlObj = new URL(normalized);
    const parts = urlObj.pathname.split('/').filter(Boolean);
    const owner = parts[0];
    const rawRepo = parts[1] || '';
    const repo = rawRepo.replace(/\.git$/i, '');

    if (!owner || !repo) {
      throw new Error('Invalid repo URL');
    }

    return { owner, repo };
  } catch {
    throw new Error('Invalid repo URL');
  }
}

export class GitHubPRService {
  static async createPR(
    repoUrl: string,
    remediations: RemediationResult[],
    runId: string,
    logger: Logger
  ): Promise<{ prUrl: string; prBranch: string } | null> {
    const githubToken = process.env.GITHUB_TOKEN || db.getSetting('githubToken');
    if (!githubToken) {
      await logger.log('GitHub PR Agent', 'System', 'WARNING', 'GITHUB_TOKEN not set. Skipping PR creation.');
      return null;
    }

    try {
      const { owner, repo } = parseGitHubRepo(repoUrl);

      const headers = {
        'Authorization': `Bearer ${githubToken}`,
        'Accept': 'application/vnd.github.v3+json',
        'X-GitHub-Api-Version': '2022-11-28',
      };

      const shortRunId = runId.substring(0, 8);
      const newBranch = `fixstack/patch-${shortRunId}`;

      await logger.log('GitHub PR Agent', 'Setup', 'INFO', `Preparing PR for ${owner}/${repo} on branch ${newBranch}`);

      // 1. Get default branch and its latest commit SHA
      const repoRes = await axios.get(`https://api.github.com/repos/${owner}/${repo}`, { headers });
      const defaultBranch = repoRes.data.default_branch;

      const refRes = await axios.get(`https://api.github.com/repos/${owner}/${repo}/git/refs/heads/${defaultBranch}`, { headers });
      const latestSha = refRes.data.object.sha;

      // 2. Create new branch
      await axios.post(
        `https://api.github.com/repos/${owner}/${repo}/git/refs`,
        { ref: `refs/heads/${newBranch}`, sha: latestSha },
        { headers }
      );

      // 3. Get package.json
      const pkgRes = await axios.get(
        `https://api.github.com/repos/${owner}/${repo}/contents/package.json?ref=${newBranch}`,
        { headers }
      );

      const content = Buffer.from(pkgRes.data.content, 'base64').toString('utf-8');
      const pkg = JSON.parse(content);

      // 4. Update package.json
      const fixedRemediations = remediations.filter(r => r.status === 'FIXED');
      if (fixedRemediations.length === 0) {
        await logger.log('GitHub PR Agent', 'Update', 'WARNING', 'No successful remediations to PR.');
        return null;
      }

      let changesMade = false;
      for (const r of fixedRemediations) {
        if (pkg.dependencies && pkg.dependencies[r.pkgName]) {
          pkg.dependencies[r.pkgName] = `^${r.newVersion}`;
          changesMade = true;
        } else if (pkg.devDependencies && pkg.devDependencies[r.pkgName]) {
          pkg.devDependencies[r.pkgName] = `^${r.newVersion}`;
          changesMade = true;
        }
      }

      if (!changesMade) {
        await logger.log('GitHub PR Agent', 'Update', 'WARNING', 'Dependencies not found in package.json.');
        return null;
      }

      const updatedContentBase64 = Buffer.from(JSON.stringify(pkg, null, 2) + '\n').toString('base64');

      // 5. Commit updated package.json
      await axios.put(
        `https://api.github.com/repos/${owner}/${repo}/contents/package.json`,
        {
          message: `FixStack: Update vulnerable dependencies\n\nRun ID: ${runId}`,
          content: updatedContentBase64,
          sha: pkgRes.data.sha,
          branch: newBranch
        },
        { headers }
      );
      await logger.log('GitHub PR Agent', 'Commit', 'SUCCESS', 'Committed updated package.json');

      // 6. Open PR
      const title = `FixStack: Security updates for ${fixedRemediations.length} dependencies`;
      const body = `Automated remediation by FixStack.\n\n` +
        fixedRemediations.map(r => `- Updated \`${r.pkgName}\` to \`${r.newVersion}\``).join('\n') +
        `\n\nRun ID: ${runId}`;

      const prRes = await axios.post(
        `https://api.github.com/repos/${owner}/${repo}/pulls`,
        {
          title,
          body,
          head: `${owner}:${newBranch}`,
          base: defaultBranch
        },
        { headers }
      );

      const prUrl = prRes.data.html_url;
      await logger.log('GitHub PR Agent', 'PR Created', 'SUCCESS', `Created Pull Request: ${prUrl}`);

      return { prUrl, prBranch: newBranch };

    } catch (error: any) {
      const status = error?.response?.status;
      const details = error?.response?.data
        ? JSON.stringify(error.response.data)
        : error.message;
      await logger.log(
        'GitHub PR Agent',
        'Error',
        'ERROR',
        `Failed to create PR${status ? ` (HTTP ${status})` : ''}: ${details}`
      );
      return null;
    }
  }
}
