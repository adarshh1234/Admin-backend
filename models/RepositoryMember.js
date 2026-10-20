import mongoose from 'mongoose';

const RepositoryMemberSchema = new mongoose.Schema(
  {
    repositoryId: { type: Number, required: true, index: true },
    userId: { type: Number, required: true, index: true },
    role: {
      type: String,
      enum: ['READ', 'WRITE', 'ADMIN'],
      default: 'READ',
      required: true,
    },
  },
  {
    timestamps: true,
    toJSON: {
      transform(_doc, ret) {
        delete ret.__v;
        return ret;
      },
    },
  },
);

RepositoryMemberSchema.index({ repositoryId: 1, userId: 1 }, { unique: true });

export default mongoose.models.RepositoryMember || mongoose.model('RepositoryMember', RepositoryMemberSchema);
