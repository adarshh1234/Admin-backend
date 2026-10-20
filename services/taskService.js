import Task from '../models/Task.js';
import TaskActivity from '../models/TaskActivity.js';
import TaskComment from '../models/TaskComment.js';
import TaskSubscriber from '../models/TaskSubscriber.js';
import Tag from '../models/Tag.js';
import TaskTag from '../models/TaskTag.js';

class TaskService {
  async getTasks() {
    const tasks = await Task.find({}).sort({ taskNumber: -1 }).lean();
    return tasks.map((t) => ({
      ...t,
      id: t.id || t.taskNumber,
    }));
  }

  async getTask(id) {
    const numericId = Number(id);
    const query = isNaN(numericId)
      ? { _id: id }
      : { $or: [{ id: numericId }, { taskNumber: numericId }] };

    const task = await Task.findOne(query).lean();
    if (!task) {
      const err = new Error(`Task with ID ${id} not found`);
      err.status = 404;
      throw err;
    }

    return {
      ...task,
      id: task.id || task.taskNumber,
    };
  }

  async createTask(dto, userId = 1) {
    const highestTask = await Task.findOne().sort({ taskNumber: -1 }).lean();
    const taskNumber = (highestTask?.taskNumber || 0) + 1;

    const newTask = await Task.create({
      id: taskNumber,
      taskNumber,
      title: dto.title,
      description: dto.description || null,
      status: dto.status || 'OPEN',
      priority: dto.priority || 'NORMAL',
      visibility: dto.visibility || 'ALL_USERS',
      createdById: userId,
      assignedToId: dto.assignedToId || null,
      parentTaskId: dto.parentTaskId || null,
    });

    await TaskActivity.create({
      taskId: taskNumber,
      userId,
      type: 'CREATED',
      oldValue: null,
      newValue: null,
      comment: null,
      createdAt: new Date(),
    });

    return newTask.toJSON();
  }

  async updateTask(id, dto, userId = 1) {
    const task = await this.getTask(id);
    const taskId = task.id;

    const updateFields = {};
    if (dto.title !== undefined) updateFields.title = dto.title;
    if (dto.description !== undefined) updateFields.description = dto.description;
    if (dto.status !== undefined) updateFields.status = dto.status;
    if (dto.priority !== undefined) updateFields.priority = dto.priority;
    if (dto.visibility !== undefined) updateFields.visibility = dto.visibility;
    if (dto.assignedToId !== undefined) updateFields.assignedToId = dto.assignedToId;
    if (dto.parentTaskId !== undefined) updateFields.parentTaskId = dto.parentTaskId;

    const updatedTask = await Task.findOneAndUpdate(
      { $or: [{ id: taskId }, { taskNumber: taskId }] },
      { $set: updateFields },
      { new: true },
    ).lean();

    if (dto.priority !== undefined && dto.priority !== task.priority) {
      await TaskActivity.create({
        taskId,
        userId,
        type: 'PRIORITY_CHANGED',
        oldValue: task.priority,
        newValue: dto.priority,
        comment: null,
        createdAt: new Date(),
      });
    }

    if (dto.status !== undefined && dto.status !== task.status) {
      await TaskActivity.create({
        taskId,
        userId,
        type: 'STATUS_CHANGED',
        oldValue: task.status,
        newValue: dto.status,
        comment: null,
        createdAt: new Date(),
      });
    }

    if (dto.assignedToId !== undefined && dto.assignedToId !== task.assignedToId) {
      await TaskActivity.create({
        taskId,
        userId,
        type: 'ASSIGNED',
        oldValue: task.assignedToId !== null ? String(task.assignedToId) : null,
        newValue: dto.assignedToId !== null ? String(dto.assignedToId) : null,
        comment: null,
        createdAt: new Date(),
      });
    }

    return {
      ...updatedTask,
      id: updatedTask.id || updatedTask.taskNumber,
    };
  }

  async deleteTask(id) {
    const task = await this.getTask(id);
    const taskId = task.id;

    // Unlink subtasks
    await Task.updateMany({ parentTaskId: taskId }, { $set: { parentTaskId: null } });

    // Cascade delete dependent records
    await TaskActivity.deleteMany({ taskId });
    await TaskComment.deleteMany({ taskId });
    await TaskSubscriber.deleteMany({ taskId });
    await TaskTag.deleteMany({ taskId });

    // Delete task
    await Task.deleteOne({ $or: [{ id: taskId }, { taskNumber: taskId }] });

    return { message: `Task with ID ${taskId} deleted successfully` };
  }

  async getActivities(taskId) {
    const numericTaskId = Number(taskId);
    return TaskActivity.find({ taskId: numericTaskId }).sort({ createdAt: 1 }).lean();
  }

  async createComment(taskId, dto, userId = 1) {
    const task = await this.getTask(taskId);
    const numericTaskId = task.id;

    const highest = await TaskComment.findOne().sort({ id: -1 }).lean();
    const commentId = (highest?.id || 0) + 1;

    const comment = await TaskComment.create({
      id: commentId,
      taskId: numericTaskId,
      userId,
      content: dto.content,
    });

    await TaskActivity.create({
      taskId: numericTaskId,
      userId,
      type: 'COMMENT_ADDED',
      oldValue: null,
      newValue: null,
      comment: dto.content,
      createdAt: new Date(),
    });

    return comment.toJSON();
  }

