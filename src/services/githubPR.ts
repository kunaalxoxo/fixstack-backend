import axios from 'axios';
import { RemediationResult } from '../types';
import { Logger } from './logger';
import { db } from '../db/store';

type SupportedManifestType = 'package.json' | 'requirements.txt' | 'pom.xml' | 'go.mod' | 'yarn.lock';

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
    } else if (normalized.startsWith('ssh://git@github.com/')) {
      normalized = normalized.replace('ssh://git@github.com/', 'https://github.com/');
    }

    const urlObj = new URL(normalized);
    if (urlObj.hostname !== 'github.com') {
      throw new Error('Invalid repo URL host');
    }
    const parts = urlObj.pathname.split('/').filter(Boolean);
    const owner = parts[0];
    const rawRepo = parts[1] || '';
    const repo = rawRepo.replace(/\.git$/i, '');
    const allowed = /^[A-Za-z0-9._-]+$/;

    if (!owner || !repo || !allowed.test(owner) || !allowed.test(repo)) {
      throw new Error('Invalid repo URL');
    }

    return { owner, repo };
  } catch (error: any) {
    throw new Error(`Invalid repo URL: ${error?.message || 'parse failed'}`);
  }
}

export class GitHubPRService {
  static async createPR(
    repoUrl: string,
    remediations: RemediationResult[],
    runId: string,
    manifestType: SupportedManifestType,
    logger: Logger
  ): Promise<{ prUrl: string; prBranch: string } | null> {
    const githubToken = process.env.GITHUB_TOKEN || db.getSetting('githubToken');
    if (!githubToken) {
      await logger.log('GitHub PR Agent', 'System', 'WARNING', 'GITHUB_TOKEN not set. Skipping PR creation.');
      return null;
    }

    try {
      const { owner, repo } = parseGitHubRepo(repoUrl);
      const encodedOwner = encodeURIComponent(owner);
      const encodedRepo = encodeURIComponent(repo);
      const repoApiBase = `https://api.github.com/repos/${encodedOwner}/${encodedRepo}`;

      const headers = {
        'Authorization': `Bearer ${githubToken}`,
        'Accept': 'application/vnd.github.v3+json',
        'X-GitHub-Api-Version': '2022-11-28',
      };

      const shortRunId = runId.substring(0, 8);
      const newBranch = `fixstack/patch-${shortRunId}`;
      const manifestPath = this.getManifestPath(manifestType);

      await logger.log('GitHub PR Agent', 'Setup', 'INFO', `Preparing PR for ${owner}/${repo} on branch ${newBranch}`);

      // 1. Get default branch and its latest commit SHA
      const repoRes = await axios.get(repoApiBase, { headers });
      const defaultBranch = repoRes.data.default_branch;

      const refRes = await axios.get(
        `${repoApiBase}/git/refs/heads/${encodeURIComponent(defaultBranch)}`,
        { headers }
      );
      const latestSha = refRes.data.object.sha;

      // 2. Create new branch
      await axios.post(
        `${repoApiBase}/git/refs`,
        { ref: `refs/heads/${newBranch}`, sha: latestSha },
        { headers }
      );

      if (!manifestPath) {
        await logger.log(
          'GitHub PR Agent',
          'Update',
          'WARNING',
          `PR creation for manifest type "${manifestType}" is not supported yet.`
        );
        return null;
      }

      // 3. Get manifest file
      const pkgRes = await axios.get(
        `${repoApiBase}/contents/${encodeURIComponent(manifestPath)}?ref=${encodeURIComponent(newBranch)}`,
        { headers }
      );

      const content = Buffer.from(pkgRes.data.content, 'base64').toString('utf-8');

      // 4. Update manifest file
      const fixedRemediations = remediations.filter(r => r.status === 'FIXED');
      if (fixedRemediations.length === 0) {
        await logger.log('GitHub PR Agent', 'Update', 'WARNING', 'No successful remediations to PR.');
        return null;
      }

      const updatedManifest = this.updateManifestContent(manifestType, content, fixedRemediations);
      if (!updatedManifest.changesMade) {
        await logger.log('GitHub PR Agent', 'Update', 'WARNING', `Dependencies not found in ${manifestPath}.`);
        return null;
      }

      const updatedContentBase64 = Buffer.from(updatedManifest.content).toString('base64');

      // 5. Commit updated manifest
      await axios.put(
        `${repoApiBase}/contents/${encodeURIComponent(manifestPath)}`,
        {
          message: `FixStack: Update vulnerable dependencies\n\nRun ID: ${runId}`,
          content: updatedContentBase64,
          sha: pkgRes.data.sha,
          branch: newBranch
        },
        { headers }
      );
      await logger.log('GitHub PR Agent', 'Commit', 'SUCCESS', `Committed updated ${manifestPath}`);

      // 6. Open PR
      const title = `FixStack: Security updates for ${fixedRemediations.length} dependencies`;
      const body = `Automated remediation by FixStack.\n\n` +
        fixedRemediations.map(r => `- Updated \`${r.pkgName}\` to \`${r.newVersion}\``).join('\n') +
        `\n\nRun ID: ${runId}`;

      const prRes = await axios.post(
        `${repoApiBase}/pulls`,
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

  private static escapeForRegex(value: string): string {
    return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  }

  private static getManifestPath(manifestType: SupportedManifestType): string | null {
    if (manifestType === 'yarn.lock') return null;
    return manifestType;
  }

  private static updateManifestContent(
    manifestType: SupportedManifestType,
    content: string,
    remediations: RemediationResult[]
  ): { content: string; changesMade: boolean } {
    if (manifestType === 'package.json') {
      const pkg = JSON.parse(content);
      let changesMade = false;
      for (const r of remediations) {
        if (pkg.dependencies && pkg.dependencies[r.pkgName]) {
          pkg.dependencies[r.pkgName] = `^${r.newVersion}`;
          changesMade = true;
        } else if (pkg.devDependencies && pkg.devDependencies[r.pkgName]) {
          pkg.devDependencies[r.pkgName] = `^${r.newVersion}`;
          changesMade = true;
        }
      }
      return { content: JSON.stringify(pkg, null, 2) + '\n', changesMade };
    }

    if (manifestType === 'requirements.txt') {
      const lines = content.split('\n');
      let changesMade = false;
      const updatedLines = lines.map((line) => {
        const trimmed = line.trim();
        if (!trimmed || trimmed.startsWith('#')) return line;
        for (const r of remediations) {
          const escaped = this.escapeForRegex(r.pkgName);
          const regex = new RegExp(`^\\s*${escaped}\\s*(==|>=|<=|~=|!=|>|<)\\s*[^\\s#]+`, 'i');
          if (regex.test(line)) {
            changesMade = true;
            return `${r.pkgName}==${r.newVersion}`;
          }
        }
        return line;
      });
      return { content: updatedLines.join('\n'), changesMade };
    }

    if (manifestType === 'go.mod') {
      let updated = content;
      let changesMade = false;
      for (const r of remediations) {
        const escaped = this.escapeForRegex(r.pkgName);
        const regex = new RegExp(`(^|\\n)(\\s*)(${escaped})(\\s+)([^\\s]+)`, 'g');
        updated = updated.replace(regex, (match, start, indent, name, spaces, currentVersion) => {
          if (currentVersion === r.newVersion || currentVersion === `v${r.newVersion}`) return match;
          changesMade = true;
          const newVersion = r.newVersion.startsWith('v') ? r.newVersion : `v${r.newVersion}`;
          return `${start}${indent}${name}${spaces}${newVersion}`;
        });
      }
      return { content: updated, changesMade };
    }

    if (manifestType === 'pom.xml') {
      let updated = content;
      let changesMade = false;
      for (const r of remediations) {
        const [groupId, artifactId] = r.pkgName.split(':');
        if (!groupId || !artifactId) {
          continue;
        }
        const escapedGroup = this.escapeForRegex(groupId);
        const escapedArtifact = this.escapeForRegex(artifactId);
        const regex = new RegExp(
          `(<dependency>[\\s\\S]*?<groupId>${escapedGroup}</groupId>[\\s\\S]*?<artifactId>${escapedArtifact}</artifactId>[\\s\\S]*?<version>)([^<]+)(</version>)`,
          'g'
        );
        updated = updated.replace(regex, (match, before, currentVersion, after) => {
          if (currentVersion.trim() === r.newVersion) return match;
          changesMade = true;
          return `${before}${r.newVersion}${after}`;
        });
      }
      return { content: updated, changesMade };
    }

    return { content, changesMade: false };
  }
}
