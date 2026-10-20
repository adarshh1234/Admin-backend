import crypto from 'node:crypto';
import Repository from '../models/Repository.js';
import RepositoryMember from '../models/RepositoryMember.js';
import GitAccessToken from '../models/GitAccessToken.js';
import User from '../models/User.js';
import gitService from './gitService.js';

class RepositoryService {
  async getRepositories() {
    return Repository.find({}).sort({ createdAt: -1 }).lean();
  }

  async getRepository(slug) {
    const repository = await Repository.findOne({ slug: slug.toLowerCase() }).lean();
    if (!repository) {
      const err = new Error(`Repository "${slug}" not found`);
      err.status = 404;
      throw err;
    }
    return repository;
  }

  async createRepository(dto, userId = 1) {
    const slug = dto.slug.toLowerCase().trim();
    gitService.assertSafeSlug(slug);

    const existingRepo = await Repository.findOne({ slug });
    if (existingRepo) {
      const err = new Error(`Repository "${slug}" already exists`);
      err.status = 409;
      throw err;
    }

    const localPath = gitService.getRepositoryPath(slug);

    if (await gitService.pathExists(localPath)) {
      const err = new Error(`Repository storage already exists for "${slug}"`);
      err.status = 409;
      throw err;
    }

    await gitService.initBareRepository(localPath);

    const highest = await Repository.findOne().sort({ id: -1 }).lean();
    const repoId = (highest?.id || 0) + 1;

    const repository = await Repository.create({
      id: repoId,
      name: dto.name.trim(),
      slug,
      description: dto.description || null,
      localPath,
      visibility: dto.visibility || 'PRIVATE',
      createdById: userId,
    });

    return repository.toJSON();
  }

  async updateRepository(slug, dto, userId = 1, role = 'ADMIN') {
    await this.assertCanManageRepository(slug, userId, role);

    const updateFields = {};
    if (dto.name !== undefined) updateFields.name = dto.name.trim();
    if (dto.description !== undefined) updateFields.description = dto.description;
    if (dto.visibility !== undefined) updateFields.visibility = dto.visibility;

    const updated = await Repository.findOneAndUpdate(
      { slug: slug.toLowerCase() },
      { $set: updateFields },
      { new: true },
    ).lean();

    return updated;
  }

  async getBranches(slug) {
    const repository = await this.getRepository(slug);
    return gitService.listBranches(repository.localPath);
  }

  async getCommits(slug, ref) {
    const repository = await this.getRepository(slug);
    return gitService.listCommits(repository.localPath, ref || 'HEAD');
  }

  async getCommit(slug, hash) {
    const repository = await this.getRepository(slug);
    return gitService.getCommit(repository.localPath, hash);
  }

  async getCommitDiff(slug, hash) {
    const repository = await this.getRepository(slug);
    return gitService.getCommitDiff(repository.localPath, hash);
  }

  async getTree(slug, ref, repositoryFilePath) {
    const repository = await this.getRepository(slug);
    return gitService.listTree(repository.localPath, ref || 'HEAD', repositoryFilePath || '');
  }

  async getBlob(slug, ref, repositoryFilePath) {
    const repository = await this.getRepository(slug);
    return gitService.readBlob(repository.localPath, ref || 'HEAD', repositoryFilePath);
  }

  async enableHttpPush(slug) {
    const repository = await this.getRepository(slug);
    await gitService.enableHttpPush(repository.localPath);
  }

  // Permissions
  async assertCanReadRepository(slug, userId = 1, role = 'ADMIN') {
    const repository = await this.getRepository(slug);

    if (repository.visibility === 'PUBLIC' || role === 'ADMIN' || role === 'Super Admin') {
      return repository;
    }

    if (repository.createdById === Number(userId)) {
      return repository;
    }

    const member = await RepositoryMember.findOne({
      repositoryId: repository.id,
      userId: Number(userId),
    });

    if (!member) {
      const err = new Error('You do not have permission to access this repository');
      err.status = 403;
      throw err;
    }

    return repository;
  }

  async assertCanWriteRepository(slug, userId = 1, role = 'ADMIN') {
    const repository = await this.getRepository(slug);

    if (role === 'ADMIN' || role === 'Super Admin' || repository.createdById === Number(userId)) {
      return repository;
    }

    const member = await RepositoryMember.findOne({
      repositoryId: repository.id,
      userId: Number(userId),
    });

    if (!member || (member.role !== 'WRITE' && member.role !== 'ADMIN')) {
      const err = new Error('You do not have permission to write to this repository');
      err.status = 403;
      throw err;
    }

    return repository;
  }

  async assertCanManageRepository(slug, userId = 1, role = 'ADMIN') {
    const repository = await this.getRepository(slug);

    if (role === 'ADMIN' || role === 'Super Admin' || repository.createdById === Number(userId)) {
      return repository;
    }

    const member = await RepositoryMember.findOne({
      repositoryId: repository.id,
      userId: Number(userId),
    });

    if (member?.role === 'ADMIN') {
      return repository;
    }

    const err = new Error('You do not have permission to manage this repository');
    err.status = 403;
    throw err;
  }

