import { execFile } from 'node:child_process';
import { constants } from 'node:fs';
import { access, mkdir } from 'node:fs/promises';
import path from 'node:path';

class GitService {
  constructor() {
    this.repositoryRoot =
      process.env.REPOSITORY_STORAGE_PATH ||
      path.resolve(process.cwd(), 'repos');
  }

  getRepositoryPath(slug) {
    this.assertSafeSlug(slug);
    return path.join(this.repositoryRoot, `${slug}.git`);
  }

  async pathExists(targetPath) {
    try {
      await access(targetPath, constants.F_OK);
      return true;
    } catch {
      return false;
    }
  }

  async initBareRepository(repositoryPath) {
    await mkdir(this.repositoryRoot, { recursive: true });
    await this.runGit(['init', '--bare', repositoryPath]);
    await this.enableHttpPush(repositoryPath);
  }

  async enableHttpPush(repositoryPath) {
    await this.runRepositoryGit(repositoryPath, [
      'config',
      'http.receivepack',
      'true',
    ]);
  }

  async listBranches(repositoryPath) {
    try {
      const { stdout } = await this.runRepositoryGit(repositoryPath, [
        'for-each-ref',
        '--format=%(refname:short)',
        'refs/heads',
      ]);

      return stdout
        .split('\n')
        .map((branch) => branch.trim())
        .filter(Boolean);
    } catch (error) {
      if (this.isEmptyRepositoryError(error)) {
        return [];
      }
      throw error;
    }
  }

  async listCommits(repositoryPath, ref = 'HEAD') {
    this.assertSafeRef(ref);

    try {
      const { stdout } = await this.runRepositoryGit(repositoryPath, [
        'log',
        '--max-count=50',
        '--pretty=format:%H%x1f%h%x1f%an%x1f%ae%x1f%aI%x1f%s',
        ref,
      ]);

      return stdout
        .split('\n')
        .filter(Boolean)
        .map((line) => {
          const [
            hash,
            shortHash,
            authorName,
            authorEmail,
            authoredAt,
            subject,
          ] = line.split('\x1f');

          return {
            hash,
            shortHash,
            authorName,
            authorEmail,
            authoredAt,
            subject,
          };
        });
    } catch (error) {
      if (this.isEmptyRepositoryError(error)) {
        return [];
      }
      throw error;
    }
  }

  async getCommit(repositoryPath, hash) {
    this.assertSafeCommitHash(hash);

    try {
      const { stdout } = await this.runRepositoryGit(repositoryPath, [
        'show',
        '-s',
        '--format=%H%x1f%h%x1f%an%x1f%ae%x1f%aI%x1f%cn%x1f%ce%x1f%cI%x1f%s%x1f%P',
        hash,
      ]);

      const [
        fullHash,
        shortHash,
        authorName,
        authorEmail,
        authoredAt,
        committerName,
        committerEmail,
        committedAt,
        subject,
        parents,
      ] = stdout.trim().split('\x1f');

      if (!fullHash) {
        const err = new Error('Commit not found');
        err.status = 404;
        throw err;
      }

      return {
        hash: fullHash,
        shortHash,
        authorName,
        authorEmail,
        authoredAt,
        subject,
        committerName,
        committerEmail,
        committedAt,
        parentHashes: parents ? parents.split(' ') : [],
      };
    } catch (error) {
      if (this.isCommitNotFoundError(error)) {
        const err = new Error('Commit not found');
        err.status = 404;
        throw err;
      }
      throw error;
    }
  }

  async getCommitDiff(repositoryPath, hash) {
    this.assertSafeCommitHash(hash);

    try {
      const { stdout } = await this.runRepositoryGit(repositoryPath, [
        'show',
        '--format=',
        '--find-renames',
        '--find-copies',
        '--unified=3',
        hash,
      ]);

      return {
        hash,
        diff: stdout,
      };
    } catch (error) {
      if (this.isCommitNotFoundError(error)) {
        const err = new Error('Commit not found');
        err.status = 404;
        throw err;
      }
      throw error;
    }
  }

