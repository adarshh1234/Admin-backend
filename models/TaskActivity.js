import mongoose from 'mongoose';

const TaskActivitySchema = new mongoose.Schema(
  {
    id: { type: Number, index: true },
    taskId: { type: Number, required: true, index: true },
    userId: { type: Number, required: true },
    type: {
      type: String,
      enum: [
        'CREATED',
        'UPDATED',
        'ASSIGNED',
        'STATUS_CHANGED',
        'PRIORITY_CHANGED',
        'TAG_ADDED',
        'TAG_REMOVED',
        'SUBSCRIBER_ADDED',
        'SUBSCRIBER_REMOVED',
        'COMMENT_ADDED',
      ],
      required: true,
    },
    oldValue: { type: String, default: null },
    newValue: { type: String, default: null },
    comment: { type: String, default: null },
    createdAt: { type: Date, default: Date.now },
  },
  {
    toJSON: {
      transform(_doc, ret) {
        ret.id = ret.id || ret._id;
        delete ret.__v;
        return ret;
      },
    },
  },
);

export default mongoose.models.TaskActivity || mongoose.model('TaskActivity', TaskActivitySchema);
