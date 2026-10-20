import mongoose from 'mongoose';

const TaskSubscriberSchema = new mongoose.Schema(
  {
    taskId: { type: Number, required: true, index: true },
    userId: { type: Number, required: true, index: true },
    createdAt: { type: Date, default: Date.now },
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

TaskSubscriberSchema.index({ taskId: 1, userId: 1 }, { unique: true });

export default mongoose.models.TaskSubscriber || mongoose.model('TaskSubscriber', TaskSubscriberSchema);