  async listTree(repositoryPath, ref = 'HEAD', repositoryFilePath = '') {
    this.assertSafeRef(ref);
    const safePath = this.normalizeRepositoryFilePath(repositoryFilePath);
    const treeish = safePath ? `${ref}:${safePath}` : ref;

    try {
      const { stdout } = await this.runRepositoryGit(repositoryPath, [
        'ls-tree',
        '-z',
        treeish,
      ]);

      return stdout
        .split('\0')
        .filter(Boolean)
        .map((entry) => {
          const match = /^(\d+)\s+(\w+)\s+([a-f0-9]+)\t(.+)$/.exec(entry);

          if (!match) {
            const err = new Error('Unable to parse git tree entry');
            err.status = 500;
            throw err;
          }

          const [, mode, type, hash, name] = match;

          return {
            mode,
            type,
            hash,
            name,
          };
        });
    } catch (error) {
      if (this.isEmptyRepositoryError(error)) {
        return [];
      }
      throw error;
    }
  }

  async readBlob(repositoryPath, ref = 'HEAD', repositoryFilePath = '') {
    this.assertSafeRef(ref);
    const safePath = this.normalizeRepositoryFilePath(repositoryFilePath);

    if (!safePath) {
      const err = new Error('File path is required');
      err.status = 400;
      throw err;
    }

    try {
      const { stdout } = await this.runRepositoryGit(repositoryPath, [
        'show',
        `${ref}:${safePath}`,
      ]);

      return {
        path: safePath,
        content: stdout,
      };
    } catch (error) {
      if (this.isEmptyRepositoryError(error)) {
        const err = new Error('File not found in repository');
        err.status = 404;
        throw err;
      }
      throw error;
    }
  }

  runRepositoryGit(repositoryPath, args) {
    return this.runGit(['--git-dir', repositoryPath, ...args]);
  }

  runGit(args) {
    return new Promise((resolve, reject) => {
      execFile(
        'git',
        args,
        {
          encoding: 'utf8',
          maxBuffer: 1024 * 1024 * 10,
          windowsHide: true,
        },
        (error, stdout, stderr) => {
          if (error) {
            error.stderr = stderr;
            reject(error);
            return;
          }
          resolve({ stdout, stderr });
        },
      );
    });
  }

  assertSafeSlug(slug) {
    if (!/^[a-z0-9][a-z0-9-]{1,62}[a-z0-9]$/.test(slug)) {
      const err = new Error('Invalid repository slug. Use 3-64 lowercase alphanumeric and hyphens.');
      err.status = 400;
      throw err;
    }
  }

  assertSafeRef(ref) {
    if (
      !/^[A-Za-z0-9._/-]+$/.test(ref) ||
      ref.startsWith('-') ||
      ref.includes('..') ||
      ref.includes('//') ||
      ref.includes('@{') ||
      ref.includes('\\')
    ) {
      const err = new Error('Invalid git ref');
      err.status = 400;
      throw err;
    }
  }

  normalizeRepositoryFilePath(repositoryFilePath) {
    if (repositoryFilePath.includes('\\')) {
      const err = new Error('Invalid repository file path');
      err.status = 400;
      throw err;
    }

    const normalizedPath = path.posix.normalize(repositoryFilePath);

    if (normalizedPath === '.' || normalizedPath === '/') {
      return '';
    }

    if (
      normalizedPath.startsWith('/') ||
      normalizedPath.startsWith('../') ||
      normalizedPath === '..'
    ) {
      const err = new Error('Invalid repository file path');
      err.status = 400;
      throw err;
    }

    return normalizedPath;
  }

  isEmptyRepositoryError(error) {
    const stderr = error?.stderr || '';
    return (
      stderr.includes('ambiguous argument') ||
      stderr.includes('Not a valid object name') ||
      stderr.includes('unknown revision') ||
      stderr.includes('does not exist in') ||
      stderr.includes('fatal: your current branch')
    );
  }

  assertSafeCommitHash(hash) {
    if (!/^[a-f0-9]{7,64}$/i.test(hash) || hash.startsWith('-')) {
      const err = new Error('Invalid commit hash');
      err.status = 400;
      throw err;
    }
  }

  isCommitNotFoundError(error) {
    const stderr = error?.stderr || '';
    return (
      stderr.includes('unknown revision') ||
      stderr.includes('bad object') ||
      stderr.includes('ambiguous argument') ||
      stderr.includes('does not exist')
    );
  }
}

export const gitService = new GitService();
export default gitService;
