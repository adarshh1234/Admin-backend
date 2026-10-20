import mongoose from 'mongoose';

const TaskTagSchema = new mongoose.Schema(
  {
    taskId: { type: Number, required: true, index: true },
    tagId: { type: Number, required: true, index: true },
  },
  {
    toJSON: {
      transform(_doc, ret) {
        delete ret.__v;
        return ret;
      },
    },
  },
);

TaskTagSchema.index({ taskId: 1, tagId: 1 }, { unique: true });

export default mongoose.models.TaskTag || mongoose.model('TaskTag', TaskTagSchema);
