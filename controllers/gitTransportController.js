import { spawn } from 'node:child_process';
import repositoryService from '../services/repositoryService.js';
import User from '../models/User.js';

export const gitTransportController = {
  async infoRefs(req, res) {
    try {
      const { slug } = req.params;
      const service = req.query.service;

      if (service !== 'git-upload-pack' && service !== 'git-receive-pack') {
        return res.status(400).send('Unsupported Git service');
      }

      const repository = await repositoryService.getRepository(slug);
      const serviceName = String(service);

      const auth = await authenticateGitRequest(req);

      if (repository.visibility === 'PRIVATE' && auth === null) {
        return sendGitUnauthorized(res);
      }

      if (auth) {
        const canAccess =
          serviceName === 'git-receive-pack'
            ? await repositoryService.assertCanWriteRepository(slug, auth.userId, auth.role).catch(() => false)
            : await repositoryService.assertCanReadRepository(slug, auth.userId, auth.role).catch(() => false);

        if (!canAccess) {
          return sendGitForbidden(res);
        }
      }

      const gitCommand = serviceName === 'git-upload-pack' ? 'upload-pack' : 'receive-pack';

      const child = spawn(
        'git',
        [
          '--git-dir',
          repository.localPath,
          gitCommand,
          '--stateless-rpc',
          '--advertise-refs',
          repository.localPath,
        ],
        { windowsHide: true },
      );

      const chunks = [];
      child.stdout.on('data', (chunk) => chunks.push(chunk));
      child.stderr.on('data', (chunk) => console.error(`git ${gitCommand}: ${chunk}`));

      child.on('error', (err) => {
        console.error(`git error:`, err);
        if (!res.headersSent) res.status(500).send('Git service error');
      });

      child.on('close', (code) => {
        if (code !== 0 && !res.headersSent) {
          return res.status(500).send('Git advertisement failed');
        }

        const body = Buffer.concat(chunks);
        const serviceLine = Buffer.from(`# service=${serviceName}\n`, 'utf8');
        const servicePacket = pktLine(serviceLine);
        const flushPacket = Buffer.from('0000', 'ascii');

        res.status(200);
        res.setHeader('Content-Type', `application/x-${serviceName}-advertisement`);
        res.setHeader('Cache-Control', 'no-cache');
        res.end(Buffer.concat([servicePacket, flushPacket, body]));
      });

      child.stdin.end();
    } catch (err) {
      if (!res.headersSent) res.status(err.status || 500).send(err.message);
    }
  },

  async uploadPack(req, res) {
    try {
      const { slug } = req.params;
      const repository = await repositoryService.getRepository(slug);
      const auth = await authenticateGitRequest(req);

      if (repository.visibility === 'PRIVATE' && auth === null) {
        return sendGitUnauthorized(res);
      }

      if (auth) {
        const canRead = await repositoryService
          .assertCanReadRepository(slug, auth.userId, auth.role)
          .catch(() => false);
        if (!canRead) return sendGitForbidden(res);
      }

      res.status(200);
      res.setHeader('Content-Type', 'application/x-git-upload-pack-result');
      res.setHeader('Cache-Control', 'no-cache');

      const child = spawn(
        'git',
        [
          '--git-dir',
          repository.localPath,
          'upload-pack',
          '--stateless-rpc',
          repository.localPath,
        ],
        { windowsHide: true },
      );

      req.pipe(child.stdin);
      child.stdout.pipe(res);

      child.on('error', (err) => {
        console.error('upload-pack error:', err);
        if (!res.headersSent) res.status(500).end();
      });
    } catch (err) {
      if (!res.headersSent) res.status(err.status || 500).send(err.message);
    }
  },

  async receivePack(req, res) {
    try {
      const { slug } = req.params;
      const repository = await repositoryService.getRepository(slug);
      const auth = await authenticateGitRequest(req);

      if (auth === null) {
        return sendGitUnauthorized(res);
      }

      const canWrite = await repositoryService
        .assertCanWriteRepository(slug, auth.userId, auth.role)
        .catch(() => false);
      if (!canWrite) return sendGitForbidden(res);

      await repositoryService.enableHttpPush(slug);

      res.status(200);
      res.setHeader('Content-Type', 'application/x-git-receive-pack-result');
      res.setHeader('Cache-Control', 'no-cache');

      const child = spawn(
        'git',
        [
          '--git-dir',
          repository.localPath,
          'receive-pack',
          '--stateless-rpc',
          repository.localPath,
        ],
        { windowsHide: true },
      );

      req.pipe(child.stdin);
      child.stdout.pipe(res);

      child.on('error', (err) => {
        console.error('receive-pack error:', err);
        if (!res.headersSent) res.status(500).end();
      });
    } catch (err) {
      if (!res.headersSent) res.status(err.status || 500).send(err.message);
    }
  },
};

async function authenticateGitRequest(req) {
  const authorization = req.headers.authorization;
  if (!authorization?.startsWith('Basic ')) {
    return null;
  }

  const encoded = authorization.slice('Basic '.length);
  let decoded;
  try {
    decoded = Buffer.from(encoded, 'base64').toString('utf8');
  } catch {
    return null;
  }

  const separatorIndex = decoded.indexOf(':');
  if (separatorIndex === -1) return null;

  const username = decoded.slice(0, separatorIndex);
  const token = decoded.slice(separatorIndex + 1);

  if (!username || !token) return null;

  const validToken = await repositoryService.findValidGitToken(token);
  if (!validToken) return null;

  const user = await User.findOne({ id: validToken.userId });
  if (!user || user.username !== username) return null;

  return {
    userId: user.id,
    username: user.username,
    role: user.role,
    tokenId: validToken.id,
  };
}

function sendGitUnauthorized(res) {
  res.setHeader('WWW-Authenticate', 'Basic realm="Admin Gitmite"');
  res.status(401).send('Git authentication required');
}

function sendGitForbidden(res) {
  res.status(403).send('Git repository permission denied');
}

function pktLine(data) {
  const length = data.length + 4;
  const header = length.toString(16).padStart(4, '0');
  return Buffer.concat([Buffer.from(header, 'ascii'), data]);
}

export default gitTransportController;
