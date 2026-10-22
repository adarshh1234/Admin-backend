import mongoose from 'mongoose';

const UserSubscriptionSchema = new mongoose.Schema(
  {
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    orgId: { type: mongoose.Schema.Types.ObjectId, ref: 'RecruiterOrganization', index: true },
    planId: { type: String, required: true, index: true },
    planName: { type: String, required: true },
    billingCycle: { type: String, required: true },
    creditsIncluded: { type: Number, required: true },
    priceInr: { type: Number, required: true },
    quotaTotal: { type: Number },
    quotaUsed: { type: Number, default: 0 },
    quotaRemaining: { type: Number },
    packageType: {
      type: String,
      enum: [
        'subscription',
        'ai_apply',
        'candidate_package',
        'company_promotion',
        'promotion',
        'startup_service',
        'startup',
      ],
      default: 'subscription',
    },
    startDate: { type: Date, required: true },
    expiresAt: { type: Date, required: true, index: true },
    status: {
      type: String,
      enum: ['active', 'expired', 'cancelled'],
      default: 'active',
      index: true,
    },
    orderId: { type: String },
    paymentId: { type: String },
  },
  { timestamps: true, collection: 'usersubscriptions' }
);

export default mongoose.models.UserSubscription ||
  mongoose.model('UserSubscription', UserSubscriptionSchema);
