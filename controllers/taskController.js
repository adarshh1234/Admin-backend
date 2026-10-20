import taskService from '../services/taskService.js';

export const taskController = {
  // Tasks CRUD
  async getTasks(req, res) {
    try {
      const tasks = await taskService.getTasks();
      res.json(tasks);
    } catch (err) {
      res.status(err.status || 500).json({ message: err.message });
    }
  },

  async getTask(req, res) {
    try {
      const task = await taskService.getTask(req.params.id);
      res.json(task);
    } catch (err) {
      res.status(err.status || 500).json({ message: err.message });
    }
  },

  async createTask(req, res) {
    try {
      const userId = req.user?.id || 1;
      const task = await taskService.createTask(req.body, userId);
      res.status(201).json(task);
    } catch (err) {
      res.status(err.status || 400).json({ message: err.message });
    }
  },

  async updateTask(req, res) {
    try {
      const userId = req.user?.id || 1;
      const task = await taskService.updateTask(req.params.id, req.body, userId);
      res.json(task);
    } catch (err) {
      res.status(err.status || 400).json({ message: err.message });
    }
  },

  async deleteTask(req, res) {
    try {
      const result = await taskService.deleteTask(req.params.id);
      res.json(result);
    } catch (err) {
      res.status(err.status || 400).json({ message: err.message });
    }
  },

  async getActivities(req, res) {
    try {
      const activities = await taskService.getActivities(req.params.id);
      res.json(activities);
    } catch (err) {
      res.status(err.status || 500).json({ message: err.message });
    }
  },

  // Comments
  async getComments(req, res) {
    try {
      const comments = await taskService.getComments(req.params.taskId);
      res.json(comments);
    } catch (err) {
      res.status(err.status || 500).json({ message: err.message });
    }
  },

  async createComment(req, res) {
    try {
      const userId = req.user?.id || 1;
      const comment = await taskService.createComment(req.params.taskId, req.body, userId);
      res.status(201).json(comment);
    } catch (err) {
      res.status(err.status || 400).json({ message: err.message });
    }
  },

  async deleteComment(req, res) {
    try {
      const result = await taskService.deleteComment(req.params.taskId, req.params.commentId);
      res.json(result);
    } catch (err) {
      res.status(err.status || 400).json({ message: err.message });
    }
  },

  // Subscribers
  async getSubscribers(req, res) {
    try {
      const subscribers = await taskService.getSubscribers(req.params.taskId);
      res.json(subscribers);
    } catch (err) {
      res.status(err.status || 500).json({ message: err.message });
    }
  },

  async addSubscriber(req, res) {
    try {
      const actorUserId = req.user?.id || 1;
      const subscriber = await taskService.addSubscriber(req.params.taskId, req.body, actorUserId);
      res.status(201).json(subscriber);
    } catch (err) {
      res.status(err.status || 400).json({ message: err.message });
    }
  },

  async removeSubscriber(req, res) {
    try {
      const actorUserId = req.user?.id || 1;
      const result = await taskService.removeSubscriber(req.params.taskId, req.params.userId, actorUserId);
      res.json(result);
    } catch (err) {
      res.status(err.status || 400).json({ message: err.message });
    }
  },

  // Tags
  async getTags(req, res) {
    try {
      const tags = await taskService.getTags();
      res.json(tags);
    } catch (err) {
      res.status(err.status || 500).json({ message: err.message });
    }
  },

  async createTag(req, res) {
    try {
      const tag = await taskService.createTag(req.body);
      res.status(201).json(tag);
    } catch (err) {
      res.status(err.status || 400).json({ message: err.message });
    }
  },

  async getTaskTags(req, res) {
    try {
      const tags = await taskService.getTaskTags(req.params.taskId);
      res.json(tags);
    } catch (err) {
      res.status(err.status || 500).json({ message: err.message });
    }
  },

  async addTagToTask(req, res) {
    try {
      const actorUserId = req.user?.id || 1;
      const result = await taskService.addTagToTask(req.params.taskId, req.body, actorUserId);
      res.status(201).json(result);
    } catch (err) {
      res.status(err.status || 400).json({ message: err.message });
    }
  },

  async removeTagFromTask(req, res) {
    try {
      const actorUserId = req.user?.id || 1;
      const result = await taskService.removeTagFromTask(req.params.taskId, req.params.tagId, actorUserId);
      res.json(result);
    } catch (err) {
      res.status(err.status || 400).json({ message: err.message });
    }
  },
};

export default taskController;
