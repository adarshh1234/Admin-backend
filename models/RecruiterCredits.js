import mongoose from 'mongoose';

const RecruiterCreditsSchema = new mongoose.Schema(
  {
    orgId: { type: mongoose.Schema.Types.ObjectId, ref: 'RecruiterOrganization', sparse: true },
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', sparse: true },
    balance: { type: Number, default: 20, min: 0 },
    promotionalGranted: { type: Boolean, default: false },
    referralCode: { type: String, sparse: true, unique: true, index: true },
    referredBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  },
  { timestamps: true, collection: 'recruitercredits' }
);

RecruiterCreditsSchema.index({ orgId: 1 }, { unique: true, sparse: true });
RecruiterCreditsSchema.index({ userId: 1 }, { unique: true, sparse: true });

export default mongoose.models.RecruiterCredits ||
  mongoose.model('RecruiterCredits', RecruiterCreditsSchema);
