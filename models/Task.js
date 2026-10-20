import mongoose from 'mongoose';

const TaskSchema = new mongoose.Schema(
  {
    id: { type: Number, unique: true, index: true },
    taskNumber: { type: Number, required: true, unique: true, index: true },
    title: { type: String, required: true, trim: true },
    description: { type: String, default: null },
    status: {
      type: String,
      enum: ['OPEN', 'RESOLVED', 'WONT_FIX', 'INVALID', 'SPITE'],
      default: 'OPEN',
      index: true,
    },
    priority: {
      type: String,
      enum: ['UNBREAK_NOW', 'NEEDS_TRIAGE', 'HIGH', 'NORMAL', 'LOW', 'WISHLIST'],
      default: 'NORMAL',
      index: true,
    },
    visibility: {
      type: String,
      enum: ['ALL_USERS', 'CUSTOM'],
      default: 'ALL_USERS',
    },
    createdById: { type: Number, required: true, default: 1 },
    assignedToId: { type: Number, default: null },
    parentTaskId: { type: Number, default: null },
  },
  {
    timestamps: true,
    toJSON: {
      transform(_doc, ret) {
        ret.id = ret.id || ret.taskNumber;
        delete ret.__v;
        return ret;
      },
    },
  },
);

export default mongoose.models.Task || mongoose.model('Task', TaskSchema, 'taskmite_tasks');
