import repositoryService from '../services/repositoryService.js';

export const repositoryController = {
  // Repositories CRUD
  async getRepositories(req, res) {
    try {
      const repos = await repositoryService.getRepositories();
      res.json(repos);
    } catch (err) {
      res.status(err.status || 500).json({ message: err.message });
    }
  },

  async getRepository(req, res) {
    try {
      const repo = await repositoryService.getRepository(req.params.slug);
      res.json(repo);
    } catch (err) {
      res.status(err.status || 500).json({ message: err.message });
    }
  },

  async createRepository(req, res) {
    try {
      const userId = req.user?.id || 1;
      const repo = await repositoryService.createRepository(req.body, userId);
      res.status(201).json(repo);
    } catch (err) {
      res.status(err.status || 400).json({ message: err.message });
    }
  },

  async updateRepository(req, res) {
    try {
      const userId = req.user?.id || 1;
      const role = req.user?.role || 'ADMIN';
      const repo = await repositoryService.updateRepository(req.params.slug, req.body, userId, role);
      res.json(repo);
    } catch (err) {
      res.status(err.status || 400).json({ message: err.message });
    }
  },

  async getBranches(req, res) {
    try {
      const branches = await repositoryService.getBranches(req.params.slug);
      res.json(branches);
    } catch (err) {
      res.status(err.status || 500).json({ message: err.message });
    }
  },

  async getCommits(req, res) {
    try {
      const commits = await repositoryService.getCommits(req.params.slug, req.query.ref);
      res.json(commits);
    } catch (err) {
      res.status(err.status || 500).json({ message: err.message });
    }
  },

  async getCommit(req, res) {
    try {
      const commit = await repositoryService.getCommit(req.params.slug, req.params.hash);
      res.json(commit);
    } catch (err) {
      res.status(err.status || 500).json({ message: err.message });
    }
  },

  async getCommitDiff(req, res) {
    try {
      const diff = await repositoryService.getCommitDiff(req.params.slug, req.params.hash);
      res.json(diff);
    } catch (err) {
      res.status(err.status || 500).json({ message: err.message });
    }
  },

  async getTree(req, res) {
    try {
      const tree = await repositoryService.getTree(
        req.params.slug,
        req.query.ref,
        req.query.path,
      );
      res.json(tree);
    } catch (err) {
      res.status(err.status || 500).json({ message: err.message });
    }
  },

  async getBlob(req, res) {
    try {
      const blob = await repositoryService.getBlob(
        req.params.slug,
        req.query.ref,
        req.query.path,
      );
      res.json(blob);
    } catch (err) {
      res.status(err.status || 500).json({ message: err.message });
    }
  },

  // Members
  async getMembers(req, res) {
    try {
      const userId = req.user?.id || 1;
      const role = req.user?.role || 'ADMIN';
      const members = await repositoryService.getMembers(req.params.slug, userId, role);
      res.json(members);
    } catch (err) {
      res.status(err.status || 500).json({ message: err.message });
    }
  },

  async addMember(req, res) {
    try {
      const userId = req.user?.id || 1;
      const role = req.user?.role || 'ADMIN';
      const member = await repositoryService.addMember(req.params.slug, req.body, userId, role);
      res.status(201).json(member);
    } catch (err) {
      res.status(err.status || 400).json({ message: err.message });
    }
  },

  async updateMember(req, res) {
    try {
      const userId = req.user?.id || 1;
      const role = req.user?.role || 'ADMIN';
      const member = await repositoryService.updateMember(
        req.params.slug,
        req.params.userId,
        req.body,
        userId,
        role,
      );
      res.json(member);
    } catch (err) {
      res.status(err.status || 400).json({ message: err.message });
    }
  },

  async removeMember(req, res) {
    try {
      const userId = req.user?.id || 1;
      const role = req.user?.role || 'ADMIN';
      const result = await repositoryService.removeMember(
        req.params.slug,
        req.params.userId,
        userId,
        role,
      );
      res.json(result);
    } catch (err) {
      res.status(err.status || 400).json({ message: err.message });
    }
  },

  // Git Tokens
  async createToken(req, res) {
    try {
      const userId = req.user?.id || 1;
      const token = await repositoryService.createGitToken(userId, req.body.name);
      res.status(201).json(token);
    } catch (err) {
      res.status(err.status || 400).json({ message: err.message });
    }
  },

  async revokeToken(req, res) {
    try {
      const userId = req.user?.id || 1;
      const result = await repositoryService.revokeGitToken(userId, req.params.id);
      res.json(result);
    } catch (err) {
      res.status(err.status || 400).json({ message: err.message });
    }
  },

  async getTokens(req, res) {
    try {
      const userId = req.user?.id || 1;
      const tokens = await repositoryService.getGitTokens(userId);
      res.json(tokens);
    } catch (err) {
      res.status(err.status || 500).json({ message: err.message });
    }
  },
};

export default repositoryController;
