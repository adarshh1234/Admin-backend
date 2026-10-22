import mongoose from 'mongoose';

const PricingAuditEntrySchema = new mongoose.Schema(
  {
    adminId: { type: String, required: true },
    adminName: { type: String, required: true },
    adminRole: { type: String, required: true },
    itemKey: { type: String, required: true },
    itemName: { type: String, required: true },
    field: { type: String, required: true },
    previousValue: { type: mongoose.Schema.Types.Mixed },
    newValue: { type: mongoose.Schema.Types.Mixed },
    reason: { type: String, required: true },
    timestamp: { type: Date, default: Date.now },
  },
  { _id: true }
);

const CreditPricingConfigSchema = new mongoose.Schema(
  {
    key: { type: String, default: 'default', unique: true, index: true },
    creditValueInr: { type: Number, default: 10, min: 1 },
    initialPromotionalCredits: { type: Number, default: 20, min: 0 },
    referralRewardCredits: { type: Number, default: 10, min: 0 },
    featurePricing: { type: Map, of: mongoose.Schema.Types.Mixed, default: {} },
    creditPacks: { type: Array, default: [] },
    subscriptionPlans: { type: Array, default: [] },
    candidatePlans: { type: Array, default: [] },
    companyPlans: { type: Array, default: [] },
    startupPlans: { type: Array, default: [] },
    institutionPlans: { type: Array, default: [] },
    status: { type: String, enum: ['draft', 'published'], default: 'published' },
    draftData: { type: mongoose.Schema.Types.Mixed, default: null },
    auditLog: [PricingAuditEntrySchema],
    lastUpdatedBy: { type: String },
    lastUpdatedByRole: { type: String },
  },
  { timestamps: true, collection: 'creditpricingconfigs' }
);

export default mongoose.models.CreditPricingConfig ||
  mongoose.model('CreditPricingConfig', CreditPricingConfigSchema);
