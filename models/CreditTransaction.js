import mongoose from 'mongoose';

const CreditTransactionSchema = new mongoose.Schema(
  {
    orgId: { type: mongoose.Schema.Types.ObjectId, ref: 'RecruiterOrganization', index: true },
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', index: true },
    type: {
      type: String,
      enum: ['purchase', 'spend', 'grant', 'referral', 'refund'],
      required: true,
    },
    amount: { type: Number, required: true },
    balanceBefore: { type: Number },
    balanceAfter: { type: Number },
    feature: { type: String },
    reason: { type: String, required: true },
    refId: { type: mongoose.Schema.Types.ObjectId },
    orderId: { type: String, index: true },
    paymentId: { type: String },
    status: {
      type: String,
      enum: ['completed', 'pending', 'failed', 'refunded'],
      default: 'completed',
      index: true,
    },
    idempotencyKey: { type: String, sparse: true, index: true },
  },
  { timestamps: { createdAt: true, updatedAt: false }, collection: 'credittransactions' }
);

export default mongoose.models.CreditTransaction ||
  mongoose.model('CreditTransaction', CreditTransactionSchema);