  async getComments(taskId) {
    const task = await this.getTask(taskId);
    return TaskComment.find({ taskId: task.id }).sort({ createdAt: 1 }).lean();
  }

  async deleteComment(taskId, commentId) {
    const task = await this.getTask(taskId);
    const numCommentId = Number(commentId);

    const comment = await TaskComment.findOne({
      taskId: task.id,
      $or: [{ id: numCommentId }, { _id: isNaN(numCommentId) ? commentId : null }],
    });

    if (!comment) {
      const err = new Error(`Comment with ID ${commentId} not found for task ${taskId}`);
      err.status = 404;
      throw err;
    }

    await TaskComment.deleteOne({ _id: comment._id });
    return { message: `Comment with ID ${commentId} deleted successfully` };
  }

  async addSubscriber(taskId, dto, actorUserId = 1) {
    const task = await this.getTask(taskId);
    const numericTaskId = task.id;
    const subUserId = Number(dto.userId);

    const existing = await TaskSubscriber.findOne({ taskId: numericTaskId, userId: subUserId });
    if (existing) {
      return existing.toJSON();
    }

    const subscriber = await TaskSubscriber.create({
      taskId: numericTaskId,
      userId: subUserId,
      createdAt: new Date(),
    });

    await TaskActivity.create({
      taskId: numericTaskId,
      userId: actorUserId,
      type: 'SUBSCRIBER_ADDED',
      oldValue: null,
      newValue: String(subUserId),
      comment: null,
      createdAt: new Date(),
    });

    return subscriber.toJSON();
  }

  async getSubscribers(taskId) {
    const task = await this.getTask(taskId);
    return TaskSubscriber.find({ taskId: task.id }).lean();
  }

  async removeSubscriber(taskId, userId, actorUserId = 1) {
    const task = await this.getTask(taskId);
    const numericTaskId = task.id;
    const subUserId = Number(userId);

    const subscriber = await TaskSubscriber.findOne({ taskId: numericTaskId, userId: subUserId });
    if (!subscriber) {
      const err = new Error(`User ${userId} is not subscribed to task ${taskId}`);
      err.status = 404;
      throw err;
    }

    await TaskSubscriber.deleteOne({ _id: subscriber._id });

    await TaskActivity.create({
      taskId: numericTaskId,
      userId: actorUserId,
      type: 'SUBSCRIBER_REMOVED',
      oldValue: String(subUserId),
      newValue: null,
      comment: null,
      createdAt: new Date(),
    });

    return { message: `User ${userId} unsubscribed from task ${taskId} successfully` };
  }

  async createTag(dto) {
    const existing = await Tag.findOne({ name: dto.name.trim() });
    if (existing) {
      const err = new Error(`Tag "${dto.name}" already exists`);
      err.status = 409;
      throw err;
    }

    const highest = await Tag.findOne().sort({ id: -1 }).lean();
    const tagId = (highest?.id || 0) + 1;

    const tag = await Tag.create({
      id: tagId,
      name: dto.name.trim(),
      description: dto.description || null,
    });

    return tag.toJSON();
  }

  async getTags() {
    return Tag.find({}).sort({ name: 1 }).lean();
  }

  async addTagToTask(taskId, dto, actorUserId = 1) {
    const task = await this.getTask(taskId);
    const numericTaskId = task.id;
    const tagId = Number(dto.tagId);

    const tag = await Tag.findOne({ $or: [{ id: tagId }, { _id: isNaN(tagId) ? dto.tagId : null }] });
    if (!tag) {
      const err = new Error(`Tag with ID ${dto.tagId} not found`);
      err.status = 404;
      throw err;
    }

    const existing = await TaskTag.findOne({ taskId: numericTaskId, tagId: tag.id || tagId });
    if (!existing) {
      await TaskTag.create({ taskId: numericTaskId, tagId: tag.id || tagId });

      await TaskActivity.create({
        taskId: numericTaskId,
        userId: actorUserId,
        type: 'TAG_ADDED',
        oldValue: null,
        newValue: tag.name,
        comment: null,
        createdAt: new Date(),
      });
    }

    return { taskId: numericTaskId, tagId: tag.id || tagId };
  }

  async getTaskTags(taskId) {
    const task = await this.getTask(taskId);
    return TaskTag.find({ taskId: task.id }).lean();
  }

  async removeTagFromTask(taskId, tagId, actorUserId = 1) {
    const task = await this.getTask(taskId);
    const numericTaskId = task.id;
    const numTagId = Number(tagId);

    const taskTag = await TaskTag.findOne({
      taskId: numericTaskId,
      tagId: numTagId,
    });

    if (!taskTag) {
      const err = new Error(`Tag ${tagId} is not attached to task ${taskId}`);
      err.status = 404;
      throw err;
    }

    await TaskTag.deleteOne({ _id: taskTag._id });

    await TaskActivity.create({
      taskId: numericTaskId,
      userId: actorUserId,
      type: 'TAG_REMOVED',
      oldValue: String(tagId),
      newValue: null,
      comment: null,
      createdAt: new Date(),
    });

    return { message: `Tag ${tagId} removed from task ${taskId} successfully` };
  }
}

export const taskService = new TaskService();
export default taskService;
