import mongoose from 'mongoose';

const TaskCommentSchema = new mongoose.Schema(
  {
    id: { type: Number, index: true },
    taskId: { type: Number, required: true, index: true },
    userId: { type: Number, required: true },
    content: { type: String, required: true },
  },
  {
    timestamps: true,
    toJSON: {
      transform(_doc, ret) {
        ret.id = ret.id || ret._id;
        delete ret.__v;
        return ret;
      },
    },
  },
);

export default mongoose.models.TaskComment || mongoose.model('TaskComment', TaskCommentSchema);
