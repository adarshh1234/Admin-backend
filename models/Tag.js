import mongoose from 'mongoose';

const TagSchema = new mongoose.Schema(
  {
    id: { type: Number, index: true },
    name: { type: String, required: true, unique: true, trim: true },
    description: { type: String, default: null },
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

export default mongoose.models.Tag || mongoose.model('Tag', TagSchema);
