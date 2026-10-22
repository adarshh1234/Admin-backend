import mongoose from 'mongoose';

const PaymentOrderSchema = new mongoose.Schema(
  {
    orderId: { type: String, required: true, unique: true, index: true },
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    orgId: { type: mongoose.Schema.Types.ObjectId, ref: 'RecruiterOrganization', index: true },
    purchaseType: { type: String, enum: ['credits', 'subscription'], required: true },
    itemKey: { type: String, required: true },
    itemName: { type: String, required: true },
    credits: { type: Number, required: true },
    amountInr: { type: Number, required: true },
    currency: { type: String, default: 'INR' },
    billingCycle: { type: String, enum: ['monthly', 'six_months', 'yearly'] },
    status: {
      type: String,
      enum: ['created', 'paid', 'failed', 'cancelled'],
      default: 'created',
      index: true,
    },
    provider: { type: String, default: 'razorpay' },
    providerOrderId: { type: String },
    providerPaymentId: { type: String },
    providerSignature: { type: String },
    idempotencyKey: { type: String, sparse: true, index: true },
  },
  { timestamps: true, collection: 'paymentorders' }
);

export default mongoose.models.PaymentOrder ||
  mongoose.model('PaymentOrder', PaymentOrderSchema);
