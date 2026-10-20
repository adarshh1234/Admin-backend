import mongoose from 'mongoose';

const RepositorySchema = new mongoose.Schema(
  {
    id: { type: Number, index: true },
    name: { type: String, required: true, trim: true },
    slug: { type: String, required: true, unique: true, trim: true, lowercase: true, index: true },
    description: { type: String, default: null },
    localPath: { type: String, required: true },
    visibility: {
      type: String,
      enum: ['PUBLIC', 'PRIVATE'],
      default: 'PRIVATE',
      index: true,
    },
    createdById: { type: Number, required: true, default: 1 },
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

export default mongoose.models.Repository || mongoose.model('Repository', RepositorySchema);
