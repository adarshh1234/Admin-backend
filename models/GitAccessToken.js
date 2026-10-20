import mongoose from 'mongoose';

const GitAccessTokenSchema = new mongoose.Schema(
  {
    id: { type: Number, index: true },
    userId: { type: Number, required: true, index: true },
    name: { type: String, required: true, trim: true },
    tokenHash: { type: String, required: true, unique: true, index: true },
    expiresAt: { type: Date, default: null },
    revokedAt: { type: Date, default: null },
  },
  {
    timestamps: { createdAt: true, updatedAt: false },
    toJSON: {
      transform(_doc, ret) {
        ret.id = ret.id || ret._id;
        delete ret.tokenHash;
        delete ret.__v;
        return ret;
      },
    },
  },
);

export default mongoose.models.GitAccessToken || mongoose.model('GitAccessToken', GitAccessTokenSchema);