  async assertCanManageMembers(slug, userId = 1, role = 'ADMIN') {
    const repository = await this.getRepository(slug);

    if (role === 'ADMIN' || role === 'Super Admin' || repository.createdById === Number(userId)) {
      return repository;
    }

    const member = await RepositoryMember.findOne({
      repositoryId: repository.id,
      userId: Number(userId),
    });

    if (member?.role === 'ADMIN') {
      return repository;
    }

    const err = new Error('You do not have permission to manage repository members');
    err.status = 403;
    throw err;
  }

  // Repository Members
  async getMembers(slug, userId = 1, role = 'ADMIN') {
    const repository = await this.assertCanManageMembers(slug, userId, role);
    return RepositoryMember.find({ repositoryId: repository.id }).lean();
  }

  async addMember(slug, dto, userId = 1, role = 'ADMIN') {
    const repository = await this.assertCanManageMembers(slug, userId, role);

    const targetUser = await User.findOne({ username: dto.username.toLowerCase().trim() });
    if (!targetUser) {
      const err = new Error(`User "${dto.username}" not found`);
      err.status = 404;
      throw err;
    }

    const targetUserId = targetUser.id || 1;
    if (targetUserId === repository.createdById) {
      const err = new Error('The repository owner does not need to be added as a member');
      err.status = 409;
      throw err;
    }

    const existing = await RepositoryMember.findOne({
      repositoryId: repository.id,
      userId: targetUserId,
    });

    if (existing) {
      const err = new Error(`User "${dto.username}" is already a repository member`);
      err.status = 409;
      throw err;
    }

    const member = await RepositoryMember.create({
      repositoryId: repository.id,
      userId: targetUserId,
      role: dto.role || 'READ',
    });

    return member.toJSON();
  }

  async updateMember(slug, targetUserId, dto, userId = 1, role = 'ADMIN') {
    const repository = await this.assertCanManageMembers(slug, userId, role);
    const numTargetId = Number(targetUserId);

    if (numTargetId === repository.createdById) {
      const err = new Error('The repository owner cannot be modified as a member');
      err.status = 409;
      throw err;
    }

    const member = await RepositoryMember.findOne({
      repositoryId: repository.id,
      userId: numTargetId,
    });

    if (!member) {
      const err = new Error('Repository member not found');
      err.status = 404;
      throw err;
    }

    member.role = dto.role;
    await member.save();
    return member.toJSON();
  }

  async removeMember(slug, targetUserId, userId = 1, role = 'ADMIN') {
    const repository = await this.assertCanManageMembers(slug, userId, role);
    const numTargetId = Number(targetUserId);

    if (numTargetId === repository.createdById) {
      const err = new Error('The repository owner cannot be removed as a member');
      err.status = 409;
      throw err;
    }

    const member = await RepositoryMember.findOne({
      repositoryId: repository.id,
      userId: numTargetId,
    });

    if (!member) {
      const err = new Error('Repository member not found');
      err.status = 404;
      throw err;
    }

    await RepositoryMember.deleteOne({ _id: member._id });
    return { message: 'Repository member removed successfully' };
  }

  // Git Access Tokens
  async createGitToken(userId = 1, name = 'Default Token') {
    const rawToken = crypto.randomBytes(32).toString('hex');
    const tokenHash = crypto.createHash('sha256').update(rawToken).digest('hex');

    const highest = await GitAccessToken.findOne().sort({ id: -1 }).lean();
    const tokenId = (highest?.id || 0) + 1;

    const token = await GitAccessToken.create({
      id: tokenId,
      userId: Number(userId),
      name,
      tokenHash,
      createdAt: new Date(),
      expiresAt: null,
      revokedAt: null,
    });

    return {
      id: token.id,
      name: token.name,
      token: rawToken,
      createdAt: token.createdAt,
    };
  }

  async findValidGitToken(rawToken) {
    const tokenHash = crypto.createHash('sha256').update(rawToken).digest('hex');
    const token = await GitAccessToken.findOne({ tokenHash });

    if (!token || token.revokedAt) {
      return null;
    }

    if (token.expiresAt && token.expiresAt <= new Date()) {
      return null;
    }

    return token;
  }

  async revokeGitToken(userId = 1, tokenId) {
    const token = await GitAccessToken.findOne({
      id: Number(tokenId),
      userId: Number(userId),
    });

    if (!token) {
      const err = new Error('Git access token not found');
      err.status = 404;
      throw err;
    }

    token.revokedAt = new Date();
    await token.save();
    return { message: 'Git token revoked successfully' };
  }

  async getGitTokens(userId = 1) {
    return GitAccessToken.find({
      userId: Number(userId),
      revokedAt: null,
    }).sort({ createdAt: -1 }).lean();
  }
}

export const repositoryService = new RepositoryService();
export default repositoryService;
